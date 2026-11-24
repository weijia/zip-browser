import fs from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from './util.js';
import { isStaticAllowed, isArchiveName } from './mime.js';
import { detectTags } from './tag-rules.js';
import { probeArchiveEncryption } from './archive-flags.js';

const execFileAsync = promisify(execFile);
// 一个目录里最多探测这么多压缩包，避免成百上千个归档把列目录拖慢。
const ARCHIVE_PROBE_LIMIT = 200;
// 目录自动标签探测：与 dir-struct-gen 的 probeDir 同口径（只读直接子项名、1.5s 超时），
// 并发受控，避免列目录被几百个子目录的 readdir 拖住。
const DIR_TAG_TIMEOUT_MS = 1500;
const DIR_TAG_CONCURRENCY = 8;
const DIR_TAG_MAX_DIRS = 400;
const PS_COMMAND = 'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,VolumeName,Size,FreeSpace,DriveType | ConvertTo-Json -Compress';

const allowedPrefixes = new Set();

function key(value) {
  return String(value).replace(/\//g, '\\').toLowerCase();
}

export function normalizeLocalPath(input) {
  if (typeof input !== 'string' || !input.trim()) throw new HttpError(400, 'path is required');
  const raw = input.trim().replace(/\//g, '\\');
  if (!/^[A-Za-z]:(?:\\|$)/.test(raw)) throw new HttpError(400, 'invalid windows path');
  const resolved = path.win32.resolve(raw);
  if (!/^[A-Za-z]:\\/.test(resolved)) throw new HttpError(400, 'path resolves outside a drive');
  return resolved;
}

export function fsUrlToLocalPath(rest) {
  const pieces = rest.split('/').filter(Boolean).map((piece) => {
    let value;
    try {
      value = decodeURIComponent(piece);
    } catch {
      throw new HttpError(400, 'malformed url');
    }
    if (value === '.' || value === '..' || value.includes('\\') || value.includes(':')) {
      throw new HttpError(400, 'invalid path segment');
    }
    return value;
  });
  const letter = pieces.shift();
  if (!letter || !/^[A-Za-z]$/.test(letter)) throw new HttpError(400, 'invalid drive letter');
  return normalizeLocalPath(`${letter}:\\${pieces.join('\\')}`);
}

export function localPathToUrl(abs) {
  const match = /^([A-Za-z]):\\(.*)$/.exec(abs);
  if (!match) throw new HttpError(400, 'cannot map path to url');
  const parts = match[2]
    ? match[2].split('\\').filter(Boolean).map(encodeURIComponent)
    : [];
  return `/fs/${match[1].toUpperCase()}/${parts.join('/')}`;
}

export function allowDirectory(abs) {
  const normalized = key(abs);
  allowedPrefixes.add(normalized.endsWith('\\') ? normalized : `${normalized}\\`);
}

export function isPathAllowed(abs) {
  const target = key(abs);
  for (const prefix of allowedPrefixes) {
    if (target.startsWith(prefix) || target === prefix.slice(0, -1)) return true;
  }
  return false;
}

export function isFileReadable(abs) {
  return isPathAllowed(abs) && isStaticAllowed(path.win32.basename(abs));
}

function driveKind(type) {
  switch (Number(type)) {
    case 2: return '可移动';
    case 4: return '网络映射';
    case 5: return '光驱';
    case 6: return '内存盘';
    default: return '本地磁盘';
  }
}

export async function listDrives() {
  const found = [];
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    const root = `${letter}:\\`;
    try {
      await fs.access(root, constants.R_OK);
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    let total = 0;
    let free = 0;
    try {
      const usage = await fs.statfs(root);
      total = Number(usage.blocks) * Number(usage.bsize);
      free = Number(usage.bavail) * Number(usage.bsize);
    } catch {
      // statfs is unavailable on some mounts; metadata comes from PowerShell below
    }
    found.push({ letter, path: root, label: '', total, free, type: 3, kind: driveKind(3) });
  }

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', PS_COMMAND],
      { timeout: 4000, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const cleaned = String(stdout).replace(/^\uFEFF/, '').trim();
    if (cleaned) {
      const parsed = JSON.parse(cleaned);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const byId = new Map(rows.map((row) => [String(row.DeviceID || '').toUpperCase(), row]));
      for (const drive of found) {
        const meta = byId.get(`${drive.letter}:`);
        if (!meta) continue;
        drive.label = String(meta.VolumeName || '');
        drive.total = Number(meta.Size) || drive.total;
        drive.free = Number(meta.FreeSpace) || drive.free;
        drive.type = Number(meta.DriveType) || drive.type;
        drive.kind = driveKind(drive.type);
      }
    }
  } catch {
    // volume labels are cosmetic; keep the statfs fallback
  }

  for (const drive of found) {
    if (!drive.total || drive.total > 64 * 1024 ** 4 || drive.total < drive.free) {
      drive.total = 0;
      drive.free = 0;
    }
  }

  return found;
}

// 单个目录的自动标签：直接子项名 → 规则表；读失败/超时按「无标签」处理（同 dir-struct-gen）。
async function readDirTagsSafe(dir) {
  let timer = null;
  try {
    const names = await Promise.race([
      fs.readdir(dir),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('tag-probe-timeout')), DIR_TAG_TIMEOUT_MS);
      }),
    ]);
    return detectTags(names);
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 批量探测目录自动标签：dir -> tags[]。
 * 每批 DIR_TAG_CONCURRENCY 个并行，单目录 1.5s 超时；超过 DIR_TAG_MAX_DIRS 的只探测前 N 个。
 */
export async function detectTagsForDirs(dirs) {
  const out = {};
  const list = (Array.isArray(dirs) ? dirs : [])
    .filter((dir) => typeof dir === 'string' && dir.trim())
    .slice(0, DIR_TAG_MAX_DIRS);
  for (let index = 0; index < list.length; index += DIR_TAG_CONCURRENCY) {
    const batch = list.slice(index, index + DIR_TAG_CONCURRENCY);
    const results = await Promise.all(batch.map((dir) => readDirTagsSafe(dir)));
    batch.forEach((dir, offset) => { out[dir] = results[offset]; });
  }
  return out;
}

export async function listDirectory(abs) {
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch (err) {
    throw new HttpError(err.code === 'ENOENT' ? 404 : 403, `cannot open directory: ${err.message}`);
  }
  // 大目录逐项 stat 很慢；并行有上限，既不串行等 N 次，也不一次打开太多句柄。
  const items = (await mapLimit(entries, 32, async (entry) => {
    if (entry.isSymbolicLink()) return null;
    const full = path.win32.join(abs, entry.name);
    try {
      const stat = await fs.stat(full);
      const dir = stat.isDirectory();
      const archive = !dir && isArchiveName(entry.name);
      return {
        name: entry.name,
        path: full,
        dir,
        size: dir ? 0 : stat.size,
        mtime: stat.mtimeMs,
        archive,
        // zip 字段保留为 archive 的别名，避免旧前端/测试失效。
        zip: archive,
      };
    } catch {
      // skip unreadable entries instead of failing the whole listing
      return null;
    }
  })).filter(Boolean);
  const probes = items.filter((item) => item.archive).map((item) => ({ item, size: item.size, mtimeMs: item.mtime }));
  items.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'zh-CN'));
  allowDirectory(abs);
  // 压缩包加密标记：只对归档做「读头尾若干 KB」的轻量探测，判不准返回 unknown。
  if (probes.length) {
    const limited = probes.slice(0, ARCHIVE_PROBE_LIMIT);
    const results = await Promise.all(limited.map(({ item, size, mtimeMs }) => probeArchiveEncryption(item.path, {
      size, mtimeMs,
    }).catch(() => 'unknown')));
    limited.forEach(({ item }, index) => { item.encrypted = results[index]; });
    for (const { item } of probes.slice(ARCHIVE_PROBE_LIMIT)) item.encrypted = 'unknown';
  }
  // 自动标签口径与 dir-struct-gen 一致：只看该目录的直接子项名，不递归读盘。
  // 子目录行也要带自己的自动标签（dir-struct-gen 是每行都能看到的），这里按批量并发探测。
  const dirItems = items.filter((item) => item.dir);
  if (dirItems.length) {
    const tagsByDir = await detectTagsForDirs(dirItems.map((item) => item.path));
    for (const item of dirItems) item.tags = tagsByDir[item.path] || [];
  }
  for (const item of items) if (!item.dir) item.tags = [];
  return { path: abs, items, tags: detectTags(entries.map((entry) => entry.name)) };
}

function mapLimit(items, limit, fn) {
  return new Promise((resolve, reject) => {
    const out = new Array(items.length);
    let cursor = 0;
    let active = 0;
    let finished = 0;
    const pump = () => {
      while (active < limit && cursor < items.length) {
        const index = cursor;
        cursor += 1;
        active += 1;
        Promise.resolve(fn(items[index], index)).then((value) => {
          out[index] = value;
          finished += 1;
          active -= 1;
          if (finished === items.length) resolve(out);
          else pump();
        }, reject);
      }
    };
    if (!items.length) resolve(out);
    else pump();
  });
}

export async function findIndexFile(abs) {
  for (const name of ['index.html', 'index.htm', 'default.html']) {
    const candidate = path.win32.join(abs, name);
    if (!isStaticAllowed(name)) continue;
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

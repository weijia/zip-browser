import fs from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from './util.js';
import { isStaticAllowed, isArchiveName } from './mime.js';
import { detectTags } from './tag-rules.js';

const execFileAsync = promisify(execFile);
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

export async function listDirectory(abs) {
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch (err) {
    throw new HttpError(err.code === 'ENOENT' ? 404 : 403, `cannot open directory: ${err.message}`);
  }
  const items = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.win32.join(abs, entry.name);
    try {
      const stat = await fs.stat(full);
      const dir = stat.isDirectory();
      const archive = !dir && isArchiveName(entry.name);
      items.push({
        name: entry.name,
        path: full,
        dir,
        size: dir ? 0 : stat.size,
        mtime: stat.mtimeMs,
        archive,
        // zip 字段保留为 archive 的别名，避免旧前端/测试失效。
        zip: archive,
      });
    } catch {
      // skip unreadable entries instead of failing the whole listing
    }
  }
  items.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'zh-CN'));
  allowDirectory(abs);
  // 自动标签口径与 dir-struct-gen 一致：只看该目录的直接子项名，零额外 IO。
  return { path: abs, items, tags: detectTags(entries.map((entry) => entry.name)) };
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

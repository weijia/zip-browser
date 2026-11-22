// 网盘信息本地缓存：把用户手工登记的网盘元信息写进本机磁盘。
//
// 目录规则：
//   Windows → <D:\codes | C:\codes>\cached\<后端名>-<序号>\info.json
//   其他     → <homedir>/codes/cached/<后端名>-<序号>/info.json
// 每个条目下另有 data/ 子目录存放真正的缓存内容，前端点进网盘看到的是 data/ 而非 info.json。
// Windows 优先 D:\codes（仅当它为已存在的目录），否则用 C:\codes；codes 不存在就创建。
// 序号按「每个后端独立」从 1 开始分配：扫描现有 <backend>-N 目录取最大 N+1。
//
// 这里只存信息（类型/大小/剩余空间/月度上下行配额与剩余流量），不缓存任何网盘文件内容，
// 与 zen-fs-config 同步组无关。条目可登记、原地编辑（目录名/序号不变）、删除。
// 另支持「从清单导入的卷」：backend 用清单里的 volumeId（安全化后含 '-' 与字母数字），
// 并额外记录 drive/来源主机/文件数/体积等清单字段，落盘规则与手工登记完全一致。
// 核心函数接受显式 root，便于测试注入临时目录。

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OPENLIST_BACKENDS } from '../web/drive-backends.js';

// 由列表推导的后端查表，避免再维护一份数组顺序。
const BACKENDS_BY_NAME = Object.fromEntries(OPENLIST_BACKENDS.map((name) => [name, true]));

export const CACHE_DIRNAME = 'cached';
export const CODES_DIRNAME = 'codes';
export const INFO_FILE = 'info.json';
export const DATA_DIRNAME = 'data';
export const MAX_FIELD_LENGTH = 200;
const SEQ_RE = /^([A-Za-z0-9._-]+)-(\d+)$/;
// volumeId（UUID / 盘符身份）允许字母数字、点、下划线与连字符；与 OpenList 后端名共用命名空间。
const SAFE_BACKEND_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** backend 合法：OpenList 白名单内的后端名，或安全化的清单卷 volumeId。 */
export function isValidBackend(name) {
  const value = String(name || '');
  return Boolean(BACKENDS_BY_NAME[value]) || SAFE_BACKEND_RE.test(value);
}

/** 判定某路径是否为已存在的目录（不跟随创建）。 */
async function isDirectory(target) {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 解析 codes 根目录，不创建。
 * 可注入 platform/homedir/env/platform-checker 便于测试。
 */
export async function resolveCodesRoot(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const home = options.homedir || os.homedir();
  if (platform === 'win32') {
    const dCodes = path.win32.join('D:\\', CODES_DIRNAME);
    if (await isDirectory(dCodes)) return dCodes;
    return path.win32.join('C:\\', CODES_DIRNAME);
  }
  return path.join(home, CODES_DIRNAME);
}

/** 解析并创建缓存根目录，返回 { codesRoot, cacheRoot }。 */
export async function ensureCacheRoot(options = {}) {
  const codesRoot = options.codesRoot || await resolveCodesRoot(options);
  await fs.mkdir(codesRoot, { recursive: true });
  const cacheRoot = path.join(codesRoot, CACHE_DIRNAME);
  await fs.mkdir(cacheRoot, { recursive: true });
  return { codesRoot, cacheRoot };
}

/** 字段清洗：容量等选填项允许缺省（null），非空一律转字符串并截断。 */
export function sanitizeInfo(raw = {}) {
  const backend = String(raw.backend || '').trim();
  if (!isValidBackend(backend)) {
    throw Object.assign(new Error('未知的后端类型'), { status: 400 });
  }
  const text = (value) => {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim().slice(0, MAX_FIELD_LENGTH) || null;
  };
  return {
    backend,
    label: text(raw.label),
    total: text(raw.total),
    free: text(raw.free),
    upQuota: text(raw.upQuota),
    downQuota: text(raw.downQuota),
    upRemaining: text(raw.upRemaining),
    downRemaining: text(raw.downRemaining),
    // 清单导入的卷附带（手工登记不会填这些），原样透传用于展示与去重。
    volumeId: text(raw.volumeId),
    drive: text(raw.drive),
    sourceHost: text(raw.sourceHost),
    fileCount: text(raw.fileCount),
    totalSize: text(raw.totalSize),
    hasChildren: text(raw.hasChildren),
  };
}

/** 某后端下一个可用序号：现有 <backend>-N 目录的最大 N+1。 */
export async function nextSeq(cacheRoot, backend) {
  let entries = [];
  try {
    entries = await fs.readdir(cacheRoot, { withFileTypes: true });
  } catch {
    return 1;
  }
  const re = new RegExp(`^${escapeRe(backend)}-(\\d+)$`);
  let max = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = re.exec(entry.name);
    if (match) max = Math.max(max, Number(match[1]) || 0);
  }
  return max + 1;
}

/** 校验目录名是否为合法的 <backend>-<序号>，backend 可为后端名或清单卷 volumeId。 */
export function parseDirName(dir) {
  const name = String(dir || '');
  if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') return null;
  const match = SEQ_RE.exec(name);
  if (!match || !isValidBackend(match[1])) return null;
  return { backend: match[1], seq: Number(match[2]) };
}

/** 列出缓存目录下所有 info.json 的信息。 */
export async function listEntries(cacheRoot) {
  let entries = [];
  try {
    entries = await fs.readdir(cacheRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const parsed = parseDirName(entry.name);
    if (!parsed) continue;
    const infoPath = path.join(cacheRoot, entry.name, INFO_FILE);
    let info = null;
    try {
      info = JSON.parse(await fs.readFile(infoPath, 'utf8'));
    } catch {
      // 缺少或损坏的 info.json 仍作为一条占位记录返回，便于前端提示重建。
    }
    out.push({
      dir: entry.name,
      seq: parsed.seq,
      backend: parsed.backend,
      label: typeof info?.label === 'string' ? info.label : null,
      total: typeof info?.total === 'string' ? info.total : null,
      free: typeof info?.free === 'string' ? info.free : null,
      upQuota: typeof info?.upQuota === 'string' ? info.upQuota : null,
      downQuota: typeof info?.downQuota === 'string' ? info.downQuota : null,
      upRemaining: typeof info?.upRemaining === 'string' ? info.upRemaining : null,
      downRemaining: typeof info?.downRemaining === 'string' ? info.downRemaining : null,
      volumeId: typeof info?.volumeId === 'string' ? info.volumeId : null,
      drive: typeof info?.drive === 'string' ? info.drive : null,
      sourceHost: typeof info?.sourceHost === 'string' ? info.sourceHost : null,
      fileCount: typeof info?.fileCount === 'string' ? info.fileCount : null,
      totalSize: typeof info?.totalSize === 'string' ? info.totalSize : null,
      hasChildren: typeof info?.hasChildren === 'string' ? info.hasChildren : null,
      updatedAt: Number(info?.updatedAt) || 0,
      hasInfo: Boolean(info),
    });
  }
  out.sort((a, b) => a.backend.localeCompare(b.backend, 'en') || a.seq - b.seq);
  return out;
}

/** 原子写 info.json：临时文件 + rename，失败回退直接写。 */
async function writeInfoFile(target, doc) {
  const tmp = path.join(target, `.${INFO_FILE}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  const finalPath = path.join(target, INFO_FILE);
  try {
    await fs.rename(tmp, finalPath);
  } catch {
    await fs.writeFile(finalPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    await fs.unlink(tmp).catch(() => {});
  }
}

/** 校验目录名并解析为 cacheRoot 下的安全绝对路径，非法则抛 400。 */
function resolveEntryTarget(cacheRoot, dir) {
  const parsed = parseDirName(dir);
  if (!parsed) throw Object.assign(new Error('无效的目录名'), { status: 400 });
  const target = path.join(cacheRoot, String(dir));
  if (path.dirname(path.resolve(target)) !== path.resolve(cacheRoot)) {
    throw Object.assign(new Error('无效的目录名'), { status: 400 });
  }
  return { parsed, target };
}

/** 条目根目录：cached/<dir>。 */
export function entryDirPath(cacheRoot, dir) {
  const { target } = resolveEntryTarget(cacheRoot, dir);
  return target;
}

/** 真正的缓存内容目录 cached/<dir>/data；不存在则创建（兼容旧登记）。 */
export async function ensureDataDir(cacheRoot, dir) {
  const dataDir = path.join(entryDirPath(cacheRoot, dir), DATA_DIRNAME);
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

/** 登记一条网盘信息：分配序号、建目录与 data/ 子目录、原子写 info.json。 */
export async function saveEntry(cacheRoot, raw) {
  const info = sanitizeInfo(raw);
  await fs.mkdir(cacheRoot, { recursive: true });
  const seq = await nextSeq(cacheRoot, info.backend);
  const dir = `${info.backend}-${seq}`;
  const target = path.join(cacheRoot, dir);
  await fs.mkdir(target, { recursive: true });
  await fs.mkdir(path.join(target, DATA_DIRNAME), { recursive: true });
  const doc = {
    v: 1,
    backend: info.backend,
    label: info.label,
    total: info.total,
    free: info.free,
    upQuota: info.upQuota,
    downQuota: info.downQuota,
    upRemaining: info.upRemaining,
    downRemaining: info.downRemaining,
    volumeId: info.volumeId,
    drive: info.drive,
    sourceHost: info.sourceHost,
    fileCount: info.fileCount,
    totalSize: info.totalSize,
    hasChildren: info.hasChildren,
    updatedAt: Date.now(),
  };
  await writeInfoFile(target, doc);
  return { ...doc, dir, seq, hasInfo: true };
}

/**
 * 更新一条已有登记：保持目录名/序号不变（后端类型与目录绑定，强制沿用目录名里的值），
 * 只重写 info.json 的可编辑字段。目录不存在则 404。
 */
export async function updateEntry(cacheRoot, dir, raw) {
  const { parsed, target } = resolveEntryTarget(cacheRoot, dir);
  try {
    if (!(await fs.stat(target)).isDirectory()) throw new Error('not a directory');
  } catch {
    throw Object.assign(new Error('登记不存在'), { status: 404 });
  }
  const info = sanitizeInfo({ ...(raw || {}), backend: parsed.backend });
  const doc = {
    v: 1,
    backend: parsed.backend,
    label: info.label,
    total: info.total,
    free: info.free,
    upQuota: info.upQuota,
    downQuota: info.downQuota,
    upRemaining: info.upRemaining,
    downRemaining: info.downRemaining,
    volumeId: info.volumeId,
    drive: info.drive,
    sourceHost: info.sourceHost,
    fileCount: info.fileCount,
    totalSize: info.totalSize,
    hasChildren: info.hasChildren,
    updatedAt: Date.now(),
  };
  await writeInfoFile(target, doc);
  return { ...doc, dir: String(dir), seq: parsed.seq, hasInfo: true };
}

/** 删除一条登记：只接受合法的 <已知后端>-<序号> 目录名，且仅删缓存根的直接子目录。 */
export async function deleteEntry(cacheRoot, dir) {
  const { target } = resolveEntryTarget(cacheRoot, dir);
  await fs.rm(target, { recursive: true, force: true });
  return { dir: String(dir), removed: true };
}

/**
 * 从 zen-fs-config 同步下来的远端清单批量落地：按条目自带的 dir 原样建目录，
 * 不调用 nextSeq 重算序号（否则 Local-1 会被改写成别的号，和远端清单漂移）。
 * 已存在且 info.json 完好的条目跳过，不覆盖用户在本机做过的编辑。
 * 返回 { imported, skipped, invalid, entries }。
 */
export async function importEntries(cacheRoot, rawEntries) {
  const result = { imported: 0, skipped: 0, invalid: 0, entries: [] };
  const list = Array.isArray(rawEntries) ? rawEntries : [];
  await fs.mkdir(cacheRoot, { recursive: true });
  for (const raw of list) {
    const dir = String(raw?.dir || '');
    const parsed = parseDirName(dir);
    if (!parsed || parsed.backend !== String(raw?.backend || '')) {
      result.invalid += 1;
      continue;
    }
    let info;
    try {
      info = sanitizeInfo({ ...(raw || {}), backend: parsed.backend });
    } catch {
      result.invalid += 1;
      continue;
    }
    const target = path.join(cacheRoot, dir);
    const infoPath = path.join(target, INFO_FILE);
    // 已有完好的 info.json：视为已落地，跳过且不覆盖本机编辑。
    let existing = null;
    try {
      existing = JSON.parse(await fs.readFile(infoPath, 'utf8'));
    } catch {
      existing = null;
    }
    if (existing && existing.backend === parsed.backend) {
      result.skipped += 1;
      result.entries.push({ ...existing, dir, seq: parsed.seq, hasInfo: true, imported: false });
      continue;
    }
    const doc = {
      v: 1,
      backend: parsed.backend,
      label: info.label,
      total: info.total,
      free: info.free,
      upQuota: info.upQuota,
      downQuota: info.downQuota,
      upRemaining: info.upRemaining,
      downRemaining: info.downRemaining,
      // 沿用清单里的时间戳，便于两端对账；缺失时才用当前时间。
      updatedAt: Number(raw?.updatedAt) || Date.now(),
    };
    await fs.mkdir(path.join(target, DATA_DIRNAME), { recursive: true });
    await writeInfoFile(target, doc);
    result.imported += 1;
    result.entries.push({ ...doc, dir, seq: parsed.seq, hasInfo: true, imported: true });
  }
  return result;
}

/** 高层入口：返回缓存根与当前所有条目。 */
export async function readCache(options = {}) {
  const { codesRoot, cacheRoot } = await ensureCacheRoot(options);
  return { codesRoot, cacheRoot, entries: await listEntries(cacheRoot) };
}

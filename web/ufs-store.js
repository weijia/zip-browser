// /ufs/ 虚拟网盘的数据层。
//
// 新格式：一次「加入 ufs」一个目录根只写一份自包含 .jsonl bundle，
// 放在 /ufs/<加入年份>/ 下：
//   第 1 行  根目录摘要（名称、来源、文件数、总大小、是否部分不可读）
//   后续每行 一个目录/文件节点（扁平，用 rel 推导父子关系）
// 这样年份目录只用于物理分桶，不再按文件 mtime 把同一个目录拆到多个年份。
//
// 旧格式 /ufs/<年份>/ufs-*.json 分片保留只读兼容；新写入不再产生旧分片。
// 所有文件只新增、不改写，删除时直接删对应 bundle。

import { readText } from './data-group-fs.js';

export const UFS_ROOT = '/ufs';

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

export function yearOf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(n);
  const year = date.getFullYear();
  return year >= 1970 && year <= 9999 ? year : null;
}

/** 目录看加入年，文件看最后修改年；mtime 缺失/非法时退回加入年。 */
export function bucketYear(entry) {
  const added = yearOf(entry?.addedAt);
  if (entry?.type !== 'file') return added || new Date().getFullYear();
  return yearOf(entry?.mtime) || added || new Date().getFullYear();
}

export function entryId(source, name = '') {
  const src = source || {};
  switch (src.kind) {
    case 'local':
      return `local:${String(src.path || '').toLowerCase()}`;
    case 'zip':
      return `zip:${String(src.zipPath || '').toLowerCase()}#${String(src.entry || '')}`;
    case 'volume':
      return `vol:${String(src.volumeId || '')}/${String(src.rel || '')}`;
    default:
      return `${src.kind || 'unknown'}:${String(src.path || name)}`;
  }
}

/** 分片文件名：带时间与随机后缀，保证同名不撞、永不覆盖。 */
export function shardFileName(now = Date.now(), random = Math.random()) {
  const date = new Date(now);
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-`
    + `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const rand = Math.floor(random * 0xffffff).toString(16).padStart(6, '0');
  return `ufs-${stamp}-${rand}.json`;
}

export function shardPath(year, file = shardFileName()) {
  return `${UFS_ROOT}/${year}/${file}`;
}

export function makeEntry(raw, now = Date.now()) {
  const source = raw?.source && typeof raw.source === 'object' ? raw.source : null;
  if (!source) throw new Error('缺少来源');
  const type = raw.type === 'file' ? 'file' : 'dir';
  const name = String(raw.name || raw.label || '').trim();
  if (!name) throw new Error('缺少名称');
  const sizeValue = raw.size == null || raw.size === '' ? null : Number(raw.size);
  return {
    v: 1,
    id: raw.id || entryId(source, name),
    name,
    type,
    source,
    size: Number.isFinite(sizeValue) ? sizeValue : null,
    mtime: Number.isFinite(Number(raw.mtime)) && Number(raw.mtime) > 0 ? Number(raw.mtime) : null,
    addedAt: Number.isFinite(Number(raw.addedAt)) && Number(raw.addedAt) > 0 ? Number(raw.addedAt) : now,
    updatedAt: now,
  };
}

/** 合并同一年的多份分片；坏分片跳过，同 id 取 updatedAt 新的。 */
export function mergeShards(docs) {
  const byId = new Map();
  for (const doc of Array.isArray(docs) ? docs : []) {
    const entries = Array.isArray(doc?.entries) ? doc.entries : [];
    for (const entry of entries) {
      if (!entry || !entry.id || !entry.name) continue;
      const prev = byId.get(entry.id);
      if (!prev || Number(entry.updatedAt || 0) >= Number(prev.updatedAt || 0)) byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'zh-CN', { numeric: true });
  });
}

/** 数据组 fs 有的是 zen-fs 实例（直接方法），有的是 .promises 包装，统一取异步 API。 */
function io(fs) {
  return fs?.promises || fs;
}

function isMissing(err) {
  return err?.code === 'ENOENT' || /ENOENT|no such file/i.test(String(err?.message || ''));
}

/** StoreFS 的 recursive mkdir 不会把已存在的目录当成功，需自己吞掉 EEXIST。 */
function isExists(err) {
  return err?.code === 'EEXIST' || /already exists|已存在/i.test(String(err?.message || ''));
}

async function ensureDir(fp, path) {
  try {
    await fp.mkdir(path, { recursive: true });
  } catch (err) {
    if (!isExists(err)) throw err;
  }
}

async function readDir(fs, path) {
  try {
    return await io(fs).readdir(path);
  } catch (err) {
    if (isMissing(err)) return [];
    throw err;
  }
}

async function readJson(fs, path) {
  try {
    return JSON.parse(await readText(io(fs), path));
  } catch {
    return null;
  }
}

export async function listYears(fs) {
  const names = await readDir(fs, UFS_ROOT);
  return names
    .map(String)
    .filter((name) => /^\d{4}$/.test(name))
    .sort((a, b) => Number(b) - Number(a));
}

export async function readYear(fs, year) {
  const names = await readDir(fs, `${UFS_ROOT}/${year}`);
  const files = names.map(String).filter((name) => /^ufs-.*\.json$/i.test(name)).sort();
  const docs = [];
  let broken = 0;
  for (const name of files) {
    const doc = await readJson(fs, `${UFS_ROOT}/${year}/${name}`);
    if (doc) docs.push(doc);
    else broken += 1;
  }
  return { entries: mergeShards(docs), shards: files.length, broken, files };
}

// ---------------------------------------------------------------------------
// 新格式：/ufs/<年份>/ufs-*.jsonl
// ---------------------------------------------------------------------------

/** bundle 文件仍放进年份目录，但年份只按「加入时间」分桶。 */
export function bundleYear(entry) {
  return yearOf(entry?.addedAt) || new Date().getFullYear();
}

export function bundleFileName(now = Date.now(), random = Math.random()) {
  const date = new Date(now);
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-`
    + `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const rand = Math.floor(random * 0xffffff).toString(16).padStart(6, '0');
  return `ufs-${stamp}-${rand}.jsonl`;
}

export function bundlePath(year, file = bundleFileName()) {
  return `${UFS_ROOT}/${year}/${file}`;
}

export function nodeId(type, rel = '') {
  return `${type === 'file' ? 'f' : 'd'}:${String(rel || '').replace(/^\/+|\/+$/g, '')}`;
}

function parentRelOf(rel) {
  const parts = String(rel || '').split('/').filter(Boolean);
  return parts.slice(0, -1).join('/');
}

/** 节点保持扁平：父子关系由 rel 推导，不写 children。 */
export function normalizeBundleNode(raw) {
  const type = raw?.type === 'file' ? 'file' : 'dir';
  const rel = String(raw?.rel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const name = String(raw?.name || (rel ? rel.split('/').pop() : '')).trim();
  if (!name) throw new Error('节点缺少名称');
  const node = {
    type,
    id: String(raw?.id || nodeId(type, rel)),
    rel,
    name,
    parentId: raw?.parentId !== undefined ? raw.parentId : (rel ? nodeId('dir', parentRelOf(rel)) : null),
  };
  const mtime = Number(raw?.mtime);
  if (Number.isFinite(mtime) && mtime > 0) node.mtime = mtime;
  if (type === 'file') {
    const size = Number(raw?.size);
    node.size = Number.isFinite(size) ? size : null;
    if (typeof raw?.hash === 'string' && raw.hash) node.hash = raw.hash;
    if (raw?.hashError) node.hashError = String(raw.hashError).slice(0, 200);
  }
  if (raw?.partial) node.partial = true;
  return node;
}

/** 根条目 + 全部节点 → 一个 bundle 文档。 */
export function makeBundle(entry, nodes, { now = Date.now(), summary = null } = {}) {
  const list = (Array.isArray(nodes) ? nodes : []).map(normalizeBundleNode);
  if (!list.length) {
    list.push(normalizeBundleNode({
      type: entry.type,
      rel: '',
      name: entry.name,
      mtime: entry.mtime,
      size: entry.size,
    }));
  }
  const rootNodeId = nodeId(entry.type, '');
  const counted = {
    dirs: entry.type === 'dir' ? 1 : 0,
    files: entry.type === 'file' ? 1 : 0,
    size: entry.type === 'file' ? (Number(entry.size) || 0) : 0,
    partial: false,
    hashFailed: 0,
  };
  for (const node of list) {
    if (node.id === rootNodeId) continue;
    if (node.type === 'dir') counted.dirs += 1;
    else {
      counted.files += 1;
      counted.size += Number(node.size) || 0;
      if (node.hashError) counted.hashFailed += 1;
    }
    if (node.partial || node.hashError) counted.partial = true;
  }
  const finalSummary = summary && typeof summary === 'object' ? {
    dirs: Number.isFinite(Number(summary.dirs)) ? Number(summary.dirs) : counted.dirs,
    files: Number.isFinite(Number(summary.files)) ? Number(summary.files) : counted.files,
    size: Number.isFinite(Number(summary.size)) ? Number(summary.size) : counted.size,
    partial: Boolean(summary.partial) || counted.partial,
    hashFailed: Number.isFinite(Number(summary.hashFailed)) ? Number(summary.hashFailed) : counted.hashFailed,
  } : counted;
  return {
    v: 2,
    kind: 'ufs-bundle',
    id: entry.id,
    name: entry.name,
    type: entry.type,
    source: entry.source,
    addedAt: entry.addedAt,
    mtime: entry.mtime || null,
    rootNodeId,
    summary: finalSummary,
    createdAt: now,
    nodes: list,
  };
}

/** 第一行是 meta，后续一行一个节点；不把节点塞进大数组。 */
export function bundleText(bundle) {
  const meta = { ...bundle };
  delete meta.nodes;
  const lines = [JSON.stringify(meta)];
  for (const node of bundle.nodes || []) lines.push(JSON.stringify(node));
  return `${lines.join('\n')}\n`;
}

export async function writeBundle(fs, entry, nodes, { now = Date.now(), random = Math.random(), summary = null } = {}) {
  const bundle = makeBundle(entry, nodes, { now, summary });
  const fp = io(fs);
  const year = bundleYear(entry);
  const dir = `${UFS_ROOT}/${year}`;
  await ensureDir(fp, UFS_ROOT);
  await ensureDir(fp, dir);
  const path = bundlePath(year, bundleFileName(now, random));
  await fp.writeFile(path, bundleText(bundle));
  return { path, year, meta: bundle, summary: bundle.summary };
}

function decodeBytes(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value.text === 'function') return value.text();
  if (value instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(value));
  if (ArrayBuffer.isView(value)) return new TextDecoder('utf-8').decode(value);
  return String(value ?? '');
}

/** 尽量只读文件头；后端不支持 open/read 时退回 readFile。 */
async function readBundleHead(fs, path, limit = 16384) {
  const fp = io(fs);
  let handle = null;
  try {
    if (typeof fp.open === 'function') {
      handle = await fp.open(path, 'r');
      const buffer = new Uint8Array(limit);
      if (typeof handle?.read === 'function') {
        const result = await handle.read(buffer, 0, limit, 0);
        const bytes = typeof result === 'number' ? result : Number(result?.bytesRead);
        if (Number.isFinite(bytes) && bytes > 0) {
          const out = result?.buffer instanceof Uint8Array
            ? result.buffer.subarray(0, bytes)
            : buffer.subarray(0, bytes);
          return await decodeBytes(out);
        }
      }
    }
  } catch {
    // 某些后端不实现 open/read，退回整文件读取
  } finally {
    if (handle && typeof handle.close === 'function') await handle.close().catch(() => {});
  }
  return (await readText(fp, path)).slice(0, limit);
}

export async function readBundleMeta(fs, path) {
  const text = await readBundleHead(fs, path);
  const first = String(text || '').split(/\r?\n/, 1)[0];
  if (!first) return null;
  try {
    const meta = JSON.parse(first);
    return meta?.kind === 'ufs-bundle' && meta?.id ? meta : null;
  } catch {
    return null;
  }
}

export async function readBundle(fs, path) {
  const text = await readText(io(fs), path);
  const lines = String(text || '').split(/\r?\n/);
  let meta = null;
  let broken = 0;
  const nodes = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (index === 0) {
      try {
        meta = JSON.parse(line);
      } catch {
        return { meta: null, nodes: [], broken: 1, path };
      }
      continue;
    }
    try {
      const node = normalizeBundleNode(JSON.parse(line));
      nodes.push(node);
    } catch {
      broken += 1;
    }
  }
  return { meta, nodes, broken, path };
}

export async function listBundles(fs, year) {
  const names = await readDir(fs, `${UFS_ROOT}/${year}`);
  const files = names.map(String).filter((name) => /^ufs-.*\.jsonl$/i.test(name)).sort();
  const bundles = [];
  let broken = 0;
  for (const name of files) {
    const path = `${UFS_ROOT}/${year}/${name}`;
    const meta = await readBundleMeta(fs, path);
    if (meta) bundles.push({ ...meta, bundlePath: path });
    else broken += 1;
  }
  bundles.sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
  return { bundles, files, broken };
}

export async function listBundleYears(fs) {
  const names = await readDir(fs, UFS_ROOT);
  const years = names.map(String).filter((name) => /^\d{4}$/.test(name)).sort((a, b) => Number(b) - Number(a));
  const rows = [];
  for (const year of years) {
    const dir = `${UFS_ROOT}/${year}`;
    const entries = await readDir(fs, dir);
    const bundleCount = entries.map(String).filter((name) => /^ufs-.*\.jsonl$/i.test(name)).length;
    const legacyCount = entries.map(String).filter((name) => /^ufs-.*\.json$/i.test(name)).length;
    if (!bundleCount && !legacyCount) continue;
    rows.push({ year, bundles: bundleCount, legacy: legacyCount });
  }
  return rows;
}

export async function removeBundle(fs, path) {
  if (!String(path || '').startsWith(`${UFS_ROOT}/`)) return 0;
  try {
    await io(fs).unlink(path);
    return 1;
  } catch (err) {
    if (isMissing(err)) return 0;
    throw err;
  }
}

/** 批量加入：同一批里按归档年份分组，每个年份目录只写一份新分片。 */
export async function addEntries(fs, raws, { now = Date.now(), random = Math.random() } = {}) {
  const entries = (Array.isArray(raws) ? raws : []).map((raw) => makeEntry(raw, now));
  const byYear = new Map();
  for (const entry of entries) {
    const year = bucketYear(entry);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(entry);
  }
  const fp = io(fs);
  await ensureDir(fp, UFS_ROOT);
  const shards = [];
  let index = 0;
  for (const [year, group] of byYear) {
    await ensureDir(fp, `${UFS_ROOT}/${year}`);
    // 同一年只生成一份；年份目录不同，即使时间戳相同也不会互相覆盖。
    const path = shardPath(year, shardFileName(now, (random + index * 0.137) % 1));
    index += 1;
    await fp.writeFile(path, `${JSON.stringify({
      v: 1,
      year,
      entries: group,
      createdAt: now,
    }, null, 2)}\n`);
    shards.push({ year, path, count: group.length });
  }
  return { entries, shards };
}

/** 单条加入：内部仍走批量写分片，保持「每次加入生成新分片」的语义。 */
export async function addEntry(fs, raw, options = {}) {
  const result = await addEntries(fs, [raw], options);
  const entry = result.entries[0];
  return { entry, year: bucketYear(entry), path: result.shards[0].path };
}

/** 删除包含该 id 的所有分片文件（分片只增不改，所以直接删文件）。 */
export async function removeEntry(fs, id) {
  if (!id) return 0;
  const fp = io(fs);
  const years = await listYears(fs);
  let removed = 0;
  for (const year of years) {
    const { files } = await readYear(fs, year);
    for (const file of files) {
      const doc = await readJson(fs, `${UFS_ROOT}/${year}/${file}`);
      const hit = Array.isArray(doc?.entries) && doc.entries.some((entry) => entry?.id === id);
      if (!hit) continue;
      try {
        await fp.unlink(`${UFS_ROOT}/${year}/${file}`);
        removed += 1;
      } catch {
        // 单个分片删除失败不影响其它分片。
      }
    }
  }
  return removed;
}

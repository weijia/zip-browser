// 非本机卷的只读浏览数据层：数据组 /struct 的目录树（dir-struct-gen 的 folders）
// 与 /file-list 的文件列表。
//
// 读取口径：
//   * struct/<host>.json、struct/zip-browser.<host>.json 是主机索引（含 mounts[].files，
//     列出该卷在远端累积的全部分片基名）；struct/<volumeKey>.<时间戳>.json 是卷分片（children 树）。
//     同一 volumeId 的多份分片要合并成一棵树（目录取并集，文件属性按 updatedAt 取新）。
//   * file-list/<volumeKey>/<盘符>/<目录层级>/files.json 是该目录的文件列表（zip-browser 导出），
//     超长/非法路径会落到哈希回退片；读取时按 mirrorPathFor() 现算路径，再沿祖先目录找递归片。
//
// 这里只读数据组，不访问本地磁盘；解析结果有 2–5 分钟内存缓存。

import { getConnectedFs } from './manifest-sync.js';
import { readJson } from './data-group-fs.js';
import { sanitizeKey } from './manifest-export.js';
import { mirrorPathFor } from './file-list-export.js';

const SHARD_NAME_RE = /\.\d{10,}\.json$/i;
const TREE_TTL_MS = 5 * 60 * 1000;
const FILE_TTL_MS = 2 * 60 * 1000;
const RESOLVE_TTL_MS = 2 * 60 * 1000;
const treeCache = new Map();
const fileCache = new Map();
const indexCache = new Map(); // struct/<索引名>.json → { at, doc }：同一主机索引被多卷共用
const resolveCache = new Map(); // volumeId → { at, data }：分片基名/盘符解析结果

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}
function lower(value) {
  return text(value).trim().toLowerCase();
}
function baseName(file) {
  return text(file).replace(/\.json$/i, '');
}
function sortNodes(list) {
  return list.sort((a, b) => {
    const fa = a.type === 'file' ? 1 : 0;
    const fb = b.type === 'file' ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN', { numeric: true });
  });
}

/** 目录树节点克隆（只保留渲染需要 + 合并需要的字段）。 */
function cloneNode(node) {
  const out = { name: text(node.name), type: node.type === 'file' ? 'file' : 'folder' };
  for (const key of ['size', 'sizeOnDisk', 'fileCount', 'totalSize', 'totalSizeOnDisk', 'updatedAt', 'leaf', 'sizePartial', 'volumeId', 'tags']) {
    if (node[key] !== undefined && node[key] !== null) out[key] = node[key];
  }
  if (out.type === 'folder') out.children = [];
  return out;
}

function epochOf(node) {
  const value = node?.updatedAt;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function keepMax(current, value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(Number(current) || 0, n) : current;
}

/** 同名节点合并：目录 children 取并集；文件属性取更新的那份（updatedAt 大的为准）。 */
function mergeNode(into, node) {
  const tags = [...new Set([...(into.tags || []), ...(node.tags || [])])];
  if (tags.length) into.tags = tags;
  else delete into.tags;
  if (!into.volumeId && node.volumeId) into.volumeId = node.volumeId;
  if (node.sizePartial === true) into.sizePartial = true;
  if (into.type === 'folder') {
    into.fileCount = keepMax(into.fileCount, node.fileCount);
    into.totalSize = keepMax(into.totalSize, node.totalSize);
    into.totalSizeOnDisk = keepMax(into.totalSizeOnDisk, node.totalSizeOnDisk);
    // leaf 只有在所有分片都说「没有子目录」时才成立
    if (into.leaf === undefined) into.leaf = node.leaf;
    else if (node.leaf === false) into.leaf = false;
    into.children = mergeChildren([into.children || [], Array.isArray(node.children) ? node.children : []]);
    return;
  }
  const newer = epochOf(node) > epochOf(into);
  if (newer) {
    if (node.size !== undefined) into.size = node.size;
    if (node.sizeOnDisk !== undefined) into.sizeOnDisk = node.sizeOnDisk;
    if (node.updatedAt !== undefined) into.updatedAt = node.updatedAt;
  } else {
    if (into.size === undefined && node.size !== undefined) into.size = node.size;
    if (into.sizeOnDisk === undefined && node.sizeOnDisk !== undefined) into.sizeOnDisk = node.sizeOnDisk;
    if (into.updatedAt === undefined && node.updatedAt !== undefined) into.updatedAt = node.updatedAt;
  }
}

/**
 * 纯函数：多组 children 数组 → 合并后的 children（目录优先 + 名字排序）。
 * 目录取并集（某台机没扫到某目录也不抹掉别人的），文件按 updatedAt 取新。
 */
export function mergeChildren(lists) {
  const map = new Map();
  for (const list of Array.isArray(lists) ? lists : []) {
    for (const node of Array.isArray(list) ? list : []) {
      if (!node || !text(node.name)) continue;
      const key = `${node.type === 'file' ? 'file' : 'folder'}\u0000${text(node.name).toLowerCase()}`;
      const existing = map.get(key);
      if (existing) mergeNode(existing, node);
      else {
        const clone = cloneNode(node);
        if (clone.type === 'folder') clone.children = mergeChildren([Array.isArray(node.children) ? node.children : []]);
        map.set(key, clone);
      }
    }
  }
  return sortNodes([...map.values()]);
}

/** 纯函数：把同一 volumeId 的多份 struct 分片合并成一棵卷根节点（可能为 null）。 */
export function mergeStructTrees(docs) {
  const roots = (Array.isArray(docs) ? docs : []).filter((doc) => doc && typeof doc === 'object'
    && Array.isArray(doc.children));
  if (!roots.length) return null;
  const root = { name: '', type: 'folder', children: mergeChildren(roots.map((doc) => doc.children)) };
  for (const doc of roots) {
    if (!root.name && text(doc.name)) root.name = text(doc.name);
    if (!root.volumeId && doc.volumeId) root.volumeId = text(doc.volumeId);
    root.fileCount = keepMax(root.fileCount, doc.fileCount);
    root.totalSize = keepMax(root.totalSize, doc.totalSize);
    root.totalSizeOnDisk = keepMax(root.totalSizeOnDisk, doc.totalSizeOnDisk);
    if (doc.sizePartial === true) root.sizePartial = true;
    if (Array.isArray(doc.sources)) root.sources = [...new Set([...(root.sources || []), ...doc.sources.map(text).filter(Boolean)])];
    const at = epochOf(doc);
    if (at > epochOf(root)) root.updatedAt = doc.updatedAt;
  }
  return root;
}

/** 纯函数：按路径段（从卷根往下）找目录节点；找不到返回 null。 */
export function findTreeNode(children, segments) {
  let level = Array.isArray(children) ? children : [];
  let node = null;
  for (const segment of Array.isArray(segments) ? segments : []) {
    const hit = level.find((item) => item && item.type !== 'file' && text(item.name).toLowerCase() === lower(segment));
    if (!hit) return null;
    node = hit;
    level = Array.isArray(hit.children) ? hit.children : [];
  }
  return node || { name: '', type: 'folder', children: level, virtualRoot: true };
}

/** 读 struct/ 下的文件名；数据组未连接时抛错。 */
async function listStructNames(connected) {
  const names = await connected.fp.readdir(connected.pathFor('struct'));
  return (Array.isArray(names) ? names : []).map((name) => text(name).replace(/\/+$/, '')).filter((name) => /\.json$/i.test(name));
}

/** 读并缓存主机索引（多块卷共用同一个索引文件，避免逐卷重复读）。失败也缓存 null，短的 TTL 内不再重试。 */
async function readIndexDoc(connected, name) {
  const hit = indexCache.get(name);
  if (hit && Date.now() - hit.at < RESOLVE_TTL_MS) return hit.doc;
  let doc = null;
  try { doc = await readJson(connected.fp, connected.pathFor(`struct/${name}`)); } catch { doc = null; }
  indexCache.set(name, { at: Date.now(), doc });
  return doc;
}

/** 从主机索引里找该卷的分片基名；索引缺失时按文件名包含 volumeKey 回退。 */
export async function resolveShardBases(connected, names, volumeId) {
  const wanted = lower(volumeId);
  const key = sanitizeKey(volumeId);
  const bases = new Set();
  const sources = [];
  let drive = '';
  const indexNames = names.filter((name) => !SHARD_NAME_RE.test(name));
  for (const name of indexNames) {
    const doc = await readIndexDoc(connected, name);
    if (!Array.isArray(doc?.mounts)) continue;
    for (const mount of doc.mounts) {
      if (!mount || typeof mount !== 'object') continue;
      if (lower(mount.volumeId) !== wanted) continue;
      const files = Array.isArray(mount.files) ? mount.files : (mount.file ? [mount.file] : []);
      for (const file of files) {
        const base = baseName(typeof file === 'string' ? file : file?.file);
        if (base) bases.add(base);
      }
      if (text(mount.letter)) drive = text(mount.letter);
      if (text(doc.source)) sources.push(text(doc.source));
    }
  }
  if (!bases.size && key) {
    // 回退：分片/固定名里带 volumeKey 的都算（如 zip-browser.<host>.<key>.json）
    for (const name of names) {
      const base = baseName(name);
      if (base.toLowerCase().includes(key.toLowerCase())) bases.add(base);
    }
  }
  return { bases: [...bases].sort((a, b) => a.localeCompare(b)), sources: [...new Set(sources)], drive };
}

/**
 * 读某卷的目录树（合并全部分片）。
 * 返回 { ok, tree, name, drive, sources, bases, error }；tree 是卷根的子项数组。
 */
export async function loadVolumeTree(volumeId, { force = false } = {}) {
  const key = lower(volumeId);
  if (!key) return { ok: false, tree: [], error: '缺少 volumeId' };
  if (!force) {
    const hit = treeCache.get(key);
    if (hit && Date.now() - hit.at < TREE_TTL_MS) return hit.data;
  }
  const connected = getConnectedFs();
  if (!connected) return { ok: false, tree: [], error: '同步组未连接：请先在「同步收藏」面板连接数据组' };
  try {
    let resolved = resolveCache.get(key);
    if (!resolved || Date.now() - resolved.at >= RESOLVE_TTL_MS) {
      const names = await listStructNames(connected);
      resolved = { at: Date.now(), data: await resolveShardBases(connected, names, volumeId) };
      resolveCache.set(key, resolved);
    }
    const bases = resolved.data?.bases || [];
    const docs = [];
    for (const base of bases) {
      try {
        const doc = await readJson(connected.fp, connected.pathFor(`struct/${base}.json`));
        if (doc && typeof doc === 'object') docs.push(doc);
      } catch { /* 单个分片坏了不影响其它分片 */ }
    }
    const root = mergeStructTrees(docs);
    const data = {
      ok: Boolean(root),
      tree: root?.children || [],
      name: root?.name || '',
      drive: resolved.data?.drive || '',
      sources: resolved.data?.sources || [],
      bases,
      shardCount: docs.length,
      error: root ? '' : '数据组里没有这个卷的 struct 分片',
    };
    treeCache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    return { ok: false, tree: [], error: err?.message || String(err) };
  }
}

function normalizeRel(value) {
  return text(value).replace(/\\/g, '/').split('/').filter(Boolean).join('/');
}
function parentRel(hostRel) {
  const index = hostRel.lastIndexOf('/');
  return index < 0 ? '' : hostRel.slice(0, index);
}

/**
 * 读一个目录的 file-list 文件列表。
 * @param {object} options { volumeId, drive, rel }
 * rel 是卷根内的相对路径（不含盘符）。
 * 返回 { found, files, incomplete, truncated, dir, note }。
 */
export async function readDirFiles({ volumeId, drive, rel, force = false } = {}) {
  const key = `${lower(volumeId)}|${lower(drive)}|${normalizeRel(rel)}`;
  if (!force) {
    const hit = fileCache.get(key);
    if (hit && Date.now() - hit.at < FILE_TTL_MS) return hit.data;
  }
  const connected = getConnectedFs();
  if (!connected) return { found: false, files: [], note: '同步组未连接' };
  const volumeKey = text(volumeId);
  // 清单 / file-list 的 host-relative 路径都以「大写盘符 + 冒号」开头（C:/Users/...）。
  const driveLetter = text(drive).replace(/:$/, '').toUpperCase();
  if (!driveLetter || !/[A-Za-z]/.test(driveLetter)) return { found: false, files: [], note: '缺少盘符，无法定位 file-list' };
  const driveTag = `${driveLetter}:`;

  const segments = normalizeRel(rel).split('/').filter(Boolean);
  const wantedDir = `${driveTag}${segments.length ? `/${segments.join('/')}` : ''}`;
  const files = [];
  const seen = new Set();
  let found = false;
  let incomplete = false;
  let truncated = false;
  let dir = '';
  const warnings = [];

  // 先读当前目录自己的片，再沿祖先读递归导出的片（祖先片里也含本目录的直属文件）。
  for (let depth = segments.length; depth >= 0; depth -= 1) {
    const dirRel = segments.slice(0, depth).join('/');
    const hostRel = `${driveTag}${dirRel ? `/${dirRel}` : ''}`;
    const target = mirrorPathFor(hostRel, volumeKey);
    let doc;
    try {
      doc = await readJson(connected.fp, connected.pathFor(target.path));
    } catch {
      continue;
    }
    if (!doc || doc.removed) continue;
    found = true;
    dir = text(doc.dir);
    if (doc.incomplete === true) incomplete = true;
    if (doc.truncated === true) truncated = true;
    const want = wantedDir;
    for (const file of (Array.isArray(doc.files) ? doc.files : [])) {
      const path = text(file?.path);
      if (!path) continue;
      if (lower(parentRel(path)) !== lower(want)) continue;
      const id = lower(path);
      if (seen.has(id)) continue;
      seen.add(id);
      files.push({
        name: text(file.name) || path.split('/').pop(),
        path,
        size: Number(file.size) || 0,
        sizeOnDisk: Number(file.sizeOnDisk ?? file.size) || 0,
        mtime: Number(file.mtime) || 0,
        tags: Array.isArray(file.tags) ? file.tags : [],
      });
    }
    if (doc.fallbackPath === true) warnings.push('该目录文件列表落在哈希回退片');
  }

  // 卷根额外带一份手工加入的散文件。
  if (!segments.length) {
    try {
      const picked = await readJson(connected.fp, connected.pathFor(`file-list/${sanitizeKey(volumeKey)}/_picked.json`));
      if (picked && !picked.removed) {
        found = true;
        for (const file of (Array.isArray(picked.files) ? picked.files : [])) {
          const path = text(file?.path);
          if (!path) continue;
          const id = lower(path);
          if (seen.has(id)) continue;
          seen.add(id);
          files.push({
            name: text(file.name) || path.split('/').pop(),
            path,
            size: Number(file.size) || 0,
            sizeOnDisk: Number(file.sizeOnDisk ?? file.size) || 0,
            mtime: Number(file.mtime) || 0,
            tags: Array.isArray(file.tags) ? file.tags : [],
            picked: true,
          });
        }
      }
    } catch { /* 没有 _picked 片是常态 */ }
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
  const data = {
    found,
    files,
    incomplete,
    truncated,
    dir,
    note: found ? warnings.join('；') : '该目录没有导出文件列表，只有目录结构',
  };
  fileCache.set(key, { at: Date.now(), data });
  return data;
}

/** 清空缓存（数据组切换 / 重新写回后调用）。 */
export function invalidateVolumeTree() {
  treeCache.clear();
  fileCache.clear();
  indexCache.clear();
  resolveCache.clear();
}

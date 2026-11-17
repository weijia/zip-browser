// 目录清单 / 文件列表共用的物理扫描层（ESM，零第三方依赖）。
//
// 移植自 dir-struct-gen 的 buildTree + summary-core，但简化为「一次扫描产出三种结果」：
//   tree      目录树（含自动标签与体积汇总）→ struct 清单
//   files     每个选中根的文件元数据         → file-list 分片
//   summaries 每个目录的聚合值               → 兼容 dir-struct-gen 的 /api/summary 口径
//
// 安全边界：根路径必须 normalizeLocalPath + isPathAllowed（本次会话已浏览过）；
// 递归时跳过符号链接 / junction、用 realpath 链检测环、带深度上限与总超时，
// 读不到的分支标记 incomplete 且绝不记成 0。

import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';
import { detectTags } from './tag-rules.js';

export const MAX_SCAN_DEPTH = 24;
export const MAX_FILES_PER_DIR = 20000;
const CONCURRENCY = 8;
const HASH_CONCURRENCY = 4;
const HASH_CACHE_MAX = 100_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const SKIP_NAMES = new Set(['.dir-struct-id']);

// 只缓存成功计算出的完整内容 hash；key 带 size/mtime，文件一变就失效。
// 这是进程内缓存，不落盘；远端 file-list 里已经有最终 hash，不依赖它持久化。
const hashCache = new Map();

function hashCacheKey(abs, size, mtime) {
  return `${String(abs).toLowerCase()}\0${Number(size) || 0}\0${Number(mtime) || 0}`;
}

function recallHash(key) {
  const value = hashCache.get(key);
  if (value === undefined) return '';
  hashCache.delete(key);
  hashCache.set(key, value);
  return value;
}

function rememberHash(key, value) {
  if (hashCache.size >= HASH_CACHE_MAX) {
    const oldest = hashCache.keys().next().value;
    if (oldest !== undefined) hashCache.delete(oldest);
  }
  hashCache.set(key, value);
}

/** 流式 SHA-256，避免把大文件整体读进内存。 */
function sha256File(abs) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(abs);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`));
  });
}

/** 固定并发上限，避免 hash 把磁盘队列打满。 */
function createLimiter(limit) {
  let active = 0;
  const queue = [];
  const pump = () => {
    while (active < limit && queue.length) {
      const job = queue.shift();
      active += 1;
      Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    pump();
  });
}

async function hashFile(abs, stat) {
  const key = hashCacheKey(abs, stat?.size, stat?.mtime);
  const cached = recallHash(key);
  if (cached) return cached;
  const value = await sha256File(abs);
  rememberHash(key, value);
  return value;
}

function assertAllowed(abs) {
  if (!isPathAllowed(abs)) {
    throw new HttpError(403, '该目录未在本次会话中打开，拒绝扫描');
  }
}

/** 限制并发的 map，避免一次打开成千上万个目录句柄。 */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function statPair(abs) {
  const st = await fs.stat(abs);
  const size = typeof st.size === 'number' && Number.isFinite(st.size) ? st.size : 0;
  // Windows 下 Node/libuv 不给 st.blocks，按逻辑大小替代（格式文档口径）。
  const alloc = typeof st.blocks === 'number' && st.blocks >= 0 ? st.blocks * 512 : size;
  return { size, sizeOnDisk: alloc, mtime: Math.round(st.mtimeMs) };
}

async function scanDir(abs, depth, opts, visited) {
  const node = {
    path: abs,
    name: path.win32.basename(abs) || abs,
    tags: [],
    incomplete: false,
    children: [],
    files: [],
    summary: { fileCount: 0, totalSize: 0, totalSizeOnDisk: 0, partial: false },
  };
  if (opts.expired() || depth > opts.maxDepth) {
    node.incomplete = true;
    node.summary.partial = true;
    return node;
  }
  let real = abs;
  try { real = await fs.realpath(abs); } catch { /* 不可解析时按原路径比较 */ }
  if (visited.has(real)) {
    node.incomplete = true;
    node.summary.partial = true;
    return node;
  }
  visited.add(real);
  try {
    try {
      const self = await fs.stat(abs);
      node.mtime = Math.round(self.mtimeMs);
    } catch { /* 目录自身 mtime 取不到就省略，不记 0 */ }
    let dirents;
    try {
      dirents = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      node.incomplete = true;
      node.summary.partial = true;
      return node;
    }
    node.tags = detectTags(dirents.map((dirent) => dirent.name));
    const dirs = [];
    const files = [];
    for (const dirent of dirents) {
      if (SKIP_NAMES.has(dirent.name) || dirent.isSymbolicLink()) continue;
      const full = path.win32.join(abs, dirent.name);
      if (dirent.isDirectory()) dirs.push({ name: dirent.name, full });
      else if (dirent.isFile()) files.push({ name: dirent.name, full });
    }
    let partial = false;
    const results = await mapLimit(files, opts.hash ? 2 : CONCURRENCY, async (file) => {
      if (opts.expired()) return null;
      try {
        const stat = await statPair(file.full);
        const row = {
          path: file.full,
          name: file.name,
          size: stat.size,
          sizeOnDisk: stat.sizeOnDisk,
          mtime: stat.mtime,
        };
        if (opts.hash) {
          if (opts.expired()) {
            row.hashError = 'scan timeout';
          } else {
            try {
              row.hash = await opts.hashLimit(() => hashFile(file.full, stat));
            } catch (err) {
              row.hashError = String(err?.message || err || 'hash failed').slice(0, 160);
            }
          }
        }
        return { ...file, stat, row };
      } catch {
        return null;
      }
    });
    let fileCount = 0;
    let totalSize = 0;
    let totalSizeOnDisk = 0;
    let hashFailed = false;
    for (const result of results) {
      if (!result) { partial = true; continue; }
      node.files.push(result.row);
      if (result.row.hashError) hashFailed = true;
      fileCount += 1;
      totalSize += result.row.size;
      totalSizeOnDisk += result.row.sizeOnDisk;
    }
    node.hashPartial = hashFailed;
    if (opts.descend) {
      const subs = await mapLimit(dirs, CONCURRENCY, (dir) => scanDir(dir.full, depth + 1, opts, visited));
      for (const sub of subs) {
        node.children.push(sub);
        fileCount += sub.summary.fileCount;
        totalSize += sub.summary.totalSize;
        totalSizeOnDisk += sub.summary.totalSizeOnDisk;
        if (sub.incomplete) { node.incomplete = true; partial = true; }
        if (sub.summary.partial) partial = true;
        if (sub.hashPartial) node.hashPartial = true;
      }
    }
    node.summary = { fileCount, totalSize, totalSizeOnDisk, partial: partial || node.incomplete };
  } finally {
    visited.delete(real);
  }
  return node;
}

/**
 * 精简树：去掉 files（单独返回），保留 struct 需要的字段。
 * emitDepth 控制「清单里出现几层子目录」，不影响体积统计：
 *   Infinity = 整棵子树；1 = 只输出根的直接子目录（每个子目录的 children 为空）。
 * 体积一律按整棵物理子树算（dir-struct-gen 口径），靠 sizeFull 让扫描仍下钻。
 */
function serializeTree(node, depth = 0, emitDepth = Infinity) {
  return {
    path: node.path,
    name: node.name,
    type: 'folder',
    tags: node.tags,
    mtime: node.mtime,
    sizePartial: node.summary.partial,
    fileCount: node.summary.fileCount,
    totalSize: node.summary.totalSize,
    totalSizeOnDisk: node.summary.totalSizeOnDisk,
    children: depth < emitDepth
      ? node.children.map((child) => serializeTree(child, depth + 1, emitDepth))
      : [],
  };
}

function collectSummaries(node, out) {
  out[node.path] = { ...node.summary };
  for (const child of node.children) collectSummaries(child, out);
}

/** 文件列表只收「清单展示层」的文件：仅本层时不把子孙目录的文件算进来。 */
function collectFiles(node, out, depth = 0, emitDepth = Infinity) {
  for (const file of node.files) out.push(file);
  if (depth + 1 < emitDepth) {
    for (const child of node.children) collectFiles(child, out, depth + 1, emitDepth);
  }
}

/**
 * 一次扫描多个用户勾选的根目录。
 * paths 元素可以是字符串（用全局 recursive），也可以是 { path, recursive }（逐目录覆盖，
 * 对应 dir-struct-gen 的「⊕ 含子目录」开关）。
 * sizeFull=true 时即使某目录只要一层，也递归扫完子孙以算出整棵子树体积。
 * @returns {{roots:Array, summaries:object, files:object, status:object}}
 *   files[path] 为该根下按路径去重排序后的文件列表；status[path] 带 incomplete/truncated。
 */
export async function scanPaths(paths, {
  recursive = true, sizeFull = false, timeoutMs = DEFAULT_TIMEOUT_MS,
  maxFiles = MAX_FILES_PER_DIR, hash = false,
} = {}) {
  const list = Array.isArray(paths) ? paths.slice(0, 100) : [];
  const deadline = Date.now() + Math.max(1000, Math.min(timeoutMs, 120_000));
  const hashLimit = hash ? createLimiter(HASH_CONCURRENCY) : null;
  const baseOpts = {
    expired: () => Date.now() > deadline,
    maxDepth: MAX_SCAN_DEPTH,
    descend: recursive,
    hash: hash === true,
    hashLimit,
  };
  const roots = [];
  const summaries = {};
  const files = {};
  const status = {};
  for (const raw of list) {
    const entry = raw && typeof raw === 'object' ? raw : { path: raw };
    const abs = normalizeLocalPath(entry.path);
    assertAllowed(abs);
    const wantRecursive = typeof entry.recursive === 'boolean'
      ? entry.recursive
      : recursive !== false;
    const emitDepth = wantRecursive ? Infinity : 1;
    // 体积口径与展示层数解耦：只要一层也要把整棵子树走一遍才能报准 totalSize。
    // sizeFull 可逐根覆盖，避免「struct 要算体积」连带把 file-list 的根也递归扫一遍。
    const rootSizeFull = typeof entry.sizeFull === 'boolean' ? entry.sizeFull : sizeFull;
    const opts = { ...baseOpts, descend: wantRecursive || rootSizeFull, emitDepth };
    const node = await scanDir(abs, 0, opts, new Set());
    roots.push(serializeTree(node, 0, emitDepth));
    collectSummaries(node, summaries);
    const gathered = [];
    collectFiles(node, gathered, 0, emitDepth);
    const seen = new Set();
    const unique = [];
    for (const file of gathered) {
      const key = file.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(file);
    }
    unique.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));
    const truncated = unique.length > maxFiles;
    files[abs] = truncated ? unique.slice(0, maxFiles) : unique;
    status[abs] = { incomplete: node.incomplete, truncated, total: unique.length };
    if (hash) status[abs].hashPartial = node.hashPartial === true;
  }
  return { roots, summaries, files, status };
}

/** 勾选树的一层：只列直接子目录，不递归、不 stat 文件。 */
export async function listTreeLevel(input) {
  const abs = normalizeLocalPath(input);
  assertAllowed(abs);
  let dirents;
  try {
    dirents = await fs.readdir(abs, { withFileTypes: true });
  } catch (err) {
    throw new HttpError(403, `cannot open directory: ${err.message}`);
  }
  const childDirs = dirents
    .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink() && !SKIP_NAMES.has(dirent.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  // 提前探测每个直接子目录是否还有下一层，避免 UI 给空目录画一个点开才知道是空的箭头。
  // 读不到时返回 null，前端按“未知”处理，不把可能非空的目录误标成空。
  const children = await mapLimit(childDirs, CONCURRENCY, async (dirent) => {
    const childPath = path.win32.join(abs, dirent.name);
    let hasChildren = null;
    try {
      const entries = await fs.readdir(childPath, { withFileTypes: true });
      hasChildren = entries.some(
        (entry) => entry.isDirectory() && !entry.isSymbolicLink() && !SKIP_NAMES.has(entry.name),
      );
    } catch {
      hasChildren = null;
    }
    return { name: dirent.name, path: childPath, hasChildren };
  });
  return {
    path: abs,
    name: path.win32.basename(abs) || abs,
    tags: detectTags(dirents.map((dirent) => dirent.name)),
    children,
  };
}

/** 批量补 mtime（读不到的路径省略，绝不记 0）。 */
export async function readMtimes(paths) {
  const out = {};
  const list = Array.isArray(paths) ? paths.slice(0, 5000) : [];
  await mapLimit(list, 16, async (raw) => {
    let abs;
    try { abs = normalizeLocalPath(raw); } catch { return; }
    if (!isPathAllowed(abs)) return;
    try {
      const st = await fs.stat(abs);
      out[abs] = Math.round(st.mtimeMs);
    } catch { /* 不可读：省略 */ }
  });
  return out;
}

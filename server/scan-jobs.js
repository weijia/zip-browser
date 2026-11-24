// 目录体积/树扫描的长任务层。
//
// 目的：不再让一个 HTTP 请求把整棵大目录扫完才回包。任务在后台推进，
// 前端通过一条 NDJSON 流拿进度；目录记录按批次追加到本机缓存，不写同步组。
//
// 缓存位置固定在用户本机的 LOCALAPPDATA（或 XDG cache），与 ZenFS 数据组无关。
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';

export const MAX_SCAN_DEPTH = 24;
const FILE_CONCURRENCY = 16;
const FILE_BATCH = 256;
const DIR_BATCH = 200;
const EVENT_LIMIT = 2000;
const DEFAULT_MAX_PATHS = 40;
const SUMMARY_TTL_MS = 2 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_JOBS = 8;
const SKIP_NAMES = new Set(['.dir-struct-id']);

const jobs = new Map();
const summaryCache = new Map(); // 根路径 + mtime -> 最近一次完整统计
let cacheRootPromise = null;

function assertAllowed(abs) {
  if (!isPathAllowed(abs)) throw new HttpError(403, '该目录未在本次会话中打开，拒绝扫描');
}

function clampDepth(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return MAX_SCAN_DEPTH;
  return Math.max(1, Math.min(MAX_SCAN_DEPTH, Math.floor(n)));
}

function cacheRoot() {
  const base = process.env.LOCALAPPDATA
    || process.env.XDG_CACHE_HOME
    || path.join(os.homedir(), '.cache');
  return path.join(base, 'zip-browser', 'scan-cache');
}

async function ensureCacheRoot() {
  if (!cacheRootPromise) {
    cacheRootPromise = fs.mkdir(cacheRoot(), { recursive: true }).then(() => cacheRoot());
  }
  return cacheRootPromise;
}

function jobPaths() {
  const files = new Set();
  // 只保护正在跑的任务；已完成任务的快照按 TTL/容量淘汰。
  for (const [id, job] of jobs) {
    if (job.state !== 'running') continue;
    files.add(`${id}.jsonl`);
    files.add(`${id}.json`);
  }
  return files;
}

/** 清理本机过期快照；正在跑的任务不删。 */
async function pruneCache(root) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  const active = jobPaths();
  const metas = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));
  const rows = [];
  for (const entry of metas) {
    if (active.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    try {
      const stat = await fs.stat(full);
      rows.push({ name: entry.name, full, at: stat.mtimeMs });
    } catch {
      // 读不到的旧条目忽略
    }
  }
  rows.sort((a, b) => b.at - a.at);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (index < CACHE_MAX_JOBS && Date.now() - row.at <= CACHE_TTL_MS) continue;
    try {
      await fs.unlink(row.full);
      await fs.unlink(row.full.replace(/\.json$/, '.jsonl')).catch(() => {});
    } catch {
      // 清理失败不影响新任务
    }
  }
}

function cacheKey(abs, mtime) {
  return `${String(abs).toLowerCase()}\0${Number(mtime) || 0}`;
}

async function rootMtime(abs) {
  try {
    const stat = await fs.stat(abs);
    return Number(stat.mtimeMs) || 0;
  } catch {
    return 0;
  }
}

function pushEvent(job, payload) {
  const event = { seq: job.seq + 1, ...payload };
  job.seq = event.seq;
  job.events.push(event);
  if (job.events.length > EVENT_LIMIT) {
    const removed = job.events.shift();
    job.minSeq = removed?.seq || job.minSeq;
  }
  for (const subscriber of job.subscribers) {
    try { subscriber(event); } catch { /* 单个连接异常不能拖垮任务 */ }
  }
  if (!job.cleanupTimer && (event.type === 'done' || event.type === 'cancelled' || event.type === 'error')) {
    // 完成态继续保留 10 分钟，便于断线重连；之后释放内存，本机快照仍在。
    job.cleanupTimer = setTimeout(() => {
      job.subscribers.clear();
      jobs.delete(job.id);
    }, 10 * 60 * 1000);
    job.cleanupTimer.unref?.();
  }
  return event;
}

function rememberSummary(key, result) {
  if (!key) return;
  summaryCache.delete(key);
  summaryCache.set(key, { at: Date.now(), result });
  if (summaryCache.size > 200) {
    const oldest = summaryCache.keys().next().value;
    if (oldest !== undefined) summaryCache.delete(oldest);
  }
}

function finalEvent(job) {
  if (job.state === 'done') {
    return { seq: job.seq, type: 'done', results: job.results, elapsedMs: job.endedAt - job.startedAt, cached: job.cached };
  }
  if (job.state === 'cancelled') {
    return { seq: job.seq, type: 'cancelled', progress: job.progress, elapsedMs: Date.now() - job.startedAt };
  }
  if (job.state === 'error') {
    return { seq: job.seq, type: 'error', error: job.error || 'scan failed', progress: job.progress };
  }
  return null;
}

function emitProgress(job, force = false) {
  const now = Date.now();
  if (!force && now - job.lastProgressAt < 150) return;
  job.lastProgressAt = now;
  pushEvent(job, {
    type: 'progress',
    dirs: job.progress.dirs,
    files: job.progress.files,
    bytes: job.progress.bytes,
    current: job.progress.current,
    elapsedMs: now - (job.startedAt || now),
  });
}

async function appendLines(handle, lines) {
  if (!lines.length) return;
  const text = `${lines.join('\n')}\n`;
  lines.length = 0;
  await handle.write(text);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
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

async function statFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    const size = Number(stat.size) || 0;
    const onDisk = typeof stat.blocks === 'number' && stat.blocks >= 0 ? stat.blocks * 512 : size;
    return { size, onDisk };
  } catch {
    return null;
  }
}

/**
 * 递归统计一个根目录。所有文件都会遍历；目录记录按批写本机 JSONL。
 * 不缓存文件路径清单，只保留聚合结果，避免大目录把服务端内存吃满。
 */
async function walkRoot(job, rootAbs, handle, lines) {
  const deadline = job.timeoutMs > 0 ? Date.now() + job.timeoutMs : Infinity;
  const summary = { path: rootAbs, fileCount: 0, totalSize: 0, totalSizeOnDisk: 0, partial: false, dirs: 0 };
  const queue = [{ abs: rootAbs, depth: 0, parent: '' }];
  let cursor = 0;
  while (cursor < queue.length) {
    if (job.cancelled) return { ...summary, cancelled: true };
    if (Date.now() > deadline) {
      summary.partial = true;
      summary.timedOut = true;
      break;
    }
    const dir = queue[cursor];
    cursor += 1;
    if (cursor > 200) {
      // 已出队的节点不再保留，BFS 队列随扫描推进释放内存。
      queue.splice(0, cursor);
      cursor = 0;
    }
    job.progress.current = dir.abs;
    let dirents;
    try {
      dirents = await fs.readdir(dir.abs, { withFileTypes: true });
    } catch {
      summary.partial = true;
      lines.push(JSON.stringify({
        path: dir.abs, parent: dir.parent, depth: dir.depth,
        fileCount: 0, totalSize: 0, totalSizeOnDisk: 0, partial: true,
      }));
      job.progress.dirs += 1;
      emitProgress(job);
      continue;
    }
    const files = [];
    const subdirs = [];
    for (const entry of dirents) {
      if (SKIP_NAMES.has(entry.name) || entry.isSymbolicLink()) continue;
      const full = path.win32.join(dir.abs, entry.name);
      if (entry.isDirectory()) {
        if (dir.depth + 1 > job.maxDepth) {
          summary.partial = true;
        } else {
          subdirs.push({ abs: full, depth: dir.depth + 1, parent: dir.abs });
        }
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
    let dirFiles = 0;
    let dirSize = 0;
    let dirOnDisk = 0;
    let dirPartial = false;
    for (let offset = 0; offset < files.length; offset += FILE_BATCH) {
      if (job.cancelled) return { ...summary, cancelled: true };
      if (Date.now() > deadline) {
        dirPartial = true;
        summary.partial = true;
        summary.timedOut = true;
        break;
      }
      const chunk = files.slice(offset, offset + FILE_BATCH);
      const stats = await mapLimit(chunk, FILE_CONCURRENCY, (full) => statFile(full));
      for (const stat of stats) {
        if (!stat) { dirPartial = true; summary.partial = true; continue; }
        dirFiles += 1;
        dirSize += stat.size;
        dirOnDisk += stat.onDisk;
        summary.fileCount += 1;
        summary.totalSize += stat.size;
        summary.totalSizeOnDisk += stat.onDisk;
      }
      job.progress.files += chunk.filter((_, index) => stats[index]).length;
      job.progress.bytes += stats.reduce((sum, stat) => sum + (stat ? stat.size : 0), 0);
      emitProgress(job);
    }
    summary.dirs += 1;
    job.progress.dirs += 1;
    lines.push(JSON.stringify({
      path: dir.abs,
      parent: dir.parent,
      depth: dir.depth,
      fileCount: dirFiles,
      totalSize: dirSize,
      totalSizeOnDisk: dirOnDisk,
      partial: dirPartial,
    }));
    for (const sub of subdirs) queue.push(sub);
    if (lines.length >= DIR_BATCH) await appendLines(handle, lines);
    emitProgress(job);
  }
  if (lines.length) await appendLines(handle, lines);
  return summary;
}

async function runJob(job) {
  let handle = null;
  const lines = [];
  try {
    const root = await ensureCacheRoot();
    await pruneCache(root);
    handle = await fs.open(job.cacheFile, 'a');
    for (const abs of job.paths) {
      if (job.cancelled) break;
      job.progress.current = abs;
      const result = await walkRoot(job, abs, handle, lines);
      if (result.cancelled) break;
      delete result.cancelled;
      job.results.push(result);
      if (!result.partial && !result.timedOut) {
        rememberSummary(job.cacheKeys[abs] || '', result);
      }
    }
    if (handle) await appendLines(handle, lines);
    await handle?.close();
    handle = null;
    if (job.cancelled) {
      job.state = 'cancelled';
      job.endedAt = Date.now();
      pushEvent(job, { type: 'cancelled', progress: job.progress, elapsedMs: job.endedAt - job.startedAt });
      return;
    }
    job.state = 'done';
    job.endedAt = Date.now();
    await fs.writeFile(job.metaFile, JSON.stringify({
      id: job.id,
      paths: job.paths,
      results: job.results,
      createdAt: job.createdAt,
      endedAt: job.endedAt,
      cacheFile: job.cacheFile,
    }, null, 2)).catch(() => {});
    pushEvent(job, {
      type: 'done',
      results: job.results,
      elapsedMs: job.endedAt - job.startedAt,
      cached: false,
    });
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    if (job.cancelled) {
      job.state = 'cancelled';
      pushEvent(job, { type: 'cancelled', progress: job.progress, elapsedMs: Date.now() - job.startedAt });
    } else {
      job.state = 'error';
      job.error = String(err?.message || err || 'scan failed');
      pushEvent(job, { type: 'error', error: job.error, progress: job.progress });
    }
  }
}

function newJob({ paths, cacheKeys, timeoutMs, maxDepth, cachedResults = null }) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const root = cacheRoot();
  const job = {
    id,
    paths,
    cacheKeys,
    timeoutMs,
    maxDepth,
    state: cachedResults ? 'done' : 'running',
    createdAt: now,
    startedAt: now,
    endedAt: cachedResults ? now : null,
    cacheFile: path.join(root, `${id}.jsonl`),
    metaFile: path.join(root, `${id}.json`),
    cached: Boolean(cachedResults),
    results: cachedResults || [],
    progress: { dirs: 0, files: 0, bytes: 0, current: paths[0] || '' },
    events: [],
    seq: 0,
    minSeq: 1,
    lastProgressAt: 0,
    subscribers: new Set(),
    cancelled: false,
  };
  jobs.set(id, job);
  return job;
}

/**
 * 启动扫描任务。全量递归仍然执行；返回 jobId，不等待扫描结束。
 * 命中 2 分钟内的同路径完整统计时直接返回完成态任务，避免重复扫。
 */
export async function startScanJob(rawPaths, opts = {}) {
  const list = (Array.isArray(rawPaths) ? rawPaths : []).slice(0, DEFAULT_MAX_PATHS);
  if (!list.length) throw new HttpError(400, '缺少要扫描的目录');
  const paths = [];
  const cacheKeys = {};
  for (const raw of list) {
    const abs = normalizeLocalPath(typeof raw === 'string' ? raw : raw?.path);
    assertAllowed(abs);
    if (paths.includes(abs)) continue;
    paths.push(abs);
    cacheKeys[abs] = cacheKey(abs, await rootMtime(abs));
  }
  if (!paths.length) throw new HttpError(400, '没有可扫描的目录');
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
  const maxDepth = clampDepth(opts.maxDepth);

  if (opts.refresh !== true) {
    let cached = null;
    for (const abs of paths) {
      const hit = summaryCache.get(cacheKeys[abs]);
      if (!hit || Date.now() - hit.at > SUMMARY_TTL_MS) { cached = null; break; }
      cached = cached || [];
      cached.push({ ...hit.result });
    }
    if (cached && cached.length === paths.length) {
      const job = newJob({ paths, cacheKeys, timeoutMs, maxDepth, cachedResults: cached });
      pushEvent(job, {
        type: 'done', results: job.results, elapsedMs: 0, cached: true,
      });
      return { jobId: job.id, cached: true };
    }
  }

  const job = newJob({ paths, cacheKeys, timeoutMs, maxDepth });
  setImmediate(() => { runJob(job).catch(() => {}); });
  return { jobId: job.id, cached: false };
}

export function getScanJob(id) {
  return jobs.get(String(id || '')) || null;
}

export function scanJobStatus(id) {
  const job = jobs.get(String(id || ''));
  if (!job) throw new HttpError(404, 'scan job not found');
  return {
    id: job.id,
    state: job.state,
    cached: job.cached,
    createdAt: job.createdAt,
    endedAt: job.endedAt,
    progress: job.progress,
    results: job.results,
    error: job.error || null,
    cacheFile: job.cacheFile,
  };
}

export function cancelScanJob(id) {
  const job = jobs.get(String(id || ''));
  if (!job) throw new HttpError(404, 'scan job not found');
  if (job.state === 'done' || job.state === 'cancelled' || job.state === 'error') {
    return { ok: true, state: job.state };
  }
  job.cancelled = true;
  return { ok: true, state: 'cancelling' };
}

/** 一条长连接推送进度与最终结果；前端断线可用 cursor 续读。 */
export async function streamScanJob(req, res, id, url) {
  const job = jobs.get(String(id || ''));
  if (!job) throw new HttpError(404, 'scan job not found');
  const cursor = Math.max(0, Number(url.searchParams.get('cursor')) || 0);
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  let alive = true;
  let unsubscribe = () => {};
  let heartbeat = null;
  const cleanup = () => {
    if (!alive) return;
    alive = false;
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe();
    req.off('close', cleanup);
    try { res.end(); } catch { /* 已断开 */ }
  };
  const send = (event) => {
    if (!alive) return;
    try {
      res.write(`${JSON.stringify(event)}\n`);
    } catch {
      cleanup();
    }
  };

  req.on('close', cleanup);
  unsubscribe = (() => {
    const handler = (event) => {
      send(event);
      if (event.type === 'done' || event.type === 'cancelled' || event.type === 'error') {
        setTimeout(cleanup, 0);
      }
    };
    job.subscribers.add(handler);
    return () => job.subscribers.delete(handler);
  })();

  // 续读：发送 cursor 之后的已有事件。事件被淘汰过就只给当前进度，前端继续等后续。
  if (cursor && cursor < job.minSeq - 1) {
    send({ seq: job.seq, type: 'reset', progress: job.progress, state: job.state });
  }
  for (const event of job.events) {
    if (event.seq > cursor) send(event);
  }
  const terminal = job.state === 'done' || job.state === 'cancelled' || job.state === 'error';
  if (terminal) {
    const final = finalEvent(job);
    if (final && !job.events.some((event) => event.seq > cursor && event.type === final.type)) send(final);
    setTimeout(cleanup, 0);
    return;
  }
  heartbeat = setInterval(() => {
    send({ seq: job.seq, type: 'ping', progress: job.progress });
  }, 15000);
}

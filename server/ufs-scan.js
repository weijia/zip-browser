// UFS 目录采集：一次请求递归扫完一个目录，按批流式返回目录/文件节点。
//
// 目标不是复用 /api/list 的逐目录请求，而是避免大目录把前端请求打爆：
// - 目录记录直接推给前端，前端只负责拼扁平节点；
// - 文件内容用流式 SHA-256，并发固定，避免把磁盘队列打满；
// - 整个过程走一条 NDJSON 响应，进度持续可见，客户端断开就停止。
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import path from 'node:path';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';

export const UFS_MAX_DEPTH = 24;
const FILE_CONCURRENCY = 4;
const FILE_BATCH = 128;
const PROGRESS_INTERVAL_MS = 180;
const SKIP_NAMES = new Set(['.dir-struct-id']);

export async function hashLocalFile(input) {
  const abs = normalizeLocalPath(input);
  if (!isPathAllowed(abs)) throw new HttpError(403, '该文件未在本次会话中打开，拒绝计算 hash');
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch (err) {
    throw new HttpError(err?.code === 'ENOENT' ? 404 : 403, `cannot open file: ${err.message}`);
  }
  if (!stat.isFile()) throw new HttpError(400, '只接受文件');
  return {
    path: abs,
    name: path.win32.basename(abs) || abs,
    size: Number(stat.size) || 0,
    mtime: Number(stat.mtimeMs) || null,
    hash: await sha256File(abs),
  };
}

function sha256File(abs, signal) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(abs, signal ? { signal } : undefined);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`));
  });
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

function relOf(abs, root) {
  const relative = path.relative(root, abs).replace(/\\/g, '/');
  return relative === '' ? '' : relative;
}

function baseName(abs) {
  return path.win32.basename(abs) || abs;
}

function abortError() {
  const err = new Error('ufs scan aborted');
  err.name = 'AbortError';
  return err;
}

/**
 * 采集一个本地目录，事件格式：
 *   { type:'start', root:{ path,name,mtime } }
 *   { type:'dirs', rows:[{ type:'dir', rel, name, mtime, partial? }] }
 *   { type:'files', rows:[{ type:'file', rel, name, size, mtime, hash?, hashError? }] }
 *   { type:'progress', dirs, files, bytes, current }
 * 返回值是 summary，供调用方写 bundle 首页。
 */
export async function collectUfsTree(root, {
  onEvent = async () => {},
  signal,
  maxDepth = UFS_MAX_DEPTH,
  concurrency = FILE_CONCURRENCY,
} = {}) {
  const absRoot = normalizeLocalPath(root);
  let rootStat;
  try {
    rootStat = await fs.stat(absRoot);
  } catch (err) {
    throw new HttpError(err?.code === 'ENOENT' ? 404 : 403, `cannot open directory: ${err.message}`);
  }
  if (!rootStat.isDirectory()) throw new HttpError(400, 'UFS 目录采集只接受目录');

  const summary = {
    dirs: 0,
    files: 0,
    size: 0,
    partial: false,
    hashFailed: 0,
  };
  const visited = new Set();
  let lastProgressAt = 0;
  let current = absRoot;

  const ensureLive = () => {
    if (signal?.aborted) throw abortError();
  };

  const emit = async (event) => {
    ensureLive();
    await onEvent(event);
  };

  const progress = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    await emit({
      type: 'progress',
      dirs: summary.dirs,
      files: summary.files,
      bytes: summary.size,
      current,
    });
  };

  const walk = async (abs, rel, depth, isRoot = false) => {
    ensureLive();
    if (depth > maxDepth) {
      summary.partial = true;
      return;
    }
    let real = abs;
    try { real = await fs.realpath(abs); } catch { /* 不可解析时按原路径比较 */ }
    const visitKey = String(real).toLowerCase();
    if (visited.has(visitKey)) {
      summary.partial = true;
      return;
    }
    visited.add(visitKey);
    try {
      let mtime = null;
      try {
        const stat = await fs.stat(abs);
        mtime = Number(stat.mtimeMs) || null;
      } catch {
        summary.partial = true;
      }

      summary.dirs += 1;
      let dirents;
      try {
        dirents = await fs.readdir(abs, { withFileTypes: true });
      } catch {
        summary.partial = true;
        await emit({
          type: 'dirs',
          rows: [{ type: 'dir', rel, name: baseName(abs), mtime, partial: true }],
        });
        return;
      }
      await emit({
        type: 'dirs',
        rows: [{ type: 'dir', rel, name: baseName(abs), mtime }],
      });
      await progress();

      const dirs = [];
      const files = [];
      for (const entry of dirents) {
        if (SKIP_NAMES.has(entry.name) || entry.isSymbolicLink()) continue;
        const full = path.win32.join(abs, entry.name);
        if (entry.isDirectory()) dirs.push(full);
        else if (entry.isFile()) files.push(full);
      }
      dirs.sort((a, b) => baseName(a).localeCompare(baseName(b), 'zh-CN', { numeric: true }));
      files.sort((a, b) => baseName(a).localeCompare(baseName(b), 'zh-CN', { numeric: true }));

      for (let offset = 0; offset < files.length; offset += FILE_BATCH) {
        ensureLive();
        const chunk = files.slice(offset, offset + FILE_BATCH);
        const rows = await mapLimit(chunk, concurrency, async (full) => {
          ensureLive();
          const fileRel = relOf(full, absRoot);
          try {
            const stat = await fs.stat(full);
            const row = {
              type: 'file',
              rel: fileRel,
              name: baseName(full),
              size: Number(stat.size) || 0,
              mtime: Number(stat.mtimeMs) || null,
            };
            try {
              row.hash = await sha256File(full, signal);
            } catch (err) {
              if (err?.name === 'AbortError') throw err;
              row.hashError = String(err?.message || err || 'hash failed').slice(0, 200);
              summary.hashFailed += 1;
              summary.partial = true;
            }
            summary.files += 1;
            summary.size += row.size;
            current = full;
            return row;
          } catch (err) {
            if (err?.name === 'AbortError') throw err;
            summary.partial = true;
            return null;
          }
        });
        const good = rows.filter(Boolean);
        // 目录节点先发出去；空目录也要让前端看到。
        if (good.length) {
          await emit({ type: 'files', rows: good });
        }
        await progress();
      }

      for (const child of dirs) {
        ensureLive();
        await walk(child, relOf(child, absRoot), depth + 1);
      }
    } finally {
      visited.delete(visitKey);
    }
  };

  await emit({
    type: 'start',
    root: {
      path: absRoot,
      name: baseName(absRoot),
      mtime: Number(rootStat.mtimeMs) || null,
    },
  });
  await walk(absRoot, '', 0, true);
  await progress(true);
  return summary;
}

/** POST /api/ufs/scan：把 collectUfsTree 事件原样写成 NDJSON。 */
export async function streamUfsScan(req, res, rootRaw, { maxDepth = UFS_MAX_DEPTH } = {}) {
  const root = normalizeLocalPath(rootRaw);
  if (!isPathAllowed(root)) throw new HttpError(403, '该目录未在本次会话中打开，拒绝采集');
  let stat;
  try {
    stat = await fs.stat(root);
  } catch (err) {
    throw new HttpError(err?.code === 'ENOENT' ? 404 : 403, `cannot open directory: ${err.message}`);
  }
  if (!stat.isDirectory()) throw new HttpError(400, 'UFS 目录采集只接受目录');

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const controller = new AbortController();
  let closed = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      closed = true;
      controller.abort();
    }
  });

  const send = async (event) => {
    if (closed) throw abortError();
    const ok = res.write(`${JSON.stringify(event)}\n`);
    if (!ok) await once(res, 'drain');
  };

  try {
    const summary = await collectUfsTree(root, {
      onEvent: send,
      signal: controller.signal,
      maxDepth,
    });
    if (!closed) await send({ type: 'done', summary, elapsedMs: 0 });
  } catch (err) {
    if (err?.name !== 'AbortError' && !closed) {
      await send({ type: 'error', error: String(err?.message || err || 'ufs scan failed') }).catch(() => {});
    }
  } finally {
    if (!closed) res.end();
  }
}

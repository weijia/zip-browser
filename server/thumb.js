import fs from 'node:fs/promises';
import sharp from 'sharp';
import { HttpError, decodePath } from './util.js';
import { isImage } from './mime.js';
import {
  fsUrlToLocalPath,
  localPathToUrl,
  isFileReadable,
  isPathAllowed,
} from './fs-service.js';
import { normalizeEntryPath, peekArchive, readArchiveEntry, probeArchiveBytes } from './archive.js';
import { findPasswordByPath } from './vault-service.js';

const THUMB_SIZE = 160;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40 * 1024 * 1024;
const CACHE_LIMIT = 300;

const cache = new Map();

const PLACEHOLDER = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">'
  + '<rect width="160" height="160" fill="#f1f3f6"/>'
  + '<rect x="38" y="48" width="84" height="64" rx="7" fill="#dfe4ea"/>'
  + '<circle cx="64" cy="70" r="9" fill="#b9c2cd"/>'
  + '<path d="M42 108l27-27 18 18 13-11 22 20z" fill="#b9c2cd"/>'
  + '</svg>',
);

export function localThumbUrl(abs) {
  return localPathToUrl(abs).replace(/^\/fs\//, '/thumb/fs/');
}

export function zipThumbUrl(id, entryPath) {
  const parts = entryPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `/thumb/zip/${id}/${parts.join('/')}`;
}

function placeholder() {
  return { buffer: PLACEHOLDER, contentType: 'image/svg+xml; charset=utf-8' };
}

// zip 封面退回图标：zip 内不止一个文件、或单个文件不是图片、或加密且无密码时显示。
const ZIP_ICON = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">'
  + '<rect width="160" height="160" fill="#f1f3f6"/>'
  + '<rect x="48" y="32" width="64" height="96" rx="8" fill="#c8d2f5"/>'
  + '<path d="M88 32 l0 16 16 -16 z" fill="#aab8f0"/>'
  + '<rect x="60" y="74" width="40" height="6" rx="3" fill="#7c8cf0"/>'
  + '<rect x="60" y="88" width="40" height="6" rx="3" fill="#7c8cf0"/>'
  + '<rect x="60" y="102" width="40" height="6" rx="3" fill="#7c8cf0"/>'
  + '</svg>',
);

function zipIcon() {
  return { buffer: ZIP_ICON, contentType: 'image/svg+xml; charset=utf-8' };
}

function cacheGet(key) {
  const value = cache.get(key);
  if (!value) return null;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cachePut(key, value) {
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return value;
}

async function makeThumb(source, key) {
  try {
    const buffer = await sharp(source, {
      animated: false,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 76 })
      .toBuffer();
    return cachePut(key, { buffer, contentType: 'image/jpeg' });
  } catch {
    return placeholder();
  }
}

async function localThumb(rest) {
  const abs = fsUrlToLocalPath(rest);
  if (!isImage(abs)) throw new HttpError(403, 'not an image');
  if (!isFileReadable(abs)) throw new HttpError(403, '该文件类型不允许预览');
  const stat = await fs.stat(abs).catch(() => {
    throw new HttpError(404, 'not found');
  });
  if (!stat.isFile()) throw new HttpError(404, 'not found');
  const key = `fs:${abs.toLowerCase()}:${stat.size}:${Math.round(stat.mtimeMs)}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  if (stat.size > MAX_SOURCE_BYTES) return placeholder();
  const source = await fs.readFile(abs).catch(() => {
    throw new HttpError(404, 'not found');
  });
  return makeThumb(source, key);
}

async function zipThumb(rest) {
  const pieces = rest.split('/').filter(Boolean).map(decodePath);
  const id = pieces.shift();
  if (!id) throw new HttpError(400, 'missing archive session id');
  const entryPath = normalizeEntryPath(pieces.join('/'));
  if (!isImage(entryPath)) throw new HttpError(403, 'not an image');
  const session = peekArchive(id);
  const record = session.map.get(entryPath);
  if (!record || record.dir) throw new HttpError(404, 'entry not found');
  if (record.size > MAX_SOURCE_BYTES) return placeholder();
  const key = `zip:${id}:${entryPath}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  let source;
  try {
    source = await readArchiveEntry(id, entryPath);
  } catch (err) {
    if (err.status === 401) return placeholder();
    throw err;
  }
  if (!source) throw new HttpError(404, 'entry not found');
  return makeThumb(source, key);
}

// ---- 归档封面缩略图：包内若只有一个文件，则用它的缩略图；否则退回归档图标 ----
// 顶层归档加密时，若带有效 vsid（密码库会话），自动用记录的密码解密；否则试缺省密码。

async function coverFromProbed(probed, { password, keyPrefix }) {
  try {
    if (probed.encrypted && !password) return zipIcon();
    const files = probed.list.filter((item) => !item.dir);
    if (files.length !== 1) return zipIcon();
    const only = files[0];
    if (!isImage(only.path)) return zipIcon();
    let source;
    try {
      source = await probed.readFile(only.path);
    } catch {
      return zipIcon();
    }
    if (!source) return zipIcon();
    if (source.length > MAX_SOURCE_BYTES) return zipIcon();
    // 'p'/'o' 标记区分「已用密码解密」与「未解密」，避免无密码请求命中已解密的缓存（同机单用户场景下的信息隔离）。
    const key = `${keyPrefix}:${only.path}:${source.length}:${password != null ? 'p' : 'o'}`;
    const hit = cacheGet(key);
    if (hit) return hit;
    return makeThumb(source, key);
  } finally {
    await probed.close().catch?.(() => {});
  }
}

async function archiveCoverFs(rest, vsid, defpw) {
  let abs;
  try { abs = fsUrlToLocalPath(rest); } catch { return zipIcon(); }
  if (!isPathAllowed(abs)) return zipIcon();
  let password = null;
  if (vsid) {
    try { password = findPasswordByPath(vsid, abs); } catch { password = null; }
  }
  if (!password && defpw) password = defpw;
  let bytes;
  try { bytes = new Uint8Array(await fs.readFile(abs)); } catch { return zipIcon(); }
  let probed;
  try { probed = await probeArchiveBytes(bytes, { password }); }
  catch { return zipIcon(); }
  return coverFromProbed(probed, { password, keyPrefix: `zipcover:fs:${abs.toLowerCase()}` });
}

async function archiveCoverZip(rest, defpw) {
  const pieces = rest.split('/').filter(Boolean).map(decodePath);
  const id = pieces.shift();
  if (!id) return zipIcon();
  const entryPath = normalizeEntryPath(pieces.join('/'));
  let session;
  try { session = peekArchive(id); } catch { return zipIcon(); }
  const record = session.map.get(entryPath);
  if (!record || record.dir) return zipIcon();
  let innerBytes;
  try { innerBytes = await readArchiveEntry(id, entryPath); } catch { return zipIcon(); }
  if (!innerBytes) return zipIcon();
  const password = defpw || null;
  let probed;
  try { probed = await probeArchiveBytes(innerBytes, { password }); }
  catch { return zipIcon(); }
  return coverFromProbed(probed, { password, keyPrefix: `zipcover:zip:${id}:${entryPath}` });
}

export function fsCoverUrl(abs, vsid, defpw) {
  const base = localPathToUrl(abs).replace(/^\/fs\//, '/thumb/zipcover/fs/');
  let url = vsid ? `${base}?vsid=${encodeURIComponent(vsid)}` : base;
  if (defpw) url += `${vsid ? '&' : '?'}defpw=${encodeURIComponent(defpw)}`;
  return url;
}

export function zipCoverUrl(id, entryPath, vsid, defpw) {
  const parts = entryPath.split('/').filter(Boolean).map(encodeURIComponent);
  const base = `/thumb/zipcover/zip/${id}/${parts.join('/')}`;
  let url = vsid ? `${base}?vsid=${encodeURIComponent(vsid)}` : base;
  if (defpw) url += `${vsid ? '&' : '?'}defpw=${encodeURIComponent(defpw)}`;
  return url;
}

export async function handleThumb(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    throw new HttpError(405, 'method not allowed');
  }
  const pathname = url.pathname;
  let result;
  if (pathname.startsWith('/thumb/zipcover/')) {
    const sub = pathname.slice('/thumb/zipcover'.length);
    const vsid = url.searchParams.get('vsid') || undefined;
    const defpw = url.searchParams.get('defpw') || undefined;
    if (sub.startsWith('/fs/')) result = await archiveCoverFs(sub.slice('/fs'.length), vsid, defpw);
    else if (sub.startsWith('/zip/')) result = await archiveCoverZip(sub.slice('/zip'.length), defpw);
    else throw new HttpError(404, 'not found');
  } else if (pathname.startsWith('/thumb/fs/')) {
    result = await localThumb(pathname.slice('/thumb/fs'.length));
  } else if (pathname.startsWith('/thumb/zip/')) {
    result = await zipThumb(pathname.slice('/thumb/zip'.length));
  } else {
    throw new HttpError(404, 'not found');
  }
  res.writeHead(200, {
    'Content-Type': result.contentType,
    'Content-Length': result.buffer.length,
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  });
  res.end(req.method === 'HEAD' ? undefined : result.buffer);
  return true;
}

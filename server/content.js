import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError, decodePath, sendBuffer } from './util.js';
import { mimeOf, isTextPreview, isMarkdown, extensionOf, isImage, isArchiveName } from './mime.js';
import {
  fsUrlToLocalPath,
  localPathToUrl,
  isPathAllowed,
  isFileReadable,
  allowDirectory,
  listDirectory,
  findIndexFile,
} from './fs-service.js';
import { normalizeEntryPath, peekArchive, readArchiveEntry } from './archive.js';
import { localThumbUrl, zipThumbUrl, fsCoverUrl, zipCoverUrl } from './thumb.js';
import { renderMarkdown, renderTextPreview, renderNotice, renderDirectory } from './markdown.js';
import { renderImageViewer } from './image-viewer.js';
import { CONTENT_CSP, DIRECTORY_CSP } from './config.js';

const HTML_EXT = new Set(['.html', '.htm']);

function isNavigateRequest(req) {
  const mode = String(req.headers['sec-fetch-mode'] || '').toLowerCase();
  const dest = String(req.headers['sec-fetch-dest'] || '').toLowerCase();
  if (mode === 'navigate' || dest === 'document' || dest === 'iframe') return true;
  if (['style', 'script', 'image', 'font', 'audio', 'video', 'manifest'].includes(dest)) return false;
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html') && !accept.includes('*/*');
}

function withNavigation(payload, isNavigate, rawUrl) {
  if (!isNavigate) return payload;
  const { buffer, name } = payload;
  if (isMarkdown(name)) {
    return {
      buffer: Buffer.from(renderMarkdown(buffer.toString('utf8'), name)),
      contentType: 'text/html; charset=utf-8',
      csp: CONTENT_CSP,
      name,
    };
  }
  // 图片导航请求渲染成可缩放的查看器，URL 不变；原图由 ?raw=1 返回给 <img>。
  // 必须放在文本预览之前：.svg 同时属于 TEXT_EXT 和图片扩展名。
  if (isImage(name)) {
    return {
      buffer: Buffer.from(renderImageViewer({ name, src: rawUrl })),
      contentType: 'text/html; charset=utf-8',
      csp: CONTENT_CSP,
      name,
    };
  }
  if (!HTML_EXT.has(extensionOf(name)) && isTextPreview(name)) {
    return {
      buffer: Buffer.from(renderTextPreview(buffer.toString('utf8'), name)),
      contentType: 'text/html; charset=utf-8',
      csp: DIRECTORY_CSP,
      name,
    };
  }
  return payload;
}

async function localFilePayload(abs, isNavigate, rawUrl) {
  const name = path.win32.basename(abs);
  const buffer = await fs.readFile(abs);
  return withNavigation({ buffer, contentType: mimeOf(name), csp: CONTENT_CSP, name }, isNavigate, rawUrl);
}

async function localDirectoryPayload(abs, view, rawUrl, vsid) {
  allowDirectory(abs);
  if (view !== 'thumbs') {
    const index = await findIndexFile(abs);
    if (index) return localFilePayload(index, true, rawUrl);
  }
  const { items } = await listDirectory(abs);
  const links = items.map((item) => {
    const isZip = !item.dir && isArchiveName(item.name);
    return {
      name: item.name,
      dir: item.dir,
      size: item.size,
      href: `${localPathToUrl(item.path)}${item.dir ? '/' : ''}`,
      thumb: !item.dir && isImage(item.name)
        ? localThumbUrl(item.path)
        : (isZip ? fsCoverUrl(item.path, vsid) : null),
    };
  });
  return {
    buffer: Buffer.from(renderDirectory({
      title: abs,
      items: links,
      hint: '本地目录 · 只读浏览，点击文件名可直接预览',
      view,
    })),
    contentType: 'text/html; charset=utf-8',
    csp: DIRECTORY_CSP,
    name: 'index.html',
  };
}

async function resolveLocal(rest, isNavigate, view, rawUrl, vsid) {
  const abs = fsUrlToLocalPath(rest);
  if (!isPathAllowed(abs)) throw new HttpError(403, '该目录尚未在本会话中打开');
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    throw new HttpError(404, 'not found');
  }
  if (stat.isDirectory()) return localDirectoryPayload(abs, view, rawUrl);
  if (!isFileReadable(abs)) throw new HttpError(403, '该文件类型不允许预览');
  return localFilePayload(abs, isNavigate, rawUrl);
}

function zipHref(id, entryPath, dir) {
  const parts = entryPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `/zip/${id}/${parts.join('/')}${dir ? '/' : ''}`;
}

async function zipFilePayload(session, entryPath, isNavigate, rawUrl) {
  let buffer;
  try {
    buffer = await readArchiveEntry(session.id, entryPath);
  } catch (err) {
    if (err.status === 401) {
      return {
        buffer: Buffer.from(renderNotice('需要密码', '这个压缩包已加密，请返回文件浏览器重新输入密码。')),
        contentType: 'text/html; charset=utf-8',
        csp: DIRECTORY_CSP,
        name: 'notice.html',
      };
    }
    throw err;
  }
  if (!buffer) throw new HttpError(404, 'entry not found');
  const name = entryPath.split('/').pop() || 'file';
  return withNavigation({ buffer, contentType: mimeOf(name), csp: CONTENT_CSP, name }, isNavigate, rawUrl);
}

function zipDirectoryPayload(session, dir, view, vsid) {
  const prefix = dir ? `${dir}/` : '';
  const seen = new Set();
  const items = [];
  for (const item of session.list) {
    if (!item.path.startsWith(prefix)) continue;
    const rest = item.path.slice(prefix.length);
    if (!rest) continue;
    const first = rest.split('/')[0];
    if (!first || seen.has(first)) continue;
    seen.add(first);
    const isDir = rest.includes('/') || (item.path === `${prefix}${first}` && item.dir);
    const childPath = `${prefix}${first}`;
    items.push({
      name: first,
      dir: isDir,
      size: isDir ? 0 : item.size,
      href: zipHref(session.id, childPath, isDir),
      thumb: !isDir && isImage(first)
        ? zipThumbUrl(session.id, childPath)
        : (!isDir && isArchiveName(first) ? zipCoverUrl(session.id, childPath, vsid) : null),
    });
  }
  if (dir) {
    const parent = dir.split('/').slice(0, -1).join('/');
    items.unshift({ name: '..', dir: true, size: 0, href: zipHref(session.id, parent, true), thumb: null });
  }
  items.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'zh-CN'));
  return {
    buffer: Buffer.from(renderDirectory({
      title: dir ? `zip://${dir}/` : `zip://${session.id}/`,
      items,
      hint: '压缩包内目录 · 相对引用会按包内路径解析',
      view,
    })),
    contentType: 'text/html; charset=utf-8',
    csp: DIRECTORY_CSP,
    name: 'index.html',
  };
}

async function resolveZip(rest, isNavigate, view, rawUrl, vsid) {
  const pieces = rest.split('/').filter(Boolean).map(decodePath);
  const id = pieces.shift();
  if (!id) throw new HttpError(400, 'missing zip session id');
  const entryPath = normalizeEntryPath(pieces.join('/'));
  const session = peekArchive(id);

  const candidates = entryPath
    ? [`${entryPath}/index.html`, `${entryPath}/index.htm`]
    : ['index.html', 'index.htm', 'default.html'];
  if (view !== 'thumbs') {
    for (const candidate of candidates) {
      const record = session.map.get(candidate);
      if (record && !record.dir) return zipFilePayload(session, candidate, isNavigate, rawUrl);
    }
  }

  const record = session.map.get(entryPath);
  if (record && !record.dir) return zipFilePayload(session, entryPath, isNavigate, rawUrl);

  const prefix = entryPath ? `${entryPath}/` : '';
  const hasChildren = session.list.some((item) => item.path.startsWith(prefix));
  if (!entryPath || (record && record.dir) || hasChildren) {
    return zipDirectoryPayload(session, entryPath, view, vsid);
  }
  throw new HttpError(404, 'entry not found');
}

export async function handleContent(req, res, url) {
  const pathname = decodePath(url.pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method not allowed');
  const view = url.searchParams.get('view') === 'thumbs' ? 'thumbs' : 'list';
  const vsid = url.searchParams.get('vsid') || undefined;
  // 查看器里的 <img> 和「原图」链接带 raw=1，必须拿到原始字节而不是再套一层 HTML。
  const rawUrl = `${url.pathname}?raw=1`;
  const isNavigate = isNavigateRequest(req) && url.searchParams.get('raw') !== '1';
  let payload;
  if (pathname.startsWith('/fs/')) {
    payload = await resolveLocal(pathname.slice(4), isNavigate, view, rawUrl, vsid);
  } else if (pathname.startsWith('/zip/')) {
    payload = await resolveZip(pathname.slice(5), isNavigate, view, rawUrl, vsid);
  } else {
    return false;
  }
  sendBuffer(req, res, req.method === 'HEAD' ? Buffer.alloc(0) : payload.buffer, {
    contentType: payload.contentType,
    csp: payload.csp,
    name: payload.name,
  });
  return true;
}

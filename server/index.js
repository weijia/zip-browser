import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { HOST, PORT, TOKEN, WEB_DIR, ROOT_DIR } from './config.js';
import { json, fail, readJson, requireToken, sendBuffer, HttpError } from './util.js';
import { mimeOf } from './mime.js';
import {
  listDrives,
  listDirectory,
  normalizeLocalPath,
} from './fs-service.js';
import {
  openArchive,
  unlockArchive,
  listArchiveEntries,
  closeArchive,
} from './archive.js';
import { handleContent } from './content.js';
import { handleThumb } from './thumb.js';
import { getVersionInfo } from './version.js';
import { getHostInfo } from './hostinfo.js';
import { trashPaths } from './trash-service.js';
import {
  createVault,
  unlockVault,
  getEntries,
  getPassword,
  saveEntry,
  deleteEntry,
  lock,
} from './vault-service.js';

const MAIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  // 同步组（RemoteStorage / Gitee / WebDAV）要访问用户配置的远端地址，
  // 不能只放行 'self'；本机 API 仍由 X-Local-Token 保护。
  "connect-src 'self' https: http:",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

// 第三方浏览器 bundle 走固定映射表，不接受任意路径，避免变成读文件的通道。
const VENDOR_FILES = new Map([
  ['/vendor/zen-fs-config.js', path.join(ROOT_DIR, 'node_modules', 'zen-fs-config', 'dist', 'zen-fs-config.js')],
  // 同步组配置组件及其远端后端 UMD：随源码入库，离线可用，不走 CDN。
  // 注意：zen-fs-config-ui 内部自带一份 zen-fs-config，但它只导出 UI 辅助函数，
  // 不导出 createConfigRepo；上面的 zen-fs-config.js 仍需保留给 /annotations 与密码库。
  ['/vendor/zen-fs-config-ui.js', path.join(WEB_DIR, 'vendor', 'zen-fs-config-ui.js')],
  ['/vendor/zen-fs-remotestoragejs.global.js', path.join(WEB_DIR, 'vendor', 'zen-fs-remotestoragejs.global.js')],
  ['/vendor/zen-fs-gitee.global.js', path.join(WEB_DIR, 'vendor', 'zen-fs-gitee.global.js')],
]);

async function serveVendor(res, pathname) {
  const file = VENDOR_FILES.get(pathname);
  if (!file) throw new HttpError(404, 'not found');
  const buffer = await fs.readFile(file);
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(buffer);
}

async function serveIndex(res) {
  const source = await fs.readFile(path.join(WEB_DIR, 'index.html'), 'utf8');
  const version = JSON.stringify(await getVersionInfo()).replace(/</g, '\\u003c');
  const body = Buffer.from(source
    .replace('__ZIP_BROWSER_TOKEN__', TOKEN)
    .replace('__ZIP_BROWSER_VERSION__', version));
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': MAIN_CSP,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function serveStatic(res, pathname) {
  const name = path.basename(pathname);
  const buffer = await fs.readFile(path.join(WEB_DIR, name));
  res.writeHead(200, {
    'Content-Type': mimeOf(name),
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(buffer);
}

async function handleApi(req, res, url) {
  requireToken(req);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/drives') {
    return json(res, 200, { drives: await listDrives() });
  }

  // v2 清单导出需要主机名与盘稳定身份（浏览器拿不到，且不允许写盘）。
  if (req.method === 'GET' && pathname === '/api/hostinfo') {
    return json(res, 200, await getHostInfo());
  }

  if (req.method === 'GET' && pathname === '/api/list') {
    const abs = normalizeLocalPath(url.searchParams.get('path') || '');
    return json(res, 200, await listDirectory(abs));
  }

  // 唯一的写操作：把当前目录的直接子项送进 Windows 回收站（可还原），不做永久删除。
  if (req.method === 'POST' && pathname === '/api/trash') {
    const body = await readJson(req);
    return json(res, 200, await trashPaths({ dir: body.dir, paths: body.paths }));
  }

  if (req.method === 'GET' && pathname === '/api/download') {
    const abs = normalizeLocalPath(url.searchParams.get('path') || '');
    const stat = await fs.stat(abs).catch(() => {
      throw new HttpError(404, 'file not found');
    });
    if (!stat.isFile()) throw new HttpError(400, 'not a file');
    if (stat.size > 256 * 1024 * 1024) throw new HttpError(413, 'file too large to download');
    const buffer = await fs.readFile(abs);
    return sendBuffer(req, res, buffer, {
      contentType: mimeOf(abs),
      attachment: true,
      name: path.win32.basename(abs),
    });
  }

  if (req.method === 'POST' && pathname === '/api/zip/open') {
    const body = await readJson(req);
    const abs = normalizeLocalPath(body.path || '');
    return json(res, 200, await openArchive(abs, {
      password: typeof body.password === 'string' ? body.password : undefined,
      encoding: typeof body.encoding === 'string' ? body.encoding : undefined,
    }));
  }

  if (req.method === 'POST' && pathname === '/api/zip/unlock') {
    const body = await readJson(req);
    try {
      const result = await unlockArchive(body.id, body.password);
      return json(res, 200, result);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) return json(res, 401, { ok: false, error: err.message });
      throw err;
    }
  }

  if (req.method === 'GET' && pathname === '/api/zip/tree') {
    return json(res, 200, listArchiveEntries(url.searchParams.get('id') || ''));
  }

  if (req.method === 'POST' && pathname === '/api/zip/close') {
    const body = await readJson(req);
    return json(res, 200, { closed: await closeArchive(body.id) });
  }

  if (pathname.startsWith('/api/vault/')) {
    return await handleVault(req, res, url);
  }

  throw new HttpError(404, 'unknown api');
}

async function handleVault(req, res, url) {
  const pathname = url.pathname;
  const body = req.method === 'POST' ? await readJson(req) : {};
  try {
    if (pathname === '/api/vault/create') {
      return json(res, 200, await createVault(body.master, body.name));
    }
    if (pathname === '/api/vault/unlock') {
      return json(res, 200, await unlockVault(body.data, body.master));
    }
    if (pathname === '/api/vault/entries') {
      return json(res, 200, { entries: getEntries(body.sessionId) });
    }
    if (pathname === '/api/vault/password') {
      return json(res, 200, getPassword(body.sessionId, body.entryId));
    }
    if (pathname === '/api/vault/save') {
      return json(res, 200, await saveEntry(body.sessionId, body.entry || {}));
    }
    if (pathname === '/api/vault/delete') {
      return json(res, 200, await deleteEntry(body.sessionId, body.entryId));
    }
    if (pathname === '/api/vault/lock') {
      return json(res, 200, lock(body.sessionId));
    }
    throw new HttpError(404, 'unknown vault api');
  } catch (err) {
    // 主密码错误等统一返回 401，不暴露内部错误细节
    const code = err?.code || err?.message;
    const isAuth = code === 'InvalidKey' || code === 'BadSignature' || err?.status === 401;
    return json(res, isAuth ? 401 : 400, { error: isAuth ? '主密码错误' : (err.message || '请求失败') });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return await serveIndex(res);
    }
    // 版本探测不需要 token：只暴露源码指纹与修订号，没有任何本地文件信息
    if (req.method === 'GET' && pathname === '/version.json') {
      return json(res, 200, await getVersionInfo());
    }
    if (req.method === 'GET' && pathname.startsWith('/vendor/')) {
      return await serveVendor(res, pathname);
    }
    if (req.method === 'GET' && ['/app.js', '/vault.js', '/style.css', '/location.js', '/update-checker.js', '/annotations-store.js', '/annotations-ui.js', '/image-viewer.js', '/manifest-export.js', '/manifest-sync.js', '/trash-ui.js'].includes(pathname)) {
      return await serveStatic(res, pathname);
    }
    if (pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (pathname.startsWith('/thumb/')) return await handleThumb(req, res, url);
    if (pathname.startsWith('/fs/') || pathname.startsWith('/zip/')) {
      const handled = await handleContent(req, res, url);
      if (handled) return;
    }
    throw new HttpError(404, 'not found');
  } catch (err) {
    fail(res, err);
  }
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, HOST, async () => {
  const info = await getVersionInfo().catch(() => null);
  const label = info ? ` v${info.version} (${info.sha})` : '';
  console.log(`本地文件浏览器${label}已启动: http://${HOST}:${PORT}/`);
  console.log('浏览 + 删除到回收站 · 仅监听 127.0.0.1 · Ctrl+C 停止');
});

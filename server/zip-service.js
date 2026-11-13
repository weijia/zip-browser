import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import * as zip from '@zip.js/zip.js';
import { HttpError } from './util.js';
import { MAX_ZIP_BYTES, SESSION_TTL_MS } from './config.js';

if (typeof zip.configure === 'function') {
  zip.configure({ useWebWorkers: false });
}

const sessions = new Map();
let queue = Promise.resolve();

function serialize(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function makeReader(bytes) {
  if (typeof zip.Uint8ArrayReader === 'function') return new zip.Uint8ArrayReader(bytes);
  return new zip.BlobReader(new Blob([bytes]));
}

export function normalizeEntryPath(raw) {
  const parts = String(raw || '').replace(/\\/g, '/').split('/');
  const out = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!out.length) throw new HttpError(400, 'path escapes archive');
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join('/');
}

function getSession(id) {
  const session = sessions.get(id);
  if (!session) throw new HttpError(404, 'zip session not found');
  if (session.expires < Date.now()) {
    sessions.delete(id);
    session.reader.close().catch(() => {});
    throw new HttpError(410, 'zip session expired');
  }
  session.expires = Date.now() + SESSION_TTL_MS;
  return session;
}

export function peekSession(id) {
  return getSession(id);
}

export function listZipEntries(id) {
  const session = getSession(id);
  return { id, path: session.zipPath, encrypted: session.encrypted, entries: session.list };
}

function parseEntries(entries) {
  const map = new Map();
  const list = [];
  for (const entry of entries) {
    const raw = entry.filename || '';
    let entryPath;
    try {
      entryPath = normalizeEntryPath(raw);
    } catch {
      continue;
    }
    if (!entryPath) continue;
    const dir = Boolean(entry.directory) || raw.endsWith('/');
    const size = Number(entry.uncompressedSize || 0);
    if (dir) {
      if (!map.has(entryPath)) map.set(entryPath, { entry: null, dir: true, size: 0 });
    } else {
      map.set(entryPath, { entry, dir: false, size });
    }
    list.push({ path: entryPath, dir, size, encrypted: Boolean(entry.encrypted) });
  }
  const encrypted = list.some((item) => item.encrypted && !item.dir);
  return { map, list, encrypted };
}

// 临时打开 zip（不注册会话）：用于缩略图封面、嵌套 zip 探测等只读场景，调用方负责关闭 reader。
export async function openZipTransient(bytes, { password, encoding } = {}) {
  const reader = new zip.ZipReader(makeReader(bytes), {
    useWebWorkers: false,
    ...(password ? { password } : {}),
  });
  let entries;
  try {
    entries = await reader.getEntries(encoding ? { filenameEncoding: encoding } : {});
  } catch (err) {
    await reader.close().catch(() => {});
    throw new HttpError(400, `cannot read archive: ${err.message}`);
  }
  const { map, list, encrypted } = parseEntries(entries);
  return { reader, map, list, encrypted, password: password || null };
}

// 从 openZipTransient 的结果里读单个条目（供封面/嵌套探测使用，不依赖会话）。
export async function readOpenedEntry(opened, entryPath, password) {
  const record = opened.map.get(normalizeEntryPath(entryPath));
  if (!record || record.dir || !record.entry) return null;
  const bytes = await record.entry.getData(new zip.Uint8ArrayWriter(), {
    ...(password ? { password } : {}),
    useWebWorkers: false,
    checkSignature: true,
  });
  return Buffer.from(bytes);
}

export async function openZip(zipPath, { password, encoding } = {}) {
  let stat;
  try {
    stat = await fs.stat(zipPath);
  } catch {
    throw new HttpError(404, 'zip file not found');
  }
  if (!stat.isFile()) throw new HttpError(400, 'not a file');
  if (stat.size > MAX_ZIP_BYTES) throw new HttpError(413, 'zip file too large (limit 512 MB)');

  const bytes = new Uint8Array(await fs.readFile(zipPath));
  const opened = await openZipTransient(bytes, { password, encoding });
  const { reader, map, list, encrypted } = opened;
  const id = randomBytes(8).toString('hex');
  sessions.set(id, {
    id,
    zipPath,
    reader,
    map,
    list,
    encrypted,
    password: password || null,
    encoding: encoding || '',
    expires: Date.now() + SESSION_TTL_MS,
  });
  return {
    id,
    encrypted,
    needsPassword: encrypted && !password,
    count: list.filter((item) => !item.dir).length,
    entries: list,
  };
}

export async function unlockZip(id, password) {
  const session = getSession(id);
  if (typeof password !== 'string' || !password) throw new HttpError(400, 'password is required');
  const candidates = session.list
    .filter((item) => item.encrypted && !item.dir)
    .sort((a, b) => a.size - b.size);
  if (!candidates.length) {
    session.password = password;
    return { ok: true };
  }
  const record = session.map.get(candidates[0].path);
  return serialize(async () => {
    try {
      await record.entry.getData(new zip.Uint8ArrayWriter(), {
        password,
        useWebWorkers: false,
        checkSignature: true,
      });
    } catch {
      return { ok: false, error: '密码不正确或压缩包已损坏' };
    }
    session.password = password;
    session.expires = Date.now() + SESSION_TTL_MS;
    return { ok: true };
  });
}

export async function readEntry(id, entryPath) {
  const session = getSession(id);
  const normalized = normalizeEntryPath(entryPath);
  const record = session.map.get(normalized);
  if (!record || record.dir) return null;
  if (record.entry.encrypted && !session.password) throw new HttpError(401, 'password required');
  return serialize(async () => {
    const bytes = await record.entry.getData(new zip.Uint8ArrayWriter(), {
      ...(session.password ? { password: session.password } : {}),
      useWebWorkers: false,
      checkSignature: true,
    });
    return Buffer.from(bytes);
  });
}

export async function closeZip(id) {
  const session = sessions.get(id);
  if (!session) return false;
  sessions.delete(id);
  await session.reader.close().catch(() => {});
  return true;
}

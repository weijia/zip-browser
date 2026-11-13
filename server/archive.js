import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpError } from './util.js';
import { extensionOf, archiveEngineOf } from './mime.js';
import {
  openZip,
  openZipTransient,
  readOpenedEntry,
  peekSession,
  readEntry,
  unlockZip,
  closeZip,
  listZipEntries,
  normalizeEntryPath,
} from './zip-service.js';
import {
  open7z,
  open7zFromBytes,
  peek7z,
  read7zEntry,
  unlock7z,
  close7z,
} from './seven-service.js';

export { normalizeEntryPath };

// 归档会话统一分发：同一个 /zip/<id>/ 与 /api/zip/* 契约，按会话记录的引擎类型路由到 zip.js 或 7z 二进制。
const backendOf = new Map(); // id -> 'zip' | 'seven'
const tempFiles = new Map(); // id -> 临时文件路径（内存归档打开后清理）

async function openZipFromBytes(bytes, opts) {
  const tmp = path.join(os.tmpdir(), `zbzip-${randomBytes(6).toString('hex')}.zip`);
  await fs.writeFile(tmp, Buffer.from(bytes));
  const info = await openZip(tmp, opts);
  backendOf.set(info.id, 'zip');
  tempFiles.set(info.id, tmp);
  return info;
}

export async function openArchive(abs, opts = {}) {
  const name = String(abs).split(/[\\/]/).pop() || '';
  const backend = archiveEngineOf(name);
  if (backend === 'zip') {
    const result = await openZip(abs, opts);
    backendOf.set(result.id, 'zip');
    return result;
  }
  const result = await open7z(abs, opts);
  backendOf.set(result.id, 'seven');
  return result;
}

export async function openArchiveFromBytes(bytes, opts = {}) {
  const isZip = bytes && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
  if (isZip) return openZipFromBytes(bytes, opts);
  const result = await open7zFromBytes(bytes, opts);
  backendOf.set(result.id, 'seven');
  return result;
}

export function peekArchive(id) {
  const backend = backendOf.get(id);
  if (backend === 'zip') return peekSession(id);
  if (backend === 'seven') return peek7z(id);
  throw new HttpError(404, 'archive session not found');
}

export async function readArchiveEntry(id, entryPath) {
  const backend = backendOf.get(id);
  if (backend === 'zip') return readEntry(id, entryPath);
  if (backend === 'seven') return read7zEntry(id, entryPath);
  throw new HttpError(404, 'archive session not found');
}

export async function unlockArchive(id, password) {
  const backend = backendOf.get(id);
  try {
    if (backend === 'zip') {
      const result = await unlockZip(id, password);
      if (!result.ok) throw new HttpError(401, result.error || '密码不正确');
      return result;
    }
    if (backend === 'seven') {
      const result = await unlock7z(id, password);
      if (!result.ok) throw new HttpError(401, result.error || '密码不正确');
      return result;
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, '密码不正确');
  }
  throw new HttpError(404, 'archive session not found');
}

export function listArchiveEntries(id) {
  const backend = backendOf.get(id);
  if (backend === 'zip') return listZipEntries(id);
  if (backend === 'seven') {
    const session = peek7z(id);
    return { id, path: session.path, encrypted: session.encrypted, entries: session.list };
  }
  throw new HttpError(404, 'archive session not found');
}

export async function closeArchive(id) {
  const backend = backendOf.get(id);
  let ok = false;
  if (backend === 'zip') ok = await closeZip(id);
  else if (backend === 'seven') ok = await close7z(id);
  const tmp = tempFiles.get(id);
  if (tmp) await fs.unlink(tmp).catch(() => {});
  tempFiles.delete(id);
  backendOf.delete(id);
  return ok;
}

// 内存归档的临时探测（不注册会话）：用于封面缩略图、嵌套归档判断。
// 返回统一形状：{ encrypted, list, map, readFile(path) -> Buffer|null, close() }
export async function probeArchiveBytes(bytes, { password } = {}) {
  const isZip = bytes && bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'
  if (isZip) {
    const opened = await openZipTransient(bytes, { password });
    return {
      kind: 'zip',
      encrypted: opened.encrypted,
      list: opened.list,
      map: opened.map,
      readFile: (entryPath) => readOpenedEntry(opened, entryPath, password),
      close: () => opened.reader.close().catch(() => {}),
    };
  }
  const info = await open7zFromBytes(bytes, { password });
  const id = info.id;
  const session = peek7z(id);
  return {
    kind: 'seven',
    encrypted: info.encrypted,
    list: info.entries,
    map: session.map,
    readFile: (entryPath) => read7zEntry(id, entryPath),
    close: () => close7z(id),
  };
}


// 服务端 KeePass (KDBX4) 密码库：创建 / 解锁 / 列举 / 读取密码 / 增删条目。
// 加解密用 kdbxweb + hash-wasm（Argon2id），路径已在 Node 侧验证通过。
// 主密码只在「解锁」请求中一次性传入，服务不持久化；vault 密文由浏览器侧存入 zen-fs-config。
import kdbxweb from 'kdbxweb';
import { argon2id, argon2d } from 'hash-wasm';

// kdbxweb 需要 Argon2 实现；注入 hash-wasm 的 Argon2id/Argon2d。
kdbxweb.CryptoEngine.setArgon2Impl(async (password, salt, memory, iterations, length, parallelism, type, version) => {
  const fn = type === 0 ? argon2d : argon2id;
  return fn({
    password: new Uint8Array(password),
    salt: new Uint8Array(salt),
    parallelism,
    iterations,
    memorySize: memory,
    hashLength: length,
    outputType: 'binary',
    version,
  });
});

const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map();

function newSessionId() {
  return globalThis.crypto.randomUUID();
}

function credentials(master) {
  return new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(master));
}

function entryId(entry) {
  return entry.uuid ? String(entry.uuid) : '';
}

function entryInfo(entry) {
  const f = entry.fields;
  return {
    id: entryId(entry),
    title: f.get('Title') || '',
    username: f.get('UserName') || '',
    url: f.get('URL') || '',
    notes: f.get('Notes') || '',
  };
}

function listEntries(db) {
  const out = [];
  const walk = (group) => {
    for (const e of group.entries || []) out.push(entryInfo(e));
    for (const c of group.groups || []) walk(c);
  };
  walk(db.getDefaultGroup());
  return out;
}

function findEntry(db, id) {
  let found = null;
  const walk = (group) => {
    for (const e of group.entries || []) {
      if (entryId(e) === id) { found = e; return; }
    }
    for (const c of group.groups || []) walk(c);
  };
  walk(db.getDefaultGroup());
  return found;
}

function findEntryByUsername(db, username) {
  let found = null;
  const walk = (group) => {
    for (const e of group.entries || []) {
      if ((e.fields.get('UserName') || '') === username) { found = e; return; }
    }
    for (const c of group.groups || []) walk(c);
  };
  walk(db.getDefaultGroup());
  return found;
}

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) throw new HttpErrorUnauthorized('密码库会话不存在或已锁定');
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    throw new HttpErrorUnauthorized('密码库会话已过期，请重新解锁');
  }
  s.expiresAt = Date.now() + SESSION_TTL_MS;
  return s;
}

class HttpErrorUnauthorized extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

function toBase64(arrayBuffer) {
  return Buffer.from(arrayBuffer).toString('base64');
}

function fromBase64(data) {
  const buf = Buffer.from(data, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function createVault(master, name = 'zip-browser 密码库') {
  if (!master) throw new Error('主密码不能为空');
  const db = kdbxweb.Kdbx.create(credentials(master), name);
  db.setKdf(kdbxweb.Consts.KdfId.Argon2id);
  const saved = await db.save();
  const sessionId = newSessionId();
  sessions.set(sessionId, { db, expiresAt: Date.now() + SESSION_TTL_MS });
  return { data: toBase64(saved), sessionId, entries: listEntries(db) };
}

export async function unlockVault(data, master) {
  if (!data || !master) throw new Error('缺少密码库数据或主密码');
  const db = await kdbxweb.Kdbx.load(fromBase64(data), credentials(master));
  const sessionId = newSessionId();
  sessions.set(sessionId, { db, expiresAt: Date.now() + SESSION_TTL_MS });
  return { sessionId, entries: listEntries(db) };
}

export function getEntries(sessionId) {
  const { db } = getSession(sessionId);
  return listEntries(db);
}

export function getPassword(sessionId, entryId) {
  const { db } = getSession(sessionId);
  const entry = findEntry(db, entryId);
  if (!entry) throw new Error('条目不存在');
  return { password: entry.fields.get('Password')?.getText?.() || '' };
}

export async function saveEntry(sessionId, info) {
  const { db } = getSession(sessionId);
  const username = typeof info.username === 'string' ? info.username : '';
  let entry = username ? findEntryByUsername(db, username) : null;
  if (!entry) entry = db.createEntry(db.getDefaultGroup());
  entry.fields.set('Title', String(info.title || ''));
  entry.fields.set('UserName', username);
  entry.fields.set('URL', String(info.url || ''));
  entry.fields.set('Notes', String(info.notes || ''));
  entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(String(info.password || '')));
  const saved = await db.save();
  return { data: toBase64(saved) };
}

export async function deleteEntry(sessionId, targetId) {
  const { db } = getSession(sessionId);
  let removed = false;
  const walk = (group) => {
    const entries = group.entries || [];
    const idx = entries.findIndex((e) => entryId(e) === targetId);
    if (idx >= 0) {
      if (typeof group.remove === 'function') group.remove(entries[idx]);
      else entries.splice(idx, 1);
      removed = true;
      return true;
    }
    for (const c of group.groups || []) if (walk(c)) return true;
    return removed;
  };
  walk(db.getDefaultGroup());
  if (!removed) throw new Error('条目不存在');
  const saved = await db.save();
  return { data: toBase64(saved) };
}

// 按 zip 磁盘路径指纹找记录的密码（用户在密码库保存 zip 密码时以路径指纹作为 username）。
// 指纹公式与前端 vault.js 的 fpFor 完全一致，确保「保存」与「查找」能配对。
export function findPasswordByPath(sessionId, abs) {
  const { db } = getSession(sessionId);
  const fp = `fp:${btoa(unescape(encodeURIComponent(String(abs))))}`;
  let found = null;
  const walk = (group) => {
    for (const e of group.entries || []) {
      if ((e.fields.get('UserName') || '') === fp) { found = e; return; }
    }
    for (const c of group.groups || []) walk(c);
  };
  walk(db.getDefaultGroup());
  if (!found) return null;
  return found.fields.get('Password')?.getText?.() || '';
}

export function lock(sessionId) {
  sessions.delete(sessionId);
  return { ok: true };
}

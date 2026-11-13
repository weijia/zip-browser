import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from './util.js';
import { MAX_ZIP_BYTES, SESSION_TTL_MS } from './config.js';
import { normalizeEntryPath } from './zip-service.js';

const execFileAsync = promisify(execFile);

const sessions = new Map();
let sevenBin = null;

// 定位 7z 可执行文件：优先 7z（用户已通过 scoop 安装），退回 7za/7zr。
export async function locate7z() {
  if (sevenBin) return sevenBin;
  for (const candidate of ['7z', '7za', '7zr']) {
    try {
      await execFileAsync(candidate, ['i'], { windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 });
      sevenBin = candidate;
      return sevenBin;
    } catch (err) {
      if (err && err.code === 'ENOENT') continue; // 没装这个，试下一个
      // 能跑起来只是退出码非 0（如 7z 打印了帮助），仍视为可用
      sevenBin = candidate;
      return sevenBin;
    }
  }
  throw new HttpError(500, '未找到 7z 可执行文件，请安装 7-Zip / 7za 并加入 PATH');
}

async function run7z(args, { password, maxBuffer = 512 * 1024 * 1024 } = {}) {
  const bin = await locate7z();
  const full = withPassword(args, password);
  let code = 0;
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFileAsync(bin, full, { windowsHide: true, maxBuffer, encoding: 'utf8' });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (err) {
    if (err && err.code === 'ENOENT') throw new HttpError(500, '未找到 7z 可执行文件');
    code = typeof err.code === 'number' ? err.code : 1;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }
  return { code, stdout, stderr };
}

async function run7zBuffer(args, { password, maxBuffer = 512 * 1024 * 1024 } = {}) {
  const bin = await locate7z();
  const full = withPassword(args, password);
  try {
    const result = await execFileAsync(bin, full, { windowsHide: true, maxBuffer, encoding: 'buffer' });
    return Buffer.from(result.stdout || Buffer.alloc(0));
  } catch (err) {
    const wrapped = new Error((err.stderr || Buffer.alloc(0)).toString() || err.message);
    wrapped.stderr = err.stderr;
    throw wrapped;
  }
}

// 始终显式传 -p：不给密码时传空串，让 7z 直接报错而不是停下来交互式询问密码
// （execFile 的 stdin 是管道，7z 一旦提示输入密码会一直等待，导致请求挂死）。
function withPassword(args, password) {
  const out = args.slice();
  out.splice(1, 0, `-p${password || ''}`);
  return out;
}

// 解析 `7z l -slt`：每个条目块以 `----------` 分隔，含 Path/Attributes/Size/Encrypted。
function parseListing(text) {
  const entries = [];
  const map = new Map();
  let cur = null;

  const flush = () => {
    if (cur && cur.hasAttr && cur.path) {
      const dir = Boolean(cur.dir);
      const size = Number(cur.size) || 0;
      const encrypted = Boolean(cur.encrypted);
      if (dir) {
        if (!map.has(cur.path)) map.set(cur.path, { entry: null, dir: true, size: 0, encrypted });
      } else {
        map.set(cur.path, { entry: cur.path, dir: false, size, encrypted });
      }
      entries.push({ path: cur.path, dir, size, encrypted });
    }
    cur = null;
  };

  for (const rawLine of String(text).split(/\r?\n/)) {
    if (/^----------/.test(rawLine)) { flush(); continue; }
    const match = /^([A-Za-z][A-Za-z0-9 ]*)\s*=\s?(.*)$/.exec(rawLine);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2];
    if (key === 'Path') {
      if (cur) flush();
      cur = { path: normalizeEntryPath(value), hasAttr: false, dir: false, size: 0, encrypted: false };
    } else if (cur) {
      if (key === 'Attributes') {
        cur.hasAttr = true;
        cur.dir = /D/.test(value);
      } else if (key === 'Size') {
        cur.size = Number(value) || 0;
      } else if (key === 'Encrypted') {
        cur.encrypted = /^[+]/.test(value);
      }
    }
  }
  flush();
  return { entries, map };
}

function registerSession(sevenPath, data, needsPassword, tempFile = null) {
  const id = randomBytes(8).toString('hex');
  sessions.set(id, {
    id,
    sevenPath,
    map: data.map,
    list: data.list,
    encrypted: data.encrypted,
    password: data.password || null,
    tempFile,
    expires: Date.now() + SESSION_TTL_MS,
  });
  return {
    id,
    encrypted: data.encrypted,
    needsPassword: Boolean(needsPassword),
    count: data.list.filter((item) => !item.dir).length,
    entries: data.list,
  };
}

function isWrongPassword(stderr) {
  return /wrong password/i.test(stderr || '');
}

export async function open7z(sevenPath, { password } = {}) {
  let stat;
  try {
    stat = await fs.stat(sevenPath);
  } catch {
    throw new HttpError(404, 'archive not found');
  }
  if (!stat.isFile()) throw new HttpError(400, 'not a file');
  if (stat.size > MAX_ZIP_BYTES) throw new HttpError(413, 'archive too large (limit 512 MB)');

  const { stdout, stderr, code } = await run7z(['l', '-slt', '-sccUTF-8', sevenPath], { password });
  if (code === 'ENOENT') throw new HttpError(500, '未找到 7z 可执行文件');

  const hasEncMarker = /encrypted/i.test(`${stdout}\n${stderr}`);
  // 没给密码却列不出来（头部加密），按"需要密码"处理，先建一个空会话等待解锁。
  if (!password && (isWrongPassword(stderr) || (hasEncMarker && code !== 0))) {
    return registerSession(sevenPath, { map: new Map(), list: [], encrypted: true, password: null }, true);
  }
  if (password && isWrongPassword(stderr)) throw new HttpError(401, '密码不正确');

  const { entries, map } = parseListing(stdout);
  const encrypted = entries.some((item) => item.encrypted && !item.dir) || (code !== 0 && hasEncMarker);
  return registerSession(sevenPath, { map, list: entries, encrypted, password: password || null }, encrypted && !password);
}

export async function unlock7z(id, password) {
  const session = sessions.get(id);
  if (!session) throw new HttpError(404, 'archive session not found');
  if (typeof password !== 'string' || !password) throw new HttpError(400, 'password is required');

  const { stdout, stderr, code } = await run7z(['l', '-slt', '-sccUTF-8', session.sevenPath], { password });
  if (code === 'ENOENT') throw new HttpError(500, '未找到 7z 可执行文件');
  if (isWrongPassword(stderr)) return { ok: false, error: '密码不正确' };

  const { entries, map } = parseListing(stdout);
  const encrypted = entries.some((item) => item.encrypted && !item.dir);

  // 头未加密时 7z 用错误密码也能列出条目，必须真正解一个最小的加密条目来校验密码。
  const probe = entries
    .filter((item) => item.encrypted && !item.dir)
    .sort((a, b) => a.size - b.size)[0];
  if (probe) {
    const tested = await run7z(['t', session.sevenPath, probe.path, '-y'], { password });
    if (tested.code !== 0 || isWrongPassword(tested.stderr)) return { ok: false, error: '密码不正确' };
  }

  session.map = map;
  session.list = entries;
  session.encrypted = encrypted;
  session.password = password;
  session.expires = Date.now() + SESSION_TTL_MS;
  return { ok: true };
}

export async function read7zEntry(id, entryPath) {
  const session = sessions.get(id);
  if (!session) throw new HttpError(404, 'archive session not found');
  const normalized = normalizeEntryPath(entryPath);
  const record = session.map.get(normalized);
  if (!record || record.dir) return null;
  if (record.encrypted && !session.password) throw new HttpError(401, 'password required');
  try {
    return await run7zBuffer(['e', session.sevenPath, '-so', normalized, '-y'], { password: session.password || undefined });
  } catch (err) {
    if (isWrongPassword(err.stderr)) throw new HttpError(401, '密码不正确');
    throw err;
  }
}

export function peek7z(id) {
  const session = sessions.get(id);
  if (!session) throw new HttpError(404, 'archive session not found');
  if (session.expires < Date.now()) {
    sessions.delete(id);
    throw new HttpError(410, 'archive session expired');
  }
  session.expires = Date.now() + SESSION_TTL_MS;
  return {
    id,
    path: session.sevenPath,
    encrypted: session.encrypted,
    entries: session.list,
    map: session.map,
    list: session.list,
  };
}

export async function close7z(id) {
  const session = sessions.get(id);
  if (!session) return false;
  sessions.delete(id);
  if (session.tempFile) await fs.unlink(session.tempFile).catch(() => {});
  return true;
}

// 内存中的归档（嵌套归档 / 封面探测）：落临时文件后用 7z 打开，close 时一并清理。
export async function open7zFromBytes(bytes, { password } = {}) {
  const tmp = path.join(os.tmpdir(), `zb7z-${randomBytes(6).toString('hex')}.bin`);
  await fs.writeFile(tmp, Buffer.from(bytes));
  try {
    const info = await open7z(tmp, { password });
    const session = sessions.get(info.id);
    if (session) session.tempFile = tmp;
    return info;
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}

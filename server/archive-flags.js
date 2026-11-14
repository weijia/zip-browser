/**
 * 归档加密探测 —— 只服务于文件列表里的「🔒 加密」标记。
 *
 * 设计边界（很重要）：
 * - 只读文件尾部 / 头部若干 KB，绝不整文件读入、绝不解压、绝不启动 7z 进程。
 * - 返回 true / false / 'unknown'。'unknown' 表示判不准，前端不显示标记，
 *   **绝不会**被当成「未加密」。
 * - .zip 走 central directory 精确判定；.7z / .rar 走文件头尽力判定；
 *   .tar / .gz / .bz2 / .xz 容器本身没有密码，直接判 false。
 * - 结果按 path + size + mtime 缓存，列目录反复刷新不重复读盘。
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_PROBE_SIZE = 512 * 1024 * 1024;   // 与 zip 打开上限一致，超大包不探测
const MAX_CD_BYTES = 16 * 1024 * 1024;      // central directory 读取上限
const MAX_ENTRIES = 200_000;                // 条目数上限，防畸形头把内存吃满
const TAIL_FIRST = 4096;                    // 绝大多数 zip 只需读尾部 4KB
const TAIL_MAX = 22 + 65535 + 20;           // EOCD + 最长注释 + Zip64 locator
const HEAD_BYTES = 4096;
const CACHE_LIMIT = 1000;

const NO_PASSWORD_EXT = new Set(['.tar', '.tgz', '.gz', '.bz2', '.xz']);
const SIG_EOCD = 0x06054b50;
const SIG_ZIP64_LOCATOR = 0x07064b50;
const SIG_ZIP64_EOCD = 0x06064b50;
const SIG_CENTRAL = 0x02014b50;
const AES_EXTRA_ID = 0x9901;
const ZIP7Z_MAGIC = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
// 7z 的 AES-256 coder method id，出现在 next header 的 coder 链里。
const ZIP7Z_AES_CODER = Buffer.from([0x06, 0xf1, 0x07, 0x01]);
const RAR4_MAGIC = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
const RAR5_MAGIC = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);

const cache = new Map();

function extOf(abs) {
  return String(path.win32.extname(abs) || '').toLowerCase();
}

async function readAt(handle, position, length) {
  if (!Number.isSafeInteger(position) || position < 0 || !Number.isSafeInteger(length) || length <= 0) {
    return Buffer.alloc(0);
  }
  const buf = Buffer.allocUnsafe(length);
  const { bytesRead } = await handle.read(buf, 0, length, position);
  return bytesRead === length ? buf : buf.subarray(0, bytesRead);
}

/** 从尾部缓冲区里找最靠后的 EOCD；返回索引，找不到返回 -1。 */
function findEocd(buf) {
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) !== SIG_EOCD) continue;
    const comment = buf.readUInt16LE(i + 20);
    // 允许 EOCD 后面有少量跟随数据（某些工具会追加），但不能越界。
    if (i + 22 + comment <= buf.length) return i;
  }
  return -1;
}

async function readEocd(handle, size) {
  const first = Math.min(size, TAIL_FIRST);
  let start = size - first;
  let buf = await readAt(handle, start, first);
  let index = findEocd(buf);
  if (index >= 0) return { buf, start, index };
  if (size <= first) return null;
  const len = Math.min(size, TAIL_MAX);
  start = size - len;
  buf = await readAt(handle, start, len);
  index = findEocd(buf);
  return index >= 0 ? { buf, start, index } : null;
}

function aesExtraHasEncryption(cd, from, length) {
  let pos = from;
  const end = Math.min(from + length, cd.length);
  while (pos + 4 <= end) {
    const id = cd.readUInt16LE(pos);
    const size = cd.readUInt16LE(pos + 2);
    if (id === AES_EXTRA_ID) return true;
    if (pos + 4 + size > end) break;
    pos += 4 + size;
  }
  return false;
}

/** 解析已读入的 central directory；纯函数，便于单测。 */
export function detectZipEncryption(cd, totalEntries) {
  if (cd.length < 46 || cd.readUInt32LE(0) !== SIG_CENTRAL) return 'unknown';
  let pos = 0;
  let seen = 0;
  let encrypted = false;
  const limit = Number.isFinite(totalEntries) && totalEntries > 0
    ? Math.min(totalEntries, MAX_ENTRIES)
    : MAX_ENTRIES;
  while (pos + 46 <= cd.length && seen < limit) {
    if (cd.readUInt32LE(pos) !== SIG_CENTRAL) return encrypted ? true : 'unknown';
    const flags = cd.readUInt16LE(pos + 8);
    const nameLen = cd.readUInt16LE(pos + 28);
    const extraLen = cd.readUInt16LE(pos + 30);
    const commentLen = cd.readUInt16LE(pos + 32);
    const next = pos + 46 + nameLen + extraLen + commentLen;
    if (next > cd.length) return encrypted ? true : 'unknown';
    if ((flags & 0x1) !== 0) encrypted = true;
    else if (aesExtraHasEncryption(cd, pos + 46 + nameLen, extraLen)) encrypted = true;
    pos = next;
    seen += 1;
  }
  // 没读完声明的条目数说明头被截断，不能断言「未加密」。
  if (!encrypted && seen < limit && totalEntries > seen) return 'unknown';
  return encrypted;
}

async function probeZip(handle, size) {
  const tail = await readEocd(handle, size);
  if (!tail) return 'unknown';
  const { buf, start, index } = tail;
  const eocdPos = start + index;
  let cdSize = buf.readUInt32LE(index + 12);
  let cdOffset = buf.readUInt32LE(index + 16);
  let total = buf.readUInt16LE(index + 10);

  // Zip64：EOCD 里的哨兵值 → 读 locator 与 Zip64 EOCD 拿真实 64 位字段。
  if (cdSize === 0xffffffff || cdOffset === 0xffffffff || total === 0xffff) {
    const locator = await readAt(handle, Math.max(0, eocdPos - 20), 20);
    if (locator.length >= 20 && locator.readUInt32LE(0) === SIG_ZIP64_LOCATOR) {
      const z64Pos = Number(locator.readBigUInt64LE(8));
      const z64 = await readAt(handle, z64Pos, 56);
      if (z64.length >= 56 && z64.readUInt32LE(0) === SIG_ZIP64_EOCD) {
        total = Number(z64.readBigUInt64LE(32));
        cdSize = Number(z64.readBigUInt64LE(40));
        cdOffset = Number(z64.readBigUInt64LE(48));
      }
    }
  }
  if (!Number.isSafeInteger(cdSize) || !Number.isSafeInteger(cdOffset) || !Number.isSafeInteger(total)) {
    return 'unknown';
  }
  if (cdSize === 0 && total === 0) return false; // 空归档
  if (cdSize <= 0 || cdSize > MAX_CD_BYTES || total > MAX_ENTRIES || cdOffset < 0 || cdOffset > size) {
    return 'unknown';
  }

  let cd = await readAt(handle, cdOffset, cdSize);
  if (cd.length < 46 || cd.length < cdSize || cd.readUInt32LE(0) !== SIG_CENTRAL) {
    // 自解压包 / 前置数据：EOCD 里的绝对偏移会整体错位，用 EOCD 位置反推。
    const alt = eocdPos - cdSize;
    if (alt >= 0) cd = await readAt(handle, alt, cdSize);
  }
  return detectZipEncryption(cd, total);
}

async function probe7z(handle, size) {
  const head = await readAt(handle, 0, Math.min(size, HEAD_BYTES));
  if (head.length < 32 || !head.subarray(0, 6).equals(ZIP7Z_MAGIC)) return 'unknown';
  const nextOffset = Number(head.readBigUInt64LE(12));
  const nextSize = Number(head.readBigUInt64LE(20));
  const at = 32 + nextOffset;
  if (!Number.isSafeInteger(at) || at < 32 || at >= size) return 'unknown';
  const marker = await readAt(handle, at, 1);
  if (marker.length < 1) return 'unknown';
  if (marker[0] === 0x17) return true; // kEncodedHeader：连目录都加密
  if (marker[0] !== 0x01) return 'unknown';
  // kHeader：目录可读，内容是否加密看 coder 链里有没有 AES coder id。
  const wanted = nextSize || 65536;
  const body = await readAt(handle, at, Math.min(wanted, 1024 * 1024));
  if (body.indexOf(ZIP7Z_AES_CODER) >= 0) return true;
  // 只读了截断的一部分时不能断言「未加密」。
  return body.length < wanted ? 'unknown' : false;
}

async function probeRar(handle, size) {
  const head = await readAt(handle, 0, Math.min(size, HEAD_BYTES));
  if (head.length >= 7 && head.subarray(0, 7).equals(RAR4_MAGIC)) {
    if (head.length < 20) return 'unknown';
    const mainFlags = head.readUInt16LE(10);
    if ((mainFlags & 0x0080) !== 0) return true; // MHD_PASSWORD：-hp 连头一起加密
    const mainSize = head.readUInt16LE(12);
    const at = 7 + mainSize;
    if (at + 7 > head.length) return 'unknown';
    if (head[at + 2] === 0x74) { // 0x74 = 文件头
      const flags = head.readUInt16LE(at + 3);
      return (flags & 0x0004) !== 0; // LHD_PASSWORD
    }
    return 'unknown';
  }
  if (head.length >= 8 && head.subarray(0, 8).equals(RAR5_MAGIC)) {
    // RAR5 头加密时 CRC32 不再匹配；内容加密在 extra area 里，判不准就 unknown。
    if (head.length < 16) return 'unknown';
    const expected = head.readUInt32LE(8);
    let pos = 12;
    let headerSize = 0;
    let mult = 1;
    let bytes = 0;
    while (pos < head.length && bytes < 8) {
      const b = head[pos];
      pos += 1;
      bytes += 1;
      headerSize += (b & 0x7f) * mult;
      mult *= 128;
      if ((b & 0x80) === 0) break;
    }
    if (headerSize <= 0 || pos + headerSize > head.length) return 'unknown';
    const actual = crc32(head.subarray(pos, pos + headerSize));
    return actual !== expected ? true : 'unknown';
  }
  return 'unknown';
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 清空缓存（测试用）。 */
export function clearArchiveEncryptionCache() {
  cache.clear();
}

/**
 * @returns {Promise<boolean|'unknown'>} true=加密，false=未加密，'unknown'=判不准
 */
export async function probeArchiveEncryption(abs, { size, mtimeMs } = {}) {
  let fileSize = size;
  let mtime = mtimeMs;
  if (!Number.isFinite(fileSize) || !Number.isFinite(mtime)) {
    try {
      const stat = await fs.stat(abs);
      fileSize = stat.size;
      mtime = stat.mtimeMs;
    } catch {
      return 'unknown';
    }
  }
  if (fileSize > MAX_PROBE_SIZE) return 'unknown';
  const key = `${String(abs).toLowerCase()}|${fileSize}|${Math.round(mtime)}`;
  if (cache.has(key)) return cache.get(key);

  const ext = extOf(abs);
  let result = 'unknown';
  if (NO_PASSWORD_EXT.has(ext)) {
    result = false;
  } else {
    let handle;
    try {
      handle = await fs.open(abs, 'r');
      if (ext === '.zip') result = await probeZip(handle, fileSize);
      else if (ext === '.7z') result = await probe7z(handle, fileSize);
      else if (ext === '.rar') result = await probeRar(handle, fileSize);
      else result = 'unknown';
    } catch {
      result = 'unknown';
    } finally {
      await handle?.close().catch(() => {});
    }
  }

  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    for (const old of cache.keys()) {
      cache.delete(old);
      if (cache.size <= CACHE_LIMIT) break;
    }
  }
  return result;
}

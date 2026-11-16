// 文件列表分片的纯函数层：用户选择集 + 一次物理扫描结果 → 待写入的 JSON 文件。
// 不依赖 DOM / 网络，可直接被 node:test 引入。格式见 my-data/docs/formats/file-list-format.md。
//
// 落点：file-list/<volumeId>/<原始目录层级>/files.json（无 host 层）。
// 路径过长 / 段数过多 / 段不安全时回退到卷根下的哈希片。

import {
  sanitizeKey, hostRelativePath, driveOfHostRelative,
  volumeIdOf, volumeKeyFor,
} from './manifest-export.js';
import { cleanCrc32 } from './manifest-selection.js';

export const MAX_SEGMENTS = 24;
export const MAX_PATH_CHARS = 512;
export const DEFAULT_MAX_FILES = 20000;
export const FILE_LIST_GENERATOR = 'zip-browser';

/** 同步 64-bit FNV-1a，对 UTF-8 字节计算，Node / 浏览器结果一致。 */
export function fnv1a64Hex(text) {
  const source = String(text ?? '');
  let bytes;
  if (typeof TextEncoder !== 'undefined') bytes = new TextEncoder().encode(source);
  else bytes = Buffer.from(source, 'utf8');
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of bytes) {
    hash = (((hash ^ BigInt(byte)) * prime) & mask);
  }
  return hash.toString(16).padStart(16, '0');
}

/** 单段安全化：保留 Unicode（含中文/空格/前导点），只替换真正不合法的字符。 */
export function safeSegment(value) {
  const text = String(value ?? '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/^\s+/, '')
    .replace(/[\s.]+$/, '');
  if (!text || text === '.' || text === '..') return '';
  // 孤立代理项无法被远端编码成合法 UTF-8 路径。
  if (/[\uD800-\uDFFF]/u.test(text)) return '';
  return text;
}

/** host-relative → 远端路径段数组；任一段不可用则返回 null（触发哈希回退）。 */
export function mirrorSegments(rel) {
  const parts = String(rel || '').split('/').filter(Boolean);
  if (!parts.length) return null;
  const out = [];
  for (let index = 0; index < parts.length; index += 1) {
    if (index === 0) {
      // 盘符段：C: → C，去冒号、统一大写。
      const drive = safeSegment(parts[0].replace(/:$/, ''));
      if (!drive) return null;
      out.push(drive.toUpperCase());
    } else {
      if (parts[index] === '.' || parts[index] === '..') return null;
      const safe = safeSegment(parts[index]);
      if (!safe) return null;
      out.push(safe);
    }
  }
  return out;
}

function fallbackPath(rel, volumeKey) {
  const parts = String(rel || '').split('/').filter(Boolean);
  const base = sanitizeKey(parts[parts.length - 1] || '') || 'dir';
  const dirKey = `${base}-${fnv1a64Hex(String(rel).toLowerCase()).slice(0, 12)}`;
  return {
    path: `file-list/${sanitizeKey(volumeKey)}/${dirKey}.json`,
    fallback: true,
    dirKey,
  };
}

/** 选中目录 → 分片相对路径（不含 <base> 前缀）。 */
export function mirrorPathFor(rel, volumeKey) {
  const segments = mirrorSegments(rel);
  const root = `file-list/${sanitizeKey(volumeKey)}`;
  if (!segments || segments.length > MAX_SEGMENTS) return fallbackPath(rel, volumeKey);
  const path = `${root}/${segments.join('/')}/files.json`;
  if (path.length > MAX_PATH_CHARS) return fallbackPath(rel, volumeKey);
  return { path, fallback: false, dirKey: '' };
}

/** 取消选择时写的空片（后端不支持 unlink 时用；读取侧忽略 removed:true）。 */
export function removedDoc(rel, host, now = Date.now()) {
  return {
    version: 2,
    generator: FILE_LIST_GENERATOR,
    source: String(host || 'pc'),
    dir: rel,
    removed: true,
    files: [],
    generatedAt: now,
  };
}

/** 写入片内前做白名单投影：配置仓里的多余字段一律不带进导出文件。 */
export function normalizeDocCopyRefs(list) {
  return (Array.isArray(list) ? list : [])
    .map((ref) => ({
      id: String(ref?.id || ''),
      kind: ['url', 'path', 'other'].includes(ref?.kind) ? ref.kind : 'other',
      value: String(ref?.value || ''),
      label: String(ref?.label || ''),
      note: String(ref?.note || ''),
      addedAt: Number(ref?.addedAt) || 0,
    }))
    .filter((ref) => ref.id && ref.value)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * 把网络副本引用按 host-relative 路径（大小写不敏感）合并进片。
 * B 通道生成新片与 C 通道 patch 旧片都调用它，保证两边写出的结构逐字节一致。
 * 引用只是预留位置，不表示副本已存在、也不触发任何上传。
 */
export function applyCopyRefs(doc, copiesByRel = {}) {
  let files = 0;
  let refs = 0;
  for (const file of (Array.isArray(doc.files) ? doc.files : [])) {
    const key = String(file.path || '').toLowerCase();
    const list = normalizeDocCopyRefs(copiesByRel?.[key]);
    if (list.length) {
      file.copies = list;
      files += 1;
      refs += list.length;
    } else {
      delete file.copies;
    }
  }
  doc.copyRefs = { files, refs };
  return doc;
}

/** 只认完整 SHA-256；扫描超时/失败时文件没有 hash，不能把半成品写进片。 */
function normalizeHash(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return /^sha256:[0-9a-f]{64}$/.test(text) ? text : '';
}

/** 幂等签名：路径/大小/mtime/hash/CRC + 完整性标记 + 网络副本引用；不变则零写入。 */
export function fileListSignature(doc) {
  const rows = (doc.files || [])
    .map((file) => {
      const copies = (file.copies || [])
        .map((ref) => `${ref.id}\0${ref.kind}\0${ref.value}\0${ref.label ?? ''}\0${ref.note ?? ''}\0${ref.addedAt ?? ''}`)
        .join('\n');
      return `${file.path}\0${file.size ?? ''}\0${file.mtime ?? ''}\0${file.hash ?? ''}\0${file.crc32 ?? ''}\0${copies}`;
    })
    .join('\n');
  return fnv1a64Hex([
    doc.dir || '', String(doc.recursive), String(Boolean(doc.incomplete)),
    String(Boolean(doc.truncated)), rows,
  ].join('\0')).slice(0, 16);
}

function findByAbs(map, abs) {
  if (!map || typeof map !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(map, abs)) return map[abs];
  const wanted = String(abs).toLowerCase();
  const key = Object.keys(map).find((item) => item.toLowerCase() === wanted);
  return key ? map[key] : null;
}

function normalizeFile(raw, tagsByRel) {
  const rel = hostRelativePath(raw?.path);
  if (!rel) return null;
  const tags = Array.isArray(tagsByRel?.[rel]) ? tagsByRel[rel].filter((t) => typeof t === 'string') : [];
  const hash = normalizeHash(raw?.hash);
  return {
    path: rel,
    name: raw.name || rel.split('/').pop(),
    size: Number(raw.size) || 0,
    sizeOnDisk: Number(raw.sizeOnDisk) || Number(raw.size) || 0,
    mtime: Number(raw.mtime) || 0,
    tags,
    archive: false,
    ...(hash ? { hash } : {}),
  };
}

function uniqueSorted(list) {
  const seen = new Set();
  const out = [];
  for (const file of list) {
    if (!file) continue;
    const key = file.path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(file);
  }
  out.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));
  return out;
}

function baseDoc({ host, volumeId, letter, dir, recursive, now, revision }) {
  return {
    version: 2,
    generator: FILE_LIST_GENERATOR,
    source: host,
    volumeId,
    letter,
    dir,
    recursive,
    part: { id: sanitizeKey(host), revision, generatedAt: now },
    generatedAt: now,
    incomplete: false,
    truncated: false,
    fileCount: 0,
    files: [],
  };
}

/**
 * 生成全部 file-list 分片。
 * @param {object} options
 * @param {object} options.selection  {dirs:[{path,recursive}], files:[object|string]}
 * @param {object} options.scan       /api/mft/scan 的响应
 * @param {string} options.host       主机名
 * @param {object} options.volumes    盘符 -> volumeId
 * @param {object} options.tagsByRel  host-relative 路径 -> 标签数组
 * @param {object} options.copiesByRel 小写 host-relative 路径 -> 网络副本引用数组（仅预留）
 * @returns {{files:Array<{path,json,rootAbs,kind}>, stats:object}}
 */
export function buildFileListDocs({
  selection = {}, scan = {}, host = 'pc', volumes = {}, tagsByRel = {},
  copiesByRel = {}, now = Date.now(), revision = 1, maxFiles = DEFAULT_MAX_FILES,
} = {}) {
  const safeHost = String(host || 'pc').trim() || 'pc';
  const out = [];
  const stats = {
    dirs: 0, files: 0, fallback: 0, incomplete: 0, truncated: 0, picked: 0,
    copyFiles: 0, copyRefs: 0,
  };
  const seenDirs = new Set();

  const dirs = Array.isArray(selection.dirs) ? selection.dirs : [];
  for (const entry of dirs) {
    const abs = typeof entry === 'string' ? entry : entry?.path;
    const rel = hostRelativePath(abs);
    if (!rel) continue;
    const norm = rel.toLowerCase();
    if (seenDirs.has(norm)) continue; // Windows 大小写不敏感，远端敏感
    seenDirs.add(norm);

    const drive = driveOfHostRelative(rel);
    const volumeKey = volumeKeyFor(drive, safeHost, volumes);
    const volumeId = volumeIdOf(drive, volumes) || volumeKey;
    const target = mirrorPathFor(rel, volumeKey);
    const rawFiles = findByAbs(scan.files, abs) || [];
    const status = findByAbs(scan.status, abs) || { incomplete: true, truncated: false, total: 0 };
    const list = uniqueSorted(rawFiles.map((raw) => normalizeFile(raw, tagsByRel)));
    const truncated = Boolean(status.truncated) || list.length > maxFiles;
    const doc = baseDoc({
      host: safeHost,
      volumeId,
      letter: drive || '',
      dir: rel,
      recursive: typeof entry === 'string' ? true : entry.recursive !== false,
      now,
      revision,
    });
    doc.incomplete = Boolean(status.incomplete);
    doc.truncated = truncated;
    doc.files = truncated ? list.slice(0, maxFiles) : list;
    doc.fileCount = doc.files.length;
    applyCopyRefs(doc, copiesByRel);
    if (target.fallback) { doc.fallbackPath = true; doc.dirKey = target.dirKey; }
    out.push({ path: target.path, json: doc, rootAbs: abs, kind: 'file-list' });
    stats.copyFiles += doc.copyRefs.files;
    stats.copyRefs += doc.copyRefs.refs;
    stats.dirs += 1;
    stats.files += doc.fileCount;
    if (target.fallback) stats.fallback += 1;
    if (doc.incomplete) stats.incomplete += 1;
    if (doc.truncated) stats.truncated += 1;
  }

  // 手工加入的散文件 / zip 内文件：按卷分组，每卷一份 <volumeId>/_picked.json。
  const picked = new Map();
  const rawPicked = Array.isArray(selection.files) ? selection.files : [];
  for (const item of rawPicked) {
    const raw = typeof item === 'string' ? { path: item } : item;
    if (!raw?.path) continue;
    const isZip = String(raw.path).startsWith('zip:') || Boolean(raw.archive);
    const rel = isZip ? String(raw.path) : hostRelativePath(raw.path);
    if (!rel) continue;
    const drive = isZip ? null : driveOfHostRelative(rel);
    const zipRel = isZip ? /^zip:([A-Za-z]:)/.exec(rel)?.[1] : null;
    const volumeKey = volumeKeyFor(drive || zipRel || '', safeHost, volumes);
    const volumeId = volumeIdOf(drive || zipRel || '', volumes) || volumeKey;
    const group = picked.get(volumeKey) || { volumeId, files: [] };
    const hash = isZip ? '' : normalizeHash(raw.hash);
    const crc32 = isZip ? cleanCrc32(raw.crc32) : '';
    group.files.push({
      path: rel,
      name: raw.name || rel.split(/[/#]/).pop(),
      size: Number(raw.size) || 0,
      sizeOnDisk: Number(raw.sizeOnDisk) || Number(raw.size) || 0,
      mtime: Number(raw.mtime) || 0,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      archive: isZip,
      ...(hash ? { hash } : {}),
      ...(crc32 ? { crc32 } : {}),
    });
    picked.set(volumeKey, group);
  }
  for (const [volumeKey, group] of picked) {
    const doc = baseDoc({
      host: safeHost, volumeId: group.volumeId, letter: '', dir: '',
      recursive: false, now, revision,
    });
    doc.picked = true;
    doc.files = uniqueSorted(group.files);
    doc.fileCount = doc.files.length;
    applyCopyRefs(doc, copiesByRel);
    stats.copyFiles += doc.copyRefs.files;
    stats.copyRefs += doc.copyRefs.refs;
    out.push({
      path: `file-list/${sanitizeKey(volumeKey)}/_picked.json`,
      json: doc,
      rootAbs: '',
      kind: 'file-list-picked',
    });
    stats.picked += doc.fileCount;
  }
  return { files: out, stats };
}

// 清单生成的三套「选择集」持久化：纯函数部分可直接被 node:test 引入。
//   /manifest-selection     哪些目录进 struct 清单（含选项）
//   /file-list-selection    哪些目录的文件列表要上传 + 手工加入的散文件
//   /file-copy-refs         某个文件预留的网络副本链接 / 远端路径（仅元数据，不上传内容）
// 三者相互独立，均存 zen-fs-config 配置仓，localStorage 作同步镜像与兜底。

import { hostRelativePath } from './manifest-export.js';

export const APP_ID = 'zip-browser';
export const DIR_SELECTION_KEY = '/manifest-selection';
export const FILE_SELECTION_KEY = '/file-list-selection';
export const COPY_REFS_KEY = '/file-copy-refs';
export const LOCAL_DIR_KEY = 'zip-browser:manifest-selection:v1';
export const LOCAL_FILE_KEY = 'zip-browser:file-list-selection:v1';
export const LOCAL_COPY_KEY = 'zip-browser:file-copy-refs:v1';

const MAX_DIRS = 300;
const MAX_FILES = 2000;
const MAX_COPY_FILES = 5000;
export const MAX_REFS_PER_FILE = 20;
export const MAX_REF_VALUE = 2048;
const REF_KINDS = new Set(['url', 'path', 'other']);

export function emptyDirSelection() {
  return {
    v: 1, updatedAt: 0, dirs: [],
    options: { includeFiles: false, includeSize: true, includeMtime: true, recursive: true },
  };
}

export function emptyFileSelection() {
  return { v: 1, updatedAt: 0, dirs: [], files: [] };
}

function cleanPath(value) {
  const text = String(value ?? '').trim();
  if (text.startsWith('zip:')) return text;
  // OpenList Go 宿主把本机盘符暴露成 /C/...；这类 POSIX 绝对路径必须原样保留，
  // 不能转成 C:\...，否则选择集会被清空、API 也会找不到存储。
  if (/^\/+/.test(text)) return text.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!/^[A-Za-z]:[\\/]/i.test(text)) return '';
  // 盘符路径统一成单反斜杠：不同来源（浏览页 / 粘贴 / URL）可能带 / 或重复分隔符。
  return text.replace(/\//g, '\\').replace(/\\+/g, '\\');
}

/** ZIP 中央目录的 CRC-32 是 8 位十六进制；空、缺失或非数字都视为没有。 */
export function cleanCrc32(value) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).trim().toLowerCase();
  if (/^[0-9a-f]{8}$/.test(text)) return text;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return '';
  return (num >>> 0).toString(16).padStart(8, '0');
}

function norm(value) {
  return cleanPath(value).toLowerCase();
}

function cleanDirList(raw) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const path = cleanPath(typeof item === 'string' ? item : item?.path);
    if (!path) continue;
    const key = norm(path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      path,
      recursive: typeof item === 'string' ? true : item.recursive !== false,
    });
    if (out.length >= MAX_DIRS) break;
  }
  return out;
}

function cleanFileList(raw) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const source = typeof item === 'string' ? { path: item } : item;
    const path = cleanPath(source?.path);
    if (!path) continue;
    const key = norm(path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      path,
      name: String(source?.name || path.split(/[\\/#]/).pop() || ''),
      size: Number(source?.size) || 0,
      sizeOnDisk: Number(source?.sizeOnDisk) || 0,
      mtime: Number(source?.mtime) || 0,
      archive: path.startsWith('zip:') || Boolean(source?.archive),
      crc32: cleanCrc32(source?.crc32),
    });
    if (out.length >= MAX_FILES) break;
  }
  return out;
}

export function sanitizeDirSelection(raw) {
  const base = emptyDirSelection();
  if (!raw || typeof raw !== 'object') return base;
  return {
    v: 1,
    updatedAt: Number(raw.updatedAt) || 0,
    dirs: cleanDirList(raw.dirs),
    options: {
      includeFiles: Boolean(raw.options?.includeFiles),
      includeSize: raw.options?.includeSize !== false,
      includeMtime: raw.options?.includeMtime !== false,
      recursive: raw.options?.recursive !== false,
    },
  };
}

export function sanitizeFileSelection(raw) {
  const base = emptyFileSelection();
  if (!raw || typeof raw !== 'object') return base;
  return {
    v: 1,
    updatedAt: Number(raw.updatedAt) || 0,
    dirs: cleanDirList(raw.dirs),
    files: cleanFileList(raw.files),
  };
}

/**
 * 网络副本引用：只保存「链接 / 远端路径」这类预留位置，本程序从不上传文件内容。
 * key 用 host-relative 原样路径（可读性），查找一律大小写不敏感（Windows / 远端差异）。
 */
export function emptyCopyRefs() {
  return { v: 1, updatedAt: 0, refs: {} };
}

function relKey(value) {
  const text = String(value ?? '').trim();
  if (text.startsWith('zip:')) return text; // 包内文件伪路径
  return hostRelativePath(text) || '';
}

function newRefId() {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 拒绝可执行 scheme 与本机绝对路径：网络副本不能是 javascript: 或 C:\… */
export function cleanCopyRef(raw) {
  const value = String(raw?.value ?? '').trim().slice(0, MAX_REF_VALUE);
  if (!value || /[\x00-\x1f]/.test(value)) return null;
  if (/^(javascript|data|vbscript|file):/i.test(value)) return null;
  if (/^[A-Za-z]:[\\/]/i.test(value)) return null;
  const kind = REF_KINDS.has(raw?.kind) ? raw.kind : (/^https?:\/\//i.test(value) ? 'url' : 'path');
  return {
    id: String(raw?.id || newRefId()).slice(0, 64),
    kind,
    value,
    label: String(raw?.label ?? '').trim().slice(0, 120),
    note: String(raw?.note ?? '').trim().slice(0, 500),
    addedAt: Number(raw?.addedAt) || Date.now(),
  };
}

export function sanitizeCopyRefs(raw) {
  const result = emptyCopyRefs();
  result.updatedAt = Number(raw?.updatedAt) || 0;
  const source = raw && typeof raw === 'object' ? raw.refs : null;
  if (!source || typeof source !== 'object') return result;
  const seen = new Map();
  let files = 0;
  for (const [key, list] of Object.entries(source)) {
    const rel = relKey(key);
    if (!rel || files >= MAX_COPY_FILES) continue;
    const lower = rel.toLowerCase();
    const target = seen.get(lower) || rel;
    const bucket = result.refs[target] || (result.refs[target] = []);
    for (const item of (Array.isArray(list) ? list : [])) {
      const clean = cleanCopyRef(item);
      if (!clean || bucket.some((ref) => ref.id === clean.id)) continue;
      bucket.push(clean);
      if (bucket.length >= MAX_REFS_PER_FILE) break;
    }
    if (bucket.length && !seen.has(lower)) { seen.set(lower, target); files += 1; }
  }
  for (const key of Object.keys(result.refs)) {
    if (!result.refs[key].length) delete result.refs[key];
  }
  return result;
}

function copyBucket(state, path) {
  const rel = relKey(path);
  if (!rel) return null;
  const key = Object.keys(state?.refs || {})
    .find((item) => item.toLowerCase() === rel.toLowerCase());
  return key ? { key, list: state.refs[key] || [] } : { key: rel, list: [] };
}

export function copyRefsFor(state, path) {
  const bucket = copyBucket(state, path);
  return bucket ? bucket.list.map((ref) => ({ ...ref })) : [];
}

export function addCopyRef(state, path, ref) {
  const bucket = copyBucket(state, path);
  if (!bucket) return state;
  const clean = cleanCopyRef({ ...ref, addedAt: ref?.addedAt || Date.now() });
  if (!clean) return state;
  return sanitizeCopyRefs({
    ...state,
    refs: { ...(state?.refs || {}), [bucket.key]: [...bucket.list, clean] },
  });
}

export function updateCopyRef(state, path, id, patch = {}) {
  const bucket = copyBucket(state, path);
  if (!bucket || !bucket.list.some((ref) => ref.id === id)) return state;
  const list = bucket.list.map((ref) => (ref.id === id
    ? cleanCopyRef({ ...ref, ...patch, id: ref.id, addedAt: ref.addedAt })
    : ref)).filter(Boolean);
  return sanitizeCopyRefs({ ...state, refs: { ...(state?.refs || {}), [bucket.key]: list } });
}

export function removeCopyRef(state, path, id) {
  const bucket = copyBucket(state, path);
  if (!bucket) return state;
  const list = bucket.list.filter((ref) => ref.id !== id);
  const refs = { ...(state?.refs || {}) };
  if (list.length) refs[bucket.key] = list;
  else delete refs[bucket.key];
  return sanitizeCopyRefs({ ...state, refs });
}

/** 供导出层合并：小写 host-relative → 引用数组。 */
export function copyRefsByRel(state) {
  const out = {};
  for (const [rel, list] of Object.entries(state?.refs || {})) {
    if (Array.isArray(list) && list.length) out[rel.toLowerCase()] = list.map((ref) => ({ ...ref }));
  }
  return out;
}

export function copyRefTotals(state) {
  const refs = state?.refs || {};
  return {
    files: Object.keys(refs).length,
    refs: Object.values(refs).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
  };
}

export function isDirSelected(selection, path) {
  const key = norm(path);
  return Boolean(key) && (selection?.dirs || []).some((item) => norm(item.path) === key);
}

export function isFileSelected(selection, path) {
  const key = norm(path);
  return Boolean(key) && (selection?.files || []).some((item) => norm(item.path) === key);
}

function withDir(selection, sanitize, path, recursive) {
  const clean = cleanPath(path);
  if (!clean || isDirSelected(selection, clean)) return selection;
  return sanitize({
    ...selection,
    dirs: [...(selection.dirs || []), { path: clean, recursive: recursive !== false }],
  });
}

export function addDirSelection(selection, path, recursive = true) {
  return withDir(selection, sanitizeDirSelection, path, recursive);
}

export function removeDirSelection(selection, path) {
  const key = norm(path);
  if (!key) return selection;
  return sanitizeDirSelection({
    ...selection,
    dirs: (selection.dirs || []).filter((item) => norm(item.path) !== key),
  });
}

export function addFileDirSelection(selection, path, recursive = true) {
  return withDir(selection, sanitizeFileSelection, path, recursive);
}

export function removeFileDirSelection(selection, path) {
  const key = norm(path);
  if (!key) return selection;
  return sanitizeFileSelection({
    ...selection,
    dirs: (selection.dirs || []).filter((item) => norm(item.path) !== key),
  });
}

export function addPickedFile(selection, item) {
  const path = cleanPath(item?.path);
  if (!path || isFileSelected(selection, path)) return selection;
  return sanitizeFileSelection({ ...selection, files: [...(selection.files || []), item] });
}

export function removePickedFile(selection, path) {
  const key = norm(path);
  if (!key) return selection;
  return sanitizeFileSelection({
    ...selection,
    files: (selection.files || []).filter((item) => norm(item.path) !== key),
  });
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
}

/**
 * 三套选择集的仓库。repoFactory 传 null 可完全禁用 zen-fs-config（单测用）。
 * onChange 在本地修改后触发，供面板重绘与触发增量导出。
 */
export function createSelectionStore({ storage, repoFactory, onChange } = {}) {
  const globals = typeof window !== 'undefined' ? window : globalThis;
  const local = storage || globals.localStorage || memoryStorage();
  const factory = repoFactory === undefined
    ? (() => {
      const lib = globals.ZenFSConfig;
      return lib && typeof lib.createConfigRepo === 'function'
        ? () => lib.createConfigRepo(APP_ID)
        : null;
    })()
    : repoFactory;
  const specs = {
    dirs: { config: DIR_SELECTION_KEY, local: LOCAL_DIR_KEY, empty: emptyDirSelection, clean: sanitizeDirSelection },
    files: { config: FILE_SELECTION_KEY, local: LOCAL_FILE_KEY, empty: emptyFileSelection, clean: sanitizeFileSelection },
    copies: { config: COPY_REFS_KEY, local: LOCAL_COPY_KEY, empty: emptyCopyRefs, clean: sanitizeCopyRefs },
  };
  let repo = null;
  let backend = 'local';
  const state = { dirs: emptyDirSelection(), files: emptyFileSelection(), copies: emptyCopyRefs() };

  function readLocal(key, clean) {
    try { return clean(JSON.parse(local.getItem(key) || 'null')); } catch { return null; }
  }
  function readRepo(key, clean) {
    try { return clean(repo?.getConfig?.(key)); } catch { return null; }
  }
  function writeLocal(key, value) {
    try { local.setItem(key, JSON.stringify(value)); } catch { /* 隐私模式忽略 */ }
  }
  function writeRepo(key, value) {
    try { repo?.setConfig?.(key, value); } catch { /* 降级由 localStorage 兜底 */ }
  }
  function stamp(value) {
    return { ...value, updatedAt: Date.now() };
  }

  async function init() {
    if (factory) {
      try { repo = await factory(); backend = 'zenfs'; } catch { repo = null; backend = 'local'; }
    }
    for (const [which, spec] of Object.entries(specs)) {
      const chosen = newer(readRepo(spec.config, spec.clean), readLocal(spec.local, spec.clean)) || spec.empty();
      state[which] = chosen;
      writeLocal(spec.local, chosen);
      if (!readRepo(spec.config, spec.clean)) writeRepo(spec.config, chosen);
    }
    return snapshot();
  }

  function get(which) {
    return JSON.parse(JSON.stringify(state[which] || specs[which].empty()));
  }

  function set(which, value) {
    const spec = specs[which];
    if (!spec) return get(which);
    state[which] = stamp(spec.clean(value));
    writeLocal(spec.local, state[which]);
    writeRepo(spec.config, state[which]);
    if (onChange) onChange(which, snapshot());
    return get(which);
  }

  function snapshot() {
    return { dirs: get('dirs'), files: get('files'), copies: get('copies') };
  }

  return {
    init, get, set, snapshot,
    get backend() { return backend; },
  };
}

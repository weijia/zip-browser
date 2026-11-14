// 清单生成的两套「选择集」持久化：纯函数部分可直接被 node:test 引入。
//   /manifest-selection     哪些目录进 struct 清单（含选项）
//   /file-list-selection    哪些目录的文件列表要上传 + 手工加入的散文件
// 两者相互独立，均存 zen-fs-config 配置仓，localStorage 作同步镜像与兜底。

export const APP_ID = 'zip-browser';
export const DIR_SELECTION_KEY = '/manifest-selection';
export const FILE_SELECTION_KEY = '/file-list-selection';
export const LOCAL_DIR_KEY = 'zip-browser:manifest-selection:v1';
export const LOCAL_FILE_KEY = 'zip-browser:file-list-selection:v1';

const MAX_DIRS = 300;
const MAX_FILES = 2000;

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
  if (!/^[A-Za-z]:[\\/]/i.test(text)) return '';
  // 盘符路径统一成单反斜杠：不同来源（浏览页 / 粘贴 / URL）可能带 / 或重复分隔符。
  return text.replace(/\//g, '\\').replace(/\\+/g, '\\');
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
 * 两套选择集的仓库。repoFactory 传 null 可完全禁用 zen-fs-config（单测用）。
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
  };
  let repo = null;
  let backend = 'local';
  const state = { dirs: emptyDirSelection(), files: emptyFileSelection() };

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
    return { dirs: get('dirs'), files: get('files') };
  }

  return {
    init, get, set, snapshot,
    get backend() { return backend; },
  };
}

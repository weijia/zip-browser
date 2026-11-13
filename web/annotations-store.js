// 目录标签与书签的数据层。
// 纯函数部分不依赖 DOM，可直接被 node:test 引入；持久化部分以 zen-fs-config
// 的 config-sync 为主，localStorage 作为同步镜像与初始化失败时的兜底。

export const STORAGE_KEY = 'zip-browser:annotations:v1';
export const CONFIG_KEY = '/annotations';
export const APP_ID = 'zip-browser';

const MAX_TAGS_PER_KEY = 24;
const MAX_BOOKMARKS = 500;
const MAX_TAG_LENGTH = 32;

const PALETTE = [
  { bg: '#e6f1fb', fg: '#185fa5' },
  { bg: '#faeeda', fg: '#854f0b' },
  { bg: '#e1f5ee', fg: '#0f6e56' },
  { bg: '#eeedfe', fg: '#534ab7' },
  { bg: '#faece7', fg: '#993c1d' },
  { bg: '#eaf3de', fg: '#3b6d11' },
];

export function tagColor(tag) {
  let hash = 0;
  for (const char of String(tag)) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function normalizeLocal(value) {
  const text = String(value || '').replace(/\//g, '\\').replace(/\\+/g, '\\');
  const match = /^([A-Za-z]):\\?(.*)$/.exec(text);
  if (!match) return String(value || '').trim().toLowerCase();
  const tail = match[2].replace(/\\$/, '');
  return `${match[1].toLowerCase()}:\\${tail.toLowerCase()}`;
}

// 包内路径大小写敏感，只做规范化，不转小写；同时挡住 ../ 越界。
export function normalizeEntryDir(entry) {
  const parts = String(entry || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
}

export function keyForDir(abs) {
  return `fs:${normalizeLocal(abs)}`;
}

export function keyForZip(zipPath, entryDir = '') {
  return `zip:${normalizeLocal(zipPath)}#${normalizeEntryDir(entryDir)}`;
}

/** 从 zip 的 current URL(/zip/<id>/...) 取「所在目录」，文件页面归属它所在的目录。 */
export function zipEntryDir(current, id) {
  const raw = String(current || '').split('?')[0].split('#')[0];
  const prefix = `/zip/${id}/`;
  if (!raw.startsWith(prefix)) return '';
  let rest = raw.slice(prefix.length);
  try {
    rest = decodeURIComponent(rest);
  } catch { /* keep raw */ }
  if (!rest || rest.endsWith('/')) return normalizeEntryDir(rest);
  const parts = rest.split('/');
  parts.pop();
  return normalizeEntryDir(parts.join('/'));
}

export function keyForTarget(target) {
  if (!target) return null;
  if (target.kind === 'dir') return keyForDir(target.path);
  if (target.kind === 'preview' && target.dir) return keyForDir(target.dir);
  if (target.kind === 'zip' && target.zipPath) {
    return keyForZip(target.zipPath, zipEntryDir(target.current, target.id));
  }
  return null;
}

export function emptyData() {
  return { v: 1, updatedAt: 0, tags: {}, paths: {}, bookmarks: [] };
}

function cleanTag(tag) {
  return String(tag || '').trim().slice(0, MAX_TAG_LENGTH);
}

export function sanitizeData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const tags = {};
  for (const [key, value] of Object.entries(raw.tags || {})) {
    if (typeof key !== 'string' || !Array.isArray(value)) continue;
    const list = [...new Set(value.map(cleanTag).filter(Boolean))].slice(0, MAX_TAGS_PER_KEY);
    if (list.length) tags[key] = list;
  }
  // key 只用于匹配，原始路径另存一份：Windows 路径大小写/盘符在 key 里被规范化过，
  // 标签筛选要跳回目录必须拿到未改写的路径。
  const paths = {};
  for (const [key, value] of Object.entries(raw.paths || {})) {
    if (typeof key !== 'string' || !value || typeof value !== 'object') continue;
    if (value.kind !== 'dir' && value.kind !== 'zip') continue;
    const path = typeof value.path === 'string' ? value.path : '';
    if (!path) continue;
    paths[key] = {
      kind: value.kind,
      path,
      zipPath: value.kind === 'zip' && typeof value.zipPath === 'string' ? value.zipPath : '',
      entry: normalizeEntryDir(value.entry),
      label: cleanTag(value.label) || path,
    };
  }
  const bookmarks = (Array.isArray(raw.bookmarks) ? raw.bookmarks : [])
    .filter((item) => item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.key === 'string'
      && (item.kind === 'dir' || item.kind === 'zip') && typeof item.path === 'string')
    .slice(0, MAX_BOOKMARKS)
    .map((item) => ({
      id: item.id,
      key: item.key,
      kind: item.kind,
      label: cleanTag(item.label) || item.path,
      path: item.path,
      zipPath: typeof item.zipPath === 'string' ? item.zipPath : '',
      entry: normalizeEntryDir(item.entry),
      createdAt: Number(item.createdAt) || 0,
    }));
  return {
    v: 1,
    updatedAt: Number(raw.updatedAt) || 0,
    tags,
    paths,
    bookmarks,
  };
}

function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  const score = (data) => Object.keys(data.tags).length + data.bookmarks.length;
  return score(a) >= score(b) ? a : b;
}

export function rememberPath(data, key, descriptor) {
  if (!key || !descriptor || !descriptor.path) return data;
  if (data.paths?.[key]?.path === descriptor.path) return data;
  return {
    ...data,
    paths: {
      ...(data.paths || {}),
      [key]: {
        kind: descriptor.kind === 'zip' ? 'zip' : 'dir',
        path: descriptor.path,
        zipPath: descriptor.zipPath || '',
        entry: normalizeEntryDir(descriptor.entry),
        label: cleanTag(descriptor.label) || descriptor.path,
      },
    },
  };
}

export function describeKey(data, key) {
  return data?.paths?.[key] || null;
}

export function listTags(data, key) {
  return (data?.tags?.[key] || []).slice();
}

export function addTag(data, key, tag) {
  const clean = cleanTag(tag);
  if (!clean || !key) return data;
  const existing = listTags(data, key);
  if (existing.includes(clean) || existing.length >= MAX_TAGS_PER_KEY) return data;
  return { ...data, tags: { ...data.tags, [key]: [...existing, clean] } };
}

export function removeTag(data, key, tag) {
  if (!key || !data?.tags?.[key]) return data;
  const next = listTags(data, key).filter((item) => item !== tag);
  const tags = { ...data.tags };
  if (next.length) tags[key] = next;
  else delete tags[key];
  return { ...data, tags };
}

export function allTags(data) {
  const counts = new Map();
  for (const list of Object.values(data?.tags || {})) {
    for (const tag of new Set(list)) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export function keysByTag(data, tag) {
  const clean = cleanTag(tag);
  if (!clean) return [];
  return Object.entries(data?.tags || {})
    .filter(([, list]) => list.includes(clean))
    .map(([key]) => key);
}

export function isBookmarked(data, key) {
  return (data?.bookmarks || []).some((item) => item.key === key);
}

export function addBookmark(data, bookmark) {
  if (!bookmark || !bookmark.key) return data;
  if (isBookmarked(data, bookmark.key)) return data;
  if ((data.bookmarks || []).length >= MAX_BOOKMARKS) return data;
  const item = {
    id: bookmark.id,
    key: bookmark.key,
    kind: bookmark.kind,
    label: cleanTag(bookmark.label) || bookmark.path,
    path: bookmark.path,
    zipPath: bookmark.zipPath || '',
    entry: normalizeEntryDir(bookmark.entry),
    createdAt: bookmark.createdAt || Date.now(),
  };
  const withPath = rememberPath(data, bookmark.key, item);
  return { ...withPath, bookmarks: [...(withPath.bookmarks || []), item] };
}

export function removeBookmark(data, id) {
  return { ...data, bookmarks: (data?.bookmarks || []).filter((item) => item.id !== id) };
}

export function renameBookmark(data, id, label) {
  const clean = cleanTag(label);
  if (!clean) return data;
  return {
    ...data,
    bookmarks: (data?.bookmarks || []).map((item) => (item.id === id ? { ...item, label: clean } : item)),
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

/**
 * 创建一个带持久化的仓库。repoFactory 传 null 可完全禁用 zen-fs-config（单测用）。
 * onChange 在每次本地修改或多标签页同步后触发，供 UI 重绘。
 */
export function createAnnotationStore({ storage, repoFactory, onChange } = {}) {
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

  let repo = null;
  let backend = 'local';
  let data = emptyData();
  const notify = () => { if (onChange) onChange(snapshot()); };

  function readLocal() {
    try {
      return sanitizeData(JSON.parse(local.getItem(STORAGE_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  function readRepo() {
    try {
      return sanitizeData(repo?.getConfig?.(CONFIG_KEY));
    } catch {
      return null;
    }
  }

  function writeLocal(next) {
    try {
      local.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* 隐私模式或配额满：仍有内存态可用 */ }
  }

  function writeRepo(next) {
    if (!repo || typeof repo.setConfig !== 'function') return;
    try {
      repo.setConfig(CONFIG_KEY, next);
    } catch { /* 降级由 localStorage 兜底 */ }
  }

  function adopt(next) {
    data = next || emptyData();
    writeLocal(data);
    return data;
  }

  async function init() {
    if (factory) {
      try {
        repo = await factory();
        backend = 'zenfs';
      } catch {
        repo = null;
        backend = 'local';
      }
    }
    const merged = newer(readRepo(), readLocal());
    const chosen = merged || { ...emptyData(), updatedAt: Date.now() };
    adopt(chosen);
    // 把较新的一侧补写到另一侧，让两个后端从一开始就一致
    if (readRepo()?.updatedAt !== data.updatedAt) writeRepo(data);
    return { backend, data: snapshot() };
  }

  /** 其他标签页 / 设备同步后重新读取，不重建 repo。 */
  function reload() {
    const merged = newer(readRepo(), readLocal());
    if (merged && merged.updatedAt !== data.updatedAt) {
      data = merged;
      notify();
    }
    return snapshot();
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(data));
  }

  function mutate(fn) {
    const next = fn(data);
    if (next === data) return snapshot();
    data = { ...next, v: 1, updatedAt: Date.now() };
    writeLocal(data);
    writeRepo(data);
    notify();
    return snapshot();
  }

  async function flush() {
    if (repo && typeof repo.flush === 'function') {
      try { await repo.flush(); } catch { /* 离线时忽略 */ }
    }
  }

  return {
    init, reload, snapshot, mutate, flush,
    get backend() { return backend; },
    get data() { return data; },
  };
}

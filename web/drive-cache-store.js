// 网盘信息登记的数据层：本机磁盘（由服务端 API 落盘）是权威来源，
// zen-fs-config 的 /drive-cache 配置是同步副本，localStorage 是同步失败时的兜底镜像。
//
// 数据流：用户登记 → 服务端写 codes/cached/<后端>-<序号>/info.json →
// 前端拿到最新条目列表 → 写 zen-fs-config + localStorage → 其他设备可见。
// 这里不缓存网盘文件内容，也不与配置同步组的数据组发生关系。
//
// repo 来源：不再自己 createConfigRepo('zip-browser')（那是没有 replica 的孤岛）。
// 改为订阅 config-repo 公告板——全应用只 connect 一次（manifest-sync 的
// configurator），拿到的 repo（appId=dir-struct-gen）由 store 共享。
// 显式传 repoFactory（含 null）时仍按调用方控制，供单测使用。

import { getConfigRepo, onConfigRepo } from './config-repo.js';

export const STORAGE_KEY = 'zip-browser:drive-cache:v1';
export const CONFIG_KEY = '/drive-cache';
export const APP_ID = 'dir-struct-gen';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

export function emptyData() {
  return { v: 1, updatedAt: 0, entries: [] };
}

function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.dir !== 'string') return null;
  const text = (value) => (typeof value === 'string' ? value : null);
  return {
    dir: raw.dir,
    seq: Number(raw.seq) || 0,
    backend: text(raw.backend) || '',
    label: text(raw.label),
    total: text(raw.total),
    free: text(raw.free),
    upQuota: text(raw.upQuota),
    downQuota: text(raw.downQuota),
    upRemaining: text(raw.upRemaining),
    downRemaining: text(raw.downRemaining),
    volumeId: text(raw.volumeId),
    drive: text(raw.drive),
    sourceHost: text(raw.sourceHost),
    fileCount: text(raw.fileCount),
    totalSize: text(raw.totalSize),
    hasChildren: text(raw.hasChildren),
    updatedAt: Number(raw.updatedAt) || 0,
    hasInfo: raw.hasInfo !== false,
  };
}

export function sanitizeData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const entries = (Array.isArray(raw.entries) ? raw.entries : [])
    .map(cleanEntry)
    .filter(Boolean);
  return { v: 1, updatedAt: Number(raw.updatedAt) || 0, entries };
}

/** 以已有登记为模板生成新登记的提交内容：字段照搬，名称加「副本」以便区分。 */
export function makeCopyPayload(entry) {
  const raw = entry && typeof entry === 'object' ? entry : {};
  const backend = String(raw.backend || '');
  const label = String(raw.label || '').trim();
  return {
    backend,
    label: `${label || backend || '网盘'} 副本`,
    total: raw.total ?? null,
    free: raw.free ?? null,
    upQuota: raw.upQuota ?? null,
    downQuota: raw.downQuota ?? null,
    upRemaining: raw.upRemaining ?? null,
    downRemaining: raw.downRemaining ?? null,
  };
}

/**
 * 创建网盘信息仓库。repoFactory 传 null 可禁用 zen-fs-config（单测用）。
 * onChange(data) 在每次本地修改后触发。
 */
export function createDriveCacheStore({ storage, repoFactory, onChange } = {}) {
  const globals = typeof window !== 'undefined' ? window : globalThis;
  const local = storage || globals.localStorage || memoryStorage();
  // 显式传 repoFactory 时按调用方（单测）控制；否则订阅共享的 connect repo。
  const useShared = repoFactory === undefined;
  const factory = useShared ? null : repoFactory;

  let repo = null;
  let backend = 'local';
  let data = emptyData();

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
    } catch { /* 隐私模式：仍有内存态可用 */ }
  }

  function writeRepo(next) {
    if (!repo || typeof repo.setConfig !== 'function') return;
    try {
      repo.setConfig(CONFIG_KEY, next);
    } catch { /* 降级由 localStorage 兜底 */ }
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(data));
  }

  function adopt(next) {
    data = next || emptyData();
    writeLocal(data);
    return snapshot();
  }

  /** 合并 repo 与本地镜像（取 updatedAt 较新者），并把较新一侧补写到另一侧。 */
  function mergeFromRepo(notify = false) {
    const fromRepo = readRepo();
    const fromLocal = readLocal();
    let chosen = fromRepo && fromLocal
      ? (fromRepo.updatedAt >= fromLocal.updatedAt ? fromRepo : fromLocal)
      : (fromRepo || fromLocal);
    if (!chosen) chosen = { ...emptyData(), updatedAt: Date.now() };
    const changed = chosen.updatedAt !== data.updatedAt;
    adopt(chosen);
    if (readRepo()?.updatedAt !== data.updatedAt) writeRepo(data);
    if (changed && notify && onChange) onChange(snapshot());
    return snapshot();
  }

  /** 收到 connect 的 repo（或断开时的 null）：重合并并通知 UI。 */
  function attachRepo(next) {
    repo = next || null;
    backend = repo ? 'zenfs' : 'local';
    mergeFromRepo(true);
  }

  async function init() {
    if (useShared) {
      // connected 事件晚于 init；先根据当前快照初始化本地，订阅会在 repo 到达时回调。
      repo = getConfigRepo();
      backend = repo ? 'zenfs' : 'local';
      onConfigRepo(attachRepo);
    } else if (factory) {
      try {
        repo = await factory();
        backend = 'zenfs';
      } catch {
        repo = null;
        backend = 'local';
      }
    }
    const fromRepo = readRepo();
    const fromLocal = readLocal();
    // 取 updatedAt 较新的一侧作为初值：远端同步过来的登记优先于本地镜像。
    let chosen = fromRepo && fromLocal
      ? (fromRepo.updatedAt >= fromLocal.updatedAt ? fromRepo : fromLocal)
      : (fromRepo || fromLocal);
    if (!chosen) chosen = { ...emptyData(), updatedAt: Date.now() };
    adopt(chosen);
    if (readRepo()?.updatedAt !== data.updatedAt) writeRepo(data);
    return { backend, data: snapshot() };
  }

  /** 用服务端落盘后的权威条目列表覆盖本地状态并同步到 zen-fs-config。 */
  function setEntries(entries) {
    const cleaned = (Array.isArray(entries) ? entries : []).map(cleanEntry).filter(Boolean);
    data = { v: 1, updatedAt: Date.now(), entries: cleaned };
    writeLocal(data);
    writeRepo(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }

  async function flush() {
    if (repo && typeof repo.flush === 'function') {
      try { await repo.flush(); } catch { /* 离线时忽略 */ }
    }
  }

  return {
    init, setEntries, snapshot, flush,
    get backend() { return backend; },
    get data() { return data; },
  };
}

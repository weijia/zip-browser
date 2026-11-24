// 网盘信息登记的数据层：登记清单是「数据组（网络磁盘）上的一个文件」，
// 不是配置组配置，也不是本机缓存。
//
// 权威来源：数据组根下 `/drive-registry.json`（跨机可见，和 host-disks.v2.json 同一条链路）。
// 本机 `codes/cached/<后端>-<序号>/info.json` 只是该条目在本机的落地副本（服务端 API 读写），
// localStorage 只是 UI 加速的镜像，两者都不参与跨机判断。
//
// 旧名兼容：数据组根下历史文件 `/drive-cache.json` 只读一次，读到就迁到新文件名；
// 旧的配置组配置 `/dir-struct-gen/drive-cache.json` 不再读写（用户要求只用数据组）。
//
// 写入规则：
//   - init 阶段绝不写远端（避免「本地空镜像覆盖远端登记」）；
//   - 合并按 dir 逐条进行，不整表覆盖；
//   - 写完再 flush，并返回真实结果供 UI 显示。

export const STORAGE_KEY = 'zip-browser:drive-registry:v1';
export const LEGACY_STORAGE_KEY = 'zip-browser:drive-cache:v1';
export const REGISTRY_PATH = '/drive-registry.json';
export const LEGACY_REGISTRY_PATH = '/drive-cache.json';

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
    // 是否显示在「此电脑」磁盘列表；缺省显示，隐藏不影响登记本身。
    visible: raw.visible !== false,
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

/** 按 dir 合并：overlay 覆盖 base 的同名条目，base 里多出来的保留。 */
export function mergeEntries(base, overlay) {
  const byDir = new Map();
  for (const entry of (Array.isArray(base) ? base : [])) {
    const clean = cleanEntry(entry);
    if (clean) byDir.set(clean.dir, clean);
  }
  for (const entry of (Array.isArray(overlay) ? overlay : [])) {
    const clean = cleanEntry(entry);
    if (clean) byDir.set(clean.dir, clean);
  }
  return [...byDir.values()].sort((a, b) => (
    a.backend === b.backend ? a.seq - b.seq : a.backend.localeCompare(b.backend)
  ));
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
function isMissingError(err) {
  const code = err?.code || err?.name || '';
  return code === 'ENOENT' || code === 'NotFoundError' || /not found|ENOENT/i.test(String(err?.message || ''));
}

/**
 * 创建网盘登记仓库。
 *
 * @param {object} options
 * @param {Storage} [options.storage]  localStorage 兼容对象（单测注入）
 * @param {() => object|null} [options.readFs] 返回数据组 fs（带 promises 的 writeFile/readFile）
 * @param {() => Promise<any>} [options.flush] 写完后触发数据组 flush
 * @param {(data) => void} [options.onChange]
 */
export function createDriveRegistryStore({ storage, readFs, flush, onChange } = {}) {
  const globals = typeof window !== 'undefined' ? window : globalThis;
  const local = storage || globals.localStorage || memoryStorage();
  // 生产路径（readFs）：数据组文件就是唯一持久化位置，localStorage 仅测试/旧调用点使用。
  const fileMode = typeof readFs === 'function';

  let data = emptyData();
  let lastRemote = null; // { doc, path } | null
  let backend = 'local';

  function readLocal() {
    try {
      const raw = local.getItem(STORAGE_KEY) || local.getItem(LEGACY_STORAGE_KEY) || 'null';
      return sanitizeData(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function writeLocal(next) {
    if (fileMode) return;
    try {
      local.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* 隐私模式：仍有内存态可用 */ }
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(data));
  }

  function adopt(next) {
    data = sanitizeData(next) || emptyData();
    writeLocal(data);
    return snapshot();
  }

  /** 读数据组里的登记文件（新名优先，旧名兜底）。不写、不抛。 */
  async function readRemote() {
    const fp = typeof readFs === 'function' ? readFs() : null;
    if (!fp || typeof fp.readFile !== 'function') {
      lastRemote = null;
      backend = 'local';
      return { doc: null, path: null, error: 'no-group' };
    }
    for (const path of [REGISTRY_PATH, LEGACY_REGISTRY_PATH]) {
      try {
        const raw = await fp.readFile(path, 'utf8');
        const doc = sanitizeData(JSON.parse(raw));
        if (!doc) return { doc: null, path, error: 'parse' };
        lastRemote = { doc, path };
        backend = 'data-group';
        return { doc, path, error: null };
      } catch (err) {
        if (isMissingError(err)) continue;
        backend = 'data-group';
        return { doc: null, path, error: String(err?.message || err) };
      }
    }
    lastRemote = null;
    backend = 'data-group';
    return { doc: null, path: null, error: 'not-found' };
  }

  /** 写数据组登记文件并 flush，返回 { ok, path, error }。 */
  async function writeRemote(next) {
    const fp = typeof readFs === 'function' ? readFs() : null;
    if (!fp || typeof fp.writeFile !== 'function') {
      return { ok: false, error: '同步组未连接，登记只保存在本机' };
    }
    const doc = sanitizeData(next) || emptyData();
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    try {
      await fp.writeFile(REGISTRY_PATH, text);
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
    try {
      if (typeof flush === 'function') await flush();
    } catch (err) {
      return { ok: false, path: REGISTRY_PATH, error: `已写入本地副本，同步失败：${err?.message || err}` };
    }
    lastRemote = { doc, path: REGISTRY_PATH };
    backend = 'data-group';
    return { ok: true, path: REGISTRY_PATH, error: null };
  }

  /** 启动：只读，不写远端；无同步组时不读旧 localStorage 镜像。 */
  async function init() {
    if (!fileMode) {
      const fromLocal = readLocal();
      if (fromLocal) adopt(fromLocal);
    }
    const remote = await readRemote();
    if (remote.doc) adopt(remote.doc);
    return { backend, data: snapshot(), remote };
  }

  /** 合并一组本机条目（服务端落盘结果）进当前登记清单，再写回数据组。 */
  async function upsert(entries) {
    const merged = mergeEntries(data.entries, entries);
    data = { v: 1, updatedAt: Date.now(), entries: merged };
    writeLocal(data);
    const result = await writeRemote(data);
    if (onChange) onChange(snapshot());
    return { ...result, data: snapshot() };
  }

  /** 从登记清单里移除一条（删除登记），再写回数据组。 */
  async function remove(dir) {
    const key = String(dir || '');
    if (!key) return { ok: false, error: '缺少登记目录名', data: snapshot() };
    data = {
      v: 1,
      updatedAt: Date.now(),
      entries: data.entries.filter((entry) => entry.dir !== key),
    };
    writeLocal(data);
    const result = await writeRemote(data);
    if (onChange) onChange(snapshot());
    return { ...result, data: snapshot() };
  }

  /** 只更新内存/本地镜像（远端清单已读过时用），不写数据组。 */
  function adoptRemote(entries) {
    const merged = mergeEntries(data.entries, entries);
    data = { v: 1, updatedAt: Date.now(), entries: merged };
    writeLocal(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }

  /** 直接用一份文档替换内存/本地镜像（不写数据组）。 */
  function adoptDoc(doc) {
    adopt(doc);
    if (onChange) onChange(snapshot());
    return snapshot();
  }

  return {
    init, upsert, remove, readRemote, writeRemote, adoptRemote, adoptDoc, snapshot,
    get backend() { return backend; },
    get data() { return data; },
    get lastRemote() { return lastRemote; },
  };
}

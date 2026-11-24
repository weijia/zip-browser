// 设备身份注册表的数据层，结构严格遵循 my-data/docs/formats/device-identity-registry.md：
//   { v: 1, updatedAt: <ISO8601>, devices: [{ id, type, primaryName, aliases, links, updatedAt }] }
//
// 这是该格式的第一个生产者：zip-browser 用户手工确认的 SN → volumeId 映射，
// 以 { kind:'serial', value:SN, source:'user' } 的 alias 挂到 type='volume' / id=volumeId 的实体上。
//
// 存储：应用数据只放数据同步组（单一 default 组）根下的 /device-registry.json；
// 配置同步组和 localStorage 都不再作为镜像。旧 repoFactory 参数仅保留给单测。

import { getConfigRepo, onConfigRepo } from './config-repo.js';

export const STORAGE_KEY = 'zip-browser:device-registry:v1';
export const CONFIG_KEY = '/device-registry/identities';
export const DATA_PATH = '/device-registry.json';

const ALIAS_KINDS = new Set([
  'volumeId', 'volumeKey', 'serial', 'diskUuid', 'deviceUuid', 'hostname', 'volumeLabel',
  'driveLetter', 'backendId', 'backendName', 'cacheDir', 'cacheLabel', 'webUuid', 'other',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 磁盘标识既可能是 SN 也可能是 UUID（SMART 记录的 uuid），按值形态选 alias kind。 */
export function diskIdKind(value) {
  return UUID_RE.test(asString(value) || '') ? 'diskUuid' : 'serial';
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

export function emptyRegistry() {
  return { v: 1, updatedAt: new Date(0).toISOString(), devices: [] };
}

function asString(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function timeValue(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = asString(v);
  if (!s) return 0;
  const n = Date.parse(s);
  return Number.isFinite(n) ? n : 0;
}

/** 按 my-data 第 6 节：同一 value+kind 整表最多指向一个 id；重复时保留首次出现。 */
export function sanitizeRegistry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const devices = [];
  const claimed = new Set();
  for (const d of Array.isArray(raw.devices) ? raw.devices : []) {
    if (!d || typeof d !== 'object') continue;
    const id = asString(d.id);
    const type = asString(d.type);
    if (!id || !['volume', 'host', 'disk', 'network'].includes(type)) continue;
    const aliases = [];
    for (const a of Array.isArray(d.aliases) ? d.aliases : []) {
      if (!a || typeof a !== 'object') continue;
      const value = asString(a.value);
      const kind = asString(a.kind);
      if (!value || !kind || !ALIAS_KINDS.has(kind)) continue;
      // deviceUuid / serial 等 alias 在不同实体类型上语义不同：
      //   volume.deviceUuid = 「该卷来自哪台主机」的冗余标记
      //   host.deviceUuid   = 主机的别名 UUID
      //   disk.serial       = 物理磁盘别名（可与 volume.serial 映射同值但语义不同）
      // 因此 host / disk 按 type 分域去重，volume / network 共用默认域。
      const unique = type === 'host' || type === 'disk'
        ? `${type}\u0000${kind}\u0000${value.toLowerCase()}`
        : `${kind}\u0000${value.toLowerCase()}`;
      if (claimed.has(unique)) continue;
      claimed.add(unique);
      const alias = { value, kind, source: asString(a.source) || 'user' };
      const observedAt = asString(a.observedAt);
      if (observedAt) alias.observedAt = observedAt;
      aliases.push(alias);
    }
    const links = {};
    if (d.links && typeof d.links === 'object') {
      const deviceUuid = asString(d.links.deviceUuid);
      if (deviceUuid) links.deviceUuid = deviceUuid;
      for (const key of ['hostnames', 'volumeIds', 'backendIds', 'cacheDirs']) {
        const arr = (Array.isArray(d.links[key]) ? d.links[key] : [])
          .map(asString).filter(Boolean);
        if (arr.length) links[key] = arr;
      }
    }
    devices.push({
      id, type,
      primaryName: asString(d.primaryName) || id,
      aliases,
      ...(Object.keys(links).length ? { links } : {}),
      updatedAt: asString(d.updatedAt) || new Date(timeValue(d.updatedAt)).toISOString(),
    });
  }
  return {
    v: 1,
    updatedAt: asString(raw.updatedAt) || new Date(timeValue(raw.updatedAt)).toISOString(),
    devices,
  };
}

/**
 * 纯函数：把一条手工映射写入注册表（volumeId 为规范 ID，SN 作为 serial alias）。
 * 同一 SN 已指向别的 volumeId 时抛错——按 my-data 第 6 节不自动归并，交由用户裁决。
 */
export function upsertVolumeMapping(registry, input) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const volumeId = asString(input?.volumeId);
  const serial = asString(input?.serial);
  if (!volumeId || !serial) throw new Error('缺少 volumeId 或 SN');

  for (const d of base.devices) {
    if (d.id === volumeId) continue;
    if (d.aliases.some((a) => a.kind === 'serial' && a.value.toLowerCase() === serial.toLowerCase())) {
      throw new Error(`SN ${serial} 已映射到 ${d.id}，请先删除原映射`);
    }
  }

  const now = new Date().toISOString();
  let device = base.devices.find((d) => d.id === volumeId && d.type === 'volume');
  if (!device) {
    device = { id: volumeId, type: 'volume', primaryName: input.primaryName || volumeId, aliases: [], updatedAt: now };
    base.devices.push(device);
  }
  const setAlias = (kind, value, source = 'user') => {
    if (!value) return;
    const existing = device.aliases.find((a) => a.kind === kind);
    if (existing) { existing.value = value; existing.source = source; }
    else device.aliases.push({ value, kind, source });
  };
  setAlias('volumeId', volumeId, 'dir-struct-gen');
  setAlias('serial', serial, 'user');
  setAlias('hostname', asString(input.hostname), 'user');
  setAlias('driveLetter', asString(input.drive), 'user');
  setAlias('deviceUuid', asString(input.deviceUuid), 'user');
  if (Array.isArray(input.hostnames) && input.hostnames.length) {
    device.links = { ...(device.links || {}), hostnames: input.hostnames.map(asString).filter(Boolean) };
  }
  if (asString(input.deviceUuid)) {
    device.links = { ...(device.links || {}), deviceUuid: asString(input.deviceUuid) };
  }
  device.updatedAt = now;
  base.updatedAt = now;
  return base;
}

/** 纯函数：删除一条映射；若实体除 volumeId 外无 alias，则整条删除。 */
export function removeVolumeMapping(registry, volumeId) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const idx = base.devices.findIndex((d) => d.id === volumeId && d.type === 'volume');
  if (idx < 0) return base;
  const d = base.devices[idx];
  d.aliases = d.aliases.filter((a) => !(a.kind === 'serial' && a.source === 'user'));
  if (d.aliases.length <= 1 && !Object.keys(d.links || {}).length) base.devices.splice(idx, 1);
  else d.updatedAt = new Date().toISOString();
  base.updatedAt = new Date().toISOString();
  return base;
}

/** 纯函数：SN → volumeId 索引（大小写/空白不敏感）。 */
export function mappingBySerial(registry) {
  const out = new Map();
  for (const d of (sanitizeRegistry(registry) || emptyRegistry()).devices) {
    if (d.type !== 'volume') continue;
    for (const a of d.aliases) {
      if (a.kind !== 'serial') continue;
      out.set(a.value.trim().toLowerCase(), { serial: a.value, volumeId: d.id });
    }
  }
  return out;
}

/** 纯函数：列出用户维护的 SN→volumeId 映射，供 UI 展示。 */
export function listVolumeMappings(registry) {
  const pick = (d, kind) => d.aliases.find((a) => a.kind === kind)?.value || null;
  return (sanitizeRegistry(registry) || emptyRegistry()).devices
    .filter((d) => d.type === 'volume')
    .map((d) => ({
      volumeId: d.id,
      serial: pick(d, 'serial'),
      hostname: pick(d, 'hostname'),
      drive: pick(d, 'driveLetter'),
      deviceUuid: pick(d, 'deviceUuid'),
      source: d.aliases.find((a) => a.kind === 'serial')?.source || null,
    }))
    .filter((m) => m.serial)
    .sort((a, b) => a.volumeId.localeCompare(b.volumeId));
}

/**
 * 纯函数：把一条「别名 UUID → 规范 UUID」写入注册表（host 实体）。
 * 规范 ID 复用其中一个 device_uuid（第 2 节：不新建独立 UUID），其余 UUID 作为
 * deviceUuid alias（source:'user'）挂在同一实体上，主机换 UUID 后仍归一到同一台。
 * 同一别名 UUID 已指向别的规范 UUID 时抛错，不自动归并。
 */
export function upsertHostAlias(registry, input) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const canonical = asString(input?.canonicalUuid);
  const alias = asString(input?.aliasUuid);
  if (!canonical || !alias) throw new Error('缺少规范 UUID 或别名 UUID');
  if (canonical.toLowerCase() === alias.toLowerCase()) throw new Error('规范 UUID 与别名 UUID 不能相同');

  for (const d of base.devices) {
    if (d.type !== 'host') continue;
    // 别名已挂到别的 host → 冲突
    if (d.aliases.some((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() === alias.toLowerCase())
        && d.id.toLowerCase() !== canonical.toLowerCase()) {
      throw new Error(`别名 UUID ${alias} 已归并到 ${d.id}，请先删除原映射`);
    }
    // 规范 UUID 本身已是别的 host 的别名 → 不能反过来当规范
    if (d.id.toLowerCase() !== canonical.toLowerCase()
        && d.aliases.some((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() === canonical.toLowerCase())) {
      throw new Error(`规范 UUID ${canonical} 已是 ${d.id} 的别名，请选它所在的规范 UUID`);
    }
  }

  const now = new Date().toISOString();
  let host = base.devices.find((d) => d.type === 'host' && d.id.toLowerCase() === canonical.toLowerCase());
  if (!host) {
    host = { id: canonical, type: 'host', primaryName: input.primaryName || canonical, aliases: [], updatedAt: now };
    base.devices.push(host);
  }
  if (!host.aliases.some((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() === canonical.toLowerCase())) {
    host.aliases.push({ value: canonical, kind: 'deviceUuid', source: 'user' });
  }
  if (!host.aliases.some((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() === alias.toLowerCase())) {
    host.aliases.push({ value: alias, kind: 'deviceUuid', source: 'user' });
  }
  const hostname = asString(input.hostname);
  if (hostname && !host.aliases.some((a) => a.kind === 'hostname' && a.value.toLowerCase() === hostname.toLowerCase())) {
    host.aliases.push({ value: hostname, kind: 'hostname', source: 'user' });
  }
  if (Array.isArray(input.hostnames) && input.hostnames.length) {
    const merged = new Set([...(host.links?.hostnames || []), ...input.hostnames.map(asString).filter(Boolean)]);
    host.links = { ...(host.links || {}), hostnames: [...merged] };
  }
  host.updatedAt = now;
  base.updatedAt = now;
  return base;
}

/** 纯函数：删除 host 实体上的一条别名 UUID；规范 UUID 自身的 alias 保留。 */
export function removeHostAlias(registry, canonicalUuid, aliasUuid) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const idx = base.devices.findIndex((d) => d.type === 'host' && d.id.toLowerCase() === String(canonicalUuid || '').toLowerCase());
  if (idx < 0) return base;
  const host = base.devices[idx];
  const keep = String(aliasUuid || '').toLowerCase();
  host.aliases = host.aliases.filter((a) => {
    if (a.kind !== 'deviceUuid' || a.source !== 'user') return true;
    if (a.value.toLowerCase() === host.id.toLowerCase()) return true; // 规范 UUID 的自身 alias 始终保留
    return a.value.toLowerCase() !== keep;
  });
  const onlySelf = host.aliases.every((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() === host.id.toLowerCase());
  if (onlySelf && !Object.keys(host.links || {}).length) base.devices.splice(idx, 1);
  else host.updatedAt = new Date().toISOString();
  base.updatedAt = new Date().toISOString();
  return base;
}

/** 纯函数：别名 UUID（小写）→ 规范 UUID 的索引；规范 UUID 自身也指向自己。 */
export function hostAliasIndex(registry) {
  const out = new Map();
  for (const d of (sanitizeRegistry(registry) || emptyRegistry()).devices) {
    if (d.type !== 'host') continue;
    out.set(d.id.toLowerCase(), d.id);
    for (const a of d.aliases) {
      if (a.kind === 'deviceUuid') out.set(a.value.toLowerCase(), d.id);
    }
  }
  return out;
}

/** 纯函数：列出用户维护的 UUID 归并，供 UI 展示。 */
export function listHostAliases(registry) {
  return (sanitizeRegistry(registry) || emptyRegistry()).devices
    .filter((d) => d.type === 'host')
    .map((d) => ({
      canonicalUuid: d.id,
      primaryName: d.primaryName,
      hostnames: d.links?.hostnames || [],
      aliases: d.aliases
        .filter((a) => a.kind === 'deviceUuid' && a.value.toLowerCase() !== d.id.toLowerCase())
        .map((a) => a.value),
    }))
    .sort((a, b) => a.canonicalUuid.localeCompare(b.canonicalUuid));
}

/**
 * 纯函数：把一条「别名标识 → 规范磁盘标识」写入注册表（disk 实体）。
 * 规范 ID 取用户选的一个标识（SN 或 UUID，第 2 节：不新建独立 UUID），
 * 别名标识按值形态记为 serial 或 diskUuid alias（source:'user'）。
 * 别名可以是 SN 也可以是 UUID；冲突规则与 host 一致，不自动归并。
 */
export function upsertDiskAlias(registry, input) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const canonical = asString(input?.canonicalId);
  const alias = asString(input?.aliasId);
  if (!canonical || !alias) throw new Error('缺少规范标识或别名标识');
  if (canonical.toLowerCase() === alias.toLowerCase()) throw new Error('规范标识与别名标识不能相同');

  for (const d of base.devices) {
    if (d.type !== 'disk') continue;
    if (d.aliases.some((a) => a.value.toLowerCase() === alias.toLowerCase())
        && d.id.toLowerCase() !== canonical.toLowerCase()) {
      throw new Error(`别名标识 ${alias} 已归并到 ${d.id}，请先删除原归并`);
    }
    if (d.id.toLowerCase() !== canonical.toLowerCase()
        && d.aliases.some((a) => a.value.toLowerCase() === canonical.toLowerCase())) {
      throw new Error(`规范标识 ${canonical} 已是 ${d.id} 的别名，请选它所在的规范标识`);
    }
  }

  const now = new Date().toISOString();
  let disk = base.devices.find((d) => d.type === 'disk' && d.id.toLowerCase() === canonical.toLowerCase());
  if (!disk) {
    const model = asString(input.model);
    disk = { id: canonical, type: 'disk', primaryName: input.primaryName || model || canonical, aliases: [], updatedAt: now };
    base.devices.push(disk);
  }
  for (const value of [canonical, alias]) {
    if (!disk.aliases.some((a) => a.value.toLowerCase() === value.toLowerCase())) {
      disk.aliases.push({ value, kind: diskIdKind(value), source: 'user' });
    }
  }
  disk.updatedAt = now;
  base.updatedAt = now;
  return base;
}

/** 纯函数：删除 disk 实体上的一条别名标识；规范标识自身的 alias 保留。 */
export function removeDiskAlias(registry, canonicalId, aliasId) {
  const base = sanitizeRegistry(registry) || emptyRegistry();
  const idx = base.devices.findIndex((d) => d.type === 'disk' && d.id.toLowerCase() === String(canonicalId || '').toLowerCase());
  if (idx < 0) return base;
  const disk = base.devices[idx];
  const keep = String(aliasId || '').toLowerCase();
  disk.aliases = disk.aliases.filter((a) => {
    if (a.value.toLowerCase() === disk.id.toLowerCase()) return true;
    return a.value.toLowerCase() !== keep;
  });
  const onlySelf = disk.aliases.every((a) => a.value.toLowerCase() === disk.id.toLowerCase());
  if (onlySelf && !Object.keys(disk.links || {}).length) base.devices.splice(idx, 1);
  else disk.updatedAt = new Date().toISOString();
  base.updatedAt = new Date().toISOString();
  return base;
}

/** 纯函数：别名标识（小写）→ 规范磁盘标识的索引；规范标识自身也指向自己。 */
export function diskAliasIndex(registry) {
  const out = new Map();
  for (const d of (sanitizeRegistry(registry) || emptyRegistry()).devices) {
    if (d.type !== 'disk') continue;
    out.set(d.id.toLowerCase(), d.id);
    for (const a of d.aliases) out.set(a.value.toLowerCase(), d.id);
  }
  return out;
}

/** 纯函数：列出用户维护的磁盘标识归并，供 UI 展示。 */
export function listDiskAliases(registry) {
  return (sanitizeRegistry(registry) || emptyRegistry()).devices
    .filter((d) => d.type === 'disk')
    .map((d) => ({
      canonicalId: d.id,
      primaryName: d.primaryName,
      aliases: d.aliases
        .filter((a) => a.value.toLowerCase() !== d.id.toLowerCase())
        .map((a) => ({ value: a.value, kind: a.kind })),
    }))
    .sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
}

/**
 * 创建注册表仓库。
 *
 * 生产路径（readFs）：只读写数据同步组的 /device-registry.json。
 * 旧参数 storage / repoFactory 仅留给单测，不再写配置同步组。
 */
export function createDeviceRegistryStore({ storage, repoFactory, readFs, flush, onChange } = {}) {
  const globals = typeof window !== 'undefined' ? window : globalThis;
  const local = storage || globals.localStorage || memoryStorage();
  const fileMode = typeof readFs === 'function';
  const useShared = !fileMode && repoFactory === undefined;
  const factory = useShared ? null : repoFactory;

  let repo = null;
  let backend = fileMode ? 'data-group' : 'local';
  let data = emptyRegistry();

  function readLocal() {
    try { return sanitizeRegistry(JSON.parse(local.getItem(STORAGE_KEY) || 'null')); }
    catch { return null; }
  }
  function readRepo() {
    try { return sanitizeRegistry(repo?.getConfig?.(CONFIG_KEY)); }
    catch { return null; }
  }
  function writeLocal(next) {
    try { local.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 隐私模式 */ }
  }
  function writeRepo(next) {
    if (!repo || typeof repo.setConfig !== 'function') return;
    try { repo.setConfig(CONFIG_KEY, next); } catch { /* 本地镜像兜底 */ }
  }
  function snapshot() { return JSON.parse(JSON.stringify(data)); }
  function adopt(next) { data = sanitizeRegistry(next) || emptyRegistry(); if (!fileMode) writeLocal(data); return snapshot(); }

  async function readFileData() {
    const fp = readFs?.();
    if (!fp || typeof fp.readFile !== 'function') return null;
    try { return sanitizeRegistry(JSON.parse(await fp.readFile(DATA_PATH, 'utf8'))); }
    catch { return null; }
  }
  async function writeFileData(next) {
    const fp = readFs?.();
    if (!fp || typeof fp.writeFile !== 'function') return false;
    try {
      await fp.writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`);
      if (typeof flush === 'function') await flush();
      return true;
    } catch { return false; }
  }
  function persist(next) {
    if (fileMode) { void writeFileData(next); return; }
    writeLocal(next);
    writeRepo(next);
  }

  function mergeFromSources(fromRepo, fromLocal, notify = false) {
    let chosen = fromRepo && fromLocal
      ? (timeValue(fromRepo.updatedAt) >= timeValue(fromLocal.updatedAt) ? fromRepo : fromLocal)
      : (fromRepo || fromLocal);
    if (!chosen) chosen = { ...emptyRegistry(), updatedAt: new Date().toISOString() };
    const changed = chosen.updatedAt !== data.updatedAt;
    adopt(chosen);
    if (!fileMode && readRepo()?.updatedAt !== data.updatedAt) writeRepo(data);
    if (changed && notify && onChange) onChange(snapshot());
    return snapshot();
  }

  function mergeFromRepo(notify = false) {
    return mergeFromSources(readRepo(), readLocal(), notify);
  }

  function attachRepo(next) {
    repo = next || null;
    backend = repo ? 'zenfs' : 'local';
    mergeFromRepo(true);
  }

  async function init() {
    if (fileMode) {
      const loaded = await readFileData();
      data = loaded || { ...emptyRegistry(), updatedAt: new Date().toISOString() };
      backend = readFs() ? 'data-group' : 'local';
      if (!loaded && readFs()) await writeFileData(data);
      return { backend, data: snapshot() };
    }
    if (useShared) {
      repo = getConfigRepo();
      backend = repo ? 'zenfs' : 'local';
      onConfigRepo(attachRepo);
    } else if (factory) {
      try { repo = await factory(); backend = 'zenfs'; }
      catch { repo = null; backend = 'local'; }
    }
    mergeFromRepo(false);
    return { backend, data: snapshot() };
  }

  /** 写入一条映射（校验冲突），同步到本地镜像与 repo。 */
  function upsert(input) {
    data = upsertVolumeMapping(data, input);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  function remove(volumeId) {
    data = removeVolumeMapping(data, volumeId);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  /** 写入/删除一条 UUID 归并（host 实体的 deviceUuid alias）。 */
  function upsertHost(input) {
    data = upsertHostAlias(data, input);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  function removeHost(canonicalUuid, aliasUuid) {
    data = removeHostAlias(data, canonicalUuid, aliasUuid);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  /** 写入/删除一条磁盘标识归并（disk 实体）。 */
  function upsertDisk(input) {
    data = upsertDiskAlias(data, input);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  function removeDisk(canonicalId, aliasId) {
    data = removeDiskAlias(data, canonicalId, aliasId);
    persist(data);
    if (onChange) onChange(snapshot());
    return snapshot();
  }
  function flush() {
    if (fileMode) return writeFileData(data);
    if (repo && typeof repo.flush === 'function') {
      try { return repo.flush(); } catch { /* 离线忽略 */ }
    }
    return Promise.resolve();
  }

  return {
    init, snapshot, upsert, remove, upsertHost, removeHost, upsertDisk, removeDisk, flush,
    get backend() { return backend; },
    get data() { return data; },
  };
}

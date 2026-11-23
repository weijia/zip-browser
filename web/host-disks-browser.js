// 「此电脑」下的虚拟挂载点：读取数据同步组写回的 host-disks/host-disks.json，
// 把主机磁盘归并结果当作只读目录树浏览（主机 → 磁盘 → 卷）。
// 只依赖已连接的同步组 fs，不访问本地磁盘；文件不存在时返回 error 提示写回。

import { getConnectedFs, listDataGroupFs, getActiveGroupId } from './manifest-sync.js';
import { readText, isMissing } from './data-group-fs.js';
import { loadVolumeTree, readDirFiles, findTreeNode, mergeChildren } from './volume-tree.js';
export { readText };

export const HOST_DISKS_PATH = 'host-disks/host-disks.json';
/**
 * 新的主文件路径（v2）。
 *
 * 旧的 `host-disks/host-disks.json` 已经被同步组「记住"过一次删除」：只要 gitee /
 * RemoteStorage 上这份文件缺失，下一轮双向同步就会把其它副本上的同路径文件也删掉
 * （gitee 提交历史里反复出现 Delete / Create 就是这个过程），这条状态要等墓碑
 * 保留期（24h）过后才会自然消失。换一个从未被同步跟踪过的新路径可以立刻绕开它。
 */
export const HOST_DISKS_V2_PATH = 'host-disks/host-disks.v2.json';
/**
 * 主文件的镜像副本（兜底副本，只读回退用）。
 *
 * 删除墓碑针对的是具体路径：同步组里一旦存在某个路径的删除墓碑（任一副本写过一次
 * 删除），每一端都会在下一轮 tombstone pass 把它删掉。镜像路径不在这条墓碑范围内，
 * 主文件缺失时可以从它无损恢复。
 */
export const HOST_DISKS_MIRROR_PATH = 'host-disks/host-disks.mirror.json';
const ROOT_LABEL = '主机磁盘（数据组）';

/**
 * 「隐藏无磁盘的主机」开关的存储键。
 * 面板（按主机 / 磁盘视图）与此电脑下的虚拟挂载点共用同一份设置：
 * 在两个入口切换后，另一处下次渲染即读到同一状态。
 */
export const HIDE_NO_DISK_KEY = 'zip-browser:hd-hide-no-disk';
export function readHideNoDisk() {
  try { return localStorage.getItem(HIDE_NO_DISK_KEY) === '1'; } catch { return false; }
}
export function writeHideNoDisk(on) {
  try { localStorage.setItem(HIDE_NO_DISK_KEY, on ? '1' : '0'); } catch { /* 隐私模式忽略 */ }
}

let cached = null; // { doc, error, groupId, attempts, at }

/**
 * 卷别名（人工命名，例如把某个 volumeId 标成「系统盘」）。
 *
 * 文档里存一份顶层映射 `doc.volumeAliases: { [volumeId]: alias }`，随归并结果一起写回数据组，
 * 多端可见；本机再留一份 localStorage 副本，用于「同步组还没连上」或文档暂时缺失时也能显示、
 * 不丢用户刚输入的别名。读取时文档优先（可能是别的端改的），本机副本兜底。
 */
export const VOLUME_ALIAS_KEY = 'zip-browser:hd-volume-aliases';

export function readLocalVolumeAliases() {
  try {
    const raw = localStorage.getItem(VOLUME_ALIAS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function writeLocalVolumeAliases(map) {
  try { localStorage.setItem(VOLUME_ALIAS_KEY, JSON.stringify(map || {})); } catch { /* 隐私模式忽略 */ }
}

/** 设/清本机别名；空字符串视为清除。 */
export function setLocalVolumeAlias(volumeId, alias) {
  const id = text(volumeId);
  if (!id) return readLocalVolumeAliases();
  const map = { ...readLocalVolumeAliases() };
  const name = text(alias).trim();
  if (name) map[id] = name;
  else delete map[id];
  writeLocalVolumeAliases(map);
  return map;
}

/** 展示用的别名表：本机副本打底，文档里的覆盖（文档是跨端真值）。 */
export function volumeAliasesFor(doc) {
  const fromDoc = doc && typeof doc.volumeAliases === 'object' && !Array.isArray(doc.volumeAliases) ? doc.volumeAliases : {};
  return { ...readLocalVolumeAliases(), ...fromDoc };
}

/** 写回前把本机别名（卷 + 逻辑分区）并进文档，避免面板重新归并时把人工命名冲掉。 */
export function attachVolumeAliases(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const local = readLocalVolumeAliases();
  const existing = doc && typeof doc.volumeAliases === 'object' && !Array.isArray(doc.volumeAliases) ? doc.volumeAliases : {};
  const merged = { ...local, ...existing };
  const next = Object.keys(merged).length ? { ...doc, volumeAliases: merged } : doc;
  const localParts = readLocalPartitionAliases();
  const existingParts = doc && typeof doc.partitionAliases === 'object' && !Array.isArray(doc.partitionAliases) ? doc.partitionAliases : {};
  const mergedParts = { ...localParts, ...existingParts };
  return Object.keys(mergedParts).length ? { ...next, partitionAliases: mergedParts } : next;
}

/** 某个卷的别名；没有则返回空串。 */
export function volumeAliasOf(aliases, volumeId) {
  const id = text(volumeId);
  if (!id) return '';
  return text(aliases?.[id]);
}

/**
 * 逻辑分区别名（人工命名，例如把某个分区标成「系统区」）。
 *
 * 分区没有稳定的 ID，用它的虚拟路径当键（`/partition/<主机>/<磁盘SN>/<盘符>`），
 * 文档里存 `doc.partitionAliases: { [路径]: alias }`，本机再留一份 localStorage 副本兜底。
 */
export const PARTITION_ALIAS_KEY = 'zip-browser:hd-partition-aliases';

export function readLocalPartitionAliases() {
  try {
    const raw = localStorage.getItem(PARTITION_ALIAS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function writeLocalPartitionAliases(map) {
  try { localStorage.setItem(PARTITION_ALIAS_KEY, JSON.stringify(map || {})); } catch { /* 隐私模式忽略 */ }
}

/** 设/清本机分区别名；空字符串视为清除。 */
export function setLocalPartitionAlias(partKey, alias) {
  const key = text(partKey);
  if (!key) return readLocalPartitionAliases();
  const map = { ...readLocalPartitionAliases() };
  const name = text(alias).trim();
  if (name) map[key] = name;
  else delete map[key];
  writeLocalPartitionAliases(map);
  return map;
}

/** 展示用的分区别名表：本机副本打底，文档里的覆盖。 */
export function partitionAliasesFor(doc) {
  const fromDoc = doc && typeof doc.partitionAliases === 'object' && !Array.isArray(doc.partitionAliases) ? doc.partitionAliases : {};
  return { ...readLocalPartitionAliases(), ...fromDoc };
}

/** 某个分区的别名；没有则返回空串。 */
export function partitionAliasOf(aliases, partKey) {
  const key = text(partKey);
  if (!key) return '';
  return text(aliases?.[key]);
}

/** 逻辑分区（盘符/设备号）在页面上的规范路径，同时用作别名键。 */
export function partitionAliasKey(hostId, serial, deviceId) {
  if (!text(hostId) || !text(serial) || !text(deviceId)) return '';
  return partitionPath(text(hostId), text(serial), text(deviceId));
}

/**
 * 待写入数据组的「卷 → 磁盘 SN」手工关联。
 *
 * 场景：用户在卷详情里填了 SN，但那一刻同步组还没连上（刷新后的前十几秒很常见）。
 * 这时不能假装成功，也不能让用户重填一次：先把补丁挂起，连接就绪、读到实时文档后再统一写回。
 */
export const PENDING_SERIAL_KEY = 'zip-browser:hd-serial-pending';

export function readPendingSerials() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_SERIAL_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && text(item.volumeId))
      .map((item) => ({ volumeId: text(item.volumeId), serial: text(item.serial) }));
  } catch { return []; }
}

function writePendingSerials(list) {
  try { localStorage.setItem(PENDING_SERIAL_KEY, JSON.stringify(list || [])); } catch { /* 隐私模式忽略 */ }
  return readPendingSerials();
}

/** 记一条挂起补丁（同一卷只保留最后一次填写）。 */
export function addPendingSerial(volumeId, serial) {
  const id = text(volumeId);
  if (!id) return readPendingSerials();
  const list = readPendingSerials().filter((item) => lower(item.volumeId) !== lower(id));
  list.push({ volumeId: id, serial: text(serial).trim() });
  return writePendingSerials(list);
}

/** 写回成功后清掉对应补丁；serial 传了才比对，避免把后来改过的值误删。 */
export function clearPendingSerial(volumeId, serial) {
  const id = text(volumeId);
  const sn = text(serial).trim();
  return writePendingSerials(readPendingSerials().filter((item) => {
    if (lower(item.volumeId) !== lower(id)) return true;
    return sn ? text(item.serial) !== sn : false;
  }));
}

/**
 * 纯函数：给文档里的某个卷手工指定「所属磁盘 SN」，或清空这条手工关联。
 *
 * 用途：遥测没带 serial/deviceId 的卷（例如只按主机名匹配的卷、或清单里只扫到盘符的卷）
 * 在卷详情里查不到所属磁盘。用户知道自己那块盘的 SN 时可以直接填：
 * - 文档里存在该 SN 的磁盘 → 把卷挂到这块盘下，并补齐 serial/deviceId/matchBy=manual-sn；
 * - 文档里没有该 SN 的磁盘 → 只记 manualSerial（等下次归并/补充遥测再对上）；
 * - serial 传空 → 视为取消手工关联：从所有磁盘的 volumes 里摘掉，落到原主机的 unassigned。
 *
 * 不修改入参，返回 `{ doc, matched }`（matched 为命中的 { hostId, serial } 或 null）。
 */
export function applyManualDiskSerial(doc, volumeId, serialValue) {
  const id = text(volumeId);
  if (!id) throw new Error('缺少 volumeId');
  const serial = text(serialValue).trim();
  const volKey = lower(id);
  const serialKey = lower(serial);
  const before = findDiskByVolume(doc, id);

  const hit = serialKey ? findDiskBySerial(doc, serial) : null;

  const hostKeyOfNode = (host) => hostKeyOf(host);
  // 这次改之前，卷是不是只靠「手工 SN」挂上去的？决定取消时回到哪里：
  // 手工挂上的原孤儿 → 回到 orphans（无痕撤销）；本来就是真的挂在盘下 → 回到该主机 unassigned。
  const manualOnly = !serialKey && lower((doc?.volumes || []).find((v) => lower(v.volumeId) === volKey)?.matchBy) === 'manual-sn';
  const targetHostKey = manualOnly ? '' : (hit ? hostKeyOfNode(hit.host) : (before ? hostKeyOfNode(before.host) : ''));
  const targetSerial = hit ? text(hit.disk.serial) : '';

  const hosts = (doc?.hosts || []).map((host) => {
    const key = hostKeyOfNode(host);
    const disks = (host.disks || []).map((disk) => {
      const kept = (disk.volumes || []).filter((v) => lower(typeof v === 'string' ? v : v?.volumeId) !== volKey);
      // 命中这块盘时把卷追加进来（放在末尾，不重排原有顺序）
      const isTarget = Boolean(hit) && key === targetHostKey && lower(disk.serial) === lower(targetSerial);
      return { ...disk, volumes: isTarget ? [...kept, id] : kept };
    });
    // 取消关联时落回 unassigned：先摘掉旧记录避免重复
    const unassigned = (host.unassigned || []).filter((v) => lower(typeof v === 'string' ? v : v?.volumeId) !== volKey);
    if (!serialKey && key === targetHostKey) unassigned.push(id);
    return { ...host, disks, unassigned };
  });

  const volumes = (doc?.volumes || []).map((v) => {
    if (lower(v.volumeId) !== volKey) return v;
    const prevManual = text(v.manualSerial);
    const tel = v.telemetry || {};
    if (!serialKey) {
      const { manualSerial, ...rest } = v;
      // 之前手工挂上时可能把这块盘的 serial/deviceId 写进了遥测；取消时一并摘掉，别留下
      // 「所属磁盘已经没了、却还显示一块盘的 SN」的假信息。
      const telemetry = { ...tel };
      if (prevManual && lower(tel.serial) === lower(prevManual)) {
        delete telemetry.serial;
        delete telemetry.deviceId;
      }
      const next = { ...rest, matchBy: 'unmatched' };
      if (Object.keys(telemetry).length) next.telemetry = telemetry;
      else delete next.telemetry;
      return next;
    }
    // 不往遥测里塞 serial/deviceId：所属磁盘完全由归并树的「卷挂在哪块盘下」决定，
    // 这样把卷改挂到别的盘时不会残留上一块盘的信息。
    return { ...v, manualSerial: serial, matchBy: 'manual-sn' };
  });

  // 只有真正挂到某块盘下时才把这个卷从「未归属主机的卷」里摘掉；
  // 没命中磁盘（或只是记下 SN）时保持原状，避免卷在树上凭空消失。
  const orphans = (Array.isArray(doc?.orphans) ? doc.orphans : []).slice();
  if (hit) {
    const idx = orphans.findIndex((v) => lower(typeof v === 'string' ? v : v?.volumeId) === volKey);
    if (idx >= 0) orphans.splice(idx, 1);
  }
  // 撤销手工关联：把这个卷放回「未归属主机的卷」，别让它掉到某台主机的 unassigned 里。
  if (manualOnly && !orphans.some((v) => lower(typeof v === 'string' ? v : v?.volumeId) === volKey)) {
    orphans.push(id);
  }

  return {
    doc: { ...doc, hosts, volumes, orphans },
    matched: hit ? { hostId: hostKeyOfNode(hit.host), serial: text(hit.disk.serial) || serial } : null,
  };
}

/** 读一个数据组视图上的 host-disks 文档；失败时抛出原始错误（便于区分 ENOENT / 解析错误）。 */
export async function readHostDisksFrom(fp, pathFor, path = HOST_DISKS_PATH) {
  const text = await readText(fp, pathFor(path));
  const doc = JSON.parse(text);
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.hosts)) {
    throw new Error('文件内容不是主机磁盘归并文档（缺少 hosts 数组）');
  }
  return doc;
}

/**
 * v2 主路径 → 旧路径 → 镜像 依次读取，返回 `{ doc, from: 'v2' | 'canonical' | 'mirror' }`。
 * 只有「文件不存在」才回退；解析失败等真错误照旧抛出，避免掩盖坏文件。
 */
export async function readHostDisksAny(fp, pathFor) {
  const order = [
    [HOST_DISKS_V2_PATH, 'v2'],
    [HOST_DISKS_PATH, 'canonical'],
    [HOST_DISKS_MIRROR_PATH, 'mirror'],
  ];
  let last = null;
  for (const [path, from] of order) {
    try {
      return { doc: await readHostDisksFrom(fp, pathFor, path), from };
    } catch (err) {
      if (!isMissing(err)) throw err;
      last = err;
    }
  }
  throw last || new Error('没有可用的主机磁盘文档');
}

/** 读不到的诊断：列出组根与 host-disks/ 下实际有哪些条目。 */
async function describeMissing(fp, pathFor) {
  const out = [];
  for (const dir of ['', 'host-disks']) {
    const label = `/${dir ? `${dir}/` : ''}`;
    try {
      const names = await fp.readdir(pathFor(dir));
      const list = (Array.isArray(names) ? names : [])
        .map((n) => String(n).replace(/\/+$/, ''))
        .filter(Boolean)
        .slice(0, 12);
      out.push(`${label} ${list.length ? list.join('、') : '（空）'}`);
    } catch (err) {
      out.push(`${label} 读取失败：${err?.message || err}`);
    }
  }
  return out.join(' ');
}

function decodePart(value) {
  try { return decodeURIComponent(String(value || '')); } catch { return String(value || ''); }
}
function encodePart(value) {
  return encodeURIComponent(String(value ?? ''));
}
function text(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}
function lower(value) {
  return text(value).trim().toLowerCase();
}

/** 虚拟路径 → 结构：''→root，/host/<id>，/disk/<id>/<serial>，/partition/<host>/<sn>/<deviceId>，
 *  /volume/<volumeId>，/tree/<volumeId>/<相对路径...>。 */
export function parseVirtualPath(raw) {
  const parts = String(raw || '').split('/').filter(Boolean).map(decodePart);
  if (!parts.length) return { view: 'root', path: '' };
  if (parts[0] === 'host' && parts[1]) return { view: 'host', path: `/host/${encodePart(parts[1])}`, hostId: parts[1] };
  if (parts[0] === 'disk' && parts[1] && parts[2]) {
    return { view: 'disk', path: `/disk/${encodePart(parts[1])}/${encodePart(parts[2])}`, hostId: parts[1], serial: parts[2] };
  }
  // 兼容历史/坏链：主机段为空（/disk//<serial>）时按磁盘 SN 回退查找，不再整体落回根视图。
  if (parts[0] === 'disk' && parts[2] === undefined && parts[1]) {
    return { view: 'disk', path: `/disk//${encodePart(parts[1])}`, hostId: '', serial: parts[1] };
  }
  if (parts[0] === 'partition' && parts[1] && parts[2] && parts[3]) {
    return {
      view: 'partition',
      path: `/partition/${encodePart(parts[1])}/${encodePart(parts[2])}/${encodePart(parts[3])}`,
      hostId: parts[1],
      serial: parts[2],
      deviceId: parts[3],
    };
  }
  if (parts[0] === 'tree' && parts[1]) {
    const segments = parts.slice(2);
    return {
      view: 'tree',
      path: `/tree/${encodePart(parts[1])}${segments.length ? `/${segments.map(encodePart).join('/')}` : ''}`,
      volumeId: parts[1],
      segments,
      rel: segments.join('/'),
    };
  }
  if (parts[0] === 'volume' && parts[1]) return { view: 'volume', path: `/volume/${encodePart(parts[1])}`, volumeId: parts[1] };
  return { view: 'root', path: '' };
}
function hostKeyOf(host) {
  return host?.hostId || host?.deviceUuid || host?.hostname || host?.deviceName || '';
}

export function hostPath(hostId) { return `/host/${encodePart(hostId)}`; }
export function diskPath(hostId, serial) { return `/disk/${encodePart(hostId)}/${encodePart(serial)}`; }
export function volumePath(volumeId) { return `/volume/${encodePart(volumeId)}`; }
export function partitionPath(hostId, serial, deviceId) {
  return `/partition/${encodePart(hostId)}/${encodePart(serial)}/${encodePart(deviceId)}`;
}
export function treePath(volumeId, rel = '') {
  const segments = String(rel || '').split('/').filter(Boolean).map(encodePart);
  return `/tree/${encodePart(volumeId)}${segments.length ? `/${segments.join('/')}` : ''}`;
}

/** 强制重读数据组文件；未连接/未写回时返回 { doc:null, error }，不抛异常。 */
export async function loadHostDisksDoc({ force = false } = {}) {
  if (!force && cached && Date.now() - cached.at < 3000) return cached;
  const attempts = [];
  const connected = getConnectedFs();
  if (!connected) {
    // 未连接属于临时时序状态，不写入缓存：避免首屏在连接就绪前缓存的错误一直挡住视图。
    return { doc: null, error: '同步组未连接：请先在「同步收藏」面板连接一个数据同步组', attempts, at: Date.now() };
  }

  // 1) 当前选中的数据组。写入后本地库/同步对可能还在就绪中，ENOENT 重试一次。
  const primary = { id: getActiveGroupId() || '当前数据组', fp: connected.fp, pathFor: connected.pathFor };
  for (let i = 0; i < 2; i += 1) {
    try {
      const { doc, from } = await readHostDisksAny(primary.fp, primary.pathFor);
      cached = { doc, error: '', from, groupId: primary.id, attempts, at: Date.now() };
      return cached;
    } catch (err) {
      attempts.push({ id: primary.id, error: err?.message || String(err) });
      if (!isMissing(err)) break;
      if (i === 0) await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // 2) 其它数据组兜底：多个组并存时，写回与读取可能落在不同组。
  let others = [];
  try {
    others = (await listDataGroupFs()).filter((cand) => cand.fp !== connected.fp);
  } catch { others = []; }
  for (const cand of others) {
    try {
      const { doc, from } = await readHostDisksAny(cand.fp, cand.pathFor);
      cached = { doc, error: '', from, groupId: cand.id, attempts, at: Date.now() };
      return cached;
    } catch (err) {
      attempts.push({ id: cand.id || '数据组', error: err?.message || String(err) });
    }
  }

  // 3) 全部失败：把每个组的结果 + 实际目录内容一起显示，避免只看到一句 no such file。
  let listed = '';
  try { listed = await describeMissing(primary.fp, primary.pathFor); } catch { listed = ''; }
  const detail = attempts.map((a) => `${a.id}：${a.error}`).join('；');
  cached = {
    doc: null,
    error: `数据组里没有 host-disks/host-disks.json（${detail}）${listed ? `｜当前组目录：${listed}` : ''}`,
    attempts,
    at: Date.now(),
  };
  return cached;
}

/** 写回后让缓存立即失效（面板与虚拟浏览共用同一个 repo）。 */
export function invalidateHostDisksDoc() { cached = null; }

export function findHost(doc, hostId) {
  const key = lower(hostId);
  if (!key) return null;
  return (doc?.hosts || []).find((h) => [h.hostId, h.deviceUuid, h.hostname, h.deviceName]
    .some((value) => lower(value) === key)) || null;
}

export function findDisk(host, serial) {
  const key = lower(serial);
  if (!key) return null;
  return (host?.disks || []).find((d) => lower(d.serial) === key) || null;
}

export function findVolume(doc, volumeId) {
  const key = lower(volumeId);
  if (!key) return null;
  return (doc?.volumes || []).find((v) => lower(v.volumeId) === key) || null;
}

/**
 * 按「卷挂在哪个磁盘下」反查磁盘：遥测缺 serial/deviceId 的卷（例如只按主机名匹配的卷）
 * 自身没有磁盘字段，但归并出的树里它仍然挂在某块盘下面，磁盘信息可以从那里取。
 */
export function findDiskByVolume(doc, volumeId) {
  const key = lower(volumeId);
  if (!key) return null;
  for (const host of (doc?.hosts || [])) {
    for (const disk of (host.disks || [])) {
      const ids = (disk.volumes || []).map((v) => (typeof v === 'string' ? v : v?.volumeId)).map(lower).filter(Boolean);
      if (ids.includes(key)) return { host, disk };
    }
  }
  return null;
}

/** 按磁盘 SN / 磁盘 ID / 别名在整份文档里找磁盘。 */
export function findDiskBySerial(doc, serial) {
  const key = lower(serial);
  if (!key) return null;
  for (const host of (doc?.hosts || [])) {
    for (const disk of (host.disks || [])) {
      const ids = [disk.serial, disk.diskId, disk.diskUuid, ...(Array.isArray(disk.aliasIds) ? disk.aliasIds : [])]
        .map((v) => lower(v)).filter(Boolean);
      if (ids.includes(key)) return { host, disk };
    }
  }
  return null;
}

const DERIVED_SN_RE = /^openlist-(.+)-[0-9]$/i;

/**
 * 从 openlist 扫描出来的卷 ID 里取物理盘 SN：`openlist-93R7SZ7KS-5` → `93R7SZ7KS`。
 * 只认「openlist-<中间>-<单个数字>」（openlist 按盘序号 0/1/2/… 拼出来的那批）；
 * `openlist-h99-130`、`openlist-baidu-130` 这种中间带来源名、末尾是多位编号的一律不猜，
 * 否则会把 `h99-13` 当成 SN。
 */
export function deriveSerialFromVolumeId(volumeId) {
  const m = DERIVED_SN_RE.exec(text(volumeId).trim());
  return m ? text(m[1]).trim() : '';
}

/**
 * 给「没有任何磁盘信息」的 openlist 卷按卷 ID 推断磁盘 SN，并把能对上磁盘的卷挂到该盘下。
 * 纯函数、不写文档：同一份文档在任何端都算出相同结果，不需要落盘也能跨端一致。
 */
export function applyDerivedSerials(doc) {
  if (!doc || !Array.isArray(doc.volumes) || !Array.isArray(doc.hosts)) return doc;
  const serials = new Map(); // volumeId(小写) -> 推断出来的 SN
  const moves = [];          // 能对上真实磁盘的卷
  const stale = [];          // 这次不再推断的卷（上一次推断过，要清掉标记）
  for (const v of doc.volumes) {
    const id = text(v.volumeId);
    const tel = v.telemetry || {};
    if (!id) continue;
    // 已经有磁盘信息的就不猜：真遥测带了 serial、手工填过、或者已经挂在某块盘下
    if (text(tel.serial) || text(v.manualSerial) || findDiskByVolume(doc, id)) {
      if (v.derivedSerial) stale.push(lower(id));
      continue;
    }
    const serial = deriveSerialFromVolumeId(id);
    if (!serial) {
      if (v.derivedSerial) stale.push(lower(id));
      continue;
    }
    serials.set(lower(id), serial);
    const hit = findDiskBySerial(doc, serial);
    if (hit) moves.push({ volumeId: id, hostKey: hostKeyOf(hit.host), diskSerial: text(hit.disk.serial) });
  }
  if (!serials.size && !stale.length) return doc;

  const hosts = doc.hosts.map((host) => {
    const key = hostKeyOf(host);
    const disks = (host.disks || []).map((disk) => {
      const adds = moves
        .filter((m) => m.hostKey === key && lower(m.diskSerial) === lower(disk.serial))
        .map((m) => m.volumeId);
      if (!adds.length) return disk;
      const current = (disk.volumes || []).map((x) => lower(typeof x === 'string' ? x : x?.volumeId));
      const fresh = adds.filter((id) => !current.includes(lower(id)));
      return { ...disk, volumes: [...(disk.volumes || []), ...fresh] };
    });
    return { ...host, disks };
  });

  const volumes = doc.volumes.map((v) => {
    const key = lower(v.volumeId);
    const serial = serials.get(key);
    if (!serial) {
      if (!stale.includes(key)) return v;
      // 之前推断过、现在有了真信息（或 ID 不再符合规则）：把推断标记摘掉，别留下假 SN。
      const { derivedSerial, ...rest } = v;
      if (/^derived-sn/.test(lower(v.matchBy))) {
        return { ...rest, matchBy: text(v.manualSerial) ? 'manual-sn' : 'unmatched' };
      }
      return rest;
    }
    const moved = moves.some((m) => lower(m.volumeId) === key);
    return { ...v, derivedSerial: serial, matchBy: moved ? 'derived-sn' : 'derived-sn-unverified' };
  });

  // 挂到磁盘上的卷要从「未归属主机的卷」里摘掉，否则树上会出现两次。
  const movedKeys = moves.map((m) => lower(m.volumeId));
  const orphans = (Array.isArray(doc.orphans) ? doc.orphans : []).filter((o) => !movedKeys.includes(lower(typeof o === 'string' ? o : o?.volumeId)));

  return { ...doc, hosts, volumes, orphans };
}

function row(label, meta, path = '', kind = '') {
  return { label: text(label), meta: text(meta), path, kind };
}
function bytes(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return '';
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
function matchLabel(matchBy) {
  return ({
    'manual-sn': '手工 SN 映射',
    'manual-sn-unverified': '手工映射 · 遥测未见',
    'derived-sn': '卷 ID 推断 SN',
    'derived-sn-unverified': '卷 ID 推断 · 遥测未见',
    'local-volume-id': '本机卷 ID',
    'local-only': '本机卷 · 清单未见',
    'host+drive': '主机名+盘符',
    'host-only': '仅主机名',
    unmatched: '未关联',
  })[matchBy] || text(matchBy);
}

/** 严格盘符：'C' / 'C:' / 'c:' → 'c:'；长文本不匹配，避免把目录名首字母当盘符。 */
function driveKeyOf(value) {
  const m = /^\s*([A-Za-z])(?::)?\s*$/.exec(text(value));
  return m ? `${m[1].toLowerCase()}:` : null;
}
function partitionLetter(deviceId) {
  const key = driveKeyOf(deviceId);
  return key ? `${key[0].toUpperCase()}:` : text(deviceId);
}

/** 磁盘下的卷记录（doc 行 + 遥测匹配信息），按 volumeId 归一。 */
function volumeRecords(doc, disk) {
  return (disk?.volumes || []).map((item) => {
    const id = typeof item === 'string' ? item : item?.volumeId;
    const found = findVolume(doc, id) || (typeof item === 'object' ? item : null);
    return {
      volumeId: text(id),
      drive: text(found?.drive),
      matchBy: text(found?.matchBy),
      fileCount: found?.fileCount,
      totalSize: found?.totalSize,
      localVolumeId: text(found?.localVolumeId),
      localSource: found?.localSource === true,
      telemetry: found?.telemetry || null,
      deviceId: text(found?.telemetry?.deviceId) || text(item?.telemetry?.deviceId),
    };
  }).filter((rec) => rec.volumeId);
}

/**
 * 纯函数：把磁盘的逻辑分区与关联卷归组。
 * 分区是入口（遥测事实），关联卷是它的清单记录集合（可能 0..N 条）；
 * 盘符对不上的卷归入 unassigned，不隐藏。
 */
export function partitionBuckets(doc, disk) {
  const buckets = new Map();
  const ensure = (deviceId) => {
    const key = driveKeyOf(deviceId) || lower(deviceId);
    if (!key) return null;
    if (!buckets.has(key)) {
      buckets.set(key, { key, deviceId: partitionLetter(deviceId), logical: null, volumes: [] });
    }
    return buckets.get(key);
  };
  for (const logical of (disk?.logicalDisks || [])) {
    const bucket = ensure(logical?.deviceId);
    if (bucket && !bucket.logical) bucket.logical = logical;
  }
  const unassigned = [];
  for (const rec of volumeRecords(doc, disk)) {
    const key = driveKeyOf(rec.drive) || driveKeyOf(rec.telemetry?.deviceId);
    const bucket = key ? buckets.get(key) : null;
    if (bucket) bucket.volumes.push(rec);
    else unassigned.push(rec);
  }
  // 关联卷排序：本机卷 ID / 本机来源最前，其次按匹配方式强弱，再按 volumeId。
  const matchRank = (matchBy) => ({ 'manual-sn': 0, 'local-volume-id': 1, 'host+drive': 2, 'host-only': 3, 'local-only': 4 }[matchBy] ?? 9);
  for (const bucket of buckets.values()) {
    bucket.volumes.sort((a, b) => (Number(b.localSource) - Number(a.localSource))
      || (matchRank(a.matchBy) - matchRank(b.matchBy))
      || a.volumeId.localeCompare(b.volumeId));
  }
  return { partitions: [...buckets.values()], unassigned };
}

/**
 * 纯函数：分区能否直接落到本机路径。
 * 条件 = 本机读到了该盘符的卷 ID，且（主机就是本机 或 关联卷 ID 命中本机卷 ID）。
 */
export function partitionLocalPath(local, host, partition) {
  if (!local?.volumes) return null;
  const letter = driveKeyOf(partition?.deviceId);
  if (!letter) return null;
  const letterKey = letter[0].toUpperCase();
  const localId = text(local.volumes[letterKey]);
  if (!localId) return null;
  const hostMatch = host?.local === true
    || (text(local.host) && lower(host?.hostname) === lower(local.host));
  const idMatch = (partition?.volumes || []).some((rec) => lower(rec.volumeId) === lower(localId)
    || lower(rec.localVolumeId) === lower(localId));
  if (!hostMatch && !idMatch) return null;
  return { path: `${letterKey}:\\`, volumeId: localId };
}

function isLocalHost(host, local) {
  return host?.local === true || Boolean(text(local?.host) && lower(host?.hostname) === lower(local.host));
}

/**
 * 探查某卷在数据组里可浏览的来源（目录结构分片 / 文件列表）。
 * 本机卷同样要跑：本机路径能直达，但数据组里可能还有历史扫描的结构与文件列表，
 * 两者都要能看见。只读，loadTree/readFiles 可注入便于测试。
 */
export async function probeVolumeSources(volumeId, drive, { loadTree = loadVolumeTree, readFiles = readDirFiles } = {}) {
  const result = {
    volumeId: text(volumeId),
    tree: { ok: false, count: 0, error: '' },
    files: { ok: false, count: 0, error: '', note: '' },
  };
  try {
    const info = await loadTree(volumeId);
    result.tree = {
      ok: Boolean(info?.ok),
      count: Array.isArray(info?.tree) ? info.tree.length : 0,
      error: text(info?.error),
    };
  } catch (err) {
    result.tree.error = err?.message || String(err);
  }
  const letter = driveKeyOf(drive);
  if (!letter) {
    result.files.error = '清单里没有盘符';
    return result;
  }
  try {
    const docs = await readFiles({ volumeId, drive: letter[0].toUpperCase(), rel: '' });
    result.files = {
      ok: Boolean(docs?.found),
      count: Array.isArray(docs?.files) ? docs.files.length : 0,
      error: '',
      note: text(docs?.note),
    };
  } catch (err) {
    result.files = { ok: false, count: 0, error: err?.message || String(err), note: '' };
  }
  return result;
}

/**
 * 纯函数：把归并文档 + 虚拟路径转成可直接渲染的目录视图。
 * 返回 { view, title, path, crumbs, sections, empty, hostStats }。
 *
 * hideNoDiskHosts 只影响根视图列出的主机行，不改变文档与其他层级：
 * 无磁盘主机的卷仍算「已归属主机」，不会因为隐藏而掉进「未归属主机的卷」。
 */
export function describeVirtual(doc, rawPath, { hideNoDiskHosts = false, local = null, volumeAliases = null, partitionAliases = null } = {}) {
  const parsed = parseVirtualPath(rawPath);
  const aliases = volumeAliases || volumeAliasesFor(doc);
  const partAliases = partitionAliases || partitionAliasesFor(doc);
  const crumbs = [{ label: ROOT_LABEL, path: '' }];
  const sections = [];
  const notes = [];
  let title = ROOT_LABEL;
  let hostStats = null;

  if (parsed.view === 'root') {
    // 根层只列主机：层级固定为 主机 → 磁盘 → 卷，卷不越过磁盘直接出现在主机旁边。
    const allHosts = Array.isArray(doc?.hosts) ? doc.hosts : [];
    const hideNoDisk = Boolean(hideNoDiskHosts);
    const hostsWithDisks = hideNoDisk ? allHosts.filter((h) => (h.disks || []).length) : allHosts;
    const hostVolumeIds = new Set();
    // 归属集合按全部主机统计（含被隐藏的），否则隐藏主机的卷会被误判成孤儿卷重新冒出来。
    for (const h of allHosts) {
      const volumeIds = (h.disks || []).flatMap((d) => d.volumes || [])
        .map((v) => (typeof v === 'string' ? v : v?.volumeId));
      const unassigned = (h.unassigned || []).map((v) => (typeof v === 'string' ? v : v?.volumeId));
      for (const id of [...volumeIds, ...unassigned]) if (id) hostVolumeIds.add(lower(id));
    }
    const hosts = hostsWithDisks.map((h) => {
      const volumeIds = (h.disks || []).flatMap((d) => d.volumes || [])
        .map((v) => (typeof v === 'string' ? v : v?.volumeId));
      const unassigned = (h.unassigned || []).map((v) => (typeof v === 'string' ? v : v?.volumeId));
      return row(h.hostname || h.deviceName || h.hostId,
        [h.local ? '本机' : '', h.deviceUuid ? `UUID ${h.deviceUuid}` : '', `磁盘 ${(h.disks || []).length}`,
          `卷 ${volumeIds.filter(Boolean).length + unassigned.filter(Boolean).length}`]
          .filter(Boolean).join(' · '), hostPath(hostKeyOf(h)), 'host');
    });
    hostStats = { total: allHosts.length, visible: hosts.length, hidden: allHosts.length - hosts.length };
    sections.push({
      title: `主机（${hosts.length}）`,
      rows: hosts,
      placeholder: hideNoDisk && allHosts.length
        ? `已按筛选隐藏 ${allHosts.length} 台无磁盘主机，取消勾选可查看全部。`
        : '',
    });

    // 只有「不属于任何主机」的卷才在根层单列，否则一律从主机 → 磁盘 → 卷下钻。
    const orphanRows = [];
    const seen = new Set();
    const pushOrphan = (id, meta) => {
      const key = lower(id);
      if (!key || seen.has(key) || hostVolumeIds.has(key)) return;
      seen.add(key);
      orphanRows.push(row(id, meta, volumePath(id), 'volume'));
    };
    for (const id of (Array.isArray(doc?.orphans) ? doc.orphans : [])) {
      const vol = findVolume(doc, id);
      pushOrphan(id, vol
        ? [vol.drive, matchLabel(vol.matchBy), vol.fileCount != null ? `文件 ${vol.fileCount}` : ''].filter(Boolean).join(' · ') || '遥测未匹配'
        : '清单中存在，遥测未匹配');
    }
    for (const v of (doc?.volumes || [])) {
      pushOrphan(v.volumeId, [v.drive, matchLabel(v.matchBy), v.fileCount != null ? `文件 ${v.fileCount}` : '',
        v.totalSize != null ? bytes(v.totalSize) : ''].filter(Boolean).join(' · '));
    }
    if (orphanRows.length) sections.push({ title: `未归属主机的卷（${orphanRows.length}）`, rows: orphanRows });
  } else if (parsed.view === 'host') {
    const host = findHost(doc, parsed.hostId);
    if (!host) return { view: parsed.view, title: '主机不存在', path: parsed.path, crumbs, sections: [], empty: '数据组里没有这台主机，请重新读取并写回。' };
    title = host.hostname || host.deviceName || host.hostId;
    crumbs.push({ label: title, path: hostPath(hostKeyOf(host)) });
    const disks = (host.disks || []).map((d) => row(d.serial,
      [d.model, d.deviceId, d.health ? `SMART ${d.health}` : '',
        d.temperature != null ? `${d.temperature}°C` : '', `卷 ${(d.volumes || []).length}`]
        .filter(Boolean).join(' · '), diskPath(hostKeyOf(host), d.serial), 'disk'));
    const unassigned = (host.unassigned || []).map((v) => row(v, '未归属到磁盘', volumePath(typeof v === 'string' ? v : v.volumeId), 'volume'));
    sections.push({ title: `磁盘（${disks.length}）`, rows: disks });
    if (unassigned.length) sections.push({ title: '未归属卷', rows: unassigned });
  } else if (parsed.view === 'disk') {
    let host = findHost(doc, parsed.hostId);
    let disk = host ? findDisk(host, parsed.serial) : null;
    // 坏链/旧文档主机段为空时，退而按磁盘 SN 在全部主机里找，避免整盘打不开。
    if (!disk && parsed.serial) {
      for (const candidate of (doc?.hosts || [])) {
        const hit = findDisk(candidate, parsed.serial);
        if (hit) { host = candidate; disk = hit; break; }
      }
    }
    if (!host || !disk) return { view: parsed.view, title: '磁盘不存在', path: parsed.path, crumbs, sections: [], empty: '这台主机下没有该磁盘。' };
    title = disk.serial;
    crumbs.push({ label: host.hostname || host.deviceName || host.hostId, path: hostPath(hostKeyOf(host)) });
    crumbs.push({ label: title, path: parsed.path });
    const { partitions, unassigned } = partitionBuckets(doc, disk);
    const hostIdValue = hostKeyOf(host);
    const partitionRows = partitions.map((p) => {
      const logical = p.logical || {};
      const localPath = partitionLocalPath(local, host, p);
      const detail = partitionPath(hostIdValue, disk.serial, p.deviceId);
      const partAlias = partitionAliasOf(partAliases, detail);
      const meta = [
        partAlias ? `别名「${partAlias}」` : '',
        logical.volumeName, logical.fileSystem,
        logical.sizeGB != null ? `容量 ${logical.sizeGB} GB` : '',
        logical.freeSpaceGB != null ? `剩余 ${logical.freeSpaceGB} GB` : '',
        logical.usagePercent != null ? `已用 ${logical.usagePercent}%` : '',
        `关联卷 ${p.volumes.length}`,
        localPath ? '本机' : '',
      ].filter(Boolean).join(' · ');
      const item = row(p.deviceId, meta, detail, 'partition');
      item.localPath = localPath ? localPath.path : '';
      item.localVolumeId = localPath ? localPath.volumeId : '';
      item.hostLocal = isLocalHost(host, local);
      item.volumeIds = p.volumes.map((rec) => rec.volumeId);
      item.singlePath = p.volumes.length === 1 ? treePath(p.volumes[0].volumeId) : '';
      item.detailPath = detail;
      return item;
    });
    sections.push({
      title: `逻辑分区（${partitionRows.length}）`,
      rows: partitionRows,
      placeholder: '该磁盘没有遥测到的逻辑分区。',
    });
    if (unassigned.length) {
      const rows = unassigned.map((rec) => row(rec.volumeId,
        [matchLabel(rec.matchBy), rec.drive, rec.fileCount != null ? `文件 ${rec.fileCount}` : '']
          .filter(Boolean).join(' · '), treePath(rec.volumeId), 'volume'));
      sections.push({ title: `未关联到分区的卷（${rows.length}）`, rows });
    }
  } else if (parsed.view === 'partition') {
    let host = findHost(doc, parsed.hostId);
    let disk = host ? findDisk(host, parsed.serial) : null;
    if (!disk && parsed.serial) {
      for (const candidate of (doc?.hosts || [])) {
        const hit = findDisk(candidate, parsed.serial);
        if (hit) { host = candidate; disk = hit; break; }
      }
    }
    if (!host || !disk) return { view: parsed.view, title: '磁盘不存在', path: parsed.path, crumbs, sections: [], empty: '这台主机下没有该磁盘。' };
    const key = driveKeyOf(parsed.deviceId) || lower(parsed.deviceId);
    const { partitions } = partitionBuckets(doc, disk);
    let partition = partitions.find((p) => p.key === key);
    if (!partition) {
      const records = volumeRecords(doc, disk).filter((rec) => (driveKeyOf(rec.drive) || driveKeyOf(rec.telemetry?.deviceId)) === key);
      if (!records.length) {
        return { view: parsed.view, title: '分区不存在', path: parsed.path, crumbs, sections: [], empty: '这块磁盘下没有该逻辑分区。' };
      }
      partition = { key, deviceId: partitionLetter(parsed.deviceId), logical: null, volumes: records };
    }
    const logical = partition.logical || {};
    const localPath = partitionLocalPath(local, host, partition);
    const localId = text(localPath?.volumeId);
    title = partition.deviceId;
    crumbs.push({ label: host.hostname || host.deviceName || host.hostId, path: hostPath(hostKeyOf(host)) });
    crumbs.push({ label: disk.serial, path: diskPath(hostKeyOf(host), disk.serial) });
    crumbs.push({ label: title, path: parsed.path });
    const infoPairs = [
      ['卷标', logical.volumeName],
      ['文件系统', logical.fileSystem],
      ['容量', logical.sizeGB != null ? `${logical.sizeGB} GB` : ''],
      ['剩余', logical.freeSpaceGB != null ? `${logical.freeSpaceGB} GB` : ''],
      ['使用率', logical.usagePercent != null ? `${logical.usagePercent}%` : ''],
      ['本机路径', localPath ? localPath.path : (isLocalHost(host, local) ? '本机无此盘符或未读到卷 ID' : '非本机分区，只能只读浏览')],
      ['关联卷', `${partition.volumes.length} 条`],
      ['遥测', partition.logical ? '' : '遥测没有该分区，按清单里的卷推断'],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
    // 「逻辑分区」这行自带别名入口：分区没有 volumeId，用它的路径当键，同样写进数据组文档。
    const partKey = partitionAliasKey(hostKeyOf(host), disk.serial, partition.deviceId);
    const partAlias = partitionAliasOf(partAliases, partKey);
    const partRow = row('逻辑分区', partAlias ? `${partition.deviceId} · 别名「${partAlias}」` : partition.deviceId);
    partRow.aliasEdit = partKey;
    partRow.aliasKind = 'partition';
    partRow.aliasSet = Boolean(partAlias);
    const infoRows = [partRow, ...infoPairs.map(([label, value]) => row(label, String(value)))];
    sections.push({ title: '分区信息', rows: infoRows });

    const volumeRows = partition.volumes.map((rec) => {
      const localHit = Boolean(localId) && (lower(rec.volumeId) === lower(localId)
        || lower(rec.localVolumeId) === lower(localId));
      const alias = volumeAliasOf(aliases, rec.volumeId);
      const meta = [
        rec.drive, alias ? `别名 ${alias}` : '', matchLabel(rec.matchBy), rec.telemetry?.hostname,
        rec.fileCount != null ? `文件 ${rec.fileCount}` : '',
        rec.totalSize != null ? bytes(rec.totalSize) : '',
        localHit ? `本机 ${localPath ? localPath.path : ''}`.trim() : '',
      ].filter(Boolean).join(' · ');
      const item = row(rec.volumeId, meta, treePath(rec.volumeId), 'volume');
      item.localPath = localHit && localPath ? localPath.path : '';
      item.volumeId = rec.volumeId;
      item.volumeDrive = rec.drive || (partition.deviceId ? `${partitionLetter(partition.deviceId)}` : '');
      return item;
    });
    sections.push({
      title: `关联卷（${volumeRows.length}）`,
      rows: volumeRows,
      placeholder: '这个分区在清单里没有任何卷记录：可能清单没扫到这块盘，或只索引到了目录结构之外的区域。',
    });
    if (localPath) {
      notes.push('这块分区在本机：主点击直接打开本地盘符；数据组里扫描过的目录结构/文件列表仍可从关联卷右侧「只读结构」查看。');
    }
  } else if (parsed.view === 'volume') {
    const volume = findVolume(doc, parsed.volumeId);
    if (!volume) return { view: parsed.view, title: '卷不存在', path: parsed.path, crumbs, sections: [], empty: '数据组里没有这个卷，请重新读取并写回。' };
    title = volume.volumeId;
    crumbs.push({ label: title, path: parsed.path });
    const telemetry = volume.telemetry || {};
    const alias = volumeAliasOf(aliases, volume.volumeId);
    // volumeId 行自带别名入口：用户要能在这里直接给这个卷起名，而不是另找地方维护。
    const idRow = row('volumeId', alias ? `${volume.volumeId} · 别名「${alias}」` : volume.volumeId);
    idRow.aliasEdit = volume.volumeId;
    idRow.aliasSet = Boolean(alias);
    const pairs = [
      ['本机卷 ID', volume.localVolumeId], ['盘符', volume.drive],
      ['匹配方式', matchLabel(volume.matchBy)], ['手工 SN', volume.manualSerial],
      ['文件数', volume.fileCount], ['总大小', volume.totalSize != null ? bytes(volume.totalSize) : ''],
      ['卷标', telemetry.volumeName],
      ['文件系统', telemetry.fileSystem], ['容量', telemetry.sizeGB != null ? `${telemetry.sizeGB} GB` : ''],
      ['剩余', telemetry.freeSpaceGB != null ? `${telemetry.freeSpaceGB} GB` : ''],
      ['使用率', telemetry.usagePercent != null ? `${telemetry.usagePercent}%` : ''],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
    sections.push({ title: '卷信息', rows: [idRow, ...pairs.map(([label, value]) => row(label, String(value)))] });

    // 磁盘信息单独一块：遥测里的 serial/deviceId/smart 是物理盘属性，混在卷属性里容易被当成卷字段。
    // 遥测缺这些字段的卷，再从归并树的「卷挂在哪块盘下」反查，尽量把磁盘信息补全。
    const located = findDiskByVolume(doc, volume.volumeId);
    const diskHost = located?.host || null;
    const disk = located?.disk || (telemetry.serial && diskHost ? findDisk(diskHost, telemetry.serial) : null);
    const smart = telemetry.smart || {};
    const diskSerial = text(disk?.serial) || text(telemetry.serial);
    const manualSerial = text(volume.manualSerial);
    const derivedSerial = text(volume.derivedSerial);
    // 手工挂上去的（含已经对上真实磁盘的）也保留编辑入口：填错了可以就地改或清除。
    const manualMapped = Boolean(manualSerial) && lower(volume.matchBy) === 'manual-sn';
    // openlist 卷 ID 推断出来的 SN（applyDerivedSerials 打的标）同样可编辑、可纠正。
    const derivedMapped = Boolean(derivedSerial) && !manualSerial && /^derived-sn/.test(lower(volume.matchBy));
    const diskRows = [];
    if (diskSerial) {
      const suffix = manualMapped ? '（手工指定）' : (derivedMapped ? '（由卷 ID 推断）' : '');
      const serialRow = row('磁盘 SN', `${diskSerial}${suffix}`);
      // 能定位到磁盘时给一个直达入口：/disk/<主机>/<SN>
      if (diskHost) serialRow.path = diskPath(hostKeyOf(diskHost), disk?.serial || diskSerial);
      if (manualMapped || derivedMapped) {
        serialRow.serialEdit = volume.volumeId;
        serialRow.serialValue = manualMapped ? manualSerial : derivedSerial;
        serialRow.serialSet = true;
      }
      diskRows.push(serialRow);
    }
    const diskDeviceId = text(disk?.deviceId) || text(telemetry.deviceId);
    if (diskDeviceId) diskRows.push(row('设备 ID', diskDeviceId));
    const diskModel = text(smart.model) || text(disk?.model);
    if (diskModel) diskRows.push(row('型号', diskModel));
    if (smart.temperature != null && smart.temperature !== '') diskRows.push(row('温度', `${smart.temperature}℃`));
    if (smart.health) diskRows.push(row('健康', text(smart.health)));
    if (disk?.health && !smart.health) diskRows.push(row('健康', text(disk.health)));
    // diskId 与 serial / volumeId 重复时不单独列一行，避免「磁盘 ID」看起来像另一个卷 ID。
    const diskIdValue = text(disk?.diskId);
    if (diskIdValue && lower(diskIdValue) !== lower(diskSerial) && lower(diskIdValue) !== lower(volume.volumeId)) {
      diskRows.push(row('磁盘 ID', diskIdValue));
    }
    // 查不到真实磁盘时给一个手工入口：用户知道这块盘的 SN 就可以直接填，填完卷会挂到该盘下。
    if (!located) {
      const guessed = manualSerial || derivedSerial;
      const shown = manualSerial
        ? `${manualSerial}（手工填写，数据组里还没有这块盘的记录）`
        : (derivedSerial ? `${derivedSerial}（由卷 ID 推断，数据组里还没有这块盘的记录）` : '未指定');
      const item = row('磁盘 SN', shown);
      item.serialEdit = volume.volumeId;
      item.serialValue = guessed;
      item.serialSet = Boolean(guessed);
      diskRows.push(item);
      notes.push(manualSerial
        ? '这条磁盘 SN 是手工填的：数据组里暂时没有对应磁盘记录，等遥测补到这块盘后会自动对上。'
        : (derivedSerial
          ? `磁盘 SN「${derivedSerial}」是从卷 ID 前缀（openlist-xxxx-序号）自动推断的：数据组里还没有这块盘的记录，等遥测补到后会自动对上；知道真实 SN 可以点「修改 SN」改写或清掉。`
          : '这个卷查不到所属磁盘：知道物理盘 SN 的话，点「＋填写 SN」直接补上，卷会挂到该盘下。'));
    }
    sections.push({
      title: '所属磁盘',
      rows: diskRows,
      placeholder: '这个卷在遥测和归并树里都没有对应的磁盘记录（只有卷级属性）。',
    });
    if (diskRows.length && smart.hasSmart === false) {
      notes.push('这块盘没有可读的 SMART 数据（或读取时被系统拒绝），所以只有序列号/型号这类静态信息。');
    }

    const hostPairs = [
      ['遥测主机', telemetry.hostname || telemetry.deviceName],
      ['来源主机', volume.sourceHost],
      // 遥测没带设备 UUID 时用归并树里查到的宿主节点补上，避免主机块只剩一个主机名。
      ['设备 UUID', telemetry.deviceUuid || diskHost?.deviceUuid],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
    sections.push({
      title: '主机',
      rows: hostPairs.map(([label, value]) => row(label, String(value))),
      placeholder: '没有读到这个卷的主机身份（可能是只按盘符或手工 SN 关联的卷）。',
    });
    if (alias) notes.push(`别名为「${alias}」：只在本机/数据组文档里标注，不改变 volumeId 本身与目录结构索引。`);
  }

  return { view: parsed.view, title, path: parsed.path, crumbs, sections, notes, empty: '', hostStats };
}

function fmtTime(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  const date = new Date(n);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 只读卷树视图：/tree/<volumeId>/<相对路径...>。
 * 数据从数据组 struct/（目录结构）与 file-list/（文件列表）读，不碰本地磁盘；
 * 目录结构缺失时只要文件列表能读到，也照样列出来（并显式标注「没有目录结构」）。
 *
 * 非 /tree 路径返回 null，调用方回落到 describeVirtual。
 * loadTree / readFiles 可注入，便于测试。
 */
export async function describeTreePath(doc, rawPath, { loadTree = loadVolumeTree, readFiles = readDirFiles, treeCache } = {}) {
  const parsed = parseVirtualPath(rawPath);
  if (parsed.view !== 'tree') return null;
  const volume = findVolume(doc, parsed.volumeId);
  const host = volume ? (findHost(doc, volume.telemetry?.deviceUuid)
    || findHost(doc, volume.telemetry?.hostname)
    || findHost(doc, volume.sourceHost)) : null;
  let info = null;
  if (treeCache) info = treeCache;
  else {
    try { info = await loadTree(parsed.volumeId); } catch (err) { info = { ok: false, tree: [], error: err?.message || String(err) }; }
  }
  info = info || { ok: false, tree: [], error: '没有读到目录结构' };

  const crumbs = [{ label: ROOT_LABEL, path: '' }];
  if (host) crumbs.push({ label: host.hostname || host.deviceName || host.hostId, path: hostPath(hostKeyOf(host)) });
  const volumeLabel = [volume?.drive || info.drive, parsed.volumeId].filter(Boolean).join(' · ') || parsed.volumeId;
  crumbs.push({ label: volumeLabel, path: treePath(parsed.volumeId) });
  const segments = parsed.segments || [];
  for (let i = 0; i < segments.length; i += 1) {
    crumbs.push({ label: segments[i], path: treePath(parsed.volumeId, segments.slice(0, i + 1).join('/')) });
  }
  const title = segments.length ? segments[segments.length - 1] : volumeLabel;
  const notes = [];

  const node = findTreeNode(info.tree || [], segments);
  const folderChildren = (node?.children || []).filter((item) => item && text(item.name));
  const treeFiles = folderChildren.filter((item) => item.type === 'file');

  // 文件列表：目录结构能提供盘符时才有意义（单字母盘符）。
  const driveLetter = text(volume?.drive || info.drive).replace(/:$/, '').toUpperCase();
  let fileList = { found: false, files: [], note: '', incomplete: false, truncated: false };
  if (/^[A-Z]$/.test(driveLetter)) {
    try {
      fileList = await readFiles({ volumeId: parsed.volumeId, drive: driveLetter, rel: parsed.rel || '' });
    } catch (err) {
      fileList = { found: false, files: [], note: `读文件列表失败：${err?.message || err}` };
    }
  } else {
    fileList.note = '清单里没有盘符，无法定位 file-list';
  }

  const fileMap = new Map();
  for (const item of treeFiles) {
    fileMap.set(lower(item.name), { name: text(item.name), node: item, list: null });
  }
  for (const file of (fileList.files || [])) {
    const key = lower(file.name);
    if (!key) continue;
    const hit = fileMap.get(key);
    if (hit) hit.list = file;
    else fileMap.set(key, { name: text(file.name) || key, node: null, list: file });
  }
  const fileRows = [...fileMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
    .map((entry) => {
      const size = entry.list?.size ?? entry.node?.size;
      const mtime = entry.list?.mtime ?? entry.node?.updatedAt;
      const meta = [
        size != null ? bytes(size) : '',
        mtime ? fmtTime(mtime) : '',
        entry.list?.picked ? '散文件' : '',
        !entry.list ? '未导出文件列表' : '',
        Array.isArray(entry.list?.tags) && entry.list.tags.length ? `标签 ${entry.list.tags.join('、')}` : '',
      ].filter(Boolean).join(' · ');
      return row(entry.name, meta, '', 'tree-file');
    });

  const folderRows = folderChildren.filter((item) => item.type === 'folder').map((item) => {
    const meta = [
      item.fileCount != null ? `文件 ${item.fileCount}` : '',
      item.totalSize != null ? bytes(item.totalSize) : '',
      item.leaf === true ? '末级目录' : '',
    ].filter(Boolean).join(' · ');
    return row(text(item.name), meta, treePath(parsed.volumeId, [...segments, text(item.name)].join('/')), 'tree-folder');
  });

  const sections = [];
  if (folderRows.length) sections.push({ title: `目录（${folderRows.length}）`, rows: folderRows });
  if (fileRows.length) sections.push({ title: `文件（${fileRows.length}）`, rows: fileRows });

  if (!info.ok) notes.push(`目录结构：${info.error || '没有读到'}`);
  else {
    notes.push(`目录结构来自 ${info.shardCount || 0} 份分片${info.sources?.length ? `（${info.sources.join('、')}）` : ''}`);
    if (!node) notes.push('这层目录不在已扫描的目录结构里，下面只显示文件列表能对上的文件');
  }
  if (!fileList.found) notes.push(fileList.note || '该目录没有导出文件列表，只有目录结构');
  else {
    if (fileList.incomplete) notes.push('文件列表不完整（导出时被截断或在扫描中）');
    if (fileList.truncated) notes.push('文件列表按上限截断，文件数可能少于实际');
  }

  const empty = (!folderRows.length && !fileRows.length)
    ? (info.ok ? '这个目录下没有已扫描的子项。' : (fileList.found ? '这个目录没有可列出的文件。' : '数据组里没有这个卷的目录结构，也没有文件列表。'))
    : '';

  const view = {
    view: parsed.view,
    title,
    path: parsed.path,
    crumbs,
    sections,
    notes,
    empty,
    volumeId: parsed.volumeId,
    rel: parsed.rel || '',
    drive: driveLetter,
  };
  return view;
}

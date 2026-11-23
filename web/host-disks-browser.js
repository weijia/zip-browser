// 「此电脑」下的虚拟挂载点：读取数据同步组写回的 host-disks/host-disks.json，
// 把主机磁盘归并结果当作只读目录树浏览（主机 → 磁盘 → 卷）。
// 只依赖已连接的同步组 fs，不访问本地磁盘；文件不存在时返回 error 提示写回。

import { getConnectedFs, listDataGroupFs, getActiveGroupId } from './manifest-sync.js';

export const HOST_DISKS_PATH = 'host-disks/host-disks.json';
const ROOT_LABEL = '主机磁盘（数据组）';

let cached = null; // { doc, error, groupId, attempts, at }

function isMissing(err) {
  const msg = String(err?.message || err || '');
  return err?.code === 'ENOENT' || /no such file|not exist|ENOENT|不存在/i.test(msg);
}

/**
 * 读取文件内容并转成字符串。
 * zen-fs 的 readFile 在不同后端可能返回 string / Uint8Array / Buffer / Blob，
 * 直接交给 JSON.parse 会得到「解析失败」而不是真正原因，这里统一解码。
 */
export async function readText(fp, path) {
  const raw = await fp.readFile(path, 'utf8');
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw.text === 'function') return await raw.text();
  if (raw instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(raw));
  if (ArrayBuffer.isView(raw)) return new TextDecoder('utf-8').decode(raw);
  return String(raw ?? '');
}

/** 读一个数据组视图上的 host-disks 文档；失败时抛出原始错误（便于区分 ENOENT / 解析错误）。 */
export async function readHostDisksFrom(fp, pathFor) {
  const text = await readText(fp, pathFor(HOST_DISKS_PATH));
  const doc = JSON.parse(text);
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.hosts)) {
    throw new Error('文件内容不是主机磁盘归并文档（缺少 hosts 数组）');
  }
  return doc;
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

/** 虚拟路径 → 结构：''→root，/host/<id>，/disk/<id>/<serial>，/volume/<volumeId>。 */
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
  if (parts[0] === 'volume' && parts[1]) return { view: 'volume', path: `/volume/${encodePart(parts[1])}`, volumeId: parts[1] };
  return { view: 'root', path: '' };
}
function hostKeyOf(host) {
  return host?.hostId || host?.deviceUuid || host?.hostname || host?.deviceName || '';
}

export function hostPath(hostId) { return `/host/${encodePart(hostId)}`; }
export function diskPath(hostId, serial) { return `/disk/${encodePart(hostId)}/${encodePart(serial)}`; }
export function volumePath(volumeId) { return `/volume/${encodePart(volumeId)}`; }

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
      const doc = await readHostDisksFrom(primary.fp, primary.pathFor);
      cached = { doc, error: '', groupId: primary.id, attempts, at: Date.now() };
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
      const doc = await readHostDisksFrom(cand.fp, cand.pathFor);
      cached = { doc, error: '', groupId: cand.id, attempts, at: Date.now() };
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
    'host+drive': '主机名+盘符',
    'host-only': '仅主机名',
    unmatched: '未关联',
  })[matchBy] || text(matchBy);
}

/**
 * 纯函数：把归并文档 + 虚拟路径转成可直接渲染的目录视图。
 * 返回 { view, title, path, crumbs, sections, empty }。
 */
export function describeVirtual(doc, rawPath) {
  const parsed = parseVirtualPath(rawPath);
  const crumbs = [{ label: ROOT_LABEL, path: '' }];
  const sections = [];
  let title = ROOT_LABEL;

  if (parsed.view === 'root') {
    // 根层只列主机：层级固定为 主机 → 磁盘 → 卷，卷不越过磁盘直接出现在主机旁边。
    const hostVolumeIds = new Set();
    const hosts = (doc?.hosts || []).map((h) => {
      const volumeIds = (h.disks || []).flatMap((d) => d.volumes || [])
        .map((v) => (typeof v === 'string' ? v : v?.volumeId));
      const unassigned = (h.unassigned || []).map((v) => (typeof v === 'string' ? v : v?.volumeId));
      for (const id of [...volumeIds, ...unassigned]) if (id) hostVolumeIds.add(lower(id));
      return row(h.hostname || h.deviceName || h.hostId,
        [h.deviceUuid ? `UUID ${h.deviceUuid}` : '', `磁盘 ${(h.disks || []).length}`,
          `卷 ${volumeIds.filter(Boolean).length + unassigned.filter(Boolean).length}`]
          .filter(Boolean).join(' · '), hostPath(hostKeyOf(h)), 'host');
    });
    sections.push({ title: `主机（${hosts.length}）`, rows: hosts });

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
    const logical = (disk.logicalDisks || []).map((l) => row(l.deviceId,
      [l.volumeName, l.fileSystem, l.sizeGB != null ? `容量 ${l.sizeGB} GB` : '',
        l.freeSpaceGB != null ? `剩余 ${l.freeSpaceGB} GB` : '',
        l.usagePercent != null ? `已用 ${l.usagePercent}%` : ''].filter(Boolean).join(' · ')));
    const volumes = (disk.volumes || []).map((v) => {
      const volumeId = typeof v === 'string' ? v : v.volumeId;
      const found = findVolume(doc, volumeId) || (typeof v === 'object' ? v : null);
      return row(volumeId, found ? [matchLabel(found.matchBy), found.drive,
        found.fileCount != null ? `文件 ${found.fileCount}` : ''].filter(Boolean).join(' · ') : '',
      volumePath(volumeId), 'volume');
    });
    sections.push({ title: '逻辑分区', rows: logical });
    sections.push({ title: `关联卷（${volumes.length}）`, rows: volumes });
  } else if (parsed.view === 'volume') {
    const volume = findVolume(doc, parsed.volumeId);
    if (!volume) return { view: parsed.view, title: '卷不存在', path: parsed.path, crumbs, sections: [], empty: '数据组里没有这个卷，请重新读取并写回。' };
    title = volume.volumeId;
    crumbs.push({ label: title, path: parsed.path });
    const telemetry = volume.telemetry || {};
    const pairs = [
      ['volumeId', volume.volumeId], ['盘符', volume.drive], ['来源主机', volume.sourceHost],
      ['匹配方式', matchLabel(volume.matchBy)], ['手工 SN', volume.manualSerial],
      ['文件数', volume.fileCount], ['总大小', volume.totalSize != null ? bytes(volume.totalSize) : ''],
      ['遥测主机', telemetry.hostname || telemetry.deviceName], ['设备 UUID', telemetry.deviceUuid],
      ['磁盘 SN', telemetry.serial], ['设备 ID', telemetry.deviceId], ['卷标', telemetry.volumeName],
      ['文件系统', telemetry.fileSystem], ['容量', telemetry.sizeGB != null ? `${telemetry.sizeGB} GB` : ''],
      ['剩余', telemetry.freeSpaceGB != null ? `${telemetry.freeSpaceGB} GB` : ''],
      ['使用率', telemetry.usagePercent != null ? `${telemetry.usagePercent}%` : ''],
      ['SMART', telemetry.smart?.health || ''],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
    sections.push({ title: '卷信息', rows: pairs.map(([label, value]) => row(label, String(value))) });
  }

  return { view: parsed.view, title, path: parsed.path, crumbs, sections, empty: '' };
}

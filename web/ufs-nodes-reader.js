// 从 RemoteStorage 账户根 ufs-nodes/ 读取 CPP daemon / home_cloud 上报的主机+磁盘信息。
//
// 与清单数据的区别：struct/、file-list/ 走 zen-fs-config 数据组 fs（挂载到 basePath），
// 而 ufs-nodes/ 在 RS 账户根，数据组 fs 读不到，必须用独立 RS 客户端直连。
// 凭据来自 manifest-sync.getRsCredentials()（复用同步组已连 RS 后端，零额外配置）。
// 客户端 zen-rs-client.global.js（RemoteStorageFileSystem）按需注入，避免拖慢主页面。
//
// 归一化逻辑移植自 onenav/src/components/apps/hostmonitor/{fetch,normalize}.ts，
// 分类规则与 my-data/docs/formats/host-disk-info-format.md 一致。

const UFS_DIR = 'ufs-nodes';
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000;

// 最近一次读取的详细过程，供「主机磁盘」面板显示诊断，定位「有卷没主机」断在哪一步。
let lastDiagnostic = null;
export function getLastReadDiagnostic() { return lastDiagnostic; }

function asString(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}
function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}
function toMs(v) {
  const n = asNumber(v);
  if (n == null) return null;
  return n < 1e12 ? n * 1000 : n;
}

/**
 * 纯函数：把 ufs-nodes/ 下的原始 JSON 数组分类。
 * 规则（最具体优先）：type==='disk' → SMART；含 host_info → 主机明细；
 * 含 capabilities/inbox/mqtt → 节点控制；其余 → 心跳。
 */
export function classifyUfsNodes(raws) {
  const out = [];
  for (const raw of Array.isArray(raws) ? raws : []) {
    if (!raw || typeof raw !== 'object') continue;
    let kind;
    if (raw.type === 'disk') kind = 'disk';
    else if (raw.host_info && typeof raw.host_info === 'object') kind = 'detail';
    else if ('capabilities' in raw || 'inbox' in raw || 'mqtt' in raw) kind = 'node-control';
    else kind = 'heartbeat';
    out.push({ kind, raw });
  }
  return out;
}

/** 纯函数：归一化为主机视图列表（移植 onenav normalizeUfsNodes，控制节点并入 hosts 的 controls）。 */
export function normalizeUfsNodes(raws) {
  const parsed = classifyUfsNodes(raws);
  const heartbeats = new Map();
  const disks = new Map();      // key: serial
  const details = new Map();    // key: device_uuid
  const controls = [];
  const controlStatus = new Map(); // {uuid}.json 兼具心跳与控制字段，补做心跳来源

  for (const { kind, raw } of parsed) {
    if (kind === 'heartbeat') {
      const u = asString(raw.uuid);
      if (u) heartbeats.set(u, raw);
    } else if (kind === 'disk') {
      const s = asString(raw.serial);
      if (s) disks.set(s, raw);
    } else if (kind === 'detail') {
      const du = asString(raw.host_info?.device_uuid);
      if (du) details.set(du, raw);
    } else if (kind === 'node-control') {
      controls.push(raw);
      const u = asString(raw.uuid);
      if (u && (raw.last_access != null || raw.local_ip != null)) controlStatus.set(u, raw);
    }
  }

  const buildLogical = (serial, physicalDeviceId, detail) => {
    if (!detail) return [];
    const maps = Array.isArray(detail.disk_partition_mappings) ? detail.disk_partition_mappings : [];
    const logicals = Array.isArray(detail.logical_disks) ? detail.logical_disks : [];
    const byDev = new Map();
    for (const l of logicals) {
      const dev = asString(l.DeviceID);
      if (dev) byDev.set(dev, l);
    }
    const result = [];
    for (const m of maps) {
      const ps = asString(m.PhysicalDiskSerial);
      const pd = asString(m.PhysicalDisk);
      if (ps !== serial && !(physicalDeviceId && pd === physicalDeviceId)) continue;
      const ld = asString(m.LogicalDisk);
      const l = ld ? byDev.get(ld) : null;
      if (!l) continue;
      result.push({
        deviceId: ld,
        volumeName: asString(l.VolumeName) || '',
        fileSystem: asString(l.FileSystem) || '',
        sizeGB: asNumber(l.SizeGB),
        freeSpaceGB: asNumber(l.FreeSpaceGB),
        usedSpaceGB: asNumber(l.UsedSpaceGB),
        usagePercent: asNumber(l.UsagePercent),
        driveType: asNumber(l.DriveType),
      });
    }
    return result;
  };

  const buildDiskView = (serial, smart, detail) => {
    const pm = Array.isArray(detail?.physical_disks)
      ? detail.physical_disks.find((p) => asString(p.SerialNumber) === serial) : null;
    const physicalDeviceId = pm ? asString(pm.DeviceID) : null;
    return {
      serial,
      uuid: smart ? asString(smart.uuid) : null,
      model: smart ? asString(smart.model) : (pm ? asString(pm.Model) : null),
      capacity: smart ? asString(smart.capacity) : (pm ? `${pm.SizeGB} GB` : null),
      interfaceType: smart ? asString(smart.interface) : (pm ? asString(pm.InterfaceType) : null),
      temperature: smart ? asNumber(smart.temperature) : null,
      health: smart ? asString(smart.health) : null,
      firmware: smart ? asString(smart.firmware) : (pm ? asString(pm.FirmwareRevision) : null),
      deviceId: physicalDeviceId,
      mediaType: pm ? asString(pm.MediaType) : null,
      partitions: pm ? asNumber(pm.Partitions) : null,
      status: pm ? asString(pm.Status) : null,
      logicalDisks: buildLogical(serial, physicalDeviceId, detail),
      hasSmart: !!smart,
      hasDetail: !!pm,
    };
  };

  const buildDiskViews = (uuid, detail) => {
    const views = [];
    for (const d of disks.values()) {
      if (asString(d.host_uuid) === uuid) {
        const s = asString(d.serial);
        if (s) views.push(buildDiskView(s, d, detail));
      }
    }
    if (detail && Array.isArray(detail.physical_disks)) {
      for (const p of detail.physical_disks) {
        const s = asString(p.SerialNumber);
        if (!s || views.some((v) => v.serial === s)) continue;
        views.push(buildDiskView(s, undefined, detail));
      }
    }
    return views;
  };

  // 主机来源只有心跳 / 主机明细 / SMART 磁盘三种；node-control 对象本身
  // 不产生主机（它不在下面的集合里），因此不能再按 uuid 去过滤——
  // 同一个设备常同时有 {uuid}_disks.json(detail) 和 {uuid}.json(node-control)，
  // 按 uuid 排除会把真主机连同磁盘一起抹掉。
  const hostUuids = new Set([
    ...heartbeats.keys(),
    ...controlStatus.keys(),
    ...details.keys(),
    ...[...disks.values()].map((d) => asString(d.host_uuid)).filter(Boolean),
  ]);

  const hosts = [];
  for (const uuid of hostUuids) {
    const hb = heartbeats.get(uuid) || controlStatus.get(uuid) || null;
    const detail = details.get(uuid);
    const info = detail?.host_info;
    const lastAccessMs = hb ? toMs(hb.last_access) : null;
    hosts.push({
      uuid,
      name: asString(info?.device_name) ?? (hb ? asString(hb.name) : null),
      hostname: asString(info?.hostname) ?? null,
      platform: asString(info?.platform) ?? null,
      platformVersion: asString(info?.platform_version) ?? null,
      machine: asString(info?.machine) ?? null,
      serialNumber: asString(info?.serial_number) ?? null,
      localIp: hb ? asString(hb.local_ip) : null,
      lastAccessMs,
      online: lastAccessMs != null && Date.now() - lastAccessMs <= ONLINE_THRESHOLD_MS,
      hasDetail: !!detail,
      disks: buildDiskViews(uuid, detail),
    });
  }
  hosts.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (b.lastAccessMs || 0) - (a.lastAccessMs || 0);
  });
  return { hosts, controlCount: controls.length };
}

/**
 * RemoteStorageFileSystem.readFile() 只接受 path，返回 Uint8Array（不支持 Node 的 'utf8' 参数）。
 * 必须显式解码，否则 JSON.parse(Uint8Array) 会把字节数组当字符串而全部解析失败。
 */
export async function decodeFileText(data) {
  if (typeof data === 'string') return data;
  if (typeof data?.text === 'function') return await data.text();
  if (data?.buffer && typeof data.byteOffset === 'number') {
    return new TextDecoder('utf-8').decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }
  if (data instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(data);
  return String(data);
}

/** 按需加载 RS 客户端 global bundle（只注入一次）。 */
let loader = null;
function ensureClient() {
  if (globalThis.ZenRSClient?.RemoteStorageFileSystem) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/zen-rs-client.global.js';
      s.onload = () => globalThis.ZenRSClient?.RemoteStorageFileSystem
        ? resolve() : reject(new Error('RS 客户端加载后未暴露 RemoteStorageFileSystem'));
      s.onerror = () => reject(new Error('无法加载 RS 客户端 vendor/zen-rs-client.global.js'));
      document.head.appendChild(s);
    }).catch((e) => { loader = null; throw e; });
  }
  return loader;
}

/**
 * 从 RS 账户根列出并读取 ufs-nodes/ 下全部 JSON，返回归一化前的原始对象数组。
 * credentials: { href, token }。单文件失败跳过；401/403 抛特定错误提示重新授权。
 */
export async function fetchUfsNodesRaw(credentials) {
  const diag = {
    at: new Date().toISOString(),
    href: String(credentials?.href || ''),
    basePath: String(credentials?.basePath || ''),
    attempts: [],
    files: [],
    rawCount: 0,
    error: null,
  };
  lastDiagnostic = diag;
  if (!credentials?.href || !credentials?.token) {
    diag.error = '缺少 RemoteStorage 凭据';
    throw new Error('未找到 RemoteStorage 凭据：请先在同步面板连接一个含 RemoteStorage 后端的同步组');
  }
  await ensureClient();
  const Ctor = globalThis.ZenRSClient.RemoteStorageFileSystem;
  const fs = new Ctor({ href: credentials.href, token: credentials.token, timeout: 30000 });
  // 清目录列表缓存，确保枚举到最新文件（写文件只失效直接父目录）。
  try { await fs.invalidateDirListing(); } catch { /* ignore */ }

  let names = [];
  for (const dir of [UFS_DIR, `${UFS_DIR}/`]) {
    try {
      const list = await fs.readdir(dir);
      diag.attempts.push({ dir, count: Array.isArray(list) ? list.length : null,
        sample: (Array.isArray(list) ? list : []).slice(0, 10).map(String) });
      if (Array.isArray(list) && list.length) { names = list; break; }
    } catch (e) {
      diag.attempts.push({ dir, error: String(e?.message || e), status: e?.status ?? null });
      if (e?.status === 401 || e?.status === 403) {
        diag.error = 'RS 鉴权失败 401/403';
        throw new Error('RemoteStorage 鉴权失败（401/403）：当前令牌可能缺少 ufs-nodes 读权限，请重新连接同步组');
      }
      // 其它错误尝试带斜杠的路径
    }
  }
  const jsonNames = names.map((n) => String(n).replace(/^\.\//, '')).filter((n) => /\.json$/i.test(n));
  const raws = [];
  for (const name of jsonNames) {
    const rec = { name };
    diag.files.push(rec);
    try {
      const text = await decodeFileText(await fs.readFile(`${UFS_DIR}/${name}`));
      rec.bytes = text.length;
      rec.head = text.slice(0, 80);
      try {
        const obj = JSON.parse(text);
        raws.push(obj);
        const kind = classifyUfsNodes([obj])[0]?.kind;
        rec.kind = kind;
        rec.identity = obj.host_info?.device_uuid || obj.uuid || obj.serial || obj.host_uuid || null;
        rec.hostname = obj.host_info?.hostname || obj.host_info?.device_name || obj.name || null;
      } catch (e) { rec.parseError = `JSON 解析失败：${String(e?.message || e)}`; }
    } catch (e) {
      rec.readError = String(e?.message || e);
      rec.status = e?.status ?? null;
      if (e?.status === 401 || e?.status === 403) {
        diag.error = '读文件鉴权失败 401/403';
        throw new Error('RemoteStorage 鉴权失败（401/403）：当前令牌缺少 ufs-nodes 读权限，请重新连接同步组');
      }
      // 单文件读取失败跳过
    }
  }
  diag.rawCount = raws.length;
  return raws;
}

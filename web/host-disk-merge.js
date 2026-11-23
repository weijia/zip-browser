// 把 RemoteStorage 上报的主机磁盘明细与 dir-struct-gen 清单卷归并，
// 并生成 device-identity-registry.md 规范的别名候选。
//
// 关联优先级：
//   1. 手工映射（SN → volumeId，用户在身份注册表确认）：matchBy='manual-sn'，confidence='high'；
//   2. 主机名 + 盘符软关联：matchBy='host+drive' / 'host-only'；
//   3. 都没有则 unmatched。
// 手工映射来自 device-registry-store.mappingBySerial() 的 Map（serial 小写 → { serial, volumeId }）。
// SMART serial 与 volumeId 没有共同键，绝不在无人工确认时直接用它 join。

function asString(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}
function lower(v) {
  return asString(v)?.toLowerCase() || null;
}
function hostKey(s) {
  return lower(s);
}
function driveKey(s) {
  const m = /^\s*([A-Za-z]):/.exec(asString(s) || '');
  return m ? `${m[1].toLowerCase()}:` : null;
}

/** SN 索引（SN→volumeId）反查成 volumeId→SN，便于按卷查手工映射。 */
function byVolume(mappingIndex) {
  const out = new Map();
  if (mappingIndex instanceof Map) {
    for (const { serial, volumeId } of mappingIndex.values()) {
      if (volumeId && serial) out.set(volumeId, serial);
    }
  } else if (Array.isArray(mappingIndex)) {
    for (const m of mappingIndex) {
      if (m?.volumeId && m?.serial) out.set(m.volumeId, m.serial);
    }
  }
  return out;
}

/**
 * 纯函数：按「别名 UUID → 规范 UUID」索引把多台遥测主机归一成一台。
 * 规范 UUID 取注册表中声明的值（不是简单小写），磁盘按 SN 去重合并，
 * 主机名/在线状态取各来源中最有用的一个。没有别名映射时原样返回。
 */
export function applyHostAliases(hosts, hostAliases) {
  const list = Array.isArray(hosts) ? hosts : [];
  if (!(hostAliases instanceof Map) || !hostAliases.size) return list;

  const groups = new Map(); // 规范小写 → { uuid, items }
  for (const h of list) {
    const key = lower(h?.uuid);
    if (!key) continue;
    const canonical = hostAliases.get(key) || h.uuid;
    const ck = lower(canonical);
    if (!groups.has(ck)) groups.set(ck, { uuid: canonical, items: [] });
    groups.get(ck).items.push(h);
  }

  const merged = [];
  for (const { uuid, items } of groups.values()) {
    if (items.length === 1) {
      const h = items[0];
      merged.push({ ...h, allHostnames: [h.hostname, h.name].filter(Boolean) });
      continue;
    }
    const base = items.find((h) => lower(h.uuid) === lower(uuid)) || items[0];
    const pick = (field, prefer) => {
      const pool = prefer ? [...items].sort((a, b) => (b[prefer] || 0) - (a[prefer] || 0)) : items;
      for (const h of pool) if (asString(h[field])) return h[field];
      return null;
    };
    const disks = [];
    const seenSerial = new Set();
    for (const h of items) {
      for (const d of (Array.isArray(h.disks) ? h.disks : [])) {
        const sk = lower(d.serial);
        if (sk && seenSerial.has(sk)) continue;
        if (sk) seenSerial.add(sk);
        disks.push(d);
      }
    }
    merged.push({
      ...base,
      uuid,
      aliasUuids: items.map((h) => h.uuid).filter((u) => u && lower(u) !== lower(uuid)),
      allHostnames: items.flatMap((h) => [h.hostname, h.name]).filter(Boolean),
      name: pick('name', 'lastAccessMs'),
      hostname: pick('hostname', 'lastAccessMs'),
      platform: pick('platform'),
      platformVersion: pick('platformVersion'),
      machine: pick('machine'),
      serialNumber: pick('serialNumber'),
      localIp: pick('localIp', 'lastAccessMs'),
      lastAccessMs: items.reduce((mx, h) => Math.max(mx, h.lastAccessMs || 0), 0) || null,
      online: items.some((h) => h.online === true),
      hasDetail: items.some((h) => h.hasDetail === true),
      disks,
    });
  }
  // 无 uuid 的主机原样保留
  for (const h of list) if (!lower(h?.uuid)) merged.push(h);
  return merged;
}

/**
 * 纯函数：按「别名标识 → 规范磁盘标识」索引把同一主机内的磁盘视图归并。
 * 别名的 value 可能是 SN 也可能是磁盘 UUID（SMART 的 uuid），索引里两者都是键。
 * 归并后每块盘带 diskId（规范标识）与 aliasIds（被归并进来的全部标识），
 * serial 仍保留遥测看到的值，供 SN→volumeId 映射匹配。
 */
export function applyDiskAliases(hosts, diskAliases) {
  const list = Array.isArray(hosts) ? hosts : [];
  if (!(diskAliases instanceof Map) || !diskAliases.size) return list;

  const mergeDisks = (group) => {
    if (group.length === 1) {
      const d = group[0];
      return {
        ...d,
        diskId: d.diskId || d.serial,
        aliasIds: [...new Set([d.serial, d.uuid, ...(Array.isArray(d.aliasIds) ? d.aliasIds : [])].map(asString).filter(Boolean))],
      };
    }
    const pick = (field) => {
      for (const d of group) if (asString(d[field])) return d[field];
      return null;
    };
    const logical = [];
    const seenDrive = new Set();
    for (const d of group) {
      for (const l of (Array.isArray(d.logicalDisks) ? d.logicalDisks : [])) {
        const k = lower(l.deviceId);
        if (k && seenDrive.has(k)) continue;
        if (k) seenDrive.add(k);
        logical.push(l);
      }
    }
    const base = group.find((d) => d.hasSmart) || group[0];
    return {
      ...base,
      serial: pick('serial'),
      uuid: pick('uuid'),
      diskId: pick('diskId'),
      aliasIds: [...new Set(group.flatMap((d) => [d.serial, d.uuid, ...(Array.isArray(d.aliasIds) ? d.aliasIds : [])]).map(asString).filter(Boolean))],
      model: pick('model'), firmware: pick('firmware'),
      capacity: pick('capacity'), interfaceType: pick('interfaceType'),
      mediaType: pick('mediaType'), status: pick('status'),
      temperature: group.reduce((v, d) => (d.temperature != null ? d.temperature : v), null),
      health: pick('health'), deviceId: pick('deviceId'),
      partitions: group.reduce((mx, d) => Math.max(mx, d.partitions || 0), 0) || null,
      logicalDisks: logical,
      hasSmart: group.some((d) => d.hasSmart === true),
      hasDetail: group.some((d) => d.hasDetail === true),
    };
  };

  return list.map((h) => {
    const groups = new Map(); // 规范标识（小写）→ disks[]
    for (const d of (Array.isArray(h.disks) ? h.disks : [])) {
      const raw = asString(d?.diskId) || asString(d?.serial) || asString(d?.uuid);
      const canonical = (raw && diskAliases.get(raw.toLowerCase())) || raw || 'unknown';
      const key = canonical.toLowerCase();
      if (!groups.has(key)) groups.set(key, { canonical: asString(canonical), items: [] });
      groups.get(key).items.push(d);
    }
    const disks = [...groups.values()].map(({ canonical, items }) => {
      const merged = mergeDisks(items);
      return { ...merged, diskId: canonical };
    });
    return { ...h, disks };
  });
}

/**
 * 纯函数：遥测主机 × 清单卷 × 手工映射 → 归并视图 + 候选。
 * @param {Array} hosts normalizeUfsNodes().hosts
 * @param {Array} volumes collectVolumes() 的产出
 * @param {Map|Array} [mappingIndex] mappingBySerial() 的 SN 索引
 * @param {Map} [hostAliases] hostAliasIndex() 的「别名 UUID→规范 UUID」索引
 * @param {Map} [diskAliases] diskAliasIndex() 的「别名标识→规范磁盘标识」索引
 * @returns {{ rows: Array, candidates: Array, stats: Object }}
 */
export function mergeHostsWithVolumes(hosts, volumes, mappingIndex, hostAliases, diskAliases) {
  const aliasedHosts = applyDiskAliases(applyHostAliases(Array.isArray(hosts) ? hosts : [], hostAliases), diskAliases);
  const hostList = aliasedHosts;
  const volList = Array.isArray(volumes) ? volumes : [];
  const manualByVol = byVolume(mappingIndex);

  // 索引：主机名别名 → 主机；SN → 遥测磁盘视图；盘符集合 → 遥测逻辑盘
  const hostsByAlias = new Map();
  const disksBySerial = new Map();
  for (const h of hostList) {
    const aliases = [h.hostname, h.name, ...(Array.isArray(h.allHostnames) ? h.allHostnames : [])]
      .map(hostKey).filter(Boolean);
    const logical = new Map();
    for (const disk of Array.isArray(h.disks) ? h.disks : []) {
      // SN、磁盘 UUID 与所有归并进来的别名都能命中同一块盘（手工 SN 映射用别名也能匹配）。
      const diskKeys = [disk.serial, disk.uuid, disk.diskId,
        ...(Array.isArray(disk.aliasIds) ? disk.aliasIds : [])].map(lower).filter(Boolean);
      for (const key of diskKeys) {
        if (!disksBySerial.has(key)) disksBySerial.set(key, { host: h, disk });
      }
      for (const ld of Array.isArray(disk.logicalDisks) ? disk.logicalDisks : []) {
        const dk = driveKey(ld.deviceId);
        if (dk && !logical.has(dk)) logical.set(dk, { host: h, disk, logicalDisk: ld });
      }
    }
    for (const a of aliases) {
      if (!hostsByAlias.has(a)) hostsByAlias.set(a, []);
      hostsByAlias.get(a).push({ host: h, logical });
    }
  }

  const rows = [];
  const candidates = [];
  let matched = 0;
  let manualMatched = 0;

  for (const vol of volList) {
    const dk = driveKey(vol.drive);
    const sourceHosts = Array.isArray(vol.sources) ? vol.sources : (vol.sourceHost ? [vol.sourceHost] : []);
    let hit = null;
    let manualSerial = null;

    // 优先级 1：手工 SN → volumeId
    const wantedSerial = manualByVol.get(vol.volumeId);
    if (wantedSerial) {
      manualSerial = wantedSerial;
      const found = disksBySerial.get(lower(wantedSerial));
      hit = found
        ? { ...found, logicalDisk: null, matchBy: 'manual-sn' }
        : { host: null, disk: null, logicalDisk: null, matchBy: 'manual-sn-unverified' };
    }

    // 优先级 2：主机名 + 盘符软关联
    if (!hit) {
      for (const sh of sourceHosts) {
        const key = hostKey(sh);
        const group = key && hostsByAlias.get(key);
        if (!group) continue;
        for (const g of group) {
          if (dk) {
            const l = g.logical.get(dk);
            if (l) { hit = { ...l, matchBy: 'host+drive' }; break; }
          }
          if (!hit) hit = { host: g.host, logical: null, matchBy: 'host-only' };
        }
        if (hit && hit.matchBy === 'host+drive') break;
      }
    }

    const isManual = hit && (hit.matchBy === 'manual-sn' || hit.matchBy === 'manual-sn-unverified');
    const row = {
      volumeId: vol.volumeId,
      backend: vol.backend,
      drive: vol.drive,
      sourceHost: vol.sourceHost,
      fileCount: vol.fileCount,
      totalSize: vol.totalSize,
      matchBy: hit ? hit.matchBy : 'unmatched',
      manualSerial,
      telemetry: null,
    };
    if (hit && hit.host) {
      matched += 1;
      if (isManual && hit.matchBy === 'manual-sn') manualMatched += 1;
      const h = hit.host;
      const disk = hit.disk || null;
      const ld = hit.logicalDisk || null;
      row.telemetry = {
        hostname: h.hostname,
        deviceName: h.name,
        deviceUuid: h.uuid,
        serial: disk?.serial || null,
        diskId: disk?.diskId || disk?.serial || null,
        diskUuid: disk?.uuid || null,
        aliasIds: disk?.aliasIds || [],
        deviceId: disk?.deviceId || null,
        volumeName: ld?.volumeName || null,
        fileSystem: ld?.fileSystem || null,
        sizeGB: ld?.sizeGB ?? null,
        freeSpaceGB: ld?.freeSpaceGB ?? null,
        usagePercent: ld?.usagePercent ?? null,
        smart: disk ? {
          model: disk.model, temperature: disk.temperature,
          health: disk.health, hasSmart: disk.hasSmart,
        } : null,
      };
    }
    rows.push(row);

    // 注册表候选：用户已确认的映射 confidence 提升为 high。
    const aliases = [];
    const add = (kind, value) => {
      const v = asString(value);
      if (v && !aliases.some((a) => a.kind === kind && a.value === v)) aliases.push({ kind, value: v });
    };
    add('volumeId', vol.volumeId);
    if (vol.drive) add('driveLetter', vol.drive);
    for (const s of sourceHosts) add('hostname', s);
    if (manualSerial) add('serial', manualSerial);
    if (row.telemetry) {
      const t = row.telemetry;
      add('deviceUuid', t.deviceUuid);
      add('serial', t.serial);
      add('volumeLabel', t.volumeName);
      if (t.hostname) add('hostname', t.hostname);
    }
    if (aliases.length > 1) {
      candidates.push({
        canonicalId: vol.volumeId,
        type: 'volume',
        aliases,
        evidence: row.matchBy,
        confidence: isManual ? 'high' : (row.matchBy === 'host+drive' ? 'medium' : 'low'),
        confirmed: !!isManual,
      });
    }
  }

  return {
    rows,
    candidates,
    // 保留归一化后的遥测主机：主机/磁盘信息不依赖卷是否匹配成功，
    // 否则「按主机·磁盘」视图会把没关联上卷的主机整台丢掉。
    hosts: hostList,
    stats: {
      volumes: volList.length,
      hosts: hostList.length,
      matched,
      manualMatched,
      unmatched: volList.length - matched,
      candidates: candidates.length,
    },
  };
}

/**
 * 纯函数：把卷视图重组为「主机 → 物理磁盘 → 卷」层级。
 * 无遥测的卷列入 orphans；有主机但无 SN 的卷列入该主机的 unassigned。
 */
export function buildHostTree(mergeResult) {
  const hosts = new Map();
  const orphans = [];

  const ensureHost = (id, init = {}) => {
    if (!hosts.has(id)) {
      hosts.set(id, {
        hostId: id,
        hostname: null,
        deviceName: null,
        deviceUuid: null,
        aliasUuids: [],
        online: null,
        lastAccessMs: null,
        disks: [],
        unassigned: [],
      });
    }
    const host = hosts.get(id);
    for (const [key, value] of Object.entries(init)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        const cur = Array.isArray(host[key]) ? host[key] : [];
        host[key] = [...new Set([...cur, ...value])];
        continue;
      }
      if (host[key] == null || value === true) host[key] = value;
    }
    return host;
  };

  const ensureDisk = (host, serial, init = {}) => {
    // 优先按规范磁盘标识归并：同一块盘的 SN 与 UUID 视图在 applyDiskAliases 后已合为一块。
    const keys = [init.diskId, init.serial, serial, ...(Array.isArray(init.aliasIds) ? init.aliasIds : [])]
      .map(lower).filter(Boolean);
    let disk = keys.length
      ? host.disks.find((d) => [d.diskId, d.serial, ...(Array.isArray(d.aliasIds) ? d.aliasIds : [])]
        .map(lower).filter(Boolean).some((k) => keys.includes(k)))
      : null;
    if (!disk) {
      disk = {
        serial: asString(serial),
        diskId: asString(init.diskId) || asString(serial),
        diskUuid: asString(init.diskUuid) || null,
        aliasIds: [],
        deviceId: null,
        model: null,
        health: null,
        temperature: null,
        hasSmart: false,
        logicalDisks: [],
        volumes: [],
      };
      host.disks.push(disk);
    }
    for (const [key, value] of Object.entries(init)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        if (!value.length) continue;
        const cur = Array.isArray(disk[key]) ? disk[key] : [];
        disk[key] = key === 'aliasIds'
          ? [...new Set([...cur, ...value])]
          : (cur.length ? cur : value);
        continue;
      }
      if (disk[key] == null || value === true) disk[key] = value;
    }
    return disk;
  };

  // 1) 遥测主机先入树：磁盘明细（SN / 型号 / 分区 / 容量）本身就是信息，
  //    不需要先有清单卷才显示。卷匹配只决定能不能进一步串到文件列表。
  for (const h of (Array.isArray(mergeResult?.hosts) ? mergeResult.hosts : [])) {
    const hostId = lower(h.uuid) || lower(h.hostname) || lower(h.name) || 'unknown';
    const host = ensureHost(hostId, {
      hostname: h.hostname || h.name || null,
      deviceName: h.name || null,
      deviceUuid: h.uuid || null,
      aliasUuids: h.aliasUuids || [],
      online: h.online ?? null,
      lastAccessMs: h.lastAccessMs ?? null,
    });
    for (const d of (Array.isArray(h.disks) ? h.disks : [])) {
      const disk = ensureDisk(host, d.serial, {
        serial: d.serial,
        diskId: d.diskId,
        diskUuid: d.uuid,
        aliasIds: d.aliasIds,
        deviceId: d.deviceId,
        model: d.model,
        health: d.health,
        temperature: d.temperature,
        hasSmart: d.hasSmart,
        logicalDisks: d.logicalDisks,
      });
      if (Array.isArray(d.logicalDisks) && !disk.logicalDisks.length) disk.logicalDisks = d.logicalDisks;
    }
  }

  // 2) 卷视图挂到对应主机/磁盘；无遥测的卷单列 orphan。
  for (const r of (mergeResult?.rows || [])) {
    const t = r.telemetry;
    if (!t) { orphans.push(r); continue; }
    const hostId = lower(t.deviceUuid) || lower(t.hostname) || lower(t.deviceName) || 'unknown';
    const host = ensureHost(hostId, {
      hostname: t.hostname || t.deviceName || null,
      deviceName: t.deviceName || null,
      deviceUuid: t.deviceUuid || null,
      aliasUuids: t.aliasUuids || [],
    });
    const sk = lower(t.serial);
    if (!sk) { host.unassigned.push(r); continue; }
    const disk = ensureDisk(host, t.serial, {
      serial: t.serial,
      diskId: t.diskId,
      diskUuid: t.diskUuid,
      aliasIds: t.aliasIds,
      deviceId: t.deviceId,
      model: t.smart?.model || null,
      health: t.smart?.health || null,
      temperature: t.smart?.temperature ?? null,
      hasSmart: !!t.smart?.hasSmart,
    });
    disk.volumes.push(r);
  }

  const hostList = [...hosts.values()];
  hostList.sort((a, b) => (a.hostname || a.deviceName || a.hostId).localeCompare(b.hostname || b.deviceName || b.hostId));
  for (const h of hostList) h.disks.sort((a, b) => String(a.serial).localeCompare(String(b.serial)));
  return { hosts: hostList, orphans };
}

/** 组装写回数据组的综合文档：同时含卷视图与主机层级树。 */
export function buildHostDiskDocument(mergeResult, source) {
  const tree = buildHostTree(mergeResult);
  return {
    version: 2,
    source: asString(source) || 'zip-browser',
    generatedAt: new Date().toISOString(),
    volumes: mergeResult.rows.map((r) => ({
      volumeId: r.volumeId,
      drive: r.drive,
      sourceHost: r.sourceHost,
      fileCount: r.fileCount,
      totalSize: r.totalSize,
      matchBy: r.matchBy,
      manualSerial: r.manualSerial,
      telemetry: r.telemetry,
    })),
    hosts: tree.hosts.map((h) => ({
      hostId: h.hostId,
      hostname: h.hostname,
      deviceName: h.deviceName,
      deviceUuid: h.deviceUuid,
      aliasUuids: h.aliasUuids || [],
      disks: h.disks.map((d) => ({
        serial: d.serial,
        diskId: d.diskId || d.serial,
        diskUuid: d.diskUuid || null,
        aliasIds: d.aliasIds || [],
        deviceId: d.deviceId,
        model: d.model,
        health: d.health,
        temperature: d.temperature,
        logicalDisks: d.logicalDisks || [],
        volumes: d.volumes.map((r) => r.volumeId),
      })),
      unassigned: h.unassigned.map((r) => r.volumeId),
    })),
    orphans: tree.orphans.map((r) => r.volumeId),
    stats: mergeResult.stats,
  };
}

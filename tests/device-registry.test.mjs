import test from 'node:test';
import assert from 'node:assert/strict';

const reg = await import('../web/device-registry-store.js');
const ufs = await import('../web/ufs-nodes-reader.js');
const merge = await import('../web/host-disk-merge.js');

const detail = (uuid, hostname, serial, logical = 'C:') => ({
  host_info: { device_uuid: uuid, device_name: hostname, hostname },
  physical_disks: [{ DeviceID: '\\\\.\\PHYSICALDRIVE0', SerialNumber: serial, Model: 'SSD-X' }],
  logical_disks: [{ DeviceID: logical, VolumeName: 'System', FileSystem: 'NTFS', SizeGB: 500 }],
  disk_partition_mappings: [{ PhysicalDisk: '\\\\.\\PHYSICALDRIVE0', PhysicalDiskSerial: serial, LogicalDisk: logical }],
});

test('device-registry：upsert 写入 my-data 格式的 volume 实体与 serial alias', () => {
  const r = reg.upsertVolumeMapping(reg.emptyRegistry(), {
    volumeId: 'VOL-C', serial: 'SNR123', hostname: 'PC-1', drive: 'C:', deviceUuid: 'u1',
  });
  assert.equal(r.v, 1);
  assert.ok(r.updatedAt.endsWith('Z'));
  assert.equal(r.devices.length, 1);
  const d = r.devices[0];
  assert.equal(d.id, 'VOL-C');
  assert.equal(d.type, 'volume');
  assert.equal(d.links.deviceUuid, 'u1');
  const kinds = Object.fromEntries(d.aliases.map((a) => [a.kind, a.value]));
  assert.equal(kinds.serial, 'SNR123');
  assert.equal(kinds.volumeId, 'VOL-C');
  assert.equal(kinds.driveLetter, 'C:');
  assert.equal(d.aliases.find((a) => a.kind === 'serial').source, 'user');
});

test('device-registry：同一 SN 不能映射到两个 volumeId（不自动归并）', () => {
  const r = reg.upsertVolumeMapping(reg.emptyRegistry(), { volumeId: 'VOL-A', serial: 'SNR1' });
  assert.throws(
    () => reg.upsertVolumeMapping(r, { volumeId: 'VOL-B', serial: 'SNR1' }),
    /已映射到 VOL-A/,
  );
});

test('device-registry：remove 删掉 SN alias，无其它信息则整条实体删除', () => {
  const r = reg.upsertVolumeMapping(reg.emptyRegistry(), { volumeId: 'VOL-A', serial: 'SNR1' });
  const after = reg.removeVolumeMapping(r, 'VOL-A');
  assert.equal(after.devices.length, 0);
  // 带 deviceUuid 时实体保留，仅移除 serial alias
  const r2 = reg.upsertVolumeMapping(r, { volumeId: 'VOL-A', serial: 'SNR1', deviceUuid: 'u1' });
  const changed = reg.removeVolumeMapping(r2, 'VOL-A');
  const d = changed.devices.find((x) => x.id === 'VOL-A');
  assert.ok(d, '带 links 的实体应保留');
  assert.ok(!d.aliases.some((a) => a.kind === 'serial'));
  assert.ok(d.aliases.some((a) => a.kind === 'volumeId'));
});

test('device-registry：sanitize 对相同 value+kind 去重，未知 kind 丢弃', () => {
  const out = reg.sanitizeRegistry({
    v: 1, updatedAt: '2026-01-01T00:00:00.000Z',
    devices: [{
      id: 'V1', type: 'volume', primaryName: 'V1', aliases: [
        { value: 'S1', kind: 'serial', source: 'user' },
        { value: 'S1', kind: 'serial', source: 'user' },
        { value: 'x', kind: 'bogus', source: 'user' },
      ],
    }],
  });
  assert.equal(out.devices[0].aliases.length, 1);
});

test('device-registry：host UUID 归并写入 type:host 实体与 deviceUuid alias', () => {
  let r = reg.upsertHostAlias(reg.emptyRegistry(), {
    canonicalUuid: 'uuid-new', aliasUuid: 'uuid-old', hostname: 'LAPTOP-NEW',
  });
  assert.equal(r.devices.length, 1);
  const d = r.devices[0];
  assert.equal(d.id, 'uuid-new');
  assert.equal(d.type, 'host');
  const uuids = d.aliases.filter((a) => a.kind === 'deviceUuid').map((a) => a.value);
  assert.deepEqual(uuids, ['uuid-new', 'uuid-old']);
  assert.ok(d.aliases.some((a) => a.kind === 'hostname' && a.value === 'LAPTOP-NEW'));
  // 再加一个别名
  r = reg.upsertHostAlias(r, { canonicalUuid: 'UUID-NEW', aliasUuid: 'uuid-older' });
  assert.equal(r.devices.length, 1);
  assert.equal(reg.listHostAliases(r)[0].aliases.length, 2);
});

test('device-registry：别名 UUID 不能归到两个规范，规范本身不能是别人的别名', () => {
  let r = reg.upsertHostAlias(reg.emptyRegistry(), { canonicalUuid: 'u1', aliasUuid: 'u-old' });
  assert.throws(
    () => reg.upsertHostAlias(r, { canonicalUuid: 'u2', aliasUuid: 'U-OLD' }),
    /已归并到 u1/,
  );
  assert.throws(
    () => reg.upsertHostAlias(r, { canonicalUuid: 'u-old', aliasUuid: 'u3' }),
    /已是 u1 的别名/,
  );
  assert.throws(
    () => reg.upsertHostAlias(r, { canonicalUuid: 'u1', aliasUuid: 'u1' }),
    /不能相同/,
  );
});

test('device-registry：删除 host 别名，最后一个别名删掉后实体移除', () => {
  let r = reg.upsertHostAlias(reg.emptyRegistry(), { canonicalUuid: 'u1', aliasUuid: 'u-old' });
  r = reg.removeHostAlias(r, 'u1', 'u-old');
  assert.equal(reg.listHostAliases(r).length, 0);
  assert.equal(r.devices.length, 0);
});

test('device-registry：磁盘归并写入 type:disk，SN 与 UUID 都可作为别名', () => {
  let r = reg.upsertDiskAlias(reg.emptyRegistry(), {
    canonicalId: '001B_448B_48B6_F5C2.', aliasId: '9e630b28-f52b-4b98-a9bc-e2e9ebe601bc',
    model: 'WDC SN730',
  });
  assert.equal(r.devices.length, 1);
  const d = r.devices[0];
  assert.equal(d.id, '001B_448B_48B6_F5C2.');
  assert.equal(d.type, 'disk');
  const byValue = Object.fromEntries(d.aliases.map((a) => [a.value, a.kind]));
  assert.equal(byValue['001B_448B_48B6_F5C2.'], 'serial');
  assert.equal(byValue['9e630b28-f52b-4b98-a9bc-e2e9ebe601bc'], 'diskUuid');
  assert.equal(reg.diskIdKind('001B_448B_48B6_F5C2.'), 'serial');
  assert.equal(reg.diskIdKind('9E630B28-F52B-4B98-A9BC-E2E9EBE601BC'), 'diskUuid');
  // 再加一个 SN 别名（同值大小写不同不重复）
  r = reg.upsertDiskAlias(r, { canonicalId: '001B_448B_48B6_F5C2.', aliasId: 'WD-WX11A80E1234' });
  assert.equal(reg.listDiskAliases(r)[0].aliases.length, 2);
});

test('device-registry：磁盘别名冲突检测与删除', () => {
  let r = reg.upsertDiskAlias(reg.emptyRegistry(), { canonicalId: 'SN-A', aliasId: 'uuid-a' });
  assert.throws(() => reg.upsertDiskAlias(r, { canonicalId: 'SN-B', aliasId: 'UUID-A' }), /已归并到 SN-A/);
  assert.throws(() => reg.upsertDiskAlias(r, { canonicalId: 'uuid-a', aliasId: 'x' }), /已是 SN-A 的别名/);
  assert.throws(() => reg.upsertDiskAlias(r, { canonicalId: 'sn-a', aliasId: 'SN-A' }), /不能相同/);
  r = reg.removeDiskAlias(r, 'SN-A', 'uuid-a');
  assert.equal(reg.listDiskAliases(r).length, 0);
  assert.equal(r.devices.length, 0);
});

test('device-registry：disk 的 serial alias 与 volume 的 SN 映射不冲突', () => {
  let r = reg.upsertVolumeMapping(reg.emptyRegistry(), { volumeId: 'VOL-C', serial: 'SN-1' });
  r = reg.upsertDiskAlias(r, { canonicalId: 'SN-1', aliasId: 'disk-uuid-1' });
  assert.equal(r.devices.length, 2);
  assert.equal(reg.mappingBySerial(r).get('sn-1').volumeId, 'VOL-C');
  assert.equal(reg.diskAliasIndex(r).get('disk-uuid-1'), 'SN-1');
  assert.equal(reg.listDiskAliases(r).length, 1);
});

test('device-registry：host 的 deviceUuid alias 与 volume 的 deviceUuid alias 不冲突', () => {
  let r = reg.upsertVolumeMapping(reg.emptyRegistry(), { volumeId: 'VOL-C', serial: 'SN1', deviceUuid: 'u1' });
  r = reg.upsertHostAlias(r, { canonicalUuid: 'u1', aliasUuid: 'u-old' });
  assert.equal(r.devices.length, 2);
  assert.equal(reg.listHostAliases(r).length, 1);
  assert.equal(reg.listVolumeMappings(r).length, 1);
  assert.equal(reg.mappingBySerial(r).get('sn1').volumeId, 'VOL-C');
});

test('hostAliasIndex：别名与规范 UUID 都指向规范 ID', () => {
  const r = reg.upsertHostAlias(reg.emptyRegistry(), { canonicalUuid: 'UUID-NEW', aliasUuid: 'uuid-old' });
  const idx = reg.hostAliasIndex(r);
  assert.equal(idx.get('uuid-old'), 'UUID-NEW');
  assert.equal(idx.get('uuid-new'), 'UUID-NEW');
});

test('merge：UUID 归并后旧 UUID 主机与新 UUID 主机合并为单台，磁盘去重', () => {
  const raws = [
    detail('uuid-old', 'PC-OLD', 'SN-A', 'C:'),
    detail('uuid-new', 'PC-NEW', 'SN-A', 'C:'),
  ];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  assert.equal(hosts.length, 2);
  const r = reg.upsertHostAlias(reg.emptyRegistry(), { canonicalUuid: 'uuid-new', aliasUuid: 'uuid-old' });
  const idx = reg.hostAliasIndex(r);
  const merged = merge.mergeHostsWithVolumes(hosts, [], undefined, idx);
  assert.equal(merged.stats.hosts, 1);
  const tree = merge.buildHostTree(merged);
  assert.equal(tree.hosts.length, 1);
  assert.equal(tree.hosts[0].deviceUuid, 'uuid-new');
  assert.deepEqual(tree.hosts[0].aliasUuids, ['uuid-old']);
  assert.equal(tree.hosts[0].disks.length, 1, '同 SN 磁盘应去重');
  const doc = merge.buildHostDiskDocument(merged, 'zip-browser');
  assert.deepEqual(doc.hosts[0].aliasUuids, ['uuid-old']);
});

test('merge：归并后旧主机名也能匹配清单卷 source（软关联）', () => {
  const raws = [
    detail('uuid-old', 'PC-OLD', 'SN-A', 'C:'),
    detail('uuid-new', 'PC-NEW', 'SN-A', 'C:'),
  ];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  const r = reg.upsertHostAlias(reg.emptyRegistry(), { canonicalUuid: 'uuid-new', aliasUuid: 'uuid-old' });
  const idx = reg.hostAliasIndex(r);
  const volumes = [{ volumeId: 'VOL-C', drive: 'C:', sources: ['PC-OLD'] }];
  const m = merge.mergeHostsWithVolumes(hosts, volumes, undefined, idx);
  assert.equal(m.rows[0].matchBy, 'host+drive');
  assert.equal(m.rows[0].telemetry.deviceUuid, 'uuid-new');
});

test('merge：磁盘 SN 与 SMART UUID 归并后视图合为一块，卷挂到规范盘', () => {
  const uuid = '9e630b28-f52b-4b98-a9bc-e2e9ebe601bc';
  const raws = [
    detail('u1', 'PC-1', '001B_448B_48B6_F5C2.', 'C:'),
    { type: 'disk', serial: '001B_448B_48B6_F5C2.', uuid, host_uuid: 'u1', model: 'WDC SN730', health: 'PASSED' },
  ];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  assert.equal(hosts[0].disks.length, 1);
  assert.equal(hosts[0].disks[0].uuid, uuid, '磁盘视图应保留 SMART 的 uuid');
  // 用 UUID 作别名归到 SN（规范标识），再用别名 UUID 做手工 SN 映射也应命中
  const r = reg.upsertDiskAlias(reg.emptyRegistry(), { canonicalId: '001B_448B_48B6_F5C2.', aliasId: uuid });
  const diskIdx = reg.diskAliasIndex(r);
  assert.equal(diskIdx.get(uuid), '001B_448B_48B6_F5C2.');
  const volumes = [{ volumeId: 'VOL-C', drive: 'C:', sources: ['PC-1'] }];
  const m = merge.mergeHostsWithVolumes(hosts, volumes, undefined, undefined, diskIdx);
  const tree = merge.buildHostTree(m);
  assert.equal(tree.hosts[0].disks.length, 1);
  assert.equal(tree.hosts[0].disks[0].diskId, '001B_448B_48B6_F5C2.');
  assert.deepEqual(tree.hosts[0].disks[0].volumes.map((x) => x.volumeId), ['VOL-C']);
  const doc = merge.buildHostDiskDocument(m, 'zip-browser');
  assert.equal(doc.hosts[0].disks[0].diskUuid, uuid);
  assert.ok(doc.hosts[0].disks[0].aliasIds.includes(uuid));
});

test('merge：两块不同 SN 的磁盘归为同一规范盘后合并为一块（按盘 UUID）', () => {
  const raws = [{
    host_info: { device_uuid: 'u1', device_name: 'PC-1', hostname: 'PC-1' },
    physical_disks: [
      { DeviceID: '\\\\.\\PHYSICALDRIVE0', SerialNumber: 'SN-A', Model: 'SSD-A' },
      { DeviceID: '\\\\.\\PHYSICALDRIVE1', SerialNumber: 'SN-B', Model: 'SSD-B' },
    ],
    logical_disks: [
      { DeviceID: 'C:', VolumeName: 'System', FileSystem: 'NTFS' },
      { DeviceID: 'D:', VolumeName: 'Data', FileSystem: 'NTFS' },
    ],
    disk_partition_mappings: [
      { PhysicalDisk: '\\\\.\\PHYSICALDRIVE0', PhysicalDiskSerial: 'SN-A', LogicalDisk: 'C:' },
      { PhysicalDisk: '\\\\.\\PHYSICALDRIVE1', PhysicalDiskSerial: 'SN-B', LogicalDisk: 'D:' },
    ],
  }];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  assert.equal(hosts.length, 1);
  assert.equal(hosts[0].disks.length, 2);
  const r = reg.upsertDiskAlias(reg.emptyRegistry(), { canonicalId: 'DISK-UUID-1', aliasId: 'SN-A' });
  const r2 = reg.upsertDiskAlias(r, { canonicalId: 'DISK-UUID-1', aliasId: 'SN-B' });
  const m = merge.mergeHostsWithVolumes(hosts, [], undefined, undefined, reg.diskAliasIndex(r2));
  const tree = merge.buildHostTree(m);
  assert.equal(tree.hosts[0].disks.length, 1, '两块盘应合并为同一规范盘');
  assert.equal(tree.hosts[0].disks[0].diskId, 'DISK-UUID-1');
  assert.deepEqual(tree.hosts[0].disks[0].logicalDisks.map((l) => l.deviceId).sort(), ['C:', 'D:']);
});

test('merge：手工 SN 映射优先于主机名+盘符软关联', () => {
  const raws = [
    detail('u1', 'PC-1', 'SN-A', 'C:'),
    { type: 'disk', serial: 'SN-A', host_uuid: 'u1', model: 'M1', health: 'PASSED', temperature: 40 },
  ];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  // 卷 VOL-X 的盘符/主机名都指向 C:/PC-1，但手工映射到 SN-B（不存在），应标记手工且遥测未见
  const volumes = [{ volumeId: 'VOL-X', drive: 'C:', sources: ['PC-1'], fileCount: 1, totalSize: 1 }];
  let regData = reg.upsertVolumeMapping(reg.emptyRegistry(), { volumeId: 'VOL-X', serial: 'SN-B' });
  let m = merge.mergeHostsWithVolumes(hosts, volumes, reg.mappingBySerial(regData));
  assert.equal(m.rows[0].matchBy, 'manual-sn-unverified');
  assert.equal(m.rows[0].telemetry, null);
  assert.equal(m.stats.manualMatched, 0);

  // 映射到真实存在的 SN-A：即使盘符不匹配也按手工 SN 命中，confidence high
  regData = reg.upsertVolumeMapping(regData, { volumeId: 'VOL-X', serial: 'SN-A' });
  m = merge.mergeHostsWithVolumes(hosts, volumes, reg.mappingBySerial(regData));
  assert.equal(m.rows[0].matchBy, 'manual-sn');
  assert.equal(m.rows[0].telemetry.serial, 'SN-A');
  assert.equal(m.stats.manualMatched, 1);
  const cand = m.candidates.find((c) => c.canonicalId === 'VOL-X');
  assert.equal(cand.confidence, 'high');
  assert.equal(cand.confirmed, true);
});

test('buildHostTree + 写回文档：主机→磁盘→卷层级，含 orphans', () => {
  const raws = [detail('u1', 'PC-1', 'SN-A', 'C:')];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  const volumes = [
    { volumeId: 'VOL-C', drive: 'C:', sources: ['PC-1'] },
    { volumeId: 'VOL-ORPHAN', drive: 'Z:', sources: ['PC-9'] },
  ];
  const m = merge.mergeHostsWithVolumes(hosts, volumes);
  const tree = merge.buildHostTree(m);
  assert.equal(tree.hosts.length, 1);
  assert.equal(tree.hosts[0].hostname, 'PC-1');
  assert.equal(tree.hosts[0].disks.length, 1);
  assert.equal(tree.hosts[0].disks[0].serial, 'SN-A');
  assert.deepEqual(tree.hosts[0].disks[0].volumes.map((r) => r.volumeId), ['VOL-C']);
  assert.equal(tree.orphans.length, 1);
  assert.equal(tree.orphans[0].volumeId, 'VOL-ORPHAN');
  const doc = merge.buildHostDiskDocument(m, 'zip-browser');
  assert.equal(doc.hosts.length, 1);
  assert.deepEqual(doc.hosts[0].disks[0].volumes, ['VOL-C']);
  assert.deepEqual(doc.orphans, ['VOL-ORPHAN']);
  assert.equal(doc.volumes.length, 2);
});

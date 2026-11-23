import test from 'node:test';
import assert from 'node:assert/strict';

const ufs = await import('../web/ufs-nodes-reader.js');
const merge = await import('../web/host-disk-merge.js');

const detail = (uuid, hostname) => ({
  host_info: { device_uuid: uuid, device_name: hostname, hostname, platform: 'Windows' },
  physical_disks: [
    { DeviceID: '\\\\.\\PHYSICALDRIVE0', SerialNumber: 'SNR1234567890', Model: 'SSD-X', SizeGB: 512, FirmwareRevision: '1.0' },
  ],
  logical_disks: [
    { DeviceID: 'C:', VolumeName: 'System', FileSystem: 'NTFS', SizeGB: 500, FreeSpaceGB: 200, UsedSpaceGB: 300, UsagePercent: 60, DriveType: 3 },
    { DeviceID: 'D:', VolumeName: 'Data', FileSystem: 'NTFS', SizeGB: 1000, FreeSpaceGB: 400, UsedSpaceGB: 600, UsagePercent: 60, DriveType: 3 },
  ],
  disk_partition_mappings: [
    { PhysicalDisk: '\\\\.\\PHYSICALDRIVE0', PhysicalDiskSerial: 'SNR1234567890', Partition: 'Disk #0, Partition #1', LogicalDisk: 'C:', VolumeName: 'System' },
    { PhysicalDisk: '\\\\.\\PHYSICALDRIVE0', PhysicalDiskSerial: 'SNR1234567890', Partition: 'Disk #0, Partition #2', LogicalDisk: 'D:', VolumeName: 'Data' },
  ],
});

test('decodeFileText：RS readFile 返回 Uint8Array 时按 UTF-8 解码，中文不乱码', async () => {
  const bytes = new TextEncoder().encode('{"host_info":{"device_name":"笔记本"}}');
  const text = await ufs.decodeFileText(bytes);
  assert.equal(text, '{"host_info":{"device_name":"笔记本"}}');
  assert.equal(JSON.parse(text).host_info.device_name, '笔记本');
  assert.equal(await ufs.decodeFileText(new Uint8Array(bytes.buffer, 0, bytes.length).subarray(0)), text);
});

test('normalizeUfsNodes：同 UUID 的 node-control 不能把 detail 主机过滤掉', () => {
  const uuid = '8694cae7-490c-4668-9fb8-929e7d82f80c';
  const raws = [
    { uuid, name: 'vivi-new-laptop', capabilities: {}, inbox: {}, last_access: Date.now(), local_ip: '192.168.1.20' },
    {
      host_info: { device_uuid: uuid, device_name: 'vivi-new-laptop', hostname: 'LAPTOP-91PR81Q2' },
      physical_disks: [{ SerialNumber: '001B_448B_48B6_F5C2.', Model: 'WDC PC SN730 SDBQNTY-512G-1001' }],
      logical_disks: [],
      disk_partition_mappings: [],
    },
  ];
  const { hosts, controlCount } = ufs.normalizeUfsNodes(raws);
  assert.equal(controlCount, 1);
  assert.equal(hosts.length, 1);
  assert.equal(hosts[0].uuid, uuid);
  assert.equal(hosts[0].hostname, 'LAPTOP-91PR81Q2');
  assert.equal(hosts[0].online, true, 'node-control 里的 last_access 也应算出在线状态');
  assert.equal(hosts[0].localIp, '192.168.1.20');
  assert.equal(hosts[0].disks[0].serial, '001B_448B_48B6_F5C2.');
});

test('classifyUfsNodes：按最具体优先分类四类', () => {
  const raws = [
    { type: 'disk', serial: 'S1', host_uuid: 'u1' },
    detail('u1', 'PC-1'),
    { uuid: 'u2', capabilities: {}, inbox: {} },
    { uuid: 'u1', name: 'PC-1', last_access: Date.now() },
  ];
  const kinds = ufs.classifyUfsNodes(raws).map((x) => x.kind);
  assert.deepEqual(kinds, ['disk', 'detail', 'node-control', 'heartbeat']);
});

test('normalizeUfsNodes：明细 + 心跳 + SMART 融合为主机视图，盘符归到对应物理盘', () => {
  const now = Date.now();
  const raws = [
    detail('u1', 'PC-1'),
    { uuid: 'u1', name: 'PC-1', status: 'active', last_access: now },
    { type: 'disk', serial: 'SNR1234567890', host_uuid: 'u1', model: 'SSD-X', health: 'PASSED', temperature: 38 },
  ];
  const { hosts, controlCount } = ufs.normalizeUfsNodes(raws);
  assert.equal(controlCount, 0);
  assert.equal(hosts.length, 1);
  const h = hosts[0];
  assert.equal(h.uuid, 'u1');
  assert.equal(h.hostname, 'PC-1');
  assert.equal(h.online, true);
  assert.equal(h.disks.length, 1);
  const d = h.disks[0];
  assert.equal(d.serial, 'SNR1234567890');
  assert.equal(d.health, 'PASSED');
  assert.equal(d.hasSmart, true);
  assert.equal(d.logicalDisks.length, 2);
  assert.deepEqual(d.logicalDisks.map((l) => l.deviceId).sort(), ['C:', 'D:']);
});

test('mergeHostsWithVolumes：主机名+盘符关联，未匹配显式标注，生成注册表候选', () => {
  const raws = [detail('u1', 'PC-1'), { uuid: 'u1', name: 'PC-1', last_access: Date.now() }];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  const volumes = [
    { volumeId: 'VOL-C', backend: 'VOL_C', drive: 'C:', sources: ['PC-1'], fileCount: 100, totalSize: 500 },
    { volumeId: 'VOL-D', backend: 'VOL_D', drive: 'D:', sources: ['PC-1'], fileCount: 200, totalSize: 1000 },
    { volumeId: 'VOL-X', backend: 'VOL_X', drive: 'E:', sources: ['PC-9'], fileCount: 0, totalSize: 0 },
  ];
  const m = merge.mergeHostsWithVolumes(hosts, volumes);
  assert.equal(m.stats.volumes, 3);
  assert.equal(m.stats.hosts, 1);
  assert.equal(m.stats.matched, 2);
  assert.equal(m.stats.unmatched, 1);
  const c = m.rows.find((r) => r.volumeId === 'VOL-C');
  assert.equal(c.matchBy, 'host+drive');
  assert.equal(c.telemetry.serial, 'SNR1234567890');
  assert.equal(c.telemetry.volumeName, 'System');
  const x = m.rows.find((r) => r.volumeId === 'VOL-X');
  assert.equal(x.matchBy, 'unmatched');
  assert.equal(x.telemetry, null);
  // 候选只产出、不归并；同一卷的 volumeId/serial/盘符/主机名并列为 alias
  const candC = m.candidates.find((c2) => c2.canonicalId === 'VOL-C');
  assert.ok(candC, '应为 VOL-C 生成候选');
  const kinds = candC.aliases.map((a) => a.kind);
  assert.ok(kinds.includes('volumeId'));
  assert.ok(kinds.includes('serial'));
  assert.ok(kinds.includes('driveLetter'));
  assert.ok(kinds.includes('hostname'));
  assert.equal(candC.confidence, 'medium');
});

test('mergeHostsWithVolumes：大小写盘符/主机名也能对齐', () => {
  const raws = [detail('u1', 'pc-1'), { uuid: 'u1', name: 'pc-1', last_access: Date.now() }];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  const volumes = [{ volumeId: 'VOL-C', backend: 'VOL_C', drive: 'c:', sources: ['PC-1'] }];
  const m = merge.mergeHostsWithVolumes(hosts, volumes);
  assert.equal(m.rows[0].matchBy, 'host+drive');
});

test('buildHostDiskDocument：产出 v2 写回文档，含 stats', () => {
  const m = merge.mergeHostsWithVolumes([], []);
  const doc = merge.buildHostDiskDocument(m, 'zip-browser');
  assert.equal(doc.version, 2);
  assert.equal(doc.source, 'zip-browser');
  assert.ok(doc.generatedAt);
  assert.deepEqual(doc.volumes, []);
  assert.deepEqual(doc.stats, m.stats);
});

test('主机磁盘视图不依赖卷匹配：无清单卷时仍保留主机、磁盘与逻辑分区', () => {
  const raws = [detail('u1', 'PC-1')];
  const { hosts } = ufs.normalizeUfsNodes(raws);
  const m = merge.mergeHostsWithVolumes(hosts, []);
  const tree = merge.buildHostTree(m);
  assert.equal(m.stats.matched, 0);
  assert.equal(tree.hosts.length, 1, '没有卷时主机也不能丢');
  assert.equal(tree.hosts[0].deviceUuid, 'u1');
  assert.equal(tree.hosts[0].disks.length, 1);
  assert.equal(tree.hosts[0].disks[0].serial, 'SNR1234567890');
  assert.deepEqual(tree.hosts[0].disks[0].logicalDisks.map((l) => l.deviceId), ['C:', 'D:']);
  assert.deepEqual(tree.hosts[0].disks[0].volumes, []);
  const doc = merge.buildHostDiskDocument(m);
  assert.equal(doc.hosts[0].disks[0].logicalDisks.length, 2);
  assert.equal(doc.hosts[0].hostId, 'u1', '写回文档必须带上主机主键，供磁盘路径生成');
});

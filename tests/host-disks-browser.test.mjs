import test from 'node:test';
import assert from 'node:assert/strict';

const hd = await import('../web/host-disks-browser.js');

const doc = {
  version: 2,
  source: 'zip-browser',
  hosts: [{
    hostId: 'u1',
    hostname: 'LAPTOP-91PR81Q2',
    deviceUuid: 'u1',
    disks: [{
      serial: 'SN-001',
      deviceId: '\\\\.\\PHYSICALDRIVE0',
      model: 'WDC PC SN730',
      logicalDisks: [{ deviceId: 'C:', volumeName: 'Windows', sizeGB: 475.23, freeSpaceGB: 9.38, usagePercent: 98.03 }],
      volumes: ['VOL-C'],
    }],
    unassigned: [],
  }],
  volumes: [{
    volumeId: 'VOL-C', drive: 'C:', matchBy: 'host+drive', fileCount: 12, totalSize: 123456,
    telemetry: { hostname: 'LAPTOP-91PR81Q2', serial: 'SN-001', volumeName: 'Windows' },
  }],
  orphans: ['VOL-X'],
};

test('parseVirtualPath：解析并还原主机/磁盘/卷虚拟路径', () => {
  assert.deepEqual(hd.parseVirtualPath(''), { view: 'root', path: '' });
  assert.deepEqual(hd.parseVirtualPath('/host/u1'), { view: 'host', path: '/host/u1', hostId: 'u1' });
  assert.deepEqual(hd.parseVirtualPath('/disk/u1/SN-001'), { view: 'disk', path: '/disk/u1/SN-001', hostId: 'u1', serial: 'SN-001' });
  assert.deepEqual(hd.parseVirtualPath('/volume/VOL-C'), { view: 'volume', path: '/volume/VOL-C', volumeId: 'VOL-C' });
  assert.deepEqual(hd.parseVirtualPath('/unknown'), { view: 'root', path: '' });
  assert.equal(hd.parseVirtualPath('/host/u%201').hostId, 'u 1');
  assert.equal(hd.diskPath('u 1', 'SN-001'), '/disk/u%201/SN-001');
});

test('describeVirtual：根视图只列主机，卷不越过磁盘直接出现', () => {
  const view = hd.describeVirtual(doc, '');
  assert.equal(view.view, 'root');
  assert.equal(view.crumbs.length, 1);
  assert.equal(view.sections.length, 2);
  const hosts = view.sections.find((s) => s.title.startsWith('主机'));
  assert.equal(hosts.rows.length, 1);
  assert.equal(hosts.rows[0].path, '/host/u1');
  assert.match(hosts.rows[0].meta, /磁盘 1/);
  assert.match(hosts.rows[0].meta, /卷 1/);
  // 已挂在主机磁盘下的卷不再在根层重复列出
  assert.ok(!view.sections.some((s) => s.rows.some((r) => r.path === '/volume/VOL-C')));
  // 只保留不属于任何主机的卷
  const orphans = view.sections[1];
  assert.equal(orphans.title, '未归属主机的卷（1）');
  assert.equal(orphans.rows[0].label, 'VOL-X');
  assert.equal(orphans.rows[0].path, '/volume/VOL-X');
});

test('describeVirtual：主机→磁盘→卷逐层下钻，逻辑分区只读', () => {
  const host = hd.describeVirtual(doc, '/host/u1');
  assert.equal(host.title, 'LAPTOP-91PR81Q2');
  assert.equal(host.crumbs.length, 2);
  assert.equal(host.sections[0].rows[0].path, '/disk/u1/SN-001');

  const disk = hd.describeVirtual(doc, '/disk/u1/SN-001');
  assert.equal(disk.title, 'SN-001');
  assert.equal(disk.crumbs.length, 3);
  assert.equal(disk.sections[0].rows[0].label, 'C:');
  assert.equal(disk.sections[0].rows[0].path, '', '逻辑分区不可再下钻');
  assert.match(disk.sections[0].rows[0].meta, /剩余 9.38 GB/);
  assert.equal(disk.sections[1].rows[0].path, '/volume/VOL-C');

  const volume = hd.describeVirtual(doc, '/volume/VOL-C');
  assert.equal(volume.title, 'VOL-C');
  const labels = volume.sections[0].rows.map((r) => r.label);
  assert.ok(labels.includes('匹配方式'));
  assert.ok(labels.includes('磁盘 SN'));
});

test('describeVirtual：未写回/不存在的节点给出明确空状态', () => {
  assert.match(hd.describeVirtual(null, '').sections[0].title, /主机（0）/);
  assert.match(hd.describeVirtual(doc, '/host/missing').empty, /没有这台主机/);
  assert.match(hd.describeVirtual(doc, '/disk/u1/missing').empty, /没有该磁盘/);
  assert.match(hd.describeVirtual(doc, '/volume/missing').empty, /没有这个卷/);
});

test('旧文档无 hostId：按 UUID/主机名生成路径并可下钻', () => {
  const legacy = {
    hosts: [{
      hostname: 'RICHARD',
      deviceUuid: 'ca83d565-uuid',
      disks: [{ serial: 'SN-9', diskId: 'SN-9', volumes: ['VOL-R'] }],
      unassigned: [],
    }],
    volumes: [{ volumeId: 'VOL-R', drive: 'C:', matchBy: 'host+drive' }],
    orphans: [],
  };
  const root = hd.describeVirtual(legacy, '');
  const hostRow = root.sections.find((s) => s.title.startsWith('主机')).rows[0];
  assert.equal(hostRow.path, '/host/ca83d565-uuid');
  const host = hd.describeVirtual(legacy, hostRow.path);
  const diskRow = host.sections[0].rows[0];
  assert.equal(diskRow.path, '/disk/ca83d565-uuid/SN-9');
  const disk = hd.describeVirtual(legacy, diskRow.path);
  assert.equal(disk.title, 'SN-9');
  assert.equal(disk.sections[1].rows[0].path, '/volume/VOL-R');
});

test('坏链 /disk//<serial>：主机段为空时按 SN 跨主机兜底找到磁盘', () => {
  const legacy = {
    hosts: [{
      hostname: 'RICHARD',
      deviceUuid: 'ca83d565-uuid',
      disks: [{ serial: 'SN-9', diskId: 'SN-9', volumes: ['VOL-R'] }],
      unassigned: [],
    }],
    volumes: [{ volumeId: 'VOL-R', drive: 'C:', matchBy: 'host+drive' }],
    orphans: [],
  };
  const parsed = hd.parseVirtualPath('/disk//SN-9');
  assert.equal(parsed.view, 'disk');
  assert.equal(parsed.hostId, '');
  assert.equal(parsed.serial, 'SN-9');
  const disk = hd.describeVirtual(legacy, parsed.path);
  assert.equal(disk.title, 'SN-9');
  assert.equal(disk.crumbs[1].label, 'RICHARD');
});

test('readText：兼容 string / Uint8Array / ArrayBuffer，中文不乱码', async () => {  const payload = JSON.stringify({ hosts: [{ hostname: '笔记本' }], volumes: [] });
  const bytes = new TextEncoder().encode(payload);
  assert.equal(await hd.readText({ readFile: async () => payload }, '/x'), payload);
  assert.equal(await hd.readText({ readFile: async () => bytes }, '/x'), payload);
  assert.equal(await hd.readText({ readFile: async () => bytes.buffer }, '/x'), payload);
});

test('readHostDisksFrom：解析文档并校验 hosts', async () => {
  const payload = JSON.stringify({ hosts: [], volumes: [] });
  const fp = { readFile: async () => new TextEncoder().encode(payload) };
  const parsed = await hd.readHostDisksFrom(fp, (rel) => `/${rel}`);
  assert.deepEqual(parsed.hosts, []);
  await assert.rejects(
    () => hd.readHostDisksFrom({ readFile: async () => '{"volumes":[]}' }, (rel) => `/${rel}`),
    /缺少 hosts/,
  );
});

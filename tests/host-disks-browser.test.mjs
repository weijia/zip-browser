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
  assert.deepEqual(hd.parseVirtualPath('/partition/u1/SN-001/C%3A'), {
    view: 'partition', path: '/partition/u1/SN-001/C%3A', hostId: 'u1', serial: 'SN-001', deviceId: 'C:',
  });
  assert.deepEqual(hd.parseVirtualPath('/tree/VOL-C/Users/x'), {
    view: 'tree', path: '/tree/VOL-C/Users/x', volumeId: 'VOL-C', segments: ['Users', 'x'], rel: 'Users/x',
  });
  assert.deepEqual(hd.parseVirtualPath('/tree/VOL-C'), {
    view: 'tree', path: '/tree/VOL-C', volumeId: 'VOL-C', segments: [], rel: '',
  });
  assert.equal(hd.treePath('VOL-C', 'Users/x'), '/tree/VOL-C/Users/x');
  assert.equal(hd.partitionPath('u1', 'SN-001', 'C:'), '/partition/u1/SN-001/C%3A');
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

test('describeVirtual：主机→磁盘→分区逐层下钻，分区行带本地/单卷/详情信息', () => {
  const host = hd.describeVirtual(doc, '/host/u1');
  assert.equal(host.title, 'LAPTOP-91PR81Q2');
  assert.equal(host.crumbs.length, 2);
  assert.equal(host.sections[0].rows[0].path, '/disk/u1/SN-001');

  const disk = hd.describeVirtual(doc, '/disk/u1/SN-001');
  assert.equal(disk.title, 'SN-001');
  assert.equal(disk.crumbs.length, 3);
  const partition = disk.sections[0].rows[0];
  assert.equal(partition.label, 'C:');
  assert.equal(partition.kind, 'partition');
  assert.equal(partition.path, '/partition/u1/SN-001/C%3A');
  assert.equal(partition.detailPath, '/partition/u1/SN-001/C%3A');
  assert.equal(partition.singlePath, '/tree/VOL-C', '只有一个关联卷时可直接进卷树');
  assert.equal(partition.localPath, '', '非本机主机又没有本机卷 ID 时不落本地');
  assert.deepEqual(partition.volumeIds, ['VOL-C']);
  assert.match(partition.meta, /剩余 9.38 GB/);
  assert.match(partition.meta, /关联卷 1/);

  const volume = hd.describeVirtual(doc, '/volume/VOL-C');
  assert.equal(volume.title, 'VOL-C');
  const labels = volume.sections[0].rows.map((r) => r.label);
  assert.ok(labels.includes('匹配方式'));
  // 磁盘属性不再混在卷属性里，单独一块「所属磁盘」，并带直达磁盘的入口
  const diskSection = volume.sections.find((s) => s.title === '所属磁盘');
  assert.ok(diskSection, '卷详情必须有独立的「所属磁盘」块');
  const serialRow = diskSection.rows.find((r) => r.label === '磁盘 SN');
  assert.equal(serialRow.meta, 'SN-001');
  assert.equal(serialRow.path, '/disk/u1/SN-001', '磁盘 SN 可点击进入磁盘视图');
  assert.ok(diskSection.rows.some((r) => r.label === '设备 ID' && r.meta === '\\\\.\\PHYSICALDRIVE0'));
  assert.ok(diskSection.rows.some((r) => r.label === '型号' && /SN730/.test(r.meta)));
  assert.ok(!labels.includes('磁盘 SN'), '卷属性里不该再有磁盘 SN');
  const hostSection = volume.sections.find((s) => s.title === '主机');
  assert.ok(hostSection.rows.some((r) => r.label === '设备 UUID' && r.meta === 'u1'));
});

test('describeVirtual：本机分区标记（host.local / 本机卷 ID 命中）', () => {
  const localDoc = {
    ...doc,
    hosts: [{ ...doc.hosts[0], local: true }],
  };
  const local = { host: 'LAPTOP-91PR81Q2', volumes: { C: 'VOL-C' } };
  const disk = hd.describeVirtual(localDoc, '/disk/u1/SN-001', { local });
  const partition = disk.sections[0].rows[0];
  assert.equal(partition.hostLocal, true);
  assert.equal(partition.localPath, 'C:\\');
  assert.equal(partition.localVolumeId, 'VOL-C');

  // 文档里没有 local 标记，但主机名与本机相同：仍算本机主机，走「本机路径」而不是只读树
  const remote = hd.describeVirtual(doc, '/disk/u1/SN-001', { local });
  assert.equal(remote.sections[0].rows[0].localPath, 'C:\\');
  assert.equal(remote.sections[0].rows[0].hostLocal, true);

  // 主机名与本机不同、盘符也不在本机卷清单里 → 不落本地（只能只读浏览）
  const other = hd.describeVirtual(doc, '/disk/u1/SN-001', { local: { host: 'OTHER', volumes: { D: 'VOL-D' } } });
  assert.equal(other.sections[0].rows[0].localPath, '');
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
  assert.equal(disk.sections[1].rows[0].path, '/tree/VOL-R');
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

test('describeVirtual：隐藏无磁盘主机只过滤根视图主机行，其卷不变成孤儿卷', () => {
  const withNoDisk = {
    hosts: [
      { hostId: 'u1', hostname: 'LAPTOP', deviceUuid: 'u1', disks: [{ serial: 'SN-001', volumes: ['VOL-C'] }], unassigned: [] },
      // 只有卷、没有磁盘遥测的主机：勾选后被隐藏，但它的卷仍算「已归属主机」
      { hostId: 'u2', hostname: 'OLD-PC', deviceUuid: 'u2', disks: [], unassigned: ['VOL-D'] },
    ],
    volumes: [
      { volumeId: 'VOL-C', drive: 'C:', matchBy: 'host+drive' },
      { volumeId: 'VOL-D', drive: 'D:', matchBy: 'host-only' },
    ],
    orphans: [],
  };
  const shown = hd.describeVirtual(withNoDisk, '');
  const shownHosts = shown.sections.find((s) => s.title.startsWith('主机'));
  assert.equal(shownHosts.rows.length, 2);
  assert.equal(shown.hostStats.hidden, 0);

  const filtered = hd.describeVirtual(withNoDisk, '', { hideNoDiskHosts: true });
  const hosts = filtered.sections.find((s) => s.title.startsWith('主机'));
  assert.equal(hosts.rows.length, 1, '只保留有磁盘的主机');
  assert.equal(hosts.rows[0].path, '/host/u1');
  assert.match(hosts.title, /主机（1）$/);
  assert.deepEqual(filtered.hostStats, { total: 2, visible: 1, hidden: 1 });
  assert.ok(!filtered.sections.some((s) => s.title.startsWith('未归属主机的卷')), '被隐藏主机的卷不应掉进孤儿卷');
  // 下钻层级不受开关影响
  assert.equal(hd.describeVirtual(withNoDisk, '/host/u2', { hideNoDiskHosts: true }).title, 'OLD-PC');

  // 全被隐藏时给出可读占位，而不是一行空洞的「无」
  const allHidden = hd.describeVirtual({
    hosts: [{ hostId: 'u3', hostname: 'GHOST', disks: [], unassigned: [] }], volumes: [], orphans: [],
  }, '', { hideNoDiskHosts: true });
  assert.match(allHidden.sections[0].placeholder, /隐藏 1 台无磁盘主机/);
});

test('hide-no-disk 开关在无 localStorage 环境下安全降级', () => {
  assert.equal(hd.readHideNoDisk(), false);
  assert.doesNotThrow(() => hd.writeHideNoDisk(true));
});

test('readText：兼容 string / Uint8Array / ArrayBuffer，中文不乱码', async () => {  const payload = JSON.stringify({ hosts: [{ hostname: '笔记本' }], volumes: [] });
  const bytes = new TextEncoder().encode(payload);
  assert.equal(await hd.readText({ readFile: async () => payload }, '/x'), payload);
  assert.equal(await hd.readText({ readFile: async () => bytes }, '/x'), payload);
  assert.equal(await hd.readText({ readFile: async () => bytes.buffer }, '/x'), payload);
});

test('readHostDisksAny：v2 → 旧路径 → 镜像 依次回退，坏 JSON 不被掩盖', async () => {
  const payload = JSON.stringify({ hosts: [{ hostname: 'A' }], volumes: [] });
  const mb = (rel) => `/${rel}`;
  // 只有镜像
  const mirrorOnly = {
    readFile: async (p) => {
      if (p === `/${hd.HOST_DISKS_MIRROR_PATH}`) return new TextEncoder().encode(payload);
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT' });
    },
  };
  const a = await hd.readHostDisksAny(mirrorOnly, mb);
  assert.equal(a.from, 'mirror');
  assert.deepEqual(a.doc.hosts[0], { hostname: 'A' });
  // 旧路径优先于镜像
  const legacyAndMirror = {
    readFile: async (p) => {
      if (p === `/${hd.HOST_DISKS_PATH}`) return new TextEncoder().encode(JSON.stringify({ hosts: [{ hostname: 'L' }], volumes: [] }));
      if (p === `/${hd.HOST_DISKS_MIRROR_PATH}`) return new TextEncoder().encode(payload);
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT' });
    },
  };
  const b = await hd.readHostDisksAny(legacyAndMirror, mb);
  assert.equal(b.from, 'canonical');
  assert.deepEqual(b.doc.hosts[0], { hostname: 'L' });
  // v2 优先于旧路径
  const all = {
    readFile: async (p) => new TextEncoder().encode(p === `/${hd.HOST_DISKS_V2_PATH}`
      ? JSON.stringify({ hosts: [{ hostname: 'V2' }], volumes: [] })
      : JSON.stringify({ hosts: [{ hostname: 'OLD' }], volumes: [] })),
  };
  const c = await hd.readHostDisksAny(all, mb);
  assert.equal(c.from, 'v2');
  assert.deepEqual(c.doc.hosts[0], { hostname: 'V2' });
  // 主路径坏 JSON 属于真错误，不能用镜像把问题掩盖掉
  const broken = {
    readFile: async (p) => (p === `/${hd.HOST_DISKS_MIRROR_PATH}`
      ? new TextEncoder().encode(payload)
      : new TextEncoder().encode('{bad json')),
  };
  await assert.rejects(() => hd.readHostDisksAny(broken, mb), /JSON|Unexpected/i);
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

const multiVolumeDoc = {
  version: 2,
  hosts: [{
    hostId: 'u2',
    hostname: 'DESKTOP-X',
    deviceUuid: 'u2',
    disks: [{
      serial: 'SN-002',
      logicalDisks: [
        { deviceId: 'D:', volumeName: 'Data', fileSystem: 'NTFS', sizeGB: 931.5, freeSpaceGB: 120.4, usagePercent: 87.1 },
        { deviceId: 'E:', volumeName: 'Games' },
      ],
      volumes: ['VOL-D1', 'VOL-D2'],
    }],
    unassigned: [],
  }],
  volumes: [
    { volumeId: 'VOL-D1', drive: 'D:', matchBy: 'host+drive', fileCount: 120, totalSize: 98765432, telemetry: { hostname: 'DESKTOP-X', volumeName: 'Data' } },
    { volumeId: 'VOL-D2', drive: 'D:', matchBy: 'host-only', localSource: true, localVolumeId: 'LOCAL-D', telemetry: { volumeName: 'Data' } },
  ],
  orphans: [],
};

test('分区视图：一个分区下的多条关联卷全部列出，并标出本机卷', () => {
  const view = hd.describeVirtual(multiVolumeDoc, '/partition/u2/SN-002/D%3A', { local: { host: 'DESKTOP-X', volumes: { D: 'LOCAL-D' } } });
  assert.equal(view.title, 'D:');
  assert.equal(view.crumbs.length, 4, '主机 → 磁盘 → 分区');
  assert.match(view.sections[0].title, /分区信息/);
  const info = view.sections[0].rows.map((r) => `${r.label}=${r.meta}`);
  assert.ok(info.some((line) => line === '本机路径=D:\\'));
  assert.ok(info.some((line) => line.startsWith('关联卷=2')));
  const volumes = view.sections[1];
  assert.match(volumes.title, /关联卷（2）/);
  assert.equal(volumes.rows.length, 2, '多卷必须全部列出');
  assert.equal(volumes.rows[0].volumeId, 'VOL-D2', '本机卷排最前');
  assert.equal(volumes.rows[0].localPath, 'D:\\');
  assert.equal(volumes.rows[0].volumeDrive, 'D:');
  assert.equal(volumes.rows[0].path, '/tree/VOL-D2');
  assert.match(volumes.rows[0].meta, /本机 D:\\/, '本机卷同时标出本地路径');
  assert.equal(volumes.rows[1].volumeId, 'VOL-D1');
  assert.equal(volumes.rows[1].localPath, '');
});

test('分区视图：遥测里没有该分区时，按清单里的卷推断并给出说明', () => {
  const view = hd.describeVirtual({
    hosts: [{ hostId: 'u3', hostname: 'NAS', disks: [{ serial: 'SN-3', logicalDisks: [], volumes: ['VOL-E'] }], unassigned: [] }],
    volumes: [{ volumeId: 'VOL-E', drive: 'E:', matchBy: 'host+drive' }],
    orphans: [],
  }, '/partition/u3/SN-3/E%3A');
  assert.equal(view.title, 'E:');
  assert.equal(view.sections[1].rows.length, 1);
  assert.ok(view.sections[0].rows.some((r) => /遥测没有该分区/.test(r.meta)));
});

test('分区视图：分区不存在时给出空状态', () => {
  const view = hd.describeVirtual(multiVolumeDoc, '/partition/u2/SN-002/Z%3A');
  assert.match(view.empty, /没有该逻辑分区/);
});

test('卷树视图：目录结构 + 文件列表合并展示（注入假 loader）', async () => {
  const treeDoc = {
    ok: true,
    tree: [
      { name: 'Users', type: 'folder', fileCount: 3, totalSize: 4096, children: [
        { name: 'a.txt', type: 'file', size: 1024, updatedAt: Date.UTC(2026, 0, 2, 3, 4) },
        { name: 'sub', type: 'folder', children: [] },
      ] },
    ],
    name: 'D:',
    drive: 'D:',
    sources: ['zip-browser'],
    shardCount: 2,
  };
  const fileDoc = {
    found: true,
    files: [
      { name: 'a.txt', path: 'D:/Users/a.txt', size: 2048, mtime: Date.UTC(2026, 0, 3, 3, 4), tags: ['work'] },
      { name: 'b.bin', path: 'D:/Users/b.bin', size: 10, mtime: 0 },
    ],
    incomplete: false,
    truncated: false,
  };
  const view = await hd.describeTreePath(multiVolumeDoc, '/tree/VOL-D1/Users', {
    loadTree: async () => treeDoc,
    readFiles: async ({ drive, rel }) => {
      assert.equal(drive, 'D');
      assert.equal(rel, 'Users');
      return fileDoc;
    },
  });
  assert.equal(view.view, 'tree');
  assert.equal(view.title, 'Users');
  assert.equal(view.crumbs.length, 4);
  const dirs = view.sections.find((s) => s.title.startsWith('目录'));
  assert.equal(dirs.rows[0].label, 'sub');
  assert.equal(dirs.rows[0].path, '/tree/VOL-D1/Users/sub');
  const files = view.sections.find((s) => s.title.startsWith('文件'));
  assert.equal(files.rows.length, 2);
  const names = files.rows.map((r) => r.label);
  assert.deepEqual(names.sort(), ['a.txt', 'b.bin']);
  const rowA = files.rows.find((r) => r.label === 'a.txt');
  assert.match(rowA.meta, /2\.0 KB/, '文件列表的大小优先于目录结构');
  assert.match(rowA.meta, /标签 work/);
  assert.equal(rowA.kind, 'tree-file');
  assert.equal(rowA.path, '', '文件行不可再下钻');
  assert.ok(view.notes.some((n) => /目录结构来自 2 份分片/.test(n)));
});

test('卷树视图：没有文件列表时只显示目录结构并说明', async () => {
  const view = await hd.describeTreePath(multiVolumeDoc, '/tree/VOL-D1', {
    loadTree: async () => ({ ok: true, tree: [{ name: 'Users', type: 'folder', children: [] }], drive: 'D:' }),
    readFiles: async () => ({ found: false, files: [], note: '该目录没有导出文件列表，只有目录结构' }),
  });
  assert.equal(view.sections.length, 1);
  assert.match(view.sections[0].title, /目录（1）/);
  assert.ok(view.notes.some((n) => /只有目录结构/.test(n)));
});

test('probeVolumeSources：本机卷同样能查到数据组里的结构/文件列表', async () => {
  let sawDrive = '';
  let sawRel = null;
  const probe = await hd.probeVolumeSources('VOL-C', 'C:', {
    loadTree: async () => ({ ok: true, tree: [{ name: 'Users', type: 'folder' }], error: '' }),
    readFiles: async ({ drive, rel }) => {
      sawDrive = drive;
      sawRel = rel;
      return { found: true, files: [{ name: 'a.txt' }, { name: 'b.txt' }], note: '' };
    },
  });
  assert.equal(sawDrive, 'C');
  assert.equal(sawRel, '', '探查卷根');
  assert.equal(probe.tree.ok, true);
  assert.equal(probe.tree.count, 1);
  assert.equal(probe.files.ok, true);
  assert.equal(probe.files.count, 2);
});

test('probeVolumeSources：结构缺失/没有盘符时给出可读状态', async () => {
  const probe = await hd.probeVolumeSources('VOL-X', '', {
    loadTree: async () => ({ ok: false, tree: [], error: '数据组里没有这个卷的 struct 分片' }),
  });
  assert.equal(probe.tree.ok, false);
  assert.equal(probe.tree.error, '数据组里没有这个卷的 struct 分片');
  assert.equal(probe.files.ok, false);
  assert.equal(probe.files.error, '清单里没有盘符');
  assert.equal(probe.files.count, 0);
});

test('probeVolumeSources：缺文件列表只记提示，不算读取错误', async () => {
  const probe = await hd.probeVolumeSources('VOL-C', 'C:', {
    loadTree: async () => ({ ok: true, tree: [], error: '' }),
    readFiles: async () => ({ found: false, files: [], note: '该目录没有导出文件列表，只有目录结构' }),
  });
  assert.equal(probe.files.ok, false);
  assert.equal(probe.files.error, '');
  assert.match(probe.files.note, /只有目录结构/);
});

test('卷树视图：目录结构缺失时给出空状态与非 tree 路径回落', async () => {
  const empty = await hd.describeTreePath(multiVolumeDoc, '/tree/VOL-D1', {
    loadTree: async () => ({ ok: false, tree: [], error: '数据组里没有这个卷的 struct 分片' }),
    readFiles: async () => ({ found: false, files: [], note: '' }),
  });
  assert.match(empty.empty, /没有这个卷的目录结构/);
  assert.ok(empty.notes.some((n) => /struct 分片/.test(n)));

  assert.equal(await hd.describeTreePath(multiVolumeDoc, ''), null, '非 tree 路径交给 describeVirtual');
  assert.equal(await hd.describeTreePath(multiVolumeDoc, '/disk/u2/SN-002'), null);
});

test('卷别名：文档顶层 volumeAliases 直接决定展示，volumeId 行带编辑入口', () => {
  const withAlias = { ...doc, volumeAliases: { 'VOL-C': '系统盘' } };
  const view = hd.describeVirtual(withAlias, '/volume/VOL-C');
  const rows = view.sections[0].rows;
  const idRow = rows.find((r) => r.label === 'volumeId');
  assert.ok(idRow, '卷信息里必须有 volumeId 行');
  assert.equal(idRow.aliasEdit, 'VOL-C');
  assert.equal(idRow.aliasSet, true);
  assert.match(idRow.meta, /VOL-C/);
  assert.match(idRow.meta, /系统盘/);
  assert.ok(view.notes.some((n) => /系统盘/.test(n)));

  const plain = hd.describeVirtual(doc, '/volume/VOL-C');
  const plainRow = plain.sections[0].rows.find((r) => r.label === 'volumeId');
  assert.equal(plainRow.aliasSet, false);
  assert.equal(plainRow.meta, 'VOL-C', '没有别名时只显示 volumeId');
});

test('卷别名：别名按注入的映射生效（本机副本与文档合并）', () => {
  const view = hd.describeVirtual(doc, '/volume/VOL-C', { volumeAliases: { 'VOL-C': '本机命名' } });
  const idRow = view.sections[0].rows.find((r) => r.label === 'volumeId');
  assert.equal(idRow.aliasSet, true);
  assert.match(idRow.meta, /本机命名/);
});

test('卷别名：分区详情的关联卷行也带别名，未设置时不留空字段', () => {
  const withAlias = { ...doc, volumeAliases: { 'VOL-C': '系统盘' } };
  const view = hd.describeVirtual(withAlias, '/partition/u1/SN-001/C%3A');
  const volumeRows = view.sections.find((s) => s.title.startsWith('关联卷')).rows;
  assert.equal(volumeRows.length, 1);
  assert.match(volumeRows[0].meta, /别名 系统盘/);

  const plain = hd.describeVirtual(doc, '/partition/u1/SN-001/C%3A');
  const plainRows = plain.sections.find((s) => s.title.startsWith('关联卷')).rows;
  assert.ok(!/别名/.test(plainRows[0].meta));
});

test('卷别名：volumeAliasesFor 文档优先于本机副本，attachVolumeAliases 写回时不丢别名', () => {
  // Node 环境没有 localStorage，本机副本读为空；这里验证文档侧的行为与合并语义。
  assert.deepEqual(hd.volumeAliasesFor({ volumeAliases: { 'VOL-C': '系统盘' } }), { 'VOL-C': '系统盘' });
  assert.deepEqual(hd.volumeAliasesFor({}), {});
  assert.deepEqual(hd.volumeAliasesFor(null), {});

  const attached = hd.attachVolumeAliases({ ...doc, volumeAliases: { 'VOL-C': '系统盘' } });
  assert.deepEqual(attached.volumeAliases, { 'VOL-C': '系统盘' });
  assert.equal(attached.hosts.length, doc.hosts.length, '只加顶层映射，不动归并结果');
  // 没有别名时原样返回，不凭空造一个空映射。
  assert.equal('volumeAliases' in hd.attachVolumeAliases({ ...doc }), false);

  assert.equal(hd.volumeAliasOf({ 'VOL-C': '系统盘' }, 'VOL-C'), '系统盘');
  assert.equal(hd.volumeAliasOf({}, 'VOL-C'), '');
  assert.equal(hd.volumeAliasOf({ 'VOL-C': '系统盘' }, ''), '');
});

test('卷详情：卷信息 / 所属磁盘 / 主机 三块互不混淆，缺磁盘信息时给占位说明', () => {
  const view = hd.describeVirtual(doc, '/volume/VOL-C');
  assert.deepEqual(view.sections.map((s) => s.title), ['卷信息', '所属磁盘', '主机']);
  assert.ok(!view.sections[0].rows.some((r) => r.label === '设备 UUID'), '主机身份不混进卷信息');

  // 遥测里没有 serial/deviceId/smart，且树里也查不到这块盘 → 明确说明而不是留空
  const bareDoc = {
    ...doc,
    hosts: [],
    volumes: [{ volumeId: 'VOL-Z', drive: 'Z:', matchBy: 'host-only', telemetry: { hostname: 'X' } }],
    orphans: ['VOL-Z'],
  };
  const bare = hd.describeVirtual(bareDoc, '/volume/VOL-Z');
  const diskSection = bare.sections.find((s) => s.title === '所属磁盘');
  const manualRow = diskSection.rows.find((r) => r.serialEdit === 'VOL-Z');
  assert.ok(manualRow, '所属磁盘为空时要给「填写 SN」入口');
  assert.equal(manualRow.meta, '未指定');
  assert.equal(manualRow.serialSet, false);
  assert.ok(bare.notes.some((n) => /填写 SN/.test(n)));
  const hostSection = bare.sections.find((s) => s.title === '主机');
  assert.ok(hostSection.rows.some((r) => r.label === '遥测主机'));
});

test('findDiskByVolume：遥测缺 serial 时按归并树反查所属磁盘', () => {
  const noSerialDoc = {
    ...doc,
    volumes: [{ volumeId: 'VOL-C', drive: 'C:', matchBy: 'host+drive' }, { volumeId: 'VOL-Q', drive: 'Q:' }],
    hosts: [{
      ...doc.hosts[0],
      disks: [{ ...doc.hosts[0].disks[0], serial: 'SN-009', deviceId: '\\\\.\\PHYSICALDRIVE2', volumes: ['VOL-Q'] }],
    }],
    orphans: [],
  };
  const hit = hd.findDiskByVolume(noSerialDoc, 'VOL-Q');
  assert.equal(hit.disk.serial, 'SN-009');
  assert.equal(hit.host.hostname, 'LAPTOP-91PR81Q2');
  assert.equal(hd.findDiskByVolume(noSerialDoc, 'VOL-NONE'), null);

  const view = hd.describeVirtual(noSerialDoc, '/volume/VOL-Q');
  const diskSection = view.sections.find((s) => s.title === '所属磁盘');
  const serialRow = diskSection.rows.find((r) => r.label === '磁盘 SN');
  assert.equal(serialRow.meta, 'SN-009');
  assert.equal(serialRow.path, '/disk/u1/SN-009');
});

test('手工磁盘 SN：填成已存在的磁盘 SN 时把卷挂到该盘下并补齐遥测字段', () => {
  const target = {
    ...doc,
    volumes: [{ volumeId: 'VOL-C', drive: 'C:', matchBy: 'host+drive' }, { volumeId: 'VOL-Q', drive: 'Q:' }],
    orphans: ['VOL-Q'],
  };
  const before = JSON.stringify(target);
  const { doc: patched, matched } = hd.applyManualDiskSerial(target, 'VOL-Q', 'SN-001');
  assert.equal(matched.hostId, 'u1');
  assert.equal(matched.serial, 'SN-001');
  const disk = patched.hosts[0].disks[0];
  assert.deepEqual(disk.volumes, ['VOL-C', 'VOL-Q'], '卷被追加到目标磁盘下');
  assert.ok(!patched.orphans.includes('VOL-Q'), '不再是孤儿卷');
  const vol = patched.volumes.find((v) => v.volumeId === 'VOL-Q');
  assert.equal(vol.manualSerial, 'SN-001');
  assert.equal(vol.matchBy, 'manual-sn');
  assert.equal(vol.telemetry, undefined, '不往遥测里写字，磁盘信息由归并树决定');
  assert.equal(JSON.stringify(target), before, '不修改入参文档');

  // 已经对上真实磁盘的手工关联，也要保留编辑入口（填错了能就地改/清除）
  const view = hd.describeVirtual(patched, '/volume/VOL-Q');
  const row = view.sections.find((s) => s.title === '所属磁盘').rows.find((r) => r.label === '磁盘 SN');
  assert.equal(row.serialEdit, 'VOL-Q');
  assert.equal(row.serialValue, 'SN-001');
  assert.match(row.meta, /SN-001（手工指定）/);
});

test('手工磁盘 SN：SN 在文档里不存在时只记 manualSerial，并说明还没对上', () => {
  const orphanDoc = { ...doc, hosts: [], volumes: [{ volumeId: 'VOL-Q', drive: 'Q:' }], orphans: ['VOL-Q'] };
  const { doc: patched, matched } = hd.applyManualDiskSerial(orphanDoc, 'VOL-Q', 'SN-999');
  assert.equal(matched, null);
  const vol = patched.volumes.find((v) => v.volumeId === 'VOL-Q');
  assert.equal(vol.manualSerial, 'SN-999');
  assert.equal(vol.matchBy, 'manual-sn');
  assert.deepEqual(patched.orphans, ['VOL-Q'], '没命中磁盘时卷不能从树上消失');
});

test('手工磁盘 SN：传空 SN 视为取消关联，手工挂上的卷回到未归属（而不是主机 unassigned）', () => {
  const attached = {
    ...doc,
    volumes: [{ volumeId: 'VOL-Q', drive: 'Q:', matchBy: 'manual-sn', manualSerial: 'SN-001' }],
    hosts: [{
      ...doc.hosts[0],
      disks: [{ ...doc.hosts[0].disks[0], volumes: ['VOL-C', 'VOL-Q'] }],
      unassigned: [],
    }],
    orphans: [],
  };
  // 老版本会把这块盘的 serial/deviceId 写进遥测，取消时要一并摘掉
  attached.volumes[0].telemetry = { serial: 'SN-001', deviceId: '\\\\.\\PHYSICALDRIVE0', hostname: 'LAPTOP-91PR81Q2' };
  const { doc: cleared, matched } = hd.applyManualDiskSerial(attached, 'VOL-Q', '');
  assert.equal(matched, null);
  const disk = cleared.hosts[0].disks[0];
  assert.deepEqual(disk.volumes, ['VOL-C'], '从磁盘下摘掉');
  assert.deepEqual(cleared.hosts[0].unassigned, [], '手工挂上的不能掉进主机未归属，留下脏数据');
  assert.deepEqual(cleared.orphans, ['VOL-Q'], '回到未归属主机的卷列表');
  const vol = cleared.volumes.find((v) => v.volumeId === 'VOL-Q');
  assert.equal(vol.manualSerial, undefined);
  assert.equal(vol.matchBy, 'unmatched');
  assert.equal(vol.telemetry.serial, undefined, '取消时摘掉手工注入的 serial');
  assert.equal(vol.telemetry.deviceId, undefined, '取消时摘掉手工注入的 deviceId');
  assert.equal(vol.telemetry.hostname, 'LAPTOP-91PR81Q2', '原有遥测字段要保留');
});

test('手工磁盘 SN：本来就是真挂在盘下的卷取消手工标记，仍落回该主机 unassigned', () => {
  const realAttach = {
    ...doc,
    volumes: [{ volumeId: 'VOL-Q', drive: 'Q:', matchBy: 'host+drive' }],
    hosts: [{
      ...doc.hosts[0],
      disks: [{ ...doc.hosts[0].disks[0], volumes: ['VOL-C', 'VOL-Q'] }],
      unassigned: [],
    }],
    orphans: [],
  };
  const { doc: cleared } = hd.applyManualDiskSerial(realAttach, 'VOL-Q', '');
  assert.deepEqual(cleared.hosts[0].unassigned, ['VOL-Q']);
  assert.deepEqual(cleared.orphans, [], '真归属的卷不要被当成孤儿');
});

test('手工磁盘 SN：SN 在数据组里没有对应磁盘时，卷详情要说明来源是手工填的', () => {
  // 手工 SN 填了但数据组里还没有这块盘：页面要说明来源是手工填的
  const unmatchedDoc = {
    ...doc,
    volumes: [{ volumeId: 'VOL-Q', drive: 'Q:', matchBy: 'manual-sn', manualSerial: 'SN-777' }],
    hosts: [{ ...doc.hosts[0], disks: [{ ...doc.hosts[0].disks[0], volumes: ['VOL-C'] }], unassigned: [] }],
    orphans: [],
  };
  const view = hd.describeVirtual(unmatchedDoc, '/volume/VOL-Q');
  assert.ok(view.notes.some((n) => /手工填/.test(n)), '手工 SN 未命中真实磁盘时要说明来源');
  const row = view.sections.find((s) => s.title === '所属磁盘').rows.find((r) => r.serialEdit === 'VOL-Q');
  assert.equal(row.serialSet, true);
  assert.match(row.meta, /SN-777/);
});

test('挂起的手工 SN 补丁：记住、覆盖同卷、写回后按值清除', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  assert.deepEqual(hd.readPendingSerials(), []);

  hd.addPendingSerial('VOL-Q', 'SN-1');
  assert.deepEqual(hd.readPendingSerials(), [{ volumeId: 'VOL-Q', serial: 'SN-1' }]);

  // 同一卷再填一次：只保留最后一次
  hd.addPendingSerial('VOL-Q', 'SN-2');
  assert.deepEqual(hd.readPendingSerials(), [{ volumeId: 'VOL-Q', serial: 'SN-2' }]);

  hd.addPendingSerial('VOL-R', 'SN-3');
  assert.equal(hd.readPendingSerials().length, 2);

  // 值已变成 SN-2，用旧值 SN-1 清除不该动它
  hd.clearPendingSerial('VOL-Q', 'SN-1');
  assert.deepEqual(hd.readPendingSerials().map((x) => `${x.volumeId}:${x.serial}`), ['VOL-Q:SN-2', 'VOL-R:SN-3']);

  hd.clearPendingSerial('VOL-Q', 'SN-2');
  hd.clearPendingSerial('VOL-R');
  assert.deepEqual(hd.readPendingSerials(), []);
  delete globalThis.localStorage;
});

test("卷 ID 推断 SN：只认 openlist-xxx-单个数字 的形态", () => {
  assert.equal(hd.deriveSerialFromVolumeId("openlist-93R7SZ7KS-0"), "93R7SZ7KS");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-849EC7K9T-3"), "849EC7K9T");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-091031PB42041SH42VMM-6"), "091031PB42041SH42VMM");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-93R7SZ7KS-9"), "93R7SZ7KS");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-h99-130"), "", "末尾多位编号不能把 h99-13 当 SN");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-baidu-130"), "");
  assert.equal(hd.deriveSerialFromVolumeId("openlist-kuake"), "");
  assert.equal(hd.deriveSerialFromVolumeId("openlist--0"), "");
  assert.equal(hd.deriveSerialFromVolumeId("A401-6B8F"), "");
  assert.equal(hd.deriveSerialFromVolumeId(""), "");
});

test("没有磁盘信息的 openlist 卷按 ID 推断 SN：能对上磁盘就挂上去，对不上只标注推断", () => {
  const derivedDoc = {
    ...doc,
    hosts: [{ ...doc.hosts[0], disks: [{ ...doc.hosts[0].disks[0], serial: "93R7SZ7KS", volumes: [] }], unassigned: [] }],
    volumes: [
      { volumeId: "openlist-93R7SZ7KS-0", drive: "/93R7SZ7KS/0", matchBy: "unmatched" },
      { volumeId: "openlist-849EC7K9T-0", drive: "/849EC7K9T/0" },
      { volumeId: "A401-6B8F", matchBy: "local-volume-id", telemetry: { serial: "001B_448B_48B6_F5C2." } },
    ],
    orphans: ["openlist-93R7SZ7KS-0", "openlist-849EC7K9T-0"],
  };
  const before = JSON.stringify(derivedDoc);
  const out = hd.applyDerivedSerials(derivedDoc);
  assert.equal(JSON.stringify(derivedDoc), before, "不修改入参文档");
  assert.deepEqual(out.hosts[0].disks[0].volumes, ["openlist-93R7SZ7KS-0"], "能对上磁盘的卷挂到盘下");
  assert.deepEqual(out.orphans, ["openlist-849EC7K9T-0"], "挂上盘的卷从孤儿列表摘掉");
  const hit = out.volumes.find((v) => v.volumeId === "openlist-93R7SZ7KS-0");
  assert.equal(hit.derivedSerial, "93R7SZ7KS");
  assert.equal(hit.matchBy, "derived-sn");
  const miss = out.volumes.find((v) => v.volumeId === "openlist-849EC7K9T-0");
  assert.equal(miss.derivedSerial, "849EC7K9T");
  assert.equal(miss.matchBy, "derived-sn-unverified");
  const plain = out.volumes.find((v) => v.volumeId === "A401-6B8F");
  assert.equal(plain.derivedSerial, undefined, "已有磁盘信息的卷不猜");

  // 已经挂在盘下 / 手工填过的卷不再猜
  const attached = { ...out, volumes: out.volumes.map((v) => (v.volumeId === "openlist-849EC7K9T-0" ? { ...v, manualSerial: "X-1" } : v)) };
  const again = hd.applyDerivedSerials(attached);
  assert.equal(again.volumes.find((v) => v.volumeId === "openlist-849EC7K9T-0").derivedSerial, undefined);

  // 卷详情：对不上盘时说明 SN 是推断的
  const view = hd.describeVirtual(out, "/volume/openlist-849EC7K9T-0");
  const row = view.sections.find((s) => s.title === "所属磁盘").rows.find((r) => r.label === "磁盘 SN");
  assert.match(row.meta, /849EC7K9T（由卷 ID 推断/);
  assert.equal(row.serialEdit, "openlist-849EC7K9T-0");
  assert.ok(view.notes.some((n) => /自动推断/.test(n)));
});

test("逻辑分区别名：分区详情可加/改/清，键就是分区路径，写回时并进文档", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const key = hd.partitionAliasKey("u1", "SN-001", "C:");
  assert.equal(key, "/partition/u1/SN-001/C%3A");

  const view = hd.describeVirtual(doc, key);
  const rows = view.sections.find((s) => s.title === "分区信息").rows;
  const idRow = rows.find((r) => r.label === "逻辑分区");
  assert.equal(idRow.meta, "C:");
  assert.equal(idRow.aliasEdit, key);
  assert.equal(idRow.aliasKind, "partition");
  assert.equal(idRow.aliasSet, false);

  // 本机别名立即可见
  hd.setLocalPartitionAlias(key, "系统区");
  const view2 = hd.describeVirtual(doc, key);
  const idRow2 = view2.sections.find((s) => s.title === "分区信息").rows.find((r) => r.label === "逻辑分区");
  assert.equal(idRow2.aliasSet, true);
  assert.match(idRow2.meta, /C: · 别名「系统区」/);

  // 写回前并进文档（跨端可见），卷别名与分区别名互不影响
  const withAliases = hd.attachVolumeAliases(doc);
  assert.equal(withAliases.partitionAliases[key], "系统区");
  const docOnly = hd.describeVirtual({ ...doc, partitionAliases: { [key]: "文档里的名字" } }, key);
  const idRow3 = docOnly.sections.find((s) => s.title === "分区信息").rows.find((r) => r.label === "逻辑分区");
  assert.match(idRow3.meta, /文档里的名字/, "文档里的别名优先于本机副本");

  // 清空＝删除
  hd.setLocalPartitionAlias(key, "");
  assert.equal(hd.readLocalPartitionAliases()[key], undefined);
  const cleared = hd.attachVolumeAliases(doc);
  assert.equal(cleared.partitionAliases, undefined, "没有别名时不往文档里塞空表");
  delete globalThis.localStorage;
});


import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dc = await import('../server/drive-cache.js');
const be = await import('../web/drive-backends.js');

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'zb-drive-cache-'));
}

test('后端名列表写死且数量稳定', () => {
  assert.equal(be.OPENLIST_BACKENDS.length, 89);
  assert.equal(be.isKnownBackend('AliyundriveOpen'), true);
  assert.equal(be.isKnownBackend('BaiduNetdisk'), true);
  assert.equal(be.isKnownBackend('../../etc'), false);
  assert.equal(be.isKnownBackend(''), false);
});

test('resolveCodesRoot：非 Windows 走 homedir/codes', async () => {
  const lin = await dc.resolveCodesRoot({ platform: 'linux', homedir: '/home/u' });
  assert.equal(path.posix.normalize(lin.split(path.sep).join('/')), '/home/u/codes');
});

test('sanitizeInfo：校验后端白名单，选填项缺省为 null，超长截断', () => {
  const info = dc.sanitizeInfo({
    backend: 'BaiduNetdisk', label: '  备份盘  ', total: '2TB', free: '', upQuota: null,
    downQuota: 'X'.repeat(500), upRemaining: '  300GB  ', downRemaining: null,
  });
  assert.equal(info.backend, 'BaiduNetdisk');
  assert.equal(info.label, '备份盘');
  assert.equal(info.total, '2TB');
  assert.equal(info.free, null);
  assert.equal(info.upQuota, null);
  assert.equal(info.upRemaining, '300GB');
  assert.equal(info.downRemaining, null);
  assert.equal(info.downQuota.length, dc.MAX_FIELD_LENGTH);
  assert.throws(() => dc.sanitizeInfo({ backend: 'evil/../x' }));
  assert.throws(() => dc.sanitizeInfo({ backend: 'bad@name' }));
});

test('清单卷：volumeId 作 backend 落盘，清单字段可回读且序号独立', async () => {
  const root = await tempRoot();
  try {
    const a = await dc.saveEntry(root, {
      backend: 'A401-6B8F', volumeId: 'A401-6B8F', drive: 'C:',
      sourceHost: 'LAPTOP-1', fileCount: '12345', totalSize: '987654321',
      label: '系统盘', total: '500GB',
    });
    const b = await dc.saveEntry(root, {
      backend: 'A401-6B8F', volumeId: 'A401-6B8F', drive: 'D:', sourceHost: 'PC-2',
    });
    assert.equal(a.dir, 'A401-6B8F-1');
    assert.equal(b.dir, 'A401-6B8F-2');
    const doc = JSON.parse(await fs.readFile(path.join(root, a.dir, 'info.json'), 'utf8'));
    assert.equal(doc.volumeId, 'A401-6B8F');
    assert.equal(doc.drive, 'C:');
    assert.equal(doc.sourceHost, 'LAPTOP-1');
    assert.equal(doc.fileCount, '12345');
    assert.equal(doc.totalSize, '987654321');
    const listed = await dc.listEntries(root);
    assert.equal(listed.length, 2);
    assert.equal(listed[0].sourceHost, 'LAPTOP-1');
    assert.equal(listed[0].drive, 'C:');
    assert.equal((await fs.stat(path.join(root, a.dir, 'data'))).isDirectory(), true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('saveEntry：序号每后端独立从 1 递增，info.json 落盘', async () => {
  const root = await tempRoot();
  try {
    const a = await dc.saveEntry(root, { backend: 'BaiduNetdisk', total: '2TB' });
    const b = await dc.saveEntry(root, { backend: 'BaiduNetdisk', label: '备份' });
    const c = await dc.saveEntry(root, { backend: 'AliyundriveOpen', free: '1TB' });
    assert.equal(a.dir, 'BaiduNetdisk-1');
    assert.equal(b.dir, 'BaiduNetdisk-2');
    assert.equal(c.dir, 'AliyundriveOpen-1');
    const doc = JSON.parse(await fs.readFile(path.join(root, a.dir, 'info.json'), 'utf8'));
    assert.equal(doc.backend, 'BaiduNetdisk');
    assert.equal(doc.total, '2TB');
    assert.equal(doc.free, null);
    assert.equal(doc.v, 1);
    // 真正的缓存内容放在 data/ 子目录，info.json 留在父目录。
    assert.equal((await fs.stat(path.join(root, a.dir, 'data'))).isDirectory(), true);
    const dataDir = await dc.ensureDataDir(root, a.dir);
    assert.equal(dataDir, path.join(root, a.dir, 'data'));
    assert.equal((await fs.readdir(dataDir)).includes('info.json'), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('listEntries：列出全部登记并按后端/序号排序', async () => {
  const root = await tempRoot();
  try {
    await dc.saveEntry(root, { backend: 'Onedrive' });
    await dc.saveEntry(root, { backend: 'BaiduNetdisk' });
    await dc.saveEntry(root, { backend: 'BaiduNetdisk' });
    const list = await dc.listEntries(root);
    assert.equal(list.length, 3);
    assert.deepEqual(list.map((e) => e.dir), [
      'BaiduNetdisk-1', 'BaiduNetdisk-2', 'Onedrive-1',
    ]);
    assert.equal(list.every((e) => e.hasInfo), true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('parseDirName / deleteEntry：拒绝路径穿越与非法目录名', async () => {
  const root = await tempRoot();
  try {
    await dc.saveEntry(root, { backend: 'WebDav' });
    assert.equal(dc.parseDirName('WebDav-1').backend, 'WebDav');
    assert.equal(dc.parseDirName('../WebDav-1'), null);
    assert.equal(dc.parseDirName('WebDav-1/../x'), null);
    assert.equal(dc.parseDirName('WebDav-1\\evil'), null);
    assert.equal(dc.parseDirName('no-seq'), null);
    assert.equal(dc.parseDirName('bad@name-1'), null);
    // 清单卷的 volumeId（含连字符、字母数字）现在也是合法 backend。
    assert.equal(dc.parseDirName('A401-6B8F-1').backend, 'A401-6B8F');
    assert.equal(dc.isValidBackend('550e8400-e29b-41d4-a716-446655440000'), true);
    await assert.rejects(() => dc.deleteEntry(root, '../WebDav-1'));
    const removed = await dc.deleteEntry(root, 'WebDav-1');
    assert.equal(removed.removed, true);
    assert.equal((await dc.listEntries(root)).length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('删除中间序号后，新登记取最大序号+1（不复用空号）', async () => {
  const root = await tempRoot();
  try {
    await dc.saveEntry(root, { backend: 'S3' });
    await dc.saveEntry(root, { backend: 'S3' });
    await dc.saveEntry(root, { backend: 'S3' });
    await dc.deleteEntry(root, 'S3-2');
    const next = await dc.nextSeq(root, 'S3');
    assert.equal(next, 4);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('updateEntry：原地改写 info.json，目录名/序号不变且后端类型锁定', async () => {
  const root = await tempRoot();
  try {
    const saved = await dc.saveEntry(root, { backend: 'WebDav', label: '旧名称', total: '1TB' });
    const updated = await dc.updateEntry(root, saved.dir, {
      dir: saved.dir,
      backend: 'S3', // 提交不同后端也必须沿用目录名里的 WebDav
      label: '新名称', total: '2TB', free: '500GB', upRemaining: '100GB',
    });
    assert.equal(updated.dir, 'WebDav-1');
    assert.equal(updated.seq, 1);
    assert.equal(updated.backend, 'WebDav');
    assert.equal(updated.label, '新名称');
    assert.equal(updated.free, '500GB');
    assert.equal(updated.upRemaining, '100GB');
    const doc = JSON.parse(await fs.readFile(path.join(root, saved.dir, 'info.json'), 'utf8'));
    assert.equal(doc.backend, 'WebDav');
    assert.equal(doc.label, '新名称');
    assert.equal(doc.total, '2TB');
    const list = await dc.listEntries(root);
    assert.equal(list.length, 1, 'edit must not create a second entry');
    assert.equal(list[0].label, '新名称');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('updateEntry：拒绝非法目录名与不存在的登记', async () => {
  const root = await tempRoot();
  try {
    await assert.rejects(() => dc.updateEntry(root, '../WebDav-1', { label: 'x' }));
    await assert.rejects(() => dc.updateEntry(root, 'WebDav-1/../x', { label: 'x' }));
    await assert.rejects(
      () => dc.updateEntry(root, 'WebDav-9', { label: 'x' }),
      (err) => err.status === 404,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('drive-cache-store：setEntries 写入镜像并触发 onChange，可禁用 repo', async () => {
  const storeMod = await import('../web/drive-cache-store.js');
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
  let notified = 0;
  const store = storeMod.createDriveCacheStore({
    storage, repoFactory: null, onChange: () => { notified += 1; },
  });
  await store.init();
  assert.equal(store.backend, 'local');
  const entries = [{ dir: 'S3-1', seq: 1, backend: 'S3', total: '5TB' }];
  store.setEntries(entries);
  assert.equal(notified, 1);
  assert.equal(store.snapshot().entries.length, 1);
  assert.equal(store.snapshot().entries[0].total, '5TB');
  const mirrored = JSON.parse(map.get(storeMod.STORAGE_KEY));
  assert.equal(mirrored.entries[0].dir, 'S3-1');
});

test('importEntries：按 dir 原样落地，不重算序号，已存在跳过，沿用清单时间戳', async () => {
  const root = await tempRoot();
  try {
    const entries = [
      { dir: 'Local-7', seq: 7, backend: 'Local', label: '/disk/0', total: null, updatedAt: 111 },
      { dir: 'SMB-2', seq: 2, backend: 'SMB', label: '/share', updatedAt: 222 },
    ];
    const r1 = await dc.importEntries(root, entries);
    assert.equal(r1.imported, 2);
    assert.equal(r1.skipped, 0);
    assert.equal(r1.invalid, 0);
    const doc = JSON.parse(await fs.readFile(path.join(root, 'Local-7', 'info.json'), 'utf8'));
    assert.equal(doc.backend, 'Local');
    assert.equal(doc.label, '/disk/0');
    assert.equal(doc.free, null);
    assert.equal(doc.updatedAt, 111);
    assert.equal((await fs.stat(path.join(root, 'Local-7', 'data'))).isDirectory(), true);
    // 再导一次：全部跳过，不覆盖、不新增目录。
    const r2 = await dc.importEntries(root, entries);
    assert.equal(r2.imported, 0);
    assert.equal(r2.skipped, 2);
    const dirs = (await fs.readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory()).map((d) => d.name);
    assert.deepEqual(dirs.sort(), ['Local-7', 'SMB-2']);
    // 本机已有登记被改过：跳过时不覆盖用户的编辑。
    const edited = { ...doc, label: '我改过的名称' };
    await fs.writeFile(path.join(root, 'Local-7', 'info.json'), JSON.stringify(edited), 'utf8');
    await dc.importEntries(root, entries);
    const after = JSON.parse(await fs.readFile(path.join(root, 'Local-7', 'info.json'), 'utf8'));
    assert.equal(after.label, '我改过的名称');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('importEntries：拒绝非法目录名/后端不一致', async () => {
  const root = await tempRoot();
  try {
    const r = await dc.importEntries(root, [
      { dir: '../Local-1', seq: 1, backend: 'Local' },       // 路径穿越
      { dir: 'Local-2', seq: 2, backend: 'SMB' },             // 后端与目录名不符
      { dir: 'bad name!-1', seq: 1, backend: 'bad name!' },   // 目录名/后端含非法字符
    ]);
    assert.equal(r.imported, 0);
    assert.equal(r.invalid, 3);
    const dirs = (await fs.readdir(root)).filter((n) => n !== 'node_modules');
    assert.equal(dirs.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('makeCopyPayload：照搬字段并给副本改名', async () => {
  const storeMod = await import('../web/drive-cache-store.js');
  const payload = storeMod.makeCopyPayload({
    dir: 'WebDav-1', seq: 1, backend: 'WebDav', label: '我的网盘',
    total: '2TB', free: '800GB', upQuota: '1TB', downQuota: '2TB',
    upRemaining: '300GB', downRemaining: '1TB',
    updatedAt: 123, hasInfo: true,
  });
  assert.deepEqual(payload, {
    backend: 'WebDav', label: '我的网盘 副本',
    total: '2TB', free: '800GB', upQuota: '1TB', downQuota: '2TB',
    upRemaining: '300GB', downRemaining: '1TB',
  });
  const blank = storeMod.makeCopyPayload({ backend: 'S3', label: '', total: null });
  assert.equal(blank.label, 'S3 副本');
  assert.equal(blank.free, null);
  assert.equal(blank.upRemaining, null);
});

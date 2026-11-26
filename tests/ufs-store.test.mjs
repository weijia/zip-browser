import test from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../web/ufs-store.js');

function memoryFs(initial = {}) {
  const files = new Map(Object.entries(initial));
  const dirs = new Set(['/']);
  const ensureDirs = (path) => {
    const parts = path.split('/').filter(Boolean);
    let cur = '';
    for (const part of parts) {
      cur += `/${part}`;
      dirs.add(cur);
    }
  };
  return {
    files,
    dirs,
    promises: {
      async readdir(path) {
        const prefix = `${path.replace(/\/+$/, '')}/`;
        const names = new Set();
        for (const file of files.keys()) {
          if (!file.startsWith(prefix)) continue;
          const rest = file.slice(prefix.length);
          if (!rest) continue;
          names.add(rest.split('/')[0]);
        }
        for (const dir of dirs) {
          if (!dir.startsWith(prefix)) continue;
          const rest = dir.slice(prefix.length);
          if (!rest) continue;
          names.add(rest.split('/')[0]);
        }
        if (!names.size) {
          const err = new Error(`ENOENT: no such file or directory, scandir '${path}'`);
          err.code = 'ENOENT';
          throw err;
        }
        return [...names];
      },
      async readFile(path) {
        if (!files.has(path)) {
          const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
          err.code = 'ENOENT';
          throw err;
        }
        return files.get(path);
      },
      async writeFile(path, content) {
        ensureDirs(path.slice(0, path.lastIndexOf('/')));
        files.set(path, String(content));
      },
      async mkdir(path) {
        ensureDirs(path);
      },
      async unlink(path) {
        files.delete(path);
      },
    },
  };
}

test('bucketYear：目录按加入年，文件按 mtime 年，缺失退回加入年', () => {
  const dir = { type: 'dir', addedAt: new Date(2026, 0, 1).getTime(), mtime: new Date(2001, 0, 1).getTime() };
  assert.equal(mod.bucketYear(dir), 2026);
  const file = { type: 'file', addedAt: new Date(2026, 0, 1).getTime(), mtime: new Date(2019, 5, 1).getTime() };
  assert.equal(mod.bucketYear(file), 2019);
  const noMtime = { type: 'file', addedAt: new Date(2024, 0, 1).getTime(), mtime: null };
  assert.equal(mod.bucketYear(noMtime), 2024);
});

test('addEntry：每次写一份新分片，不覆盖已有文件', async () => {
  const fs = memoryFs();
  const now = new Date(2026, 10, 24, 10, 0, 0).getTime();
  const a = await mod.addEntry(fs, {
    name: 'AllBackup', type: 'dir', source: { kind: 'local', path: 'C:\\codes\\AllBackup' }, addedAt: now,
  }, { now, random: 0.1 });
  const b = await mod.addEntry(fs, {
    name: 'a.pdf', type: 'file', mtime: new Date(2019, 0, 1).getTime(),
    source: { kind: 'local', path: 'C:\\codes\\a.pdf' }, addedAt: now,
  }, { now, random: 0.2 });
  assert.equal(a.path, '/ufs/2026/ufs-20261124-100000-199999.json');
  assert.equal(b.path, '/ufs/2019/ufs-20261124-100000-333333.json');
  assert.equal([...fs.files.keys()].length, 2);
  assert.ok(fs.files.has(a.path));
  assert.ok(fs.files.has(b.path));
});

test('readYear：合并多份分片，同 id 取 updatedAt 新的', async () => {
  const fs = memoryFs({
    '/ufs/2026/ufs-a.json': JSON.stringify({ entries: [
      { id: 'local:c:\\x', name: 'x', type: 'dir', updatedAt: 1 },
      { id: 'local:c:\\y', name: 'y', type: 'dir', updatedAt: 1 },
    ] }),
    '/ufs/2026/ufs-b.json': JSON.stringify({ entries: [
      { id: 'local:c:\\x', name: 'x2', type: 'dir', updatedAt: 2 },
    ] }),
  });
  fs.dirs.add('/ufs');
  fs.dirs.add('/ufs/2026');
  const year = await mod.readYear(fs, 2026);
  assert.equal(year.shards, 2);
  assert.equal(year.broken, 0);
  assert.equal(year.entries.length, 2);
  assert.equal(year.entries.find((entry) => entry.id === 'local:c:\\x').name, 'x2');
});

test('readYear：坏分片跳过并计数，不影响其它分片', async () => {
  const fs = memoryFs({
    '/ufs/2026/ufs-a.json': '{bad json',
    '/ufs/2026/ufs-b.json': JSON.stringify({ entries: [{ id: 'i', name: 'ok', type: 'dir', updatedAt: 1 }] }),
  });
  fs.dirs.add('/ufs');
  fs.dirs.add('/ufs/2026');
  const year = await mod.readYear(fs, 2026);
  assert.equal(year.shards, 2);
  assert.equal(year.broken, 1);
  assert.equal(year.entries.length, 1);
});

test('addEntries：一次加入按年份分组，每个年份只生成一份分片', async () => {
  const fs = memoryFs();
  const now = new Date(2026, 10, 24, 10, 0, 0).getTime();
  const result = await mod.addEntries(fs, [
    { name: 'dirA', type: 'dir', source: { kind: 'local', path: 'C:\\a' }, addedAt: now },
    { name: 'old.pdf', type: 'file', mtime: new Date(2019, 0, 1).getTime(), source: { kind: 'local', path: 'C:\\a\\old.pdf' }, addedAt: now },
    { name: 'new.pdf', type: 'file', mtime: now, source: { kind: 'local', path: 'C:\\a\\new.pdf' }, addedAt: now },
  ], { now, random: 0.2 });
  assert.equal(result.shards.length, 2);
  assert.equal(result.entries[0].size, null);
  const y2019 = await mod.readYear(fs, 2019);
  const y2026 = await mod.readYear(fs, 2026);
  assert.equal(y2019.shards, 1);
  assert.equal(y2019.entries.length, 1);
  assert.equal(y2026.shards, 1);
  assert.equal(y2026.entries.length, 2);
});

test('addEntry：直接方法形态的 fs（无 .promises）也能建目录并写分片', async () => {
  const base = memoryFs();
  const direct = {
    ...base.promises,
    async mkdir(path) {
      if (base.dirs.has(path)) {
        const err = new Error('file already exists');
        err.code = 'EEXIST';
        throw err;
      }
      return base.promises.mkdir(path);
    },
  };
  const now = new Date(2026, 10, 24, 10, 0, 0).getTime();
  const a = await mod.addEntry(direct, {
    name: 'codes', type: 'dir', source: { kind: 'local', path: 'C:\\codes' }, addedAt: now,
  }, { now, random: 0.5 });
  const b = await mod.addEntry(direct, {
    name: 'codes', type: 'dir', source: { kind: 'local', path: 'C:\\codes' }, addedAt: now,
  }, { now, random: 0.6 });
  const year = await mod.readYear(direct, 2026);
  assert.equal(year.shards, 2);
  assert.equal(year.entries.length, 1);
  assert.ok(base.files.has(a.path));
  assert.ok(base.files.has(b.path));
});

test('removeEntry：删除包含该 id 的分片文件', async () => {
  const fs = memoryFs({
    '/ufs/2026/ufs-a.json': JSON.stringify({ entries: [{ id: 'target', name: 'a', type: 'dir' }] }),
    '/ufs/2026/ufs-b.json': JSON.stringify({ entries: [{ id: 'other', name: 'b', type: 'dir' }] }),
    '/ufs/2025/ufs-c.json': JSON.stringify({ entries: [{ id: 'target', name: 'c', type: 'dir' }] }),
  });
  fs.dirs.add('/ufs');
  fs.dirs.add('/ufs/2026');
  fs.dirs.add('/ufs/2025');
  const removed = await mod.removeEntry(fs, 'target');
  assert.equal(removed, 2);
  assert.ok(!fs.files.has('/ufs/2026/ufs-a.json'));
  assert.ok(fs.files.has('/ufs/2026/ufs-b.json'));
  assert.ok(!fs.files.has('/ufs/2025/ufs-c.json'));
});

test('writeBundle：目录根、节点、文件 hash 都放进同一个 .jsonl', async () => {
  const fs = memoryFs();
  const now = new Date(2026, 10, 25, 10, 0, 0).getTime();
  const entry = mod.makeEntry({
    name: 'codes',
    type: 'dir',
    source: { kind: 'volume', volumeId: 'vol-1', rel: 'codes', path: '/tree/vol-1/codes' },
    addedAt: now,
  }, now);
  const nodes = [
    { type: 'dir', rel: '', name: 'codes', mtime: now },
    { type: 'dir', rel: 'src', name: 'src', mtime: now },
    { type: 'file', rel: 'src/app.js', name: 'app.js', size: 12, mtime: now, hash: 'sha256:abc' },
  ];
  const result = await mod.writeBundle(fs, entry, nodes, {
    now,
    random: 0.1,
    summary: { dirs: 2, files: 1, size: 12, partial: false, hashFailed: 0 },
  });
  assert.equal(result.path, '/ufs/2026/ufs-20261125-100000-199999.jsonl');
  const text = fs.files.get(result.path);
  const lines = text.trim().split('\n');
  assert.equal(lines.length, 4);
  const meta = JSON.parse(lines[0]);
  assert.equal(meta.kind, 'ufs-bundle');
  assert.equal(meta.summary.files, 1);
  assert.ok(!('nodes' in meta));
  const file = JSON.parse(lines[3]);
  assert.equal(file.hash, 'sha256:abc');
  assert.equal(file.parentId, 'd:src');
  assert.ok(!('children' in file));

  const metaOnly = await mod.readBundleMeta(fs, result.path);
  assert.equal(metaOnly.name, 'codes');
  const full = await mod.readBundle(fs, result.path);
  assert.equal(full.nodes.length, 3);
  assert.equal(full.broken, 0);
});

test('listBundles/listBundleYears：年份目录只放 bundle，不再按 mtime 拆年', async () => {
  const fs = memoryFs();
  const now = new Date(2026, 10, 25, 10, 0, 0).getTime();
  const oldMtime = new Date(2019, 0, 1).getTime();
  const entry = mod.makeEntry({
    name: 'mixed',
    type: 'dir',
    source: { kind: 'volume', volumeId: 'vol-1', rel: 'mixed' },
    addedAt: now,
  }, now);
  const result = await mod.writeBundle(fs, entry, [
    { type: 'dir', rel: '', name: 'mixed' },
    { type: 'file', rel: 'old.pdf', name: 'old.pdf', size: 1, mtime: oldMtime, hash: 'sha256:x' },
  ], { now, random: 0.3, summary: { dirs: 1, files: 1, size: 1, partial: false, hashFailed: 0 } });
  assert.equal(result.year, 2026);
  assert.ok(fs.files.has(result.path));
  assert.ok(!fs.files.has('/ufs/2019/ufs-20190101-000000-000000.jsonl'));
  const bundleInfo = await mod.listBundles(fs, 2026);
  assert.equal(bundleInfo.bundles.length, 1);
  assert.equal(bundleInfo.bundles[0].name, 'mixed');
  const years = await mod.listBundleYears(fs);
  assert.deepEqual(years, [{ year: '2026', bundles: 1, legacy: 0 }]);
});

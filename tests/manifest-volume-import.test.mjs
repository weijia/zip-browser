import test from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../web/manifest-volume-import.js');

function shard(volumeId, { base = `${volumeId}.1`, name = 'C:', fileCount = 0, totalSize = 0, sources = ['PC-1'], children = [] } = {}) {
  return {
    base,
    raw: {
      volumeId, name, type: 'folder',
      part: { id: `${volumeId}.1`, generatedAt: 1700000000000 },
      children, sources, fileCount, totalSize,
    },
  };
}

test('collectVolumes：v2 卷列表去重，统计字段取最大值，来源主机并集', () => {
  const docs = [
    { base: 'PC-1', raw: {
      version: 2, source: 'PC-1',
      mounts: [
        { letter: 'C:', volumeId: 'A401-6B8F', files: ['A401-6B8F.1', 'A401-6B8F.2'] },
        { letter: 'D:', volumeId: 'BBBB-2222', files: ['BBBB-2222.1'] },
      ],
    } },
    shard('A401-6B8F', { base: 'A401-6B8F.1', name: 'C:', fileCount: 100, totalSize: 1000, children: [{ name: 'a', type: 'folder' }] }),
    shard('A401-6B8F', { base: 'A401-6B8F.2', name: 'C:', fileCount: 300, totalSize: 900, sources: ['PC-2'] }),
    shard('BBBB-2222', { name: 'D:', fileCount: 50, totalSize: 500 }),
  ];
  const vols = mod.collectVolumes(docs);
  assert.equal(vols.length, 2);
  const c = vols.find((v) => v.volumeId === 'A401-6B8F');
  assert.ok(c);
  assert.equal(c.drive, 'C:');
  assert.equal(c.fileCount, 300);
  assert.equal(c.totalSize, 1000);
  assert.equal(c.hasChildren, true);
  assert.deepEqual(c.sources, ['PC-1', 'PC-2']);
  assert.equal(c.sourceHost, 'PC-1 / PC-2');
  assert.equal(c.backend, 'A401-6B8F');
  assert.deepEqual(c.shardBases, ['A401-6B8F.1', 'A401-6B8F.2']);
});

test('collectVolumes：未被索引的分片也作为卷导入（不丢数据）', () => {
  const docs = [shard('ORPHAN-1', { name: 'E:', fileCount: 7, totalSize: 70, sources: ['LAPTOP-9'] })];
  const vols = mod.collectVolumes(docs);
  assert.equal(vols.length, 1);
  assert.equal(vols[0].volumeId, 'ORPHAN-1');
  assert.equal(vols[0].drive, 'E:');
  assert.equal(vols[0].fileCount, 7);
  assert.equal(vols[0].sourceHost, 'LAPTOP-9');
});

test('collectVolumes：忽略 legacy v1 整树与畸形条目', () => {
  const docs = [
    { base: 'legacy', raw: { root: { name: 'pc', type: 'folder', children: [] }, source: 'OLD' } },
    { base: 'broken', raw: null },
    shard('GOOD-1'),
  ];
  const vols = mod.collectVolumes(docs);
  assert.equal(vols.length, 1);
  assert.equal(vols[0].volumeId, 'GOOD-1');
});

test('collectVolumes：backend 安全化，volumeId 含非法字符时替换', () => {
  const docs = [shard('HOST::C:', { name: 'C:' })];
  const vols = mod.collectVolumes(docs);
  assert.equal(vols[0].backend, 'HOST__C_');
});

test('formatBytes：人类可读体积', () => {
  assert.equal(mod.formatBytes(0), '—');
  assert.equal(mod.formatBytes(1024), '1 KB');
  assert.equal(mod.formatBytes(1536), '1.5 KB');
  assert.equal(mod.formatBytes(2 * 1024 ** 3), '2 GB');
});

test('sanitizeKey：与 dir-struct-gen 同口径', () => {
  assert.equal(mod.sanitizeKey('A::B/C'), 'A__B_C');
  assert.equal(mod.sanitizeKey('A401-6B8F'), 'A401-6B8F');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  ufsTagKey,
  shortHash,
  stamp,
  replayUfsTags,
  replayNetDriveTags,
  listShards,
  appendShard,
  netDriveTagsDir,
  readUfsTags,
} from '../web/tags-sharded.js';
import { validateDestRel, sameVolume } from '../server/ufs-publish.js';

function memoryFs(seed = {}) {
  const files = new Map(Object.entries(seed));
  const dirs = new Set();
  return {
    files,
    async readdir(p) {
      const prefix = `${p.replace(/\/$/, '')}/`;
      const out = new Set();
      for (const dir of dirs) {
        if (dir.startsWith(prefix)) out.add(dir.slice(prefix.length).split('/')[0]);
      }
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) out.add(file.slice(prefix.length).split('/')[0]);
      }
      return [...out];
    },
    async mkdir(p) { dirs.add(p.replace(/\/$/, '')); },
    async readFile(p) {
      if (!files.has(p)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return files.get(p);
    },
    async writeFile(p, text) { files.set(p, text); },
  };
}

function connected(fp) {
  return { fp, pathFor: (p) => p };
}

test('ufsTagKey 与 onenav 规则一致且稳定', () => {
  assert.equal(shortHash(''), 'ztntfp');
  assert.equal(ufsTagKey('vol:abc/Photos'), 'vol_abc_Photos-su3ie0');
  assert.equal(ufsTagKey('unknown'), 'unknown-174uabd');
  assert.equal(ufsTagKey('vol:abc/Photos'), ufsTagKey('vol:abc/Photos'));
});

test('stamp 使用零填充的年月日时分秒与 6 位随机', () => {
  const value = stamp(new Date(2026, 0, 2, 3, 4, 5), 0.5);
  assert.match(value, /^20260102-030405-[0-9a-f]{6}$/);
});

test('UFS 标签重放：旧表作基线，新事件按序覆盖，remove 生效', () => {
  const tags = replayUfsTags([
    { doc: { tags: { '': ['public'], 'a.jpg': ['x'] } } },
    { doc: { events: [{ op: 'set', rel: 'a.jpg', tags: ['public'] }] } },
    { doc: { events: [{ op: 'remove', rel: 'b.jpg' }] } },
  ]);
  assert.deepEqual(tags.get(''), ['public']);
  assert.deepEqual(tags.get('a.jpg'), ['public']);
  assert.equal(tags.has('b.jpg'), false);
});

test('网盘标签重放：set/remove 严格区分大小写', () => {
  const tags = replayNetDriveTags([
    { doc: { tags: ['public_target'] } },
    { doc: { events: [{ op: 'set', tag: 'Public_target' }, { op: 'remove', tag: 'public_target' }] } },
  ]);
  assert.equal(tags.has('public_target'), false);
  assert.equal(tags.has('Public_target'), true);
});

test('listShards 跨年枚举并按片名升序', async () => {
  const fp = memoryFs({
    'ufs-tags/k/2025/tags-20250101-000001-a.json': JSON.stringify({ events: [{ op: 'set', rel: 'a', tags: ['1'] }] }),
    'ufs-tags/k/2026/tags-20260101-000001-b.json': JSON.stringify({ events: [{ op: 'set', rel: 'a', tags: ['2'] }] }),
    'ufs-tags/k/2024/broken.json': '{bad',
  });
  const shards = await listShards(connected(fp), 'ufs-tags/k');
  assert.deepEqual(shards.map((s) => s.name), [
    'tags-20250101-000001-a.json',
    'tags-20260101-000001-b.json',
  ]);
  assert.equal(replayUfsTags(shards).get('a')[0], '2');
});

test('readUfsTags 同时读 onenav 旧单片与新事件片', async () => {
  const bundleId = 'vol:abc/Photos';
  const key = ufsTagKey(bundleId);
  const fp = memoryFs({
    [`ufs-tags/${key}.json`]: JSON.stringify({ tags: { 'a.jpg': ['x'] } }),
    [`ufs-tags/${key}/2026/tags-20260101-000001-a.json`]: JSON.stringify({
      events: [{ op: 'set', rel: 'b.jpg', tags: ['public'] }],
    }),
  });
  const tags = await readUfsTags(connected(fp), bundleId);
  assert.deepEqual(tags.get('a.jpg'), ['x']);
  assert.deepEqual(tags.get('b.jpg'), ['public']);
});

test('appendShard 只新建按年分片的事件片', async () => {
  const fp = memoryFs();
  const conn = connected(fp);
  const at = new Date(2026, 10, 27, 12, 0, 0).getTime();
  const written = await appendShard(conn, netDriveTagsDir('RemoteStorage-1'), 'tags', {
    version: 1, at, host: 'pc', events: [{ op: 'set', tag: 'public_target' }],
  }, { at, random: 0 });
  assert.equal(written, 'net-drive-tags/RemoteStorage-1/2026/tags-20261127-120000-000000.json');
  assert.equal(fp.files.size, 1);
  assert.deepEqual(replayNetDriveTags(await listShards(conn, netDriveTagsDir('RemoteStorage-1'))).has('public_target'), true);
});

test('validateDestRel 校验年份、bundleKey 与相对路径', () => {
  const bundleId = 'vol:abc/Photos';
  const key = ufsTagKey(bundleId);
  assert.deepEqual(validateDestRel(`2024/${key}/trip/a.jpg`, bundleId, 2024), ['trip', 'a.jpg']);
  assert.throws(() => validateDestRel(`2023/${key}/a.jpg`, bundleId, 2024));
  assert.throws(() => validateDestRel('2024/wrong/a.jpg', bundleId, 2024));
  assert.throws(() => validateDestRel(`2024/${key}/../a.jpg`, bundleId, 2024));
  assert.throws(() => validateDestRel(`2024/${key}/C:/a.jpg`, bundleId, 2024));
});

test('sameVolume 按盘符根判断', () => {
  assert.equal(sameVolume('C:\\a\\b.txt', 'C:\\codes\\cached\\x\\data\\public\\b.txt'), true);
  assert.equal(sameVolume('D:\\a\\b.txt', 'C:\\codes\\cached\\x\\data\\public\\b.txt'), false);
});

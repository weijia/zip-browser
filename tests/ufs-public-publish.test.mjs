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
  ufsTagsDir,
  readUfsTags,
  setUfsNodeTags,
} from '../web/tags-sharded.js';
import { validateDestRel, sameVolume } from '../server/ufs-publish.js';
import { allowPaths, isPathAllowed } from '../server/fs-service.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import { readPublishHistory } from '../web/ufs-public-publisher.js';

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

test('setUfsNodeTags 追加事件片并可被 readUfsTags 读回', async () => {
  const bundleId = 'vol:abc/Photos';
  const fp = memoryFs();
  const conn = connected(fp);
  const opts = { at: new Date(2026, 10, 27, 12, 0, 0).getTime(), random: 0, host: 'pc' };
  const p1 = await setUfsNodeTags(conn, bundleId, 'a.jpg', ['public', '精选'], opts);
  assert.equal(p1, `${ufsTagsDir(bundleId)}/2026/tags-20261127-120000-000000.json`);
  const doc = JSON.parse(fp.files.get(p1));
  assert.equal(doc.host, 'pc');
  assert.deepEqual(doc.events, [{ op: 'set', rel: 'a.jpg', tags: ['public', '精选'] }]);

  const p2 = await setUfsNodeTags(conn, bundleId, '', ['public'], { ...opts, random: 0.1 });
  const p3 = await setUfsNodeTags(conn, bundleId, 'a.jpg', [], { ...opts, random: 0.2 });
  assert.equal(fp.files.size, 3, '每次写都新建一片，不修改旧片');
  const tags = await readUfsTags(conn, bundleId);
  assert.deepEqual(tags.get(''), ['public'], '根节点标签可读');
  assert.equal(tags.has('a.jpg'), false, '清空后 remove 事件生效');
});

test('setUfsNodeTags 严格保留标签大小写与顺序，去重', async () => {
  const fp = memoryFs();
  const conn = connected(fp);
  await setUfsNodeTags(conn, 'b', 'x', ['Public', 'public', 'Public', '精选'], { random: 0 });
  const tags = await readUfsTags(conn, 'b');
  assert.deepEqual(tags.get('x'), ['Public', 'public', '精选']);
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

test('allowPaths 放行真实路径的父目录，不存在的逐条记失败', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zb-allow-'));
  const file = path.join(dir, 'a.txt');
  await fs.writeFile(file, 'x');
  try {
    const missing = path.join(dir, 'missing.txt');
    const out = await allowPaths([file, missing, '/not/a/windows/path']);
    assert.equal(out.results[0].ok, true);
    assert.equal(out.results[0].allowed.toLowerCase(), dir.toLowerCase());
    assert.equal(isPathAllowed(file), true, '父目录被放行后文件可访问');
    assert.equal(out.results[1].ok, false, '不存在的文件不放行');
    assert.equal(out.results[2].ok, false, '非法 Windows 路径不放行');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('readPublishHistory 跨 runId 与年目录枚举，按片名升序并统计各 action', async () => {
  const runA = '20260101-000001-a1b2c3';
  const runB = '20260102-000001-d4e5f6';
  const fp = memoryFs({
    [`ufs-public-state/${runA}/2026/publish-20260101-000001-aaaaaa.json`]: JSON.stringify({
      version: 1, at: 1767225600000, host: 'pc1', targets: ['Lanzou-1'],
      results: {
        'vol:x/a.jpg|Lanzou-1': { action: 'linked', method: 'link', hash: 'sha256:1', size: 10, destRel: '2026/k/a.jpg' },
        'vol:x/b.jpg|Lanzou-1': { action: 'skipped', hash: 'sha256:2', size: 20, destRel: '2026/k/b.jpg' },
      },
    }),
    [`ufs-public-state/${runB}/2026/publish-20260102-000001-bbbbbb.json`]: JSON.stringify({
      version: 1, at: 1767312000000, host: 'pc2', targets: ['Lanzou-1', 'WebDav-1'],
      results: {
        'vol:x/a.jpg|Lanzou-1': { action: 'copied', method: 'copy', hash: 'sha256:1', size: 10 },
        'vol:x/b.jpg|Lanzou-1': { action: 'failed', reason: '源文件未在本次会话中打开' },
      },
    }),
    [`ufs-public-state/${runA}/2026/broken.json`]: '{bad',
  });
  const rows = await readPublishHistory(connected(fp));
  assert.deepEqual(rows.map((row) => row.run), [runA, runB]);
  assert.deepEqual(rows[0].counts, { total: 2, linked: 1, copied: 0, skipped: 1, failed: 0 });
  assert.deepEqual(rows[1].counts, { total: 2, linked: 0, copied: 1, skipped: 0, failed: 1 });
  assert.deepEqual(rows[1].targets, ['Lanzou-1', 'WebDav-1']);
  assert.equal(rows[1].results['vol:x/b.jpg|Lanzou-1'].reason, '源文件未在本次会话中打开');
});

test('readPublishHistory 读出预检失败原因', async () => {
  const run = '20260104-000001-eeeeee';
  const fp = memoryFs({
    [`ufs-public-state/${run}/2026/publish-20260104-000001-eeeeee.json`]: JSON.stringify({
      version: 1, at: 1, host: 'pc', targets: [], results: {},
      preflight: { reason: '没有目标网盘：读取网盘登记失败（403 forbidden）', summary: { files: 2 } },
    }),
  });
  const rows = await readPublishHistory(connected(fp));
  assert.equal(rows[0].preflight.reason, '没有目标网盘：读取网盘登记失败（403 forbidden）');
  assert.equal(rows[0].preflight.summary.files, 2);
});

test('readPublishHistory 没有状态目录时返回空数组', async () => {
  assert.deepEqual(await readPublishHistory(connected(memoryFs())), []);
});

test('readPublishHistory 忽略损坏片，缺 results 的记录计数全零', async () => {
  const run = '20260103-000001-cccccc';
  const fp = memoryFs({
    [`ufs-public-state/${run}/2026/publish-20260103-000001-cccccc.json`]: JSON.stringify({ version: 1, at: 1, host: 'pc' }),
    [`ufs-public-state/${run}/2026/publish-20260103-000002-dddddd.json`]: '{bad',
  });
  const rows = await readPublishHistory(connected(fp));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].counts, { total: 0, linked: 0, copied: 0, skipped: 0, failed: 0 });
  assert.deepEqual(rows[0].results, {});
});

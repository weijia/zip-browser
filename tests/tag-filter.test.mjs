import test from 'node:test';
import assert from 'node:assert/strict';
import { tagEntries, matchTagEntries, tagCounts, filterTagCounts, pickTagForQuery } from '../web/tag-filter.js';

const DATA = {
  v: 1,
  tags: {
    'fs:c:\\codes\\nodejs': ['后端', 'node'],
    'fs:c:\\codes\\zip-browser': ['前端', 'git'],
    'fs:c:\\codes\\web': ['前端', '后端'],
    'zip:d:\\share\\a.zip#src': ['前端'],
    'fs:c:\\ghost': ['孤儿'], // 没有 paths 描述 → 丢弃
  },
  paths: {
    'fs:c:\\codes\\nodejs': { kind: 'dir', path: 'C:\\codes\\nodejs', label: 'nodejs' },
    'fs:c:\\codes\\zip-browser': { kind: 'dir', path: 'C:\\codes\\zip-browser', label: 'zip-browser' },
    'fs:c:\\codes\\web': { kind: 'dir', path: 'C:\\codes\\web', label: 'web' },
    'zip:d:\\share\\a.zip#src': {
      kind: 'zip', path: 'D:\\share\\a.zip', zipPath: 'D:\\share\\a.zip', entry: 'src', label: 'a.zip/src',
    },
  },
};

test('tagEntries：展开 paths 描述、丢弃缺描述的 key、按名称排序', () => {
  const entries = tagEntries(DATA);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((entry) => entry.label), ['a.zip/src', 'nodejs', 'web', 'zip-browser']);
  const zipEntry = entries.find((entry) => entry.label === 'a.zip/src');
  assert.equal(zipEntry.kind, 'zip');
  assert.equal(zipEntry.entry, 'src');
  assert.equal(zipEntry.zipPath, 'D:\\share\\a.zip');
  assert.equal(entries.some((entry) => entry.label === 'C:\\ghost'), false);
});

test('tagEntries：标签去重与空标签清理', () => {
  const entries = tagEntries({
    tags: { k: ['前端', '前端', '  ', ''] },
    paths: { k: { kind: 'dir', path: 'C:\\x', label: 'x' } },
  });
  assert.deepEqual(entries[0].tags, ['前端']);
});

test('matchTagEntries：and 要全部命中，or 任一命中', () => {
  const entries = tagEntries(DATA);
  assert.deepEqual(matchTagEntries(entries, ['前端', '后端'], 'and').map((entry) => entry.label), ['web']);
  assert.deepEqual(matchTagEntries(entries, ['前端', '后端'], 'or').map((entry) => entry.label), ['a.zip/src', 'nodejs', 'web', 'zip-browser']);
  assert.deepEqual(matchTagEntries(entries, ['前端'], 'and').map((entry) => entry.label), ['a.zip/src', 'web', 'zip-browser']);
});

test('matchTagEntries：没选标签或空条目时返回空，不做全量列表', () => {
  const entries = tagEntries(DATA);
  assert.deepEqual(matchTagEntries(entries, [], 'and'), []);
  assert.deepEqual(matchTagEntries(entries, ['不存在的标签'], 'or'), []);
});

test('tagCounts：按出现次数降序统计', () => {
  const entries = tagEntries(DATA);
  const counts = tagCounts(entries);
  assert.deepEqual(counts.map((item) => item.tag), ['前端', '后端', 'git', 'node']);
  assert.deepEqual(counts.map((item) => item.count), [3, 2, 1, 1]);
});

test('filterTagCounts：空输入原样返回，非空按子串且不区分大小写', () => {
  const counts = tagCounts(tagEntries(DATA));
  assert.equal(filterTagCounts(counts, '').length, counts.length);
  assert.deepEqual(filterTagCounts(counts, '前').map((item) => item.tag), ['前端']);
  // 大小写：data 里是 node，输入 NODE 也应命中
  assert.deepEqual(filterTagCounts(counts, 'NODE').map((item) => item.tag), ['node']);
  assert.deepEqual(filterTagCounts(counts, '  ').map((item) => item.tag), ['前端', '后端', 'git', 'node']);
  assert.deepEqual(filterTagCounts(counts, '不存在'), []);
});

test('pickTagForQuery：完全相等优先，其次首个子串命中，无命中返回 null', () => {
  const counts = tagCounts(tagEntries(DATA));
  assert.deepEqual(pickTagForQuery(counts, '前端'), { pick: '前端', matches: 1, exact: true });
  assert.deepEqual(pickTagForQuery(counts, 'no'), { pick: 'node', matches: 1, exact: false });
  assert.deepEqual(pickTagForQuery(counts, ' 前端 '), { pick: '前端', matches: 1, exact: true });
  // 「端」同时命中 前端/后端
  assert.deepEqual(pickTagForQuery(counts, '端'), { pick: '前端', matches: 2, exact: false });
  assert.deepEqual(pickTagForQuery(counts, '不存在'), { pick: null, matches: 0, exact: false });
  assert.deepEqual(pickTagForQuery(counts, ''), { pick: null, matches: 0, exact: false });
});

test('tagEntries：没有 paths 的 /卷ID/相对路径按 volume 条目展开', () => {
  const entries = tagEntries({
    tags: {
      '/baidu-130/我的资源': ['private'],
      '/kuake': ['private'],
      '/unknown/level2/level3': ['deep'],
    },
    paths: {},
  });
  assert.equal(entries.length, 3);
  const first = entries.find((entry) => entry.sourceKey === '/baidu-130/我的资源');
  assert.equal(first.kind, 'volume');
  assert.equal(first.volumeId, 'baidu-130');
  assert.equal(first.path, '/我的资源');
  assert.equal(first.key, 'vol:baidu-130/我的资源');
  assert.equal(first.label, 'baidu-130/我的资源');
  const root = entries.find((entry) => entry.sourceKey === '/kuake');
  assert.equal(root.path, '/');
  assert.equal(root.key, 'vol:kuake');
});

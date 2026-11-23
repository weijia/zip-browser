import test from 'node:test';
import assert from 'node:assert/strict';
import { tagEntries, matchTagEntries, tagCounts } from '../web/tag-filter.js';

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

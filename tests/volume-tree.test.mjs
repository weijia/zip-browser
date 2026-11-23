import test from 'node:test';
import assert from 'node:assert/strict';

const vt = await import('../web/volume-tree.js');

test('mergeChildren：目录取并集、文件按 updatedAt 取新、目录优先排序', () => {
  const merged = vt.mergeChildren([
    [
      { name: 'b.txt', type: 'file', size: 10, updatedAt: 1000 },
      { name: 'Docs', type: 'folder', children: [{ name: 'x.md', type: 'file', size: 1 }] },
    ],
    [
      { name: 'b.txt', type: 'file', size: 20, updatedAt: 2000 },
      { name: 'a.txt', type: 'file', size: 5, updatedAt: 500 },
      { name: 'docs', type: 'folder', children: [{ name: 'y.md', type: 'file', size: 2 }] },
    ],
  ]);
  assert.deepEqual(merged.map((n) => `${n.type === 'folder' ? 'd' : 'f'}:${n.name}`),
    ['d:Docs', 'f:a.txt', 'f:b.txt'], '目录在前，名字按 zh-CN 数字序');
  // 大小写不同的同名目录按同一项合并（Windows 卷大小写不敏感），保留先出现的大小写
  assert.equal(merged.filter((n) => n.type === 'folder').length, 1);
  const docs = merged[0];
  assert.deepEqual(docs.children.map((c) => c.name).sort(), ['x.md', 'y.md'], '目录 children 取并集');
  assert.equal(merged.find((n) => n.name === 'b.txt').size, 20, '较新的 updatedAt 覆盖大小');
  assert.equal(merged.find((n) => n.name === 'a.txt').size, 5);
});

test('mergeStructTrees：同名目录统计取 max、sources 合并、根部信息取第一份非空', () => {
  const tree = vt.mergeStructTrees([
    { name: 'C:', volumeId: 'V1', sources: ['zip-browser'], fileCount: 3, totalSize: 300, sizePartial: true,
      children: [{ name: 'Users', type: 'folder', fileCount: 2, totalSize: 100, leaf: false, children: [] }] },
    { name: '', sources: ['dir-struct-gen'], fileCount: 10, totalSize: 1000,
      children: [{ name: 'Users', type: 'folder', fileCount: 8, totalSize: 900, leaf: false, children: [] },
        { name: 'Windows', type: 'folder', children: [] }] },
  ]);
  assert.equal(tree.name, 'C:');
  assert.equal(tree.volumeId, 'V1');
  assert.deepEqual(tree.sources.sort(), ['dir-struct-gen', 'zip-browser']);
  assert.equal(tree.fileCount, 10);
  assert.equal(tree.totalSize, 1000);
  assert.equal(tree.sizePartial, true);
  const users = tree.children.find((n) => n.name === 'Users');
  assert.equal(users.fileCount, 8);
  assert.equal(users.totalSize, 900);
  assert.equal(users.leaf, false, '任一份说还有子目录，就不是末级');
});

test('mergeStructTrees：没有可用分片时返回 null', () => {
  assert.equal(vt.mergeStructTrees([]), null);
  assert.equal(vt.mergeStructTrees([{ name: 'x' }]), null);
});

test('findTreeNode：按路径段下钻；找不到返回 null；空段返回虚拟根', () => {
  const tree = [{ name: 'Users', type: 'folder', children: [{ name: 'me', type: 'folder', children: [] }] }];
  assert.equal(vt.findTreeNode(tree, []).virtualRoot, true);
  assert.deepEqual(vt.findTreeNode(tree, ['Users', 'me']).name, 'me');
  assert.equal(vt.findTreeNode(tree, ['Users', 'nope']), null);
  // 文件不当作目录下钻
  assert.equal(vt.findTreeNode([{ name: 'a.txt', type: 'file' }], ['a.txt']), null);
});

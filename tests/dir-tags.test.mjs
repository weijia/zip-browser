import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectTagsForDirs } from '../server/fs-service.js';
import { buildFolderTree, buildV2Export } from '../web/manifest-export.js';

async function makeTemp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'zb-dir-tags-'));
}

test('detectTagsForDirs：只读直接子项名，不递归', async () => {
  const root = await makeTemp();
  try {
    const nodeApp = path.join(root, 'nodeapp');
    await fs.mkdir(nodeApp);
    await fs.writeFile(path.join(nodeApp, 'package.json'), '{}');
    await fs.writeFile(path.join(nodeApp, 'package-lock.json'), '{}');
    await fs.mkdir(path.join(nodeApp, 'src'));

    const nested = path.join(root, 'nested');
    const repo = path.join(nested, 'repo');
    await fs.mkdir(repo, { recursive: true });
    await fs.mkdir(path.join(repo, '.git'));
    await fs.writeFile(path.join(repo, 'Cargo.toml'), '');

    const pure = path.join(root, 'pure');
    await fs.mkdir(pure);
    await fs.writeFile(path.join(pure, 'readme.txt'), '');

    const tags = await detectTagsForDirs([nodeApp, nested, pure, path.join(root, 'missing')]);
    // readdir 顺序不定，按集合比较
    assert.deepEqual([...tags[nodeApp]].sort(), ['node', 'npm']);
    // nested 的直接子项只有 repo 目录名，不含规则命中 → 不递归拿到 repo 的标签
    assert.deepEqual(tags[nested], []);
    assert.deepEqual(tags[pure], []);
    assert.deepEqual(tags[path.join(root, 'missing')], []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('buildFolderTree：自动标签挂到对应目录节点，无标签不写字段', () => {
  const tree = buildFolderTree(
    ['C:/Users/x/proj', 'C:/Users/x/other'],
    1,
    { 'C:/Users/x/proj': ['git', 'node'], 'C:/Users/x/other': [] },
  );
  assert.equal(tree[0].name, 'Users');
  const projects = tree[0].children[0].children;
  const proj = projects.find((node) => node.name === 'proj');
  const other = projects.find((node) => node.name === 'other');
  assert.deepEqual(proj.tags, ['git', 'node']);
  assert.equal('tags' in other, false);
  // 父节点不继承子目录标签
  assert.equal('tags' in tree[0], false);
});

test('buildV2Export：autoTags 按 host-relative 写进 struct 节点 tags', () => {
  const data = {
    tags: { 'C:\\codes\\nodejs': ['书签'] },
    paths: { 'C:\\codes\\nodejs': { kind: 'dir', path: 'C:\\codes\\nodejs' } },
    bookmarks: [],
  };
  const result = buildV2Export({
    data,
    host: 'TESTHOST',
    now: 1,
    revision: 1,
    autoTags: { 'C:/codes/nodejs': ['git', 'node'] },
  });
  const shard = result.files.find((file) => file.kind === 'shard');
  const node = shard.json.children[0].children[0]; // codes/nodejs
  assert.equal(node.name, 'nodejs');
  assert.deepEqual(node.tags, ['git', 'node']);
});

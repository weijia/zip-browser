import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { collectUfsTree } from '../server/ufs-scan.js';

function sha(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

test('collectUfsTree：一次遍历返回目录/文件节点与 SHA-256', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zb-ufs-scan-'));
  try {
    await fs.mkdir(path.join(root, 'sub'));
    await fs.writeFile(path.join(root, 'a.txt'), 'abc');
    await fs.writeFile(path.join(root, 'sub', 'b.txt'), 'hello');

    const events = [];
    const summary = await collectUfsTree(root, {
      onEvent: (event) => events.push(event),
    });

    assert.equal(summary.dirs, 2);
    assert.equal(summary.files, 2);
    assert.equal(summary.size, 8);
    assert.equal(summary.partial, false);
    assert.equal(summary.hashFailed, 0);

    const dirs = events.filter((event) => event.type === 'dirs').flatMap((event) => event.rows);
    const files = events.filter((event) => event.type === 'files').flatMap((event) => event.rows);
    assert.ok(dirs.some((row) => row.rel === '' && row.type === 'dir'));
    assert.ok(dirs.some((row) => row.rel === 'sub' && row.type === 'dir'));
    const a = files.find((row) => row.rel === 'a.txt');
    const b = files.find((row) => row.rel === 'sub/b.txt');
    assert.equal(a.hash, sha('abc'));
    assert.equal(b.hash, sha('hello'));
    assert.equal(a.size, 3);
    assert.equal(b.size, 5);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('collectUfsTree：读不到的目录标记 partial，不伪造 0 个文件', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zb-ufs-scan-'));
  try {
    await fs.writeFile(path.join(root, 'ok.txt'), 'x');
    const missing = path.join(root, 'gone');
    await fs.mkdir(missing);
    const summary = await collectUfsTree(root, {
      onEvent: () => {},
      maxDepth: 0,
    });
    assert.equal(summary.partial, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

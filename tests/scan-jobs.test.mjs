import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { allowDirectory } from '../server/fs-service.js';

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'zb-scan-job-'));
const cacheBase = path.join(tempRoot, 'localappdata');
process.env.LOCALAPPDATA = cacheBase;
const mod = await import('../server/scan-jobs.js');

after(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

async function waitForJob(id, timeoutMs = 5000) {
  const started = Date.now();
  for (;;) {
    const status = mod.scanJobStatus(id);
    if (status.state !== 'running') return status;
    if (Date.now() - started > timeoutMs) throw new Error('scan job timeout');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('scan-jobs：全量统计在本地缓存，不写同步组', async () => {
  const work = path.join(tempRoot, 'work');
  await fs.mkdir(path.join(work, 'sub', 'deep'), { recursive: true });
  await fs.writeFile(path.join(work, 'a.txt'), '12345');
  await fs.writeFile(path.join(work, 'sub', 'b.txt'), '1234567');
  await fs.writeFile(path.join(work, 'sub', 'deep', 'c.txt'), '12345678901');
  allowDirectory(work);
  const { jobId } = await mod.startScanJob([work], { refresh: true, timeoutMs: 0 });
  const status = await waitForJob(jobId);
  assert.equal(status.state, 'done');
  const result = status.results[0];
  assert.equal(result.fileCount, 3);
  assert.equal(result.totalSize, 23);
  assert.equal(result.dirs, 3);
  assert.equal(result.partial, false);

  const meta = JSON.parse(await fs.readFile(path.join(cacheBase, 'zip-browser', 'scan-cache', `${jobId}.json`), 'utf8'));
  assert.equal(meta.paths[0], work);
  assert.ok(meta.cacheFile.startsWith(path.join(cacheBase, 'zip-browser', 'scan-cache')));
  // 目录记录按批写在本地 JSONL，不在 ZenFS / 同步组路径下。
  const jsonl = await fs.readFile(meta.cacheFile, 'utf8');
  const rows = jsonl.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.path.toLowerCase().startsWith(work.toLowerCase())));
});

test('scan-jobs：NDJSON 流出进度并以 done 结束', async () => {
  const work = path.join(tempRoot, 'stream-work');
  await fs.mkdir(work, { recursive: true });
  await fs.writeFile(path.join(work, 'x.txt'), 'x');
  allowDirectory(work);
  const { jobId } = await mod.startScanJob([work], { refresh: true, timeoutMs: 0 });
  const lines = [];
  let finish;
  const ended = new Promise((resolve) => { finish = resolve; });
  const req = { on() {}, off() {} };
  const res = {
    writeHead() {},
    flushHeaders() {},
    write(chunk) { lines.push(String(chunk)); },
    end() { finish(); },
  };
  await mod.streamScanJob(req, res, jobId, new URL(`http://localhost/api/scan/jobs/${jobId}/stream?cursor=0`));
  await Promise.race([ended, new Promise((_, reject) => setTimeout(() => reject(new Error('stream did not end')), 3000))]);
  const events = lines.join('').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(events.some((event) => event.type === 'progress'));
  assert.equal(events[events.length - 1].type, 'done');
});

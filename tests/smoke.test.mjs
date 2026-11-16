import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SAMPLES = path.join(ROOT, 'samples');
const PASSWORD = 'demo1234';
const TEST_PORT = 4179;
const TEST_TOKEN = 'smoke-test-token';
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const VERSION_STATE = path.join(ROOT, 'tests', '.version-state.test.json');

let server;

const { normalizeLocalPath, localPathToUrl, fsUrlToLocalPath, allowDirectory } = await import('../server/fs-service.js');
const { normalizeEntryPath, openZip, unlockZip, readEntry, listZipEntries, closeZip } = await import('../server/zip-service.js');
const { renderMarkdown } = await import('../server/markdown.js');
const { renderImageViewer } = await import('../server/image-viewer.js');
const { isStaticAllowed } = await import('../server/mime.js');
const {
  encodeLocation, decodeLocation, compactTarget,
  localTargetFromCompact, winDirname, winBasename,
} = await import('../web/location.js');
const ann = await import('../web/annotations-store.js');
const manifest = await import('../web/manifest-export.js');
const { readVolumeId } = await import('../server/hostinfo.js');

before(async () => {
  const required = ['basic.zip', 'zipcrypto.zip', 'aes256.zip', 'chinese.zip', 'images.zip', 'images/blue.png'];
  const missing = [];
  for (const name of required) {
    try {
      await fs.access(path.join(SAMPLES, name));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'make-samples.js')], { stdio: 'inherit' });
  }
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      ZIP_BROWSER_TOKEN: TEST_TOKEN,
      ZIP_BROWSER_VERSION_STATE: VERSION_STATE,
    },
    stdio: 'ignore',
  });
  const start = Date.now();
  while (Date.now() - start < 12000) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('local server did not start');
});

after(async () => {
  if (server) server.kill();
  await fs.rm(VERSION_STATE, { force: true });
});

async function openZipViaHttp(filename) {
  const response = await fetch(`${BASE}/api/zip/open`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path.join(SAMPLES, filename) }),
  });
  assert.equal(response.status, 200, `open ${filename} failed`);
  return response.json();
}

test('windows path normalization rejects invalid and escaping paths', () => {
  assert.equal(normalizeLocalPath('C:/Users/foo'), 'C:\\Users\\foo');
  assert.equal(normalizeLocalPath('D:\\data'), 'D:\\data');
  assert.throws(() => normalizeLocalPath('/etc/passwd'));
  assert.throws(() => normalizeLocalPath('\\\\server\\share'));
  assert.equal(normalizeLocalPath('C:/../../Windows'), 'C:\\Windows');
});

test('local path <-> /fs/ url round trip', () => {
  const abs = normalizeLocalPath('C:/Users/foo/我的 文件.html');
  const url = localPathToUrl(abs);
  assert.ok(url.startsWith('/fs/C/'));
  assert.equal(fsUrlToLocalPath(url.slice(4)), abs);
});

test('zip entry path rejects traversal', () => {
  assert.equal(normalizeEntryPath('a/./b/../c.txt'), 'a/c.txt');
  assert.throws(() => normalizeEntryPath('../secret.txt'));
  assert.throws(() => normalizeEntryPath('a/../../secret.txt'));
});

test('location hash round-trips a chinese windows path and view settings', () => {
  const path = 'C:\\codes\\nodejs\\zip-browser\\samples\\图片 目录';
  const hash = encodeLocation({ t: compactTarget({ kind: 'dir', path }), view: 'thumbs', enc: 'gbk' });
  assert.ok(hash.startsWith('#!'));
  assert.ok(!hash.includes('%'), 'hash must stay url-safe');
  const snap = decodeLocation(hash);
  assert.equal(snap.t.k, 'dir');
  assert.equal(snap.t.p, path);
  assert.equal(snap.view, 'thumbs');
  assert.equal(snap.enc, 'gbk');
  assert.deepEqual(localTargetFromCompact(snap.t), { kind: 'dir', path });
});

test('compact zip target keeps url small and rebuilds preview paths', () => {
  const zip = {
    kind: 'zip', id: 'abc123', zipName: 'a.zip', zipDir: 'C:\\samples',
    zipPath: 'C:\\samples\\a.zip', current: '/zip/abc123/page/x.html',
    entries: Array.from({ length: 50 }, (_, i) => ({ path: `f${i}.txt`, dir: false, size: 1 })),
  };
  const compact = compactTarget(zip);
  assert.equal(compact.i, 'abc123');
  assert.equal(compact.c, zip.current);
  assert.ok(!JSON.stringify(compact).includes('entries'), 'entries belong in history.state, not the url');

  const preview = localTargetFromCompact({ k: 'preview', p: 'C:\\samples\\docs\\readme.md' });
  assert.equal(preview.dir, 'C:\\samples\\docs');
  assert.equal(preview.label, 'readme.md');
  assert.equal(winDirname('C:\\a.zip'), 'C:\\');
  assert.equal(winBasename('C:\\a.zip'), 'a.zip');
});

test('malformed location hashes fall back to the drives view', () => {
  assert.equal(decodeLocation(''), null);
  assert.equal(decodeLocation('#!/dir/C:/foo'), null);
  assert.equal(decodeLocation('#!not-base64!!'), null);
  assert.equal(decodeLocation('#!eyJ2Ijo5OTl9'), null);
  assert.deepEqual(localTargetFromCompact(null), { kind: 'drives' });
});

test('static location module is served and missing zip sessions are detectable', async () => {
  const module = await fetch(`${BASE}/location.js`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type') || '', /javascript/);
  assert.match(await module.text(), /export function decodeLocation/);
  const missing = await fetch(`${BASE}/api/zip/tree?id=not-a-session`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  assert.equal(missing.status, 404);
});

test('sensitive local filenames are excluded from static preview', () => {
  assert.equal(isStaticAllowed('index.html'), true);
  assert.equal(isStaticAllowed('.env'), false);
  assert.equal(isStaticAllowed('id_rsa'), false);
  assert.equal(isStaticAllowed('server.key'), false);
  assert.equal(isStaticAllowed('photo.png'), true);
});

test('markdown keeps relative image and link urls untouched', () => {
  const html = renderMarkdown('# Title\n\n![logo](img/logo.svg)\n\n[next](page/other.html)\n', 'guide.md');
  assert.match(html, /<img alt="logo" src="img\/logo.svg">/);
  assert.match(html, /<a href="page\/other.html">next<\/a>/);
});

test('plain zip exposes entries and reads content', async () => {
  const info = await openZip(path.join(SAMPLES, 'basic.zip'));
  assert.equal(info.encrypted, false);
  assert.ok(info.entries.some((entry) => entry.path === 'page/other.html'));
  const content = await readEntry(info.id, 'index.html');
  assert.match(content.toString('utf8'), /href="page\/other.html"/);
  await closeZip(info.id);
});

test('ZipCrypto archive requires and accepts the password', async () => {
  const info = await openZip(path.join(SAMPLES, 'zipcrypto.zip'));
  assert.equal(info.needsPassword, true);
  const wrong = await unlockZip(info.id, 'wrong-password');
  assert.equal(wrong.ok, false);
  const right = await unlockZip(info.id, PASSWORD);
  assert.equal(right.ok, true);
  const content = await readEntry(info.id, 'index.html');
  assert.match(content.toString('utf8'), /href="page\/other.html"/);
  await closeZip(info.id);
});

test('AES-256 archive requires and accepts the password', async () => {
  const info = await openZip(path.join(SAMPLES, 'aes256.zip'));
  assert.equal(info.needsPassword, true);
  const wrong = await unlockZip(info.id, 'wrong-password');
  assert.equal(wrong.ok, false);
  const right = await unlockZip(info.id, PASSWORD);
  assert.equal(right.ok, true);
  const css = await readEntry(info.id, 'css/style.css');
  assert.match(css.toString('utf8'), /url\("\.\.\/img\/bg\.svg"\)/);
  await closeZip(info.id);
});

test('UTF-8 chinese entry names survive decoding', async () => {
  const info = await openZip(path.join(SAMPLES, 'chinese.zip'));
  assert.ok(info.entries.some((entry) => entry.path === '文档/首页.html'));
  assert.equal(listZipEntries(info.id).entries.length, info.entries.length);
  await closeZip(info.id);
});

test('api requires the local token', async () => {
  const denied = await fetch(`${BASE}/api/drives`);
  assert.equal(denied.status, 403);
  const allowed = await fetch(`${BASE}/api/drives`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  assert.equal(allowed.status, 200);
  const data = await allowed.json();
  assert.ok(Array.isArray(data.drives));
});

test('main page injects a token and serves static assets', async () => {
  const html = await (await fetch(BASE)).text();
  assert.match(html, /__LOCAL_TOKEN__/);
  assert.ok(html.includes(TEST_TOKEN));
  assert.ok(html.includes(`window.__LOCAL_TOKEN__ = "${TEST_TOKEN}"`), 'token must be injected into the value, not the variable name');
  const css = await fetch(`${BASE}/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type') || '', /text\/css/);
});

test('content routes serve relative references and apply CSP', async () => {
  const info = await openZipViaHttp('basic.zip');
  const base = `${BASE}/zip/${info.id}`;
  const headers = { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' };

  const index = await fetch(`${base}/`, { headers });
  assert.equal(index.status, 200);
  assert.match(await index.text(), /href="page\/other.html"/);
  assert.match(index.headers.get('content-security-policy') || '', /connect-src 'none'/);

  const css = await fetch(`${base}/css/style.css`);
  assert.equal(css.status, 200);
  assert.match(await css.text(), /url\("\.\.\/img\/bg\.svg"\)/);

  const image = await fetch(`${base}/img/logo.svg`);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type') || '', /image\/svg\+xml/);

  const other = await fetch(`${base}/page/other.html`, { headers });
  assert.equal(other.status, 200);
  assert.match(await other.text(), /src="\.\.\/img\/logo.svg"/);

  const markdown = await fetch(`${base}/guide.md`, { headers });
  const rendered = await markdown.text();
  assert.match(rendered, /<img alt="包内图片" src="img\/logo.svg">/);

  const missing = await fetch(`${base}/nope.html`);
  assert.equal(missing.status, 404);
});

test('encrypted archive blocks content until unlocked', async () => {
  const info = await openZipViaHttp('aes256.zip');
  const locked = await fetch(`${BASE}/zip/${info.id}/`, { headers: { Accept: 'text/html' } });
  assert.equal(locked.status, 200);
  assert.match(await locked.text(), /需要密码/);
  const unlock = await fetch(`${BASE}/api/zip/unlock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: info.id, password: PASSWORD }),
  });
  assert.equal(unlock.status, 200);
  const page = await fetch(`${BASE}/zip/${info.id}/`, { headers: { Accept: 'text/html' } });
  assert.match(await page.text(), /首页/);
});

function thumbUrlFor(abs) {
  return `${BASE}${localPathToUrl(abs).replace(/^\/fs\//, '/thumb/fs/')}`;
}

test('local thumbnails are resized jpegs and respect the directory whitelist', async () => {
  const dir = path.join(SAMPLES, 'images');
  const listed = await fetch(`${BASE}/api/list?path=${encodeURIComponent(dir)}`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  assert.equal(listed.status, 200);

  const url = thumbUrlFor(path.join(dir, 'blue.png'));
  const first = await fetch(url);
  assert.equal(first.status, 200);
  assert.match(first.headers.get('content-type') || '', /image\/jpeg/);
  const bytes = Buffer.from(await first.arrayBuffer());
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.ok(bytes.length < 20 * 1024, 'thumbnail must stay small');
  const sharp = (await import('sharp')).default;
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 160);
  assert.equal(meta.height, 160);

  const cached = await fetch(url);
  assert.equal(cached.status, 200);
  assert.deepEqual(Buffer.from(await cached.arrayBuffer()), bytes);

  const notImage = await fetch(thumbUrlFor(path.join(dir, 'readme.txt')));
  assert.equal(notImage.status, 403);
  const outside = await fetch(`${BASE}/thumb/fs/C/Windows/win.ini`);
  assert.equal(outside.status, 403);
});

test('local directory page renders a thumbnail grid on ?view=thumbs', async () => {
  const dir = path.join(SAMPLES, 'images');
  await fetch(`${BASE}/api/list?path=${encodeURIComponent(dir)}`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  const headers = { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' };
  const page = await fetch(`${BASE}${localPathToUrl(dir)}/?view=thumbs`, { headers });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<img src="\/thumb\/fs\//);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /\?view=list/);
  assert.ok(!html.includes('nested.png'), 'only the current level is listed');
  const list = await fetch(`${BASE}${localPathToUrl(dir)}/?view=list`, { headers });
  assert.doesNotMatch(await list.text(), /<div class="grid">/);
});

test('zip thumbnails and the in-iframe thumbnail view work', async () => {
  const info = await openZipViaHttp('images.zip');
  const target = (entry) => `${BASE}/thumb/zip/${info.id}/${entry}`;
  for (const entry of ['blue.png', 'logo.svg', 'sub/nested.png']) {
    const response = await fetch(target(entry));
    assert.equal(response.status, 200, `${entry} thumbnail failed`);
    assert.match(response.headers.get('content-type') || '', /image\/jpeg/);
  }
  const denied = await fetch(target('readme.txt'));
  assert.equal(denied.status, 403);

  const page = await fetch(`${BASE}/zip/${info.id}/?view=thumbs`, { headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<img src="\/thumb\/zip\//);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /\?view=list/);
  assert.match(html, /sub\/\?view=thumbs/);
  assert.ok(!html.includes('nested.png'), 'subdirectory images are not mixed in');
  await fetch(`${BASE}/api/zip/close`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: info.id }),
  });
});

test('encrypted zip thumbnails show a placeholder until unlocked', async () => {
  const info = await openZipViaHttp('aes256.zip');
  const target = `${BASE}/thumb/zip/${info.id}/img/logo.svg`;
  const locked = await fetch(target);
  assert.equal(locked.status, 200);
  assert.match(locked.headers.get('content-type') || '', /image\/svg\+xml/);
  const unlock = await fetch(`${BASE}/api/zip/unlock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: info.id, password: PASSWORD }),
  });
  assert.equal(unlock.status, 200);
  const ready = await fetch(target);
  assert.equal(ready.status, 200);
  assert.match(ready.headers.get('content-type') || '', /image\/jpeg/);
});

test('version endpoint exposes build info and the page embeds the same version', async () => {
  const response = await fetch(`${BASE}/version.json`);
  assert.equal(response.status, 200, 'version probe must not require the api token');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  const info = await response.json();
  assert.match(info.version, /^0\.1\.\d+$/);
  assert.ok(info.buildId && info.sha && info.buildTime);
  assert.ok(info.fileCount > 0);

  const again = await (await fetch(`${BASE}/version.json`)).json();
  assert.equal(again.buildId, info.buildId, 'unchanged sources keep the same build id');
  assert.equal(again.revision, info.revision, 'reloading without edits does not bump the revision');

  const html = await (await fetch(BASE)).text();
  const embedded = html.match(/window\.__APP_VERSION__ = (\{.*?\});/);
  assert.ok(embedded, 'version object is injected into index.html');
  const pageVersion = JSON.parse(embedded[1]);
  assert.equal(pageVersion.buildId, info.buildId);
  assert.equal(pageVersion.version, info.version);
  assert.match(html, /id="appVersion"/);
  assert.match(html, /id="updateToast"/);

  const checker = await fetch(`${BASE}/update-checker.js`);
  assert.equal(checker.status, 200);
  assert.match(await checker.text(), /version\.json/);
});

test('annotation keys are stable and zip file pages map to their directory', () => {
  assert.equal(ann.keyForDir('C:\\Codes\\NodeJS\\Zip-Browser\\'), 'fs:c:\\codes\\nodejs\\zip-browser');
  assert.equal(ann.keyForDir('c:/codes/nodejs'), 'fs:c:\\codes\\nodejs');
  assert.equal(ann.keyForZip('C:\\Codes\\samples.zip', 'page/sub/'), 'zip:c:\\codes\\samples.zip#page/sub');
  assert.equal(ann.zipEntryDir('/zip/abc/page/other.html?x=1', 'abc'), 'page');
  assert.equal(ann.zipEntryDir('/zip/abc/page/?view=thumbs', 'abc'), 'page');
  assert.equal(ann.zipEntryDir('/zip/abc/', 'abc'), '');
  assert.equal(ann.normalizeEntryDir('../../etc/passwd'), 'etc/passwd');
  assert.equal(ann.keyForTarget({ kind: 'drives' }), null);
});

test('annotation CRUD keeps the original path for tag filtering', () => {
  const key = ann.keyForDir('C:\\Codes\\Photos');
  const descriptor = { kind: 'dir', path: 'C:\\Codes\\Photos', label: 'Photos' };
  let data = ann.emptyData();
  data = ann.addTag(ann.rememberPath(data, key, descriptor), key, '项目');
  data = ann.addTag(data, key, '项目');
  data = ann.addTag(data, key, '常用');
  assert.deepEqual(ann.listTags(data, key), ['项目', '常用']);
  assert.deepEqual(new Set(ann.allTags(data).map((t) => t.tag)), new Set(['项目', '常用']));
  assert.deepEqual(ann.keysByTag(data, '项目'), [key]);
  assert.equal(ann.describeKey(data, key).path, 'C:\\Codes\\Photos');

  data = ann.addBookmark(data, {
    id: 'bm-1', key, kind: 'dir', path: 'C:\\Codes\\Photos', label: 'Photos',
  });
  assert.equal(ann.isBookmarked(data, key), true);
  assert.equal(ann.addBookmark(data, { id: 'bm-2', key }).bookmarks.length, 1, 'duplicate key is ignored');
  data = ann.renameBookmark(data, 'bm-1', '相册');
  assert.equal(data.bookmarks[0].label, '相册');
  data = ann.removeBookmark(data, 'bm-1');
  assert.equal(data.bookmarks.length, 0);
  data = ann.removeTag(data, key, '项目');
  assert.deepEqual(ann.listTags(data, key), ['常用']);
  assert.equal(ann.sanitizeData({ tags: { a: 'not-array' }, bookmarks: [{ nope: 1 }] }).bookmarks.length, 0);
});

function memoryStorage(seed = null) {
  const map = new Map(seed ? [[ann.STORAGE_KEY, seed]] : []);
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

test('annotation store persists via localStorage fallback and prefers the newer backend', async () => {
  const shared = memoryStorage();
  const first = ann.createAnnotationStore({ storage: shared, repoFactory: null });
  assert.equal((await first.init()).backend, 'local');
  const key = ann.keyForDir('C:\\Docs');
  first.mutate((data) => ann.addTag(
    ann.rememberPath(data, key, { kind: 'dir', path: 'C:\\Docs', label: 'Docs' }), key, '资料',
  ));
  const second = ann.createAnnotationStore({ storage: shared, repoFactory: null });
  await second.init();
  assert.deepEqual(ann.listTags(second.snapshot(), key), ['资料']);

  let remote = { v: 1, updatedAt: Date.now() + 60000, tags: { [key]: ['远端'] }, paths: {}, bookmarks: [] };
  const fakeRepo = {
    getConfig: () => remote,
    setConfig: (_configKey, value) => { remote = value; },
    flush: async () => {},
  };
  const third = ann.createAnnotationStore({ storage: shared, repoFactory: async () => fakeRepo });
  assert.equal((await third.init()).backend, 'zenfs');
  assert.deepEqual(ann.listTags(third.snapshot(), key), ['远端'], 'newer zen-fs-config data wins');
  assert.deepEqual(ann.listTags(ann.sanitizeData(JSON.parse(shared.getItem(ann.STORAGE_KEY))), key), ['远端'], 'newer data is mirrored back');
});

test('annotation modules and the zen-fs-config vendor bundle are served', async () => {
  for (const path of ['/annotations-store.js', '/annotations-ui.js', '/vendor/zen-fs-config.js']) {
    const response = await fetch(`${BASE}${path}`);
    assert.equal(response.status, 200, `${path} is not served`);
    assert.match(response.headers.get('content-type') || '', /javascript/);
  }
  const html = await (await fetch(BASE)).text();
  assert.match(html, /id="bookmarksBtn"/);
  assert.match(html, /id="annoPanel"/);
  assert.match(html, /vendor\/zen-fs-config\.js/);
  const escaped = await fetch(`${BASE}/vendor/not-there.js`);
  assert.equal(escaped.status, 404, 'vendor route must not read arbitrary paths');
});

test('image viewer markup keeps the original url, loads raw bytes and escapes filenames', () => {
  const html = renderImageViewer({ name: 'a<svg onload=1>.png', src: '/fs/C/photos/a.png?raw=1' });
  assert.match(html, /<img id="ivImage" src="\/fs\/C\/photos\/a\.png\?raw=1"/);
  assert.match(html, /type="module" src="\/image-viewer\.js"/);
  assert.match(html, /id="ivZoom"/);
  assert.match(html, /data-image-viewer/);
  assert.ok(!html.includes('a<svg onload=1>'), 'filename must be html-escaped');
  assert.match(html, /&lt;svg onload=1&gt;/);
});

test('vault module and modal markup are served', async () => {
  const module = await fetch(`${BASE}/vault.js`);
  assert.equal(module.status, 200, 'vault.js must be allowed as a static module');
  assert.match(module.headers.get('content-type') || '', /javascript/);
  const source = await module.text();
  assert.match(source, /export function openVault\b/);
  assert.match(source, /export function openVaultForPassword/);

  const html = await (await fetch(BASE)).text();
  assert.match(html, /id="vaultModal"/);
  assert.match(html, /id="vaultBtn"/);
  assert.match(html, /id="modalVault"/, 'encrypted-zip prompt offers picking from the vault');
});

test('vault api creates, unlocks, stores zip passwords, upserts by path and rejects wrong master', async () => {
  const master = 'secret-master-123';
  const create = await fetch(`${BASE}/api/vault/create`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ master }),
  });
  assert.equal(create.status, 200, 'create vault');
  const created = await create.json();
  assert.ok(created.data && created.sessionId, 'create returns blob + session');

  // 锁定新建会话后，再用主密码解锁（模拟刷新后保留 vault 密文、重新解锁）
  await fetch(`${BASE}/api/vault/lock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: created.sessionId }),
  });
  const unlock = await fetch(`${BASE}/api/vault/unlock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: created.data, master }),
  });
  assert.equal(unlock.status, 200, 'correct master unlocks the vault');
  const open = await unlock.json();
  assert.ok(open.sessionId && Array.isArray(open.entries));

  const zipAbs = 'C:\\Users\\me\\secret.zip';
  const save = (password) => fetch(`${BASE}/api/vault/save`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: open.sessionId,
      entry: { title: 'secret.zip', username: `fp:${zipAbs}`, password, url: zipAbs },
    }),
  });
  const saved = await save('zip-pass-1');
  assert.equal(saved.status, 200);
  const savedBlob = (await saved.json()).data;
  assert.notEqual(savedBlob, created.data, 'vault blob changes after saving an entry');

  const entries = await (await fetch(`${BASE}/api/vault/entries`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId }),
  })).json();
  assert.equal(entries.entries.length, 1, 'one entry stored');
  const entryId = entries.entries[0].id;
  assert.equal(entries.entries[0].title, 'secret.zip');

  const pw = await (await fetch(`${BASE}/api/vault/password`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId, entryId }),
  })).json();
  assert.equal(pw.password, 'zip-pass-1', 'plaintext password is readable');

  // 同路径指纹 upsert：条目数仍为 1，密码更新
  await save('zip-pass-2');
  const entries2 = await (await fetch(`${BASE}/api/vault/entries`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId }),
  })).json();
  assert.equal(entries2.entries.length, 1, 'upsert keeps a single entry per zip path');
  const pw2 = await (await fetch(`${BASE}/api/vault/password`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId, entryId: entries2.entries[0].id }),
  })).json();
  assert.equal(pw2.password, 'zip-pass-2', 'upsert updated the password');

  const del = await fetch(`${BASE}/api/vault/delete`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId, entryId: entries2.entries[0].id }),
  });
  assert.equal(del.status, 200);
  const entries3 = await (await fetch(`${BASE}/api/vault/entries`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId }),
  })).json();
  assert.equal(entries3.entries.length, 0, 'entry removed');

  const bad = await fetch(`${BASE}/api/vault/unlock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: created.data, master: 'wrong-master' }),
  });
  assert.equal(bad.status, 401, 'wrong master is rejected with 401');
  assert.match((await bad.json()).error || '', /主密码/);

  // 锁定后该会话失效，任何读取都应 401
  await fetch(`${BASE}/api/vault/lock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId }),
  });
  const locked = await fetch(`${BASE}/api/vault/entries`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: open.sessionId }),
  });
  assert.equal(locked.status, 401, 'session is invalid after lock');
});

test('vault api rejects requests without a session and missing vault', async () => {
  const noSession = await fetch(`${BASE}/api/vault/entries`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'not-real' }),
  });
  assert.equal(noSession.status, 401);
  const noVault = await fetch(`${BASE}/api/vault/unlock`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: '', master: 'x' }),
  });
  assert.equal(noVault.status, 400);
});

test('navigating to a local image serves a zoomable viewer, raw requests serve pixels', async () => {
  const file = path.join(SAMPLES, 'images', 'blue.png');
  const url = `${BASE}${localPathToUrl(file)}`;
  await fetch(`${BASE}/api/list?path=${encodeURIComponent(path.join(SAMPLES, 'images'))}`, {
    headers: { 'X-Local-Token': TEST_TOKEN },
  });

  const viewer = await fetch(url, { headers: { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' } });
  assert.equal(viewer.status, 200);
  assert.match(viewer.headers.get('content-type') || '', /text\/html/);
  assert.match(viewer.headers.get('content-security-policy') || '', /connect-src 'none'/);
  const html = await viewer.text();
  assert.match(html, /data-image-viewer/);
  assert.match(html, /blue\.png\?raw=1/);

  const raw = await fetch(`${url}?raw=1`);
  assert.equal(raw.status, 200);
  assert.match(raw.headers.get('content-type') || '', /image\/png/);
  assert.deepEqual(Buffer.from(await raw.arrayBuffer()), await fs.readFile(file));

  const asResource = await fetch(url, { headers: { 'Sec-Fetch-Dest': 'image' } });
  assert.equal(asResource.status, 200);
  assert.match(asResource.headers.get('content-type') || '', /image\/png/, 'img src inside zip html must keep real pixels');
});

test('zip images and svg get the same viewer without breaking relative references', async () => {
  const info = await openZipViaHttp('images.zip');
  const base = `${BASE}/zip/${info.id}`;
  const headers = { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'iframe' };
  for (const entry of ['blue.png', 'logo.svg', 'sub/nested.png']) {
    const viewer = await fetch(`${base}/${entry}`, { headers });
    assert.equal(viewer.status, 200, `${entry} viewer failed`);
    assert.match(viewer.headers.get('content-type') || '', /text\/html/);
    const html = await viewer.text();
    assert.match(html, new RegExp(`${entry.replace('.', '\\.')}\\?raw=1`));
    const raw = await fetch(`${base}/${entry}?raw=1`, { headers: { 'Sec-Fetch-Dest': 'image' } });
    assert.equal(raw.status, 200);
    assert.match(raw.headers.get('content-type') || '', /^image\//);
  }
  // 包内 HTML 引用同一张图片时仍是图片资源，不会被误包成查看器
  const resource = await fetch(`${base}/logo.svg`, { headers: { 'Sec-Fetch-Dest': 'image' } });
  assert.match(resource.headers.get('content-type') || '', /image\/svg\+xml/);
  await fetch(`${BASE}/api/zip/close`, {
    method: 'POST',
    headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: info.id }),
  });
});

test('image viewer module is served as a static asset', async () => {
  const module = await fetch(`${BASE}/image-viewer.js`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type') || '', /javascript/);
  const source = await module.text();
  assert.match(source, /addEventListener\('wheel'/);
  assert.match(source, /__imageViewer/);
});

test('editing any source file bumps the version automatically', async () => {
  const before = await (await fetch(`${BASE}/version.json`)).json();
  const probe = path.join(ROOT, 'web', '__version_probe__.js');
  try {
    await fs.writeFile(probe, '// temporary source edit\n');
    const changed = await (await fetch(`${BASE}/version.json`)).json();
    assert.notEqual(changed.buildId, before.buildId, 'content fingerprint changed');
    assert.equal(changed.revision, before.revision + 1, 'revision auto-increments');
    assert.notEqual(changed.version, before.version, 'displayed version changed');
    assert.ok(changed.buildTime);
  } finally {
    await fs.rm(probe, { force: true });
  }
  const reverted = await (await fetch(`${BASE}/version.json`)).json();
  assert.equal(reverted.buildId, before.buildId, 'fingerprint is content-based, not time-based');
  assert.equal(reverted.revision, before.revision + 2);
});

test('zip cover thumbnail shows the single inner file and uses the recorded vault key for encrypted zips', async () => {
  const tmp = await fs.mkdtemp(path.join(SAMPLES, 'cover-'));
  // 先列目录以放行该路径（服务端的 isPathAllowed 模型）
  await fetch(`${BASE}/api/list?path=${encodeURIComponent(tmp)}`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  const png = await fs.readFile(path.join(SAMPLES, 'images', 'blue.png'));

  async function writeZip(file, entries, password) {
    const { ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } = await import('@zip.js/zip.js');
    const writer = new ZipWriter(new Uint8ArrayWriter());
    for (const [name, buf] of entries) {
      await writer.add(name, new Uint8ArrayReader(buf), password ? { password, encryptionStrength: 3 } : undefined);
    }
    await fs.writeFile(file, await writer.close());
  }

  const single = path.join(tmp, 'single.zip');
  const multi = path.join(tmp, 'multi.zip');
  const enc = path.join(tmp, 'enc.zip');
  await writeZip(single, [['photo.png', png]]);
  await writeZip(multi, [['a.txt', Buffer.from('hi')], ['b.txt', Buffer.from('yo')]]);
  await writeZip(enc, [['secret.png', png]], 'pw123');

  const cover = (abs, vsid, defpw) => {
    const u = localPathToUrl(abs).replace(/^\/fs\//, '/thumb/zipcover/fs/');
    let url = `${BASE}${u}`;
    if (vsid) url += `?vsid=${encodeURIComponent(vsid)}`;
    if (defpw) url += `${vsid ? '&' : '?'}defpw=${encodeURIComponent(defpw)}`;
    return url;
  };

  const singleRes = await fetch(cover(single));
  assert.equal(singleRes.status, 200);
  assert.equal(singleRes.headers.get('content-type'), 'image/jpeg', 'single inner image -> jpeg cover');

  const multiRes = await fetch(cover(multi));
  assert.equal(multiRes.status, 200);
  assert.match(multiRes.headers.get('content-type') || '', /svg/, 'multi-file zip -> zip icon (svg)');

  const encNoKey = await fetch(cover(enc));
  assert.match(encNoKey.headers.get('content-type') || '', /svg/, 'encrypted without key -> zip icon');

  // 把密码记入密码库，用记录的密钥自动解密封面
  const create = await fetch(`${BASE}/api/vault/create`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ master: 'masterpw' }),
  });
  const vault = await create.json();
  const fp = `fp:${btoa(unescape(encodeURIComponent(enc)))}`;
  await fetch(`${BASE}/api/vault/save`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: vault.sessionId, entry: { title: 'enc.zip', username: fp, password: 'pw123', url: enc } }),
  });

  const encWithKey = await fetch(cover(enc, vault.sessionId));
  assert.equal(encWithKey.status, 200);
  assert.equal(encWithKey.headers.get('content-type'), 'image/jpeg', 'encrypted + recorded key -> inner image cover');

  const encWithDef = await fetch(cover(enc, null, 'pw123'));
  assert.equal(encWithDef.status, 200);
  assert.equal(encWithDef.headers.get('content-type'), 'image/jpeg', 'encrypted + default password (defpw) -> inner image cover');

  await fs.rm(tmp, { recursive: true, force: true });
});

// ---- 7z / 其它格式：走本机 7z 二进制（未安装则跳过） ----
function sevenZipAvailable() {
  for (const bin of ['7z', '7za', '7zr']) {
    try {
      execFileSync(bin, ['i'], { stdio: 'ignore' });
      return bin;
    } catch (err) {
      if (err && err.code !== 'ENOENT') return bin; // 能执行，只是退出码非 0
    }
  }
  return null;
}

test('7z archives: browse, unlock, inner read and single-file cover via the local 7z binary', async (t) => {
  const bin = sevenZipAvailable();
  if (!bin) {
    t.skip('7z binary not installed');
    return;
  }

  const tmp = await fs.mkdtemp(path.join(SAMPLES, 'seven-'));
  const png = await fs.readFile(path.join(SAMPLES, 'images', 'blue.png'));
  const make = (args) => execFileSync(bin, args, { cwd: tmp, stdio: 'ignore' });

  await fs.writeFile(path.join(tmp, 'photo.png'), png);
  await fs.writeFile(path.join(tmp, 'a.txt'), 'hi');
  await fs.writeFile(path.join(tmp, 'b.txt'), 'yo');

  make(['a', '-t7z', 'single.7z', 'photo.png', '-y']);
  make(['a', '-t7z', 'multi.7z', 'a.txt', 'b.txt', '-y']);
  make(['a', '-t7z', '-ppw123', '-mhe=off', 'enc.7z', 'photo.png', '-y']);
  make(['a', '-t7z', '-ppw123', '-mhe=on', 'henc.7z', 'photo.png', '-y']);

  const listRes = await fetch(`${BASE}/api/list?path=${encodeURIComponent(tmp)}`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  assert.equal(listRes.status, 200);
  const listed = await listRes.json();
  const sevenItem = listed.items.find((item) => item.name === 'single.7z');
  assert.ok(sevenItem, '.7z appears in the directory listing');
  assert.equal(sevenItem.archive, true, '.7z is flagged as an archive');
  assert.equal(sevenItem.zip, true, 'legacy zip flag stays as an alias so the old UI still opens it');

  const cover = (abs, defpw) => {
    const u = localPathToUrl(abs).replace(/^\/fs\//, '/thumb/zipcover/fs/');
    return `${BASE}${u}${defpw ? `?defpw=${encodeURIComponent(defpw)}` : ''}`;
  };

  const singleCover = await fetch(cover(path.join(tmp, 'single.7z')));
  assert.equal(singleCover.status, 200);
  assert.equal(singleCover.headers.get('content-type'), 'image/jpeg', '7z with a single inner image -> jpeg cover');

  const multiCover = await fetch(cover(path.join(tmp, 'multi.7z')));
  assert.match(multiCover.headers.get('content-type') || '', /svg/, 'multi-file 7z -> archive icon');

  const encNoKey = await fetch(cover(path.join(tmp, 'enc.7z')));
  assert.match(encNoKey.headers.get('content-type') || '', /svg/, 'encrypted 7z without key -> archive icon');

  const encDefpw = await fetch(cover(path.join(tmp, 'enc.7z'), 'pw123'));
  assert.equal(encDefpw.headers.get('content-type'), 'image/jpeg', 'encrypted 7z + default password -> jpeg cover');

  const encBadPw = await fetch(cover(path.join(tmp, 'enc.7z'), 'wrong'));
  assert.match(encBadPw.headers.get('content-type') || '', /svg/, 'encrypted 7z + wrong default password -> archive icon');

  // 打开未加密 7z：能列出条目并通过 /zip/<id>/ 读到内容
  const openRes = await fetch(`${BASE}/api/zip/open`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path.join(tmp, 'single.7z') }),
  });
  assert.equal(openRes.status, 200);
  const opened = await openRes.json();
  assert.equal(opened.needsPassword, false);
  assert.ok(opened.entries.some((e) => e.path === 'photo.png'));

  const raw = await fetch(`${BASE}/zip/${opened.id}/photo.png?raw=1`);
  assert.equal(raw.status, 200);
  assert.equal(raw.headers.get('content-type'), 'image/png');
  assert.equal((await raw.arrayBuffer()).byteLength, png.length, 'inner bytes are served unchanged');

  // 打开加密 7z（只加密数据、头不加密）：需要密码，错误密码 401，正确密码后可读
  const encRes = await fetch(`${BASE}/api/zip/open`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path.join(tmp, 'enc.7z') }),
  });
  const encOpened = await encRes.json();
  assert.equal(encOpened.needsPassword, true, 'encrypted 7z asks for a password');

  const badUnlock = await fetch(`${BASE}/api/zip/unlock`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: encOpened.id, password: 'wrong' }),
  });
  assert.equal(badUnlock.status, 401, 'wrong 7z password is rejected');

  const goodUnlock = await fetch(`${BASE}/api/zip/unlock`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: encOpened.id, password: 'pw123' }),
  });
  assert.equal(goodUnlock.status, 200);

  const encRaw = await fetch(`${BASE}/zip/${encOpened.id}/photo.png?raw=1`);
  assert.equal(encRaw.status, 200);
  assert.equal((await encRaw.arrayBuffer()).byteLength, png.length, 'decrypted 7z entry matches the original bytes');

  // 头部加密的 7z：不给密码时列表为空、且标记需要密码（关键是不能卡住）
  const hRes = await fetch(`${BASE}/api/zip/open`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: path.join(tmp, 'henc.7z') }),
  });
  const hOpened = await hRes.json();
  assert.equal(hOpened.needsPassword, true, 'header-encrypted 7z asks for a password instead of hanging');

  const hUnlock = await fetch(`${BASE}/api/zip/unlock`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: hOpened.id, password: 'pw123' }),
  });
  assert.equal(hUnlock.status, 200, 'header-encrypted 7z unlocks with the right password');

  const hTree = await fetch(`${BASE}/api/zip/tree?id=${hOpened.id}`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  const hData = await hTree.json();
  assert.ok(hData.entries.some((e) => e.path === 'photo.png'), 'listing appears after unlocking a header-encrypted 7z');

  await fs.rm(tmp, { recursive: true, force: true });
});

/* ---------------- 收藏 → 目录结构清单 v2 ---------------- */

test('v2 path helpers and manifest prefix derivation', () => {
  assert.equal(manifest.hostRelativePath('C:\\Photos\\2024\\'), 'C:/Photos/2024');
  assert.equal(manifest.hostRelativePath('d:/private'), 'D:/private');
  assert.equal(manifest.hostRelativePath('C:\\'), 'C:');
  assert.equal(manifest.hostRelativePath('/etc/hosts'), null);
  assert.equal(manifest.driveOfHostRelative('C:/Photos/2024'), 'C:');
  assert.equal(manifest.normalizeEntry('..\\a/./b'), 'a/b');
  assert.equal(manifest.sanitizeKey('MY-PC::C:'), 'MY-PC__C_');

  assert.equal(manifest.hostIndexFile('MY-PC'), 'struct/zip-browser.MY-PC.json',
    'host index must not be named <host>.json (dir-struct-gen owns that file)');
  assert.equal(manifest.shardBaseFor('MY-PC', 'vid-1'), 'zip-browser.MY-PC.vid-1');
  assert.equal(manifest.tagFileFor('vid-1'), 'file-tags/vid-1.json');

  assert.equal(manifest.manifestPrefixFor([
    { type: 'IndexedDB' }, { type: 'RemoteStorage', options: { basePath: 'app_data/folders/' } },
  ]).prefix, '', 'RemoteStorage basePath already points at the manifest base');
  assert.equal(manifest.manifestPrefixFor([{ type: 'Gitee' }]).prefix, 'app_data/folders',
    'repo-root backends need the app_data/folders prefix');
  assert.equal(manifest.manifestPrefixFor([{ type: 'InMemory' }]).ok, false,
    'local-only data group must not be accepted');
  assert.equal(manifest.manifestPrefixFor([
    { type: 'RemoteStorage', options: { basePath: 'somewhere/else' } },
  ]).ok, false, 'an unaligned basePath must abort instead of guessing');
  assert.equal(manifest.manifestPrefixFor([
    { type: 'RemoteStorage', options: { basePath: 'app_data/folders' } }, { type: 'Gitee' },
  ]).ok, false, 'mixed prefixes cannot share one relative path');
});

test('v2 export builds host index, per-volume shards and file-tags without polluting struct', () => {
  const now = 1794500000000;
  const data = {
    v: 1, updatedAt: 1,
    tags: {
      'fs:c:\\photos\\2024': ['旅行'],
      'fs:d:\\private': ['私密'],
      'zip:c:\\a.zip#inner/dir': ['压缩包'],
    },
    paths: {
      'fs:c:\\photos\\2024': { kind: 'dir', path: 'C:\\Photos\\2024', entry: '', label: '2024' },
      'fs:d:\\private': { kind: 'dir', path: 'D:\\private', entry: '', label: 'private' },
      'zip:c:\\a.zip#inner/dir': { kind: 'zip', path: 'C:\\a.zip', zipPath: 'C:\\a.zip', entry: 'inner/dir', label: 'a' },
    },
    bookmarks: [
      { id: 'bm1', key: 'fs:c:\\photos\\2024', kind: 'dir', label: '2024', path: 'C:\\Photos\\2024', entry: '' },
      { id: 'bm2', key: 'zip:c:\\a.zip#inner/dir', kind: 'zip', label: 'a', path: 'C:\\a.zip', zipPath: 'C:\\a.zip', entry: 'inner/dir' },
    ],
  };
  const result = manifest.buildV2Export({
    data, host: 'MY-PC', now, revision: 7,
    volumes: { C: '11111111-2222-3333-4444-555555555555', D: null },
    existing: {
      'file-tags/11111111-2222-3333-4444-555555555555.json': {
        tags: { 'C:/Old': ['别的工具', '书签'] },
      },
    },
  });
  const byKind = (kind) => result.files.filter((f) => f.kind === kind);
  const host = byKind('host')[0];
  assert.equal(host.path, 'struct/zip-browser.MY-PC.json');
  assert.equal(host.json.version, 2, 'host index is v2');
  assert.equal(host.json.generator, 'zip-browser');
  assert.equal(host.json.source, 'MY-PC (zip-browser)');
  assert.equal(host.json.mounts.length, 2, 'one mount per volume');
  assert.equal(host.json.mounts[0].volumeId, '11111111-2222-3333-4444-555555555555');
  assert.equal(host.json.mounts[1].volumeId, null, 'no marker / serial falls back to null in the mount');
  for (const mount of host.json.mounts) {
    assert.equal(mount.files.length, 1, 'fixed shard name, one shard per volume');
    assert.ok(mount.files[0].startsWith('zip-browser.MY-PC.'), 'shard base carries the host id');
  }

  const shards = byKind('shard');
  assert.equal(shards.length, 2);
  for (const shard of shards) {
    assert.equal(shard.json.type, 'folder');
    assert.equal(shard.json.part.id, 'MY-PC');
    assert.equal(shard.json.part.revision, 7);
    assert.equal(shard.json.part.generatedAt, now);
    assert.deepEqual(shard.json.sources, ['MY-PC']);
  }
  const cShard = shards.find((s) => s.json.name === 'C:');
  assert.deepEqual(cShard.json.children.map((n) => n.name), ['Photos']);
  assert.deepEqual(cShard.json.children[0].children.map((n) => n.name), ['2024']);
  assert.equal(cShard.json.children[0].updatedAt, now, 'nodes carry ms epoch updatedAt');
  assert.equal(cShard.json.volumeId, '11111111-2222-3333-4444-555555555555');
  const dShard = shards.find((s) => s.json.name === 'D:');
  assert.equal(dShard.json.volumeId, null);
  assert.deepEqual(dShard.json.children.map((n) => n.name), ['private']);
  // 文档硬性要求：用户标签绝不回写 struct 清单。
  assert.equal(JSON.stringify(shards).includes('"tags"'), false, 'no tags inside struct files');
  assert.equal(JSON.stringify(shards).includes('zip:'), false, 'zip pseudo paths never become tree nodes');

  const tagFiles = byKind('tags');
  assert.equal(tagFiles.length, 2);
  assert.equal(tagFiles[0].path, 'file-tags/11111111-2222-3333-4444-555555555555.json',
    'file-tags key is the volumeId');
  const cTags = tagFiles[0].json.tags;
  assert.deepEqual(cTags['C:/Photos/2024'].sort(), ['书签', '旅行'].sort());
  assert.deepEqual(cTags['zip:C:/a.zip#inner/dir'].sort(), ['zip-bookmark', '压缩包'].sort());
  assert.deepEqual(cTags['C:/Old'], ['别的工具'], 'other tools tags are preserved, stale reserved tags removed');
  const dTags = tagFiles[1].json.tags;
  assert.deepEqual(dTags['D:/private'], ['私密'], 'D: falls back to host::drive key');
  assert.equal(tagFiles[1].path, 'file-tags/MY-PC__D_.json');

  assert.equal(result.knownVolumes.length, 2);
  assert.equal(result.stats.shardCount, 2);
  assert.equal(result.stats.revision, 7);
});

test('v2 export keeps known volumes so clearing bookmarks cannot leave orphan shards', () => {
  const knownVolumes = [
    { key: 'MY-PC::C:', drive: 'C:', volumeId: null },
  ];
  const result = manifest.buildV2Export({
    data: { tags: {}, paths: {}, bookmarks: [] },
    host: 'MY-PC', volumes: {}, now: 1794500000000, revision: 3, knownVolumes,
  });
  assert.equal(result.files.filter((f) => f.kind === 'shard').length, 1,
    'the previous shard is rewritten with empty children instead of becoming an orphan');
  assert.deepEqual(result.files.find((f) => f.kind === 'shard').json.children, []);
  assert.equal(result.files[0].json.mounts.length, 1);
});

test('file-tags merge drops stale bookmark markers but keeps foreign tags', () => {
  const merged = manifest.mergeTagDoc(
    { tags: { 'C:/A': ['旅行', '书签', 'zip-bookmark'], 'C:/B': ['别人的'] } },
    { 'C:/A': ['书签'] },
  );
  assert.deepEqual(merged.tags['C:/A'], ['旅行', '书签']);
  assert.deepEqual(merged.tags['C:/B'], ['别人的']);
  assert.deepEqual(manifest.mergeTagDoc(null, {}), { tags: {} });
});

test('hostinfo reads the volume marker without writing to the disk', async () => {
  const dir = path.join(ROOT, 'tests', '.hostinfo-fixture');
  await fs.mkdir(dir, { recursive: true });
  const marker = path.join(dir, '.dir-struct-id');
  await fs.writeFile(marker, 'abcdefab-1234-5678-9abc-defabcdefab');
  assert.equal(readVolumeId(dir), 'abcdefab-1234-5678-9abc-defabcdefab');
  await fs.rm(dir, { recursive: true, force: true });
  assert.equal(readVolumeId(null), null);
});

test('hostinfo api and v2 sync assets are served', async () => {
  const infoRes = await fetch(`${BASE}/api/hostinfo`, { headers: { 'X-Local-Token': TEST_TOKEN } });
  assert.equal(infoRes.status, 200);
  const info = await infoRes.json();
  assert.equal(typeof info.host, 'string');
  assert.ok(info.host.length > 0, 'hostname is needed for source and file names');
  assert.equal(typeof info.volumes, 'object');
  assert.ok(info.volumes !== null);

  const denied = await fetch(`${BASE}/api/hostinfo`);
  assert.ok(denied.status >= 400, 'hostinfo must still require the local token');

  for (const file of [
    '/manifest-export.js', '/manifest-sync.js',
    '/vendor/zen-fs-config-ui.js',
    '/vendor/zen-fs-remotestoragejs.global.js',
    '/vendor/zen-fs-gitee.global.js',
  ]) {
    const res = await fetch(`${BASE}${file}`);
    assert.equal(res.status, 200, `${file} is not served`);
    assert.match(res.headers.get('content-type') || '', /javascript/);
  }
  const html = await (await fetch(BASE)).text();
  for (const id of ['syncBtn', 'syncModal', 'syncHost', 'syncNowBtn', 'syncStatus']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} missing from the page`);
  }
  assert.match(html, /vendor\/zen-fs-config-ui\.js/);
  assert.match(html, /目录结构清单 v2/);
  const pageRes = await fetch(BASE);
  assert.match(pageRes.headers.get('content-security-policy') || '', /connect-src 'self' https: http:/,
    'remote sync backends must not be blocked by connect-src');
});

test('v2 sync writes host index, shard and file-tags into a fake app-data group', async () => {
  // 用假的 DOM / 数据组 fs 跑通 manifest-sync.js 的真实写入链路。
  const written = new Map();
  const fakeFs = {
    promises: {
      readFile: async () => { throw new Error('ENOENT'); },
      writeFile: async (file, text) => { written.set(file, JSON.parse(text)); },
      mkdir: async () => {},
    },
  };
  const makeEl = () => ({
    dataset: {}, textContent: '', title: '',
    classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {}, setAttribute() {},
  });
  const elements = new Map();
  const elFor = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl());
    return elements.get(id);
  };
  const configurator = {
    ...makeEl(),
    getConnection: () => ({
      groupType: 'data-sync',
      dataGroup: {
        fs: fakeFs,
        listBackends: () => [{ type: 'RemoteStorage', options: { basePath: 'app_data/folders/' } }],
        listDeclaredBackends: () => [],
      },
    }),
  };
  const store = new Map();
  const saved = {
    window: globalThis.window, document: globalThis.document,
    customElements: globalThis.customElements, localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.window = { __LOCAL_TOKEN__: 'harness-token' };
  globalThis.document = {
    getElementById: elFor,
    createElement: () => configurator,
  };
  globalThis.customElements = { get: () => ({}) };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
  };
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/api\/hostinfo$/);
    return { ok: true, json: async () => ({ host: 'HARNESS-PC', volumes: { C: 'vid-harness' } }) };
  };
  let sync;
  try {
    // query 让本用例拿到独立模块实例，不污染其它用例的模块状态
    sync = await import('../web/manifest-sync.js?harness=rs');
    const data = {
      v: 1, updatedAt: 2,
      tags: { 'fs:c:\\work': ['项目'] },
      paths: { 'fs:c:\\work': { kind: 'dir', path: 'C:\\Work', entry: '', label: 'Work' } },
      bookmarks: [{ id: 'b1', key: 'fs:c:\\work', kind: 'dir', label: 'Work', path: 'C:\\Work', entry: '' }],
    };
    const result = sync.initManifestSync({ getSnapshot: () => data });
    assert.equal(result.ok, true);
    sync.cancelScheduledSync(); // 连接建立时会自动排一次同步，这里只验证显式调用
    const stats = await sync.syncNow();
    assert.equal(stats.bookmarkShardCount, 1);
    assert.equal(stats.revision, 1);

    // 定稿：唯一主机索引 struct/<host>.json；书签分片固定名带 .bookmarks。
    const hostPath = '/struct/HARNESS-PC.json';
    const shardPath = '/struct/zip-browser.HARNESS-PC.vid-harness.bookmarks.json';
    const tagPath = '/file-tags/vid-harness.json';
    assert.ok(written.has(hostPath), `missing ${hostPath}`);
    assert.ok(written.has(shardPath), `missing ${shardPath}`);
    assert.ok(written.has(tagPath), `missing ${tagPath}`);
    assert.equal(written.get(hostPath).version, 2);
    assert.equal(written.get(hostPath).generator, 'fluentos-dir-struct-gen');
    assert.deepEqual(written.get(hostPath).mounts[0].files, ['zip-browser.HARNESS-PC.vid-harness.bookmarks']);
    assert.equal(written.get(shardPath).volumeId, 'vid-harness');
    assert.deepEqual(written.get(shardPath).children.map((n) => n.name), ['Work']);
    assert.deepEqual(written.get(tagPath).tags['C:/Work'].sort(), ['书签', '项目'].sort());
    assert.equal(store.get('zip-browser:manifest-revision'), '1');
    assert.equal(JSON.parse(store.get('zip-browser:manifest-volumes'))[0].key, 'vid-harness');
  } finally {
    sync.cancelScheduledSync();
    Object.assign(globalThis, saved);
  }
});

test('v2 sync prefixes app_data/folders for repo-root backends', async () => {
  const written = new Map();
  const fakeFs = {
    promises: {
      readFile: async () => { throw new Error('ENOENT'); },
      writeFile: async (file, text) => { written.set(file, JSON.parse(text)); },
      mkdir: async () => {},
    },
  };
  const makeEl = () => ({
    dataset: {}, textContent: '', title: '',
    classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {}, setAttribute() {},
  });
  const elements = new Map();
  const elFor = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl());
    return elements.get(id);
  };
  const configurator = {
    ...makeEl(),
    getConnection: () => ({
      groupType: 'data-sync',
      dataGroup: {
        fs: fakeFs,
        listBackends: () => [{ type: 'Gitee' }],
        listDeclaredBackends: () => [],
      },
    }),
  };
  const store = new Map();
  const saved = {
    window: globalThis.window, document: globalThis.document,
    customElements: globalThis.customElements, localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.window = { __LOCAL_TOKEN__: 'harness-token' };
  globalThis.document = { getElementById: elFor, createElement: () => configurator };
  globalThis.customElements = { get: () => ({}) };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
  };
  globalThis.fetch = async () => ({
    ok: true, json: async () => ({ host: 'GITEE-PC', volumes: {} }),
  });
  let sync;
  try {
    sync = await import('../web/manifest-sync.js?harness=gitee');
    sync.initManifestSync({ getSnapshot: () => ({ tags: {}, paths: {}, bookmarks: [] }) });
    sync.cancelScheduledSync();
    await sync.syncNow();
    assert.ok(written.has('/app_data/folders/struct/GITEE-PC.json'),
      'repo-root backends must write under app_data/folders/struct');
  } finally {
    sync.cancelScheduledSync();
    Object.assign(globalThis, saved);
  }
});

test('trash script only ever uses SendToRecycleBin and reports per-item results', async () => {
  const trash = await import('../server/trash-service.js');
  const items = [
    { i: 0, p: 'C:\\Temp\\a.txt', d: false },
    { i: 1, p: 'C:\\Temp\\目录', d: true },
  ];
  const script = trash.buildTrashScript(items);
  assert.match(script, /RecycleOption\]::SendToRecycleBin/);
  assert.match(script, /DeleteDirectory/);
  assert.match(script, /DeleteFile/);
  assert.doesNotMatch(script, /DeletePermanently|Remove-Item|FromBase64String\('[^']*remove/);
  assert.match(script, /\[Text\.Encoding\]::UTF8\.GetString/, 'paths travel as base64 JSON, never raw in argv');
  const results = trash.parseTrashOutput(
    '{"i":0,"ok":true,"e":""}\nnoise\n{"i":1,"ok":false,"e":"denied"}', items,
  );
  assert.deepEqual(results, [
    { path: items[0].p, ok: true, error: '' },
    { path: items[1].p, ok: false, error: 'denied' },
  ]);
  assert.equal(trash.isRecyclableDriveType(3), true, 'only fixed local disks carry a Recycle Bin');
  for (const type of [2, 4, 5, 6, undefined]) {
    assert.equal(trash.isRecyclableDriveType(type), false);
  }
});

test('trash validation enforces browsed dir, direct children, batch limit and protected paths', async () => {
  const trash = await import('../server/trash-service.js');
  const fss = await import('../server/fs-service.js');
  const tmp = path.join(ROOT, 'tests', `.trash-validate-${process.pid}`);
  await fs.mkdir(path.join(tmp, 'sub'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'a.txt'), 'a');
  fss.allowDirectory(tmp);
  try {
    const ok = await trash.validateTrashTargets(tmp, [path.join(tmp, 'a.txt'), path.join(tmp, 'sub')]);
    assert.equal(ok.items.length, 2);
    assert.equal(ok.items[1].d, true);
    await assert.rejects(() => trash.validateTrashTargets(tmp, []), /没有选择/);
    await assert.rejects(
      () => trash.validateTrashTargets(tmp, Array.from({ length: 11 }, () => path.join(tmp, 'a.txt'))),
      /最多删除 10/,
    );
    await assert.rejects(
      () => trash.validateTrashTargets(tmp, [path.join(tmp, '..', 'outside.txt')]),
      /直接子项/,
    );
    await assert.rejects(
      () => trash.validateTrashTargets(tmp, [path.join(tmp, 'missing.txt')]),
      /不存在/,
    );
    const unbrowsed = path.join(ROOT, 'tests', `.trash-unbrowsed-${process.pid}`);
    await assert.rejects(
      () => trash.validateTrashTargets(unbrowsed, [path.join(unbrowsed, 'x.txt')]),
      /未在当前会话中打开/,
    );
    assert.equal(trash.isProtectedPath('C:\\'), true);
    assert.equal(trash.isProtectedPath('C:\\Windows'), true);
    assert.equal(trash.isProtectedPath(process.env.USERPROFILE || 'C:\\Users'), true);
    assert.equal(trash.isProtectedPath(`${process.env.USERPROFILE || 'C:\\Users'}\\Desktop`), true);
    assert.equal(trash.isProtectedPath('C:\\Windows\\notepad.exe'), false);
    assert.equal(trash.isInsideProtectedTree('C:\\Windows\\System32\\drivers\\etc\\hosts'), true,
      'system subtrees must be off limits');
    assert.equal(trash.isInsideProtectedTree('C:\\Program Files\\SomeApp'), true);
    assert.equal(trash.isInsideProtectedTree(`${process.env.USERPROFILE || 'C:\\Users'}\\Desktop\\a.txt`), false,
      'individual files on the Desktop remain deletable');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('trash API moves files and folders into the Windows Recycle Bin', async (t) => {
  if (process.platform !== 'win32') return t.skip('recycle bin is Windows-only');
  const tmp = path.join(ROOT, 'tests', `.trash-http-${process.pid}`);
  await fs.mkdir(path.join(tmp, 'sub'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'a.txt'), 'a');
  await fs.writeFile(path.join(tmp, 'b.txt'), 'b');
  await fs.writeFile(path.join(tmp, 'sub', 'inner.txt'), 'inner');
  const headers = { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' };
  const post = (body, withToken = true) => fetch(`${BASE}/api/trash`, {
    method: 'POST',
    headers: withToken ? headers : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  try {
    const listed = await fetch(`${BASE}/api/list?path=${encodeURIComponent(tmp)}`, {
      headers: { 'X-Local-Token': TEST_TOKEN },
    });
    assert.equal(listed.status, 200, 'the directory must be opened once before deletion is allowed');

    assert.equal((await post({ dir: tmp, paths: [path.join(tmp, 'a.txt')] }, false)).status, 403);
    assert.equal((await post({
      dir: tmp,
      paths: Array.from({ length: 11 }, (_, i) => path.join(tmp, `x${i}.txt`)),
    })).status, 400);
    assert.equal((await post({ dir: tmp, paths: [path.join(tmp, '..', 'outside.txt')] })).status, 400);

    const fileRes = await post({ dir: tmp, paths: [path.join(tmp, 'a.txt')] });
    assert.equal(fileRes.status, 200);
    const fileData = await fileRes.json();
    assert.equal(fileData.ok, true, JSON.stringify(fileData));
    assert.equal(fileData.trashed, 1);
    await assert.rejects(() => fs.access(path.join(tmp, 'a.txt')), /ENOENT/);

    const dirRes = await post({ dir: tmp, paths: [path.join(tmp, 'sub')] });
    const dirData = await dirRes.json();
    assert.equal(dirData.ok, true, JSON.stringify(dirData));
    await assert.rejects(() => fs.access(path.join(tmp, 'sub')), /ENOENT/);
    assert.equal(await fs.readFile(path.join(tmp, 'b.txt'), 'utf8'), 'b', 'untargeted files stay untouched');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('trash UI is wired into the page and served as a module', async () => {
  const html = await (await fetch(BASE)).text();
  assert.match(html, /id="trashModal"/);
  assert.match(html, /data-action="trash-confirm"/);
  assert.match(html, /浏览 · 删除到回收站/);
  const module = await fetch(`${BASE}/trash-ui.js`);
  assert.equal(module.status, 200);
  assert.match(await module.text(), /\/api\/trash/);
});

test('trash UI confirms, batches 10 at a time and refreshes', async () => {
  const makeEl = (dataset = {}) => ({
    dataset, checked: false, disabled: false, textContent: '', innerHTML: '',
    classList: {
      hidden: true,
      add(c) { if (c === 'hidden') this.hidden = true; },
      remove(c) { if (c === 'hidden') this.hidden = false; },
      contains(c) { return c === 'hidden' ? this.hidden : false; },
    },
  });
  const boxes = Array.from({ length: 12 }, (_, i) => makeEl({
    path: `C:\\tmp\\f${i}.txt`, name: `f${i}.txt`, dir: 'false',
  }));
  const els = {
    trashAll: makeEl(), trashSelectedBtn: makeEl(), trashCount: makeEl(),
    trashModal: makeEl(), trashList: makeEl(), trashCountText: makeEl(),
    trashConfirm: makeEl(),
  };
  const calls = [];
  const statuses = [];
  let refreshed = 0;
  const savedDocument = globalThis.document;
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: (selector) => (selector === '.trash-check' ? boxes : []),
    addEventListener: () => {},
  };
  try {
    const ui = await import('../web/trash-ui.js?harness=trash');
    ui.initTrash({
      api: async (url, options) => {
        const body = JSON.parse(options.body);
        calls.push({ url, body });
        return { ok: true, results: body.paths.map((p) => ({ path: p, ok: true })) };
      },
      getDir: () => 'C:\\tmp',
      refresh: () => { refreshed += 1; },
      status: (text, bad) => statuses.push({ text, bad }),
    });

    // 单项删除 → 弹窗列出完整路径；取消后不应再发起请求
    await ui.handleTrashAction('trash-one', makeEl({
      path: 'C:\\tmp\\照片 目录', name: '照片 目录', dir: 'true',
    }));
    assert.equal(els.trashCountText.textContent, '1');
    assert.match(els.trashList.innerHTML, /C:\\tmp\\照片 目录/);
    assert.match(els.trashList.innerHTML, /文件夹/);
    await ui.handleTrashAction('trash-cancel', makeEl());
    await ui.handleTrashAction('trash-confirm', els.trashConfirm);
    assert.equal(calls.length, 0, 'cancel must clear the pending batch');

    for (const box of boxes) {
      box.checked = true;
      // eslint-disable-next-line no-await-in-loop
      await ui.handleTrashAction('trash-check', box);
    }
    assert.equal(els.trashSelectedBtn.disabled, false);
    assert.equal(els.trashCount.textContent, '12');
    await ui.handleTrashAction('trash-selected', els.trashSelectedBtn);
    assert.equal(els.trashCountText.textContent, '12');
    assert.match(els.trashList.innerHTML, /C:\\tmp\\f11\.txt/);
    await ui.handleTrashAction('trash-confirm', els.trashConfirm);
    assert.equal(calls.length, 2, '12 items must be sent as 10 + 2');
    assert.deepEqual(calls.map((call) => call.body.paths.length), [10, 2]);
    assert.equal(calls[0].body.dir, 'C:\\tmp');
    assert.equal(refreshed, 1);
    assert.equal(els.trashSelectedBtn.disabled, true);
    assert.match(statuses.at(-1).text, /已把 12 项移入回收站/);
  } finally {
    globalThis.document = savedDocument;
  }
});

/* ---------------- 清单生成 / 文件列表（v2 + file-list） ---------------- */

test('file-list mirrors original directory paths and falls back for unsafe or deep paths', async () => {
  const fle = await import('../web/file-list-export.js');
  assert.equal(fle.mirrorPathFor('C:/Photos/2024', 'A401-6B8F').path,
    'file-list/A401-6B8F/C/Photos/2024/files.json');
  assert.equal(fle.mirrorPathFor('D:/工作/报表', 'A401-6B8F').path,
    'file-list/A401-6B8F/D/工作/报表/files.json');
  assert.equal(fle.mirrorPathFor('C:/A/B', 'Richard::C:').path,
    'file-list/Richard__C_/C/A/B/files.json');
  assert.equal(fle.safeSegment('.git'), '.git', 'leading dots must survive');
  assert.equal(fle.safeSegment('a:b'), 'a_b');
  assert.equal(fle.safeSegment('   '), '');
  assert.equal(fle.fnv1a64Hex('C:/photos'), fle.fnv1a64Hex('C:/photos'));
  assert.notEqual(fle.fnv1a64Hex('C:/photos'), fle.fnv1a64Hex('C:/PHOTOS'));
  const deep = ['C:'].concat(Array.from({ length: 30 }, (_, i) => `d${i}`)).join('/');
  const fallback = fle.mirrorPathFor(deep, 'A401-6B8F');
  assert.equal(fallback.fallback, true);
  assert.match(fallback.dirKey, /-[0-9a-f]{12}$/);
  assert.match(fallback.path, /^file-list\/A401-6B8F\/[A-Za-z0-9_.-]+\.json$/);
  assert.equal(fle.removedDoc('C:/A', 'PC').removed, true);
});

test('file-list docs dedupe, merge tags, truncate and group picked files per volume', async () => {
  const fle = await import('../web/file-list-export.js');
  const scan = {
    files: {
      'C:\\Work': [
        { path: 'C:\\Work\\a.txt', name: 'a.txt', size: 5, sizeOnDisk: 4096, mtime: 123, hash: `sha256:${'a'.repeat(64)}` },
        { path: 'C:\\Work\\A.TXT', name: 'A.TXT', size: 5, sizeOnDisk: 4096, mtime: 123 },
        { path: 'C:\\Work\\b.txt', name: 'b.txt', size: 7, sizeOnDisk: 4096, mtime: 456 },
        { path: 'C:\\Work\\c.txt', name: 'c.txt', size: 9, sizeOnDisk: 4096, mtime: 789 },
      ],
    },
    status: { 'C:\\Work': { incomplete: false, truncated: false, total: 4 } },
  };
  const built = fle.buildFileListDocs({
    selection: {
      dirs: [{ path: 'C:\\Work', recursive: true }],
      files: [{ path: 'zip:C:/a.zip#inner/x.png', name: 'x.png', size: 3, mtime: 9, crc32: '1A2B3C4D' }],
    },
    scan,
    host: 'Richard',
    volumes: { C: 'vid-c' },
    tagsByRel: { 'C:/Work/a.txt': ['旅行'] },
    now: 1000,
    revision: 2,
    maxFiles: 2,
  });
  assert.equal(built.files.length, 2);
  const doc = built.files[0];
  assert.equal(doc.path, 'file-list/vid-c/C/Work/files.json');
  assert.equal(doc.json.fileCount, 2, 'maxFiles truncates');
  assert.equal(doc.json.truncated, true);
  assert.equal(doc.json.volumeId, 'vid-c');
  assert.equal(doc.json.source, 'Richard');
  assert.equal(doc.json.version, 2);
  assert.equal(doc.json.part.revision, 2);
  assert.deepEqual(doc.json.files.map((f) => f.path), ['C:/Work/a.txt', 'C:/Work/b.txt']);
  assert.equal(doc.json.files[0].hash, `sha256:${'a'.repeat(64)}`);
  assert.equal(doc.json.files[1].hash, undefined);
  assert.deepEqual(doc.json.files[0].tags, ['旅行']);
  assert.equal(built.files[1].path, 'file-list/vid-c/_picked.json');
  assert.equal(built.files[1].json.files[0].archive, true);
  assert.equal(built.files[1].json.files[0].crc32, '1a2b3c4d');
  assert.equal(built.files[1].json.files[0].hash, undefined, 'zip 内条目不写内容 hash');
  assert.equal(fle.fileListSignature(doc.json), fle.fileListSignature({ ...doc.json, part: { revision: 99 } }));
  assert.notEqual(
    fle.fileListSignature(doc.json),
    fle.fileListSignature({ ...doc.json, files: [{ ...doc.json.files[0], hash: `sha256:${'b'.repeat(64)}` }] }),
    'hash 必须参与签名',
  );
});

test('selection helpers normalize windows paths and keep two independent sets', async () => {
  const sel = await import('../web/manifest-selection.js');
  let dirs = sel.addDirSelection(sel.emptyDirSelection(), 'C://Work//2024');
  assert.equal(dirs.dirs[0].path, 'C:\\Work\\2024');
  assert.equal(sel.isDirSelected(dirs, 'c:\\work\\2024'), true);
  dirs = sel.addDirSelection(dirs, 'C:\\WORK\\2024');
  assert.equal(dirs.dirs.length, 1, 'case-insensitive dedupe');
  let files = sel.addFileDirSelection(sel.emptyFileSelection(), 'D:\\Photos');
  files = sel.addPickedFile(files, { path: 'zip:C:/a.zip#x.png', name: 'x.png', size: 1 });
  assert.equal(files.dirs.length, 1);
  assert.equal(files.files[0].archive, true);
  assert.equal(sel.removeFileDirSelection(files, 'd:\\photos').dirs.length, 0);
});

test('v2 scan shards, unified host index and bookmark renaming', async () => {
  const mp = await import('../web/manifest-payload.js');
  const scan = {
    roots: [{
      path: 'C:\\Work\\2024', name: '2024', type: 'folder', tags: ['node'],
      children: [], fileCount: 2, totalSize: 20, totalSizeOnDisk: 8192,
      sizePartial: false, mtime: 999,
    }],
    files: {}, status: {}, summaries: {},
  };
  const shards = mp.buildScanShards({ scan, host: 'PC', volumes: { C: 'vid-c' }, now: 1000, revision: 1 });
  assert.equal(shards.files.length, 1);
  assert.match(shards.files[0].path, /^struct\/vid-c\.1000\.json$/);
  assert.deepEqual(shards.files[0].json.children.map((n) => n.name), ['Work']);
  const work = shards.files[0].json.children[0].children[0];
  assert.deepEqual(work.tags, ['node']);
  assert.equal(work.totalSize, 20);
  const bookmarks = mp.renameBookmarkShards([{
    path: 'struct/zip-browser.PC.vid-c.json', kind: 'shard', volumeKey: 'vid-c', json: { volumeId: 'vid-c' },
  }], 'PC');
  assert.equal(bookmarks[0].path, 'struct/zip-browser.PC.vid-c.bookmarks.json');
  const index = mp.buildHostIndex({
    host: 'PC', volumes: shards.volumes, scanShards: shards.files,
    bookmarkBases: [{ volumeKey: 'vid-c', base: bookmarks[0].base }],
    remoteShards: { 'vid-c': ['vid-c.900'] }, now: 1000,
  });
  assert.equal(index.path, 'struct/PC.json');
  assert.equal(index.json.version, 2);
  assert.deepEqual(index.json.mounts[0].files,
    ['vid-c.1000', 'vid-c.900', 'zip-browser.PC.vid-c.bookmarks'].sort());
});

test('zip writer produces a structurally valid store-only archive', async () => {
  const zip = await import('../web/zip-writer.js');
  const bytes = zip.makeZip([
    { name: 'struct/PC.json', content: '{"version":2}' },
    { name: 'file-list/vid/C/A/files.json', content: '{"files":[]}' },
  ]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50, 'local header signature');
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50, 'EOCD signature');
  assert.equal(view.getUint16(bytes.length - 12, true), 2, 'two entries');
  assert.equal(view.getUint16(8, true), 0, 'store method');
  assert.equal(zip.crc32(new TextEncoder().encode('{"version":2}')), view.getUint32(14, true));
});

test('zip central directory exposes per-entry CRC-32 without extracting content', async () => {
  const zip = await import('../web/zip-writer.js');
  const service = await import('../server/zip-service.js');
  const content = 'hello zip';
  const bytes = zip.makeZip([{ name: 'inner/hello.txt', content }]);
  const opened = await service.openZipTransient(bytes);
  try {
    assert.equal(opened.list.length, 1);
    assert.equal(opened.list[0].path, 'inner/hello.txt');
    assert.equal(opened.list[0].size, content.length);
    assert.equal(opened.list[0].crc32, zip.crc32(new TextEncoder().encode(content)).toString(16).padStart(8, '0'));
  } finally {
    await opened.reader.close();
  }
});

test('manifest scan optionally computes streamed file SHA-256 and marks hash failures separately', async () => {
  const scanner = await import('../server/manifest-scan.js');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zb-hash-'));
  const content = 'hash me';
  try {
    await fs.writeFile(path.join(dir, 'a.txt'), content);
    allowDirectory(dir);
    const plain = await scanner.scanPaths([{ path: dir, recursive: false }], { timeoutMs: 10000 });
    assert.equal(plain.files[dir][0].hash, undefined, '默认不计算 hash');
    const hashed = await scanner.scanPaths([{ path: dir, recursive: false }], { hash: true, timeoutMs: 10000 });
    assert.equal(hashed.files[dir][0].hash,
      `sha256:${createHash('sha256').update(content).digest('hex')}`);
    assert.equal(hashed.status[dir].hashPartial, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

/** 复用的同步组 harness：记录写入路径、目录与次数，并在结束时还原全局对象。 */
function syncHarness({ backends, hostInfo } = {}) {
  const written = new Map();
  const writes = [];
  const madeDirs = new Set();
  const fakeFs = {
    promises: {
      readFile: async (file) => {
        if (!written.has(file)) throw new Error('ENOENT');
        return JSON.stringify(written.get(file));
      },
      writeFile: async (file, text) => {
        written.set(file, JSON.parse(text));
        writes.push(file);
      },
      mkdir: async (file) => { madeDirs.add(file); },
      readdir: async () => [],
      unlink: async (file) => { written.delete(file); },
    },
  };
  const makeEl = () => ({
    dataset: {}, textContent: '', title: '',
    classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {}, setAttribute() {},
  });
  const elements = new Map();
  const elFor = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl());
    return elements.get(id);
  };
  const configurator = {
    ...makeEl(),
    getConnection: () => ({
      groupType: 'data-sync',
      dataGroup: {
        fs: fakeFs,
        listBackends: () => backends || [{ type: 'RemoteStorage', options: { basePath: 'app_data/folders/' } }],
        listDeclaredBackends: () => [],
      },
    }),
  };
  const store = new Map();
  const saved = {
    window: globalThis.window, document: globalThis.document,
    customElements: globalThis.customElements, localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.window = { __LOCAL_TOKEN__: 'harness-token' };
  globalThis.document = { getElementById: elFor, createElement: () => configurator };
  globalThis.customElements = { get: () => ({}) };
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => hostInfo || { host: 'PC', volumes: { C: 'vid-c' } } });
  return { written, writes, madeDirs, store, restore: () => Object.assign(globalThis, saved) };
}

test('syncScanNow writes scan shard, unified index and mirrored file-list, idempotently', async () => {
  const harness = syncHarness({ hostInfo: { host: 'HARNESS', volumes: { C: 'vid-x' } } });
  let sync;
  try {
    sync = await import('../web/manifest-sync.js?harness=scan');
    sync.initManifestSync({
      getSnapshot: () => ({ tags: {}, paths: {}, bookmarks: [] }),
      getFileSelection: () => ({ dirs: [], files: [] }),
    });
    sync.cancelScheduledSync();
    const scan = {
      roots: [{
        path: 'C:\\Work', name: 'Work', type: 'folder', tags: ['node'], children: [],
        fileCount: 1, totalSize: 5, totalSizeOnDisk: 4096, sizePartial: false, mtime: 123,
      }],
      summaries: {},
      files: { 'C:\\Work': [{ path: 'C:\\Work\\a.txt', name: 'a.txt', size: 5, sizeOnDisk: 4096, mtime: 123 }] },
      status: { 'C:\\Work': { incomplete: false, truncated: false, total: 1 } },
    };
    const selection = { dirs: [{ path: 'C:\\Work', recursive: true }], files: [] };
    const stats = await sync.syncScanNow(scan, { fileSelection: selection });
    assert.equal(stats.scanShardCount, 1);
    assert.equal(stats.fileListCount, 1);
    assert.ok(harness.written.has('/struct/HARNESS.json'));
    assert.ok([...harness.written.keys()].some((key) => /^\/struct\/vid-x\.\d+\.json$/.test(key)));
    assert.ok(harness.written.has('/file-list/vid-x/C/Work/files.json'));
    assert.ok(harness.madeDirs.has('/file-list/vid-x/C/Work'), 'mirror directories are created');
    const doc = harness.written.get('/file-list/vid-x/C/Work/files.json');
    assert.equal(doc.files[0].path, 'C:/Work/a.txt');
    assert.equal(doc.volumeId, 'vid-x');
    assert.equal(doc.source, 'HARNESS');
    const before = harness.writes.filter((p) => p === '/file-list/vid-x/C/Work/files.json').length;
    assert.equal(before, 1);
    await sync.syncScanNow(scan, { fileSelection: selection });
    assert.equal(harness.writes.filter((p) => p === '/file-list/vid-x/C/Work/files.json').length, 1,
      'unchanged file-list content must not be rewritten');
  } finally {
    sync?.cancelScheduledSync();
    harness.restore();
  }
});

test('mft scan APIs walk a temporary directory and report sizes/tags/mtime', async () => {
  const tmp = await fs.mkdtemp(path.join(ROOT, 'tests', 'mft-'));
  try {
    await fs.mkdir(path.join(tmp, 'sub'));
    await fs.writeFile(path.join(tmp, 'a.txt'), 'hello');
    await fs.writeFile(path.join(tmp, 'sub', 'b.txt'), 'world!');
    await fs.writeFile(path.join(tmp, 'package.json'), '{}');
    const headers = { 'X-Local-Token': TEST_TOKEN };
    // /api/list 会把该目录登记为「本次会话已浏览」，之后 mft 下钻才被允许。
    const listed = await fetch(`${BASE}/api/list?path=${encodeURIComponent(tmp)}`, { headers });
    assert.equal(listed.status, 200);
    const listData = await listed.json();
    assert.ok(listData.tags.includes('node'), 'auto tags come from direct child names');

    const treeRes = await fetch(`${BASE}/api/mft/tree?path=${encodeURIComponent(tmp)}`, { headers });
    assert.equal(treeRes.status, 200);
    const tree = await treeRes.json();
    assert.deepEqual(tree.children.map((item) => item.name), ['sub']);
    assert.ok(tree.tags.includes('node'));

    const scanRes = await fetch(`${BASE}/api/mft/scan`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [tmp], recursive: true }),
    });
    assert.equal(scanRes.status, 200);
    const scan = await scanRes.json();
    const key = Object.keys(scan.files)[0];
    assert.equal(scan.files[key].length, 3);
    assert.equal(scan.status[key].incomplete, false);
    assert.ok(scan.summaries[key].totalSize >= 13);
    assert.ok(scan.roots[0].tags.includes('node'));
    assert.equal(scan.files[key].every((file) => Number.isFinite(file.mtime)), true);

    const noToken = await fetch(`${BASE}/api/mft/tree?path=${encodeURIComponent(tmp)}`);
    assert.equal(noToken.status, 403);
    const outside = await fetch(`${BASE}/api/mft/scan`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: ['Z:\\not-browsed'] }),
    });
    assert.equal(outside.status, 403, 'unbrowsed roots are rejected');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('manifest builder UI, new modules and token-protected mft routes are served', async () => {
  const html = await (await fetch(BASE)).text();
  assert.match(html, /id="builderBtn"/);
  assert.match(html, /id="builderModal"/);
  assert.match(html, /data-builder-tab="files"/);
  assert.match(html, /id="copyRefModal"/);
  assert.match(html, /id="copyRefSave"/);
  assert.match(html, /清单生成/);
  for (const name of [
    'manifest-builder.js', 'manifest-selection.js', 'manifest-payload.js',
    'file-list-export.js', 'zip-writer.js', 'manifest-sync.js',
  ]) {
    const response = await fetch(`${BASE}/${name}`);
    assert.equal(response.status, 200, `${name} must be served`);
  }
  const app = await (await fetch(`${BASE}/app.js`)).text();
  assert.match(app, /data-action="cr-add"/);
  assert.match(app, /openCopyRefForItem/);
});

test('network copy refs reject unsafe values, dedupe paths and support CRUD', async () => {
  const sel = await import('../web/manifest-selection.js');
  assert.equal(sel.cleanCopyRef({ value: 'javascript:alert(1)' }), null);
  assert.equal(sel.cleanCopyRef({ value: 'data:text/plain,hi' }), null);
  assert.equal(sel.cleanCopyRef({ value: 'file:///C:/a.txt' }), null);
  assert.equal(sel.cleanCopyRef({ value: 'C:\\secret\\a.txt' }), null,
    'a local absolute path is not a network copy');
  assert.ok(sel.cleanCopyRef({ value: '\\\\nas\\share\\a.jpg' }), 'UNC paths are allowed');
  assert.equal(sel.cleanCopyRef({ value: 'https://example.com/a.jpg' }).kind, 'url');
  assert.equal(sel.cleanCopyRef({ value: 'app_data/drive/a.jpg' }).kind, 'path');

  let state = sel.emptyCopyRefs();
  state = sel.addCopyRef(state, 'C:\\Photos\\a.jpg', {
    id: 'r1', kind: 'url', value: 'https://example.com/a.jpg', label: '图床', addedAt: 1000,
  });
  state = sel.addCopyRef(state, 'c:/photos/a.jpg', {
    id: 'r2', kind: 'path', value: 'app_data/drive/a.jpg', addedAt: 1001,
  });
  assert.deepEqual(sel.copyRefTotals(state), { files: 1, refs: 2 },
    'Windows case-insensitive paths must map to one entry');
  assert.equal(Object.keys(state.refs)[0], 'C:/Photos/a.jpg');

  state = sel.updateCopyRef(state, 'C:\\Photos\\a.jpg', 'r1', { label: '新图床' });
  const first = sel.copyRefsFor(state, 'c:/PHOTOS/a.jpg')[0];
  assert.equal(first.label, '新图床');
  assert.equal(first.addedAt, 1000, 'editing keeps the original addedAt');
  assert.equal(sel.copyRefsByRel(state)['c:/photos/a.jpg'].length, 2);

  state = sel.removeCopyRef(state, 'C:\\Photos\\a.jpg', 'r1');
  assert.deepEqual(sel.copyRefTotals(state), { files: 1, refs: 1 });
  state = sel.removeCopyRef(state, 'C:\\Photos\\a.jpg', 'r2');
  assert.deepEqual(state.refs, {}, 'empty buckets are removed');

  const limited = sel.sanitizeCopyRefs({
    refs: {
      'C:\\A\\x': Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, value: `https://e/${i}` })),
    },
  });
  assert.equal(limited.refs['C:/A/x'].length, sel.MAX_REFS_PER_FILE);
  assert.equal(sel.sanitizeCopyRefs({ refs: { 'C:\\A\\x': [{ id: 'bad', value: 'javascript:x' }] } }).refs['C:/A/x'], undefined);
});

test('file-list docs merge network copy refs into files and idempotency signature', async () => {
  const fle = await import('../web/file-list-export.js');
  const sel = await import('../web/manifest-selection.js');
  let refs = sel.emptyCopyRefs();
  refs = sel.addCopyRef(refs, 'C:\\Work\\a.txt', {
    id: 'r1', kind: 'url', value: 'https://example.com/a.txt', label: '图床', addedAt: 1000,
  });
  const copiesByRel = sel.copyRefsByRel(refs);
  const scan = {
    files: { 'C:\\Work': [{ path: 'C:\\Work\\a.txt', name: 'a.txt', size: 5, mtime: 123 }] },
    status: { 'C:\\Work': { incomplete: false, truncated: false, total: 1 } },
  };
  const built = fle.buildFileListDocs({
    selection: { dirs: [{ path: 'C:\\Work', recursive: true }], files: [] },
    scan, host: 'PC', volumes: { C: 'vid-c' }, copiesByRel, now: 1000, revision: 1,
  });
  const doc = built.files[0].json;
  assert.equal(doc.files[0].copies[0].value, 'https://example.com/a.txt');
  assert.deepEqual(doc.copyRefs, { files: 1, refs: 1 });
  assert.equal(built.stats.copyRefs, 1);
  const changed = JSON.parse(JSON.stringify(doc));
  changed.files[0].copies[0].label = '另一个图床';
  assert.notEqual(fle.fileListSignature(doc), fle.fileListSignature(changed),
    'copy ref edits must invalidate the idempotency signature');

  const picked = fle.buildFileListDocs({
    selection: { dirs: [], files: [{ path: 'C:\\Work\\a.txt', name: 'a.txt', size: 5, mtime: 123 }] },
    scan: { files: {}, status: {} }, host: 'PC', volumes: { C: 'vid-c' },
    copiesByRel, now: 1000, revision: 1,
  });
  assert.equal(picked.files.find((f) => f.kind === 'file-list-picked').json.files[0].copies.length, 1,
    'picked files also carry their copy refs');

  const plain = fle.buildFileListDocs({
    selection: { dirs: [{ path: 'C:\\Work', recursive: true }], files: [] },
    scan, host: 'PC', volumes: { C: 'vid-c' }, now: 1000, revision: 1,
  }).files[0].json;
  assert.equal(plain.files[0].copies, undefined, 'no refs means no copies field');
  assert.deepEqual(plain.copyRefs, { files: 0, refs: 0 });
});

test('patchCopyRefs rewrites only generated file-list shards, zero-scan and idempotent', async () => {
  const harness = syncHarness({ hostInfo: { host: 'COPIES', volumes: { C: 'vid-c' } } });
  let sync;
  try {
    const sel = await import('../web/manifest-selection.js');
    let refs = sel.emptyCopyRefs();
    const selection = { dirs: [{ path: 'C:\\Work', recursive: true }], files: [] };
    sync = await import('../web/manifest-sync.js?harness=copyrefs');
    sync.initManifestSync({
      getSnapshot: () => ({ tags: {}, paths: {}, bookmarks: [] }),
      getFileSelection: () => selection,
      getCopyRefs: () => refs,
    });
    sync.cancelScheduledSync();
    const scan = {
      roots: [{
        path: 'C:\\Work', name: 'Work', type: 'folder', tags: [], children: [],
        fileCount: 1, totalSize: 5, totalSizeOnDisk: 4096, sizePartial: false, mtime: 123,
      }],
      summaries: {},
      files: { 'C:\\Work': [{ path: 'C:\\Work\\a.txt', name: 'a.txt', size: 5, mtime: 123 }] },
      status: { 'C:\\Work': { incomplete: false, truncated: false, total: 1 } },
    };
    await sync.syncScanNow(scan, { fileSelection: selection });
    const shard = '/file-list/vid-c/C/Work/files.json';
    assert.ok(harness.written.has(shard));
    const indexWrites = harness.writes.filter((p) => p === '/struct/COPIES.json').length;

    refs = sel.addCopyRef(refs, 'C:\\Work\\a.txt', {
      id: 'r1', kind: 'url', value: 'https://example.com/a.txt', label: '图床', addedAt: 1000,
    });
    const result = await sync.patchCopyRefs(refs);
    assert.equal(result.patched, 1);
    assert.equal(result.skipped, 0);
    const patched = harness.written.get(shard);
    assert.equal(patched.files[0].copies[0].value, 'https://example.com/a.txt');
    assert.deepEqual(patched.copyRefs, { files: 1, refs: 1 });
    assert.equal(harness.writes.filter((p) => p === '/struct/COPIES.json').length, indexWrites,
      'C channel must not rewrite the host index');
    assert.equal(harness.madeDirs.has('/file-list/vid-c/C/Work'), true);

    const before = harness.writes.length;
    await sync.patchCopyRefs(refs);
    assert.equal(harness.writes.length, before, 'unchanged refs produce zero writes');

    refs = sel.removeCopyRef(refs, 'C:\\Work\\a.txt', 'r1');
    await sync.patchCopyRefs(refs);
    assert.equal(harness.written.get(shard).files[0].copies, undefined,
      'removing the last ref removes the field');
    assert.deepEqual(harness.written.get(shard).copyRefs, { files: 0, refs: 0 });

    const shardWrites = harness.writes.filter((p) => p === shard).length;
    await sync.syncScanNow(scan, { fileSelection: selection });
    assert.equal(harness.writes.filter((p) => p === shard).length, shardWrites,
      'B channel output must agree byte-for-byte with C channel patching');
  } finally {
    sync?.cancelScheduledSync();
    harness.restore();
  }
});

test('copy-ref modal saves refs, rejects unsafe values and removes via panel delegation', async () => {
  const makeEl = () => ({
    dataset: {}, value: '', textContent: '', innerHTML: '', title: '',
    handlers: {},
    classList: {
      hidden: true,
      add(c) { if (c === 'hidden') this.hidden = true; },
      remove(c) { if (c === 'hidden') this.hidden = false; },
      toggle() {},
      contains(c) { return c === 'hidden' ? this.hidden : false; },
    },
    addEventListener(type, fn) { this.handlers[type] = fn; },
    appendChild() {}, setAttribute() {}, focus() {}, remove() {},
  });
  const ids = [
    'builderBtn', 'builderClose', 'builderModal', 'builderBody', 'builderScan',
    'builderCopy', 'builderDownload', 'builderUpload', 'builderStatus',
    'builderDirs', 'builderFiles', 'builderPreview', 'builderDiag',
    'copyRefTitle', 'copyRefPath', 'copyRefKind', 'copyRefValue', 'copyRefLabel',
    'copyRefNote', 'copyRefError', 'copyRefModal', 'copyRefSave', 'copyRefCancel', 'copyRefClose',
  ];
  const els = Object.fromEntries(ids.map((id) => [id, makeEl()]));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sel = await import('../web/manifest-selection.js');
  const state = {
    dirs: { v: 1, dirs: [], options: { recursive: true, includeSize: true, includeMtime: true } },
    files: { v: 1, dirs: [], files: [] },
    copies: sel.emptyCopyRefs(),
  };
  const store = {
    get: (which) => clone(state[which]),
    set: (which, value) => { state[which] = clone(value); return clone(value); },
  };
  const statuses = [];
  const saved = { window: globalThis.window, document: globalThis.document };
  globalThis.window = { __LOCAL_TOKEN__: 'ui-token' };
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  try {
    const ui = await import('../web/manifest-builder.js?harness=copyui');
    ui.initManifestBuilder({
      api: async () => ({}), store,
      getSnapshot: () => null,
      getCurrentDir: () => 'C:\\Work',
      status: (text) => statuses.push(text),
    });

    ui.openCopyRefForItem({ path: 'C:\\Work\\a.txt', name: 'a.txt' });
    assert.equal(els.copyRefModal.classList.hidden, false, 'file row opens the modal');
    assert.equal(els.copyRefPath.value, 'C:\\Work\\a.txt');
    els.copyRefValue.value = 'https://example.com/a.txt';
    els.copyRefLabel.value = '图床';
    els.copyRefKind.value = 'url';
    els.copyRefSave.handlers.click();
    assert.equal(sel.copyRefTotals(store.get('copies')).refs, 1, 'saving persists one ref');
    assert.equal(els.copyRefModal.classList.hidden, true, 'modal closes after save');
    const ref = sel.copyRefsFor(store.get('copies'), 'C:\\Work\\a.txt')[0];
    assert.equal(ref.value, 'https://example.com/a.txt');

    ui.openCopyRefForItem({ path: 'C:\\Work\\b.txt', name: 'b.txt' });
    els.copyRefValue.value = 'javascript:alert(1)';
    els.copyRefSave.handlers.click();
    assert.match(els.copyRefError.textContent, /javascript/);
    assert.equal(sel.copyRefTotals(store.get('copies')).refs, 1, 'unsafe value is not saved');
    els.copyRefCancel.handlers.click();

    const bodyClick = els.builderBody.handlers.click;
    assert.equal(typeof bodyClick, 'function', 'panel delegation is bound');
    const fakeEvent = {
      target: { closest: () => ({ dataset: { bt: 'cr-remove', path: 'C:/Work/a.txt', id: ref.id }, tagName: 'BUTTON' }) },
      preventDefault() {},
    };
    await bodyClick(fakeEvent);
    assert.deepEqual(store.get('copies').refs, {}, 'remove action clears the ref');
    assert.ok(statuses.some((text) => /引用已保存/.test(text)));
  } finally {
    Object.assign(globalThis, saved);
  }
});

test('explorer args and open-in-explorer enforce browsed paths', async () => {
  const { explorerArgs, openInExplorer } = await import('../server/explorer-service.js');
  const { allowDirectory } = await import('../server/fs-service.js');
  assert.deepEqual(explorerArgs('C:\\Work', true), ['C:\\Work']);
  assert.deepEqual(explorerArgs('C:\\Work\\a.txt', false), ['/select,C:\\Work\\a.txt']);

  const tmp = await fs.mkdtemp(path.join(ROOT, 'tests', 'explorer-'));
  try {
    const file = path.join(tmp, 'a.txt');
    await fs.writeFile(file, 'hello');
    allowDirectory(tmp); // 等价于用户先在页面里浏览过该目录
    const calls = [];
    const run = (args) => calls.push(args);
    const dir = await openInExplorer({ path: tmp }, { run });
    assert.equal(dir.kind, 'dir');
    assert.deepEqual(dir.args, [tmp]);
    const picked = await openInExplorer({ path: file }, { run });
    assert.equal(picked.kind, 'file');
    assert.deepEqual(picked.args, [`/select,${file}`]);
    assert.equal(calls.length, 2, 'injected runner avoids launching a real GUI process');

    await assert.rejects(
      () => openInExplorer({ path: 'Z:\\not-browsed\\x' }, { run }),
      (err) => err.status === 403,
    );
    await assert.rejects(
      () => openInExplorer({ path: 'zip:C:/a.zip#x.png' }, { run }),
      (err) => err.status === 400,
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('one-level vs recursive directory lists keep full subtree sizes', async () => {
  const tmp = await fs.mkdtemp(path.join(ROOT, 'tests', 'dl-'));
  try {
    await fs.mkdir(path.join(tmp, 'sub', 'deep'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'a.txt'), 'aaa');
    await fs.writeFile(path.join(tmp, 'sub', 'b.txt'), 'bbbb');
    await fs.writeFile(path.join(tmp, 'sub', 'deep', 'c.txt'), 'ccccc');
    const token = { 'X-Local-Token': TEST_TOKEN };
    const headers = { ...token, 'Content-Type': 'application/json' };
    const listed = await fetch(`${BASE}/api/list?path=${encodeURIComponent(tmp)}`, { headers: token });
    assert.equal(listed.status, 200, 'browsing registers the root for mft scans');
    const post = async (body) => (await fetch(`${BASE}/api/mft/scan`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })).json();

    const one = await post({ paths: [{ path: tmp, recursive: false, sizeFull: true }] });
    const rootOne = one.roots[0];
    assert.equal(rootOne.children.length, 1, 'one level emits only direct child folders');
    assert.equal(rootOne.children[0].children.length, 0, 'grandchildren are not emitted');
    assert.equal(rootOne.fileCount, 3, 'root size still covers the whole physical subtree');
    assert.equal(rootOne.totalSize, 12);
    assert.equal(rootOne.children[0].fileCount, 2, 'each child carries its own subtree size');
    assert.equal(Object.values(one.files)[0].length, 1, 'file-list for one level has direct files only');

    const all = await post({ paths: [{ path: tmp, recursive: true, sizeFull: true }] });
    assert.equal(all.roots[0].children[0].children.length, 1, 'recursive emits grandchildren');
    assert.equal(all.roots[0].totalSize, 12);
    assert.equal(Object.values(all.files)[0].length, 3);

    // 逐根 sizeFull=false：不下钻，体积只含本层（旧行为），不影响别的根。
    const shallow = await post({ paths: [{ path: tmp, recursive: false, sizeFull: false }] });
    assert.equal(shallow.roots[0].children.length, 0);
    assert.equal(shallow.roots[0].totalSize, 3);

    const legacy = await post({ paths: [tmp], recursive: false });
    assert.equal(legacy.roots[0].children.length, 0, 'plain string roots keep the old global behaviour');
    assert.equal(legacy.roots[0].totalSize, 3);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('directory-list button, explorer button and new modal are wired', async () => {
  const html = await (await fetch(BASE)).text();
  for (const id of ['dirListModal', 'dirListOne', 'dirListAll', 'dirListSave', 'dirListRefresh']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  const app = await (await fetch(`${BASE}/app.js`)).text();
  for (const text of ['+ 目录下文件', '+ 该文件', '+ 目录清单', '打开位置',
    'data-action="dl-add"', 'data-action="ex-open"', '/api/explorer/open']) {
    assert.ok(app.includes(text), `app.js must contain ${text}`);
  }
  assert.doesNotMatch(app, />\+ 列表</, 'old ambiguous button text is gone');
  const builder = await (await fetch(`${BASE}/manifest-builder.js`)).text();
  for (const text of ['openDirListForItem', 'scanRootEntries', 'sizeFull: true']) {
    assert.ok(builder.includes(text), `manifest-builder.js must contain ${text}`);
  }

  const noToken = await fetch(`${BASE}/api/explorer/open`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'C:\\Work' }),
  });
  assert.equal(noToken.status, 403);
  const unbrowsed = await fetch(`${BASE}/api/explorer/open`, {
    method: 'POST', headers: { 'X-Local-Token': TEST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'Z:\\not-browsed\\x' }),
  });
  assert.equal(unbrowsed.status, 403, 'unbrowsed paths are rejected before any process launch');
});

test('directory-list modal computes sizes and saves one-level/recursive selections', async () => {
  const makeEl = () => ({
    dataset: {}, value: '', textContent: '', innerHTML: '', title: '', checked: false,
    handlers: {},
    classList: {
      hidden: true,
      add(c) { if (c === 'hidden') this.hidden = true; },
      remove(c) { if (c === 'hidden') this.hidden = false; },
      toggle() {}, contains(c) { return c === 'hidden' ? this.hidden : false; },
    },
    addEventListener(type, fn) { this.handlers[type] = fn; },
    appendChild() {}, setAttribute() {}, focus() {}, remove() {},
  });
  const ids = [
    'builderBtn', 'builderClose', 'builderModal', 'builderBody', 'builderScan',
    'builderCopy', 'builderDownload', 'builderUpload', 'builderStatus',
    'builderDirs', 'builderFiles', 'builderPreview', 'builderDiag',
    'dirListModal', 'dirListClose', 'dirListCancel', 'dirListSave', 'dirListRefresh',
    'dirListPath', 'dirListOne', 'dirListAll', 'dirListSummary',
    'dirListChildren', 'dirListError',
  ];
  const els = Object.fromEntries(ids.map((id) => [id, makeEl()]));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sel = await import('../web/manifest-selection.js');
  const state = { dirs: sel.emptyDirSelection(), files: sel.emptyFileSelection(), copies: sel.emptyCopyRefs() };
  const store = {
    get: (which) => clone(state[which]),
    set: (which, value) => { state[which] = clone(value); return clone(value); },
  };
  const statuses = [];
  const saved = { window: globalThis.window, document: globalThis.document };
  globalThis.window = { __LOCAL_TOKEN__: 'ui-token' };
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  try {
    const ui = await import('../web/manifest-builder.js?harness=dirlistui');
    ui.initManifestBuilder({
      api: async () => ({
        roots: [{
          path: 'C:\\Work', name: 'Work', fileCount: 3, totalSize: 3072,
          totalSizeOnDisk: 4096, sizePartial: false,
          children: [{ name: 'sub', fileCount: 2, totalSize: 2048 }],
        }],
        summaries: {}, files: {}, status: {},
      }),
      store,
      getSnapshot: () => null,
      getCurrentDir: () => 'C:\\Work',
      status: (text) => statuses.push(text),
    });

    ui.openDirListForItem({ path: 'C:\\Work', name: 'Work' });
    assert.equal(els.dirListModal.classList.hidden, false);
    assert.equal(els.dirListPath.value, 'C:\\Work');
    assert.equal(els.dirListOne.checked, true, 'one level is the default');
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(els.dirListSummary.innerHTML, /3<\/strong> 个文件/);
    assert.match(els.dirListSummary.innerHTML, /3\.0 KB/);
    assert.match(els.dirListChildren.innerHTML, /sub/);

    els.dirListAll.checked = true;
    els.dirListSave.handlers.click();
    assert.equal(store.get('dirs').dirs.length, 1);
    assert.equal(store.get('dirs').dirs[0].recursive, true);
    assert.equal(els.dirListModal.classList.hidden, true);
    assert.ok(statuses.some((text) => /含所有子目录/.test(text)));

    ui.openDirListForItem({ path: 'c:\\WORK', name: 'Work' });
    assert.equal(els.dirListAll.checked, true, 'existing selection is restored case-insensitively');
    els.dirListAll.checked = false;
    els.dirListOne.checked = true;
    els.dirListSave.handlers.click();
    assert.equal(store.get('dirs').dirs.length, 1, 'updating does not duplicate');
    assert.equal(store.get('dirs').dirs[0].recursive, false);
    assert.ok(statuses.some((text) => /仅本层/.test(text)));
  } finally {
    Object.assign(globalThis, saved);
  }
});

// ── 加密归档标记 ──────────────────────────────────────────────────────────

test('archive encryption probe agrees with zip.js on the real sample archives', async () => {
  const flags = await import('../server/archive-flags.js');
  const zs = await import('../server/zip-service.js');
  flags.clearArchiveEncryptionCache();
  const expected = {
    'basic.zip': false,
    'images.zip': false,
    'chinese.zip': false,
    'zipcrypto.zip': true,
    'aes256.zip': true,
  };
  for (const [name, want] of Object.entries(expected)) {
    const abs = path.join(SAMPLES, name);
    const opened = await zs.openZipTransient(new Uint8Array(await fs.readFile(abs)));
    assert.equal(opened.encrypted, want, `zip.js reports ${name} as encrypted=${want}`);
    await opened.reader.close().catch(() => {});
    assert.equal(await flags.probeArchiveEncryption(abs), want, `${name} probe`);
    assert.equal(await flags.probeArchiveEncryption(abs), want, `${name} cached probe`);
  }
});

function centralEntry({ flags = 0, name = 'a.txt', extra = Buffer.alloc(0) } = {}) {
  const nameBuf = Buffer.from(name);
  const buf = Buffer.alloc(46 + nameBuf.length + extra.length);
  buf.writeUInt32LE(0x02014b50, 0);
  buf.writeUInt16LE(flags, 8);
  buf.writeUInt16LE(nameBuf.length, 28);
  buf.writeUInt16LE(extra.length, 30);
  buf.writeUInt16LE(0, 32);
  nameBuf.copy(buf, 46);
  extra.copy(buf, 46 + nameBuf.length);
  return buf;
}

test('detectZipEncryption reads GP flags, WinZip AES extra and rejects truncated CD', async () => {
  const { detectZipEncryption } = await import('../server/archive-flags.js');
  assert.equal(detectZipEncryption(centralEntry(), 1), false);
  assert.equal(detectZipEncryption(centralEntry({ flags: 0x1 }), 1), true, 'general purpose bit 0');
  const aesExtra = Buffer.concat([Buffer.from([0x01, 0x99, 0x07, 0x00]), Buffer.alloc(7)]);
  assert.equal(detectZipEncryption(centralEntry({ extra: aesExtra }), 1), true, 'AES extra 0x9901');
  assert.equal(
    detectZipEncryption(Buffer.concat([centralEntry(), centralEntry({ name: 'b.txt' })]), 2),
    false,
  );
  assert.equal(detectZipEncryption(centralEntry(), 3), 'unknown', 'declared entries not all present');
  assert.equal(detectZipEncryption(Buffer.from('not a central directory'), 1), 'unknown');
});

test('archive encryption probe covers 7z/rar headers and stays fail-closed elsewhere', async () => {
  const flags = await import('../server/archive-flags.js');
  const tmp = path.join(ROOT, 'tests', `.enc-probe-${process.pid}`);
  await fs.mkdir(tmp, { recursive: true });
  const write = async (name, bytes) => {
    const abs = path.join(tmp, name);
    await fs.writeFile(abs, bytes);
    return flags.probeArchiveEncryption(abs);
  };
  const seven = (body) => {
    const buf = Buffer.alloc(32 + body.length);
    Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]).copy(buf, 0);
    buf.writeBigUInt64LE(0n, 12); // next header offset
    buf.writeBigUInt64LE(BigInt(body.length), 20); // next header size
    body.copy(buf, 32);
    return buf;
  };
  const rar4 = (mainFlags = 0, fileFlags = 0) => {
    const buf = Buffer.alloc(64);
    Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]).copy(buf, 0);
    buf[9] = 0x73; // main header
    buf.writeUInt16LE(mainFlags, 10);
    buf.writeUInt16LE(13, 12);
    const at = 20; // 7-byte marker + 13-byte main header
    buf[at + 2] = 0x74; // file header
    buf.writeUInt16LE(fileFlags, at + 3);
    return buf;
  };
  const rar5 = (goodCrc) => {
    const headerData = Buffer.from([0x01, 0x00, 0x00]); // type=1, flags=0, extra=0
    const buf = Buffer.alloc(64);
    Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]).copy(buf, 0);
    buf.writeUInt32LE(goodCrc ? flags.crc32(headerData) : 0, 8);
    buf[12] = headerData.length;
    headerData.copy(buf, 13);
    return buf;
  };
  try {
    assert.equal(await write('enc-header.7z', seven(Buffer.from([0x17, 0, 0, 0, 0, 0, 0, 0]))), true,
      'kEncodedHeader means even the directory is encrypted');
    assert.equal(await write('aes-content.7z', seven(Buffer.from([0x01, 0x06, 0xf1, 0x07, 0x01, 0, 0, 0]))), true,
      'AES coder id in a readable header means encrypted content');
    assert.equal(await write('plain.7z', seven(Buffer.from([0x01, 0, 0, 0, 0, 0, 0, 0]))), false);
    assert.equal(await write('password.rar', rar4(0, 0x0004)), true, 'RAR4 LHD_PASSWORD');
    assert.equal(await write('hp.rar', rar4(0x0080, 0)), true, 'RAR4 -hp encrypted headers');
    assert.equal(await write('plain.rar', rar4()), false);
    assert.equal(await write('rar5-bad-crc.rar', rar5(false)), true, 'RAR5 broken header CRC = encrypted header');
    assert.equal(await write('rar5-ok-crc.rar', rar5(true)), 'unknown', 'RAR5 content encryption is not guessed');
    assert.equal(await write('archive.tar.gz', Buffer.from('no password in gz')), false);
    assert.equal(await write('notes.txt', Buffer.from('plain text')), 'unknown');
    assert.equal(await flags.probeArchiveEncryption(path.join(tmp, 'missing.zip')), 'unknown');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('/api/list exposes encrypted only on archive items', async () => {
  const res = await fetch(`${BASE}/api/list?path=${encodeURIComponent(SAMPLES)}`, {
    headers: { 'X-Local-Token': TEST_TOKEN },
  });
  assert.equal(res.status, 200);
  const { items } = await res.json();
  const byName = new Map(items.map((item) => [item.name, item]));
  assert.equal(byName.get('aes256.zip').encrypted, true);
  assert.equal(byName.get('zipcrypto.zip').encrypted, true);
  assert.equal(byName.get('basic.zip').encrypted, false);
  assert.equal(byName.get('images.zip').encrypted, false);
  assert.equal(byName.get('images').encrypted, undefined, 'directories carry no encryption flag');
});

test('encryption badge is wired into list rows, thumbnail cards and styles', async () => {
  const app = await (await fetch(`${BASE}/app.js`)).text();
  for (const text of ['encBadge(item)', 'encBadge(item, true)', 'tag tag-enc', 'enc-badge', "item.encrypted !== true"]) {
    assert.ok(app.includes(text), `app.js must contain ${text}`);
  }
  const css = await (await fetch(`${BASE}/style.css`)).text();
  for (const text of ['.tag-enc', '.enc-badge', 'position: relative; height: 120px']) {
    assert.ok(css.includes(text), `style.css must contain ${text}`);
  }
});

// ── 局域网访问 / 访问码 ──────────────────────────────────────────────────

test('access code is Basic Auth, fail-closed, and never injected into the page', async () => {
  const { basicAuthAccepted, isLoopbackRequest } = await import('../server/access.js');
  assert.equal(basicAuthAccepted(undefined, ''), true, 'no code configured = disabled');
  assert.equal(basicAuthAccepted(undefined, 'lan-secret'), false);
  assert.equal(basicAuthAccepted('Bearer anything', 'lan-secret'), false);
  assert.equal(basicAuthAccepted('Basic !!!', 'lan-secret'), false);
  const good = 'Basic ' + Buffer.from('zip:lan-secret').toString('base64');
  assert.equal(basicAuthAccepted(good, 'lan-secret'), true);
  assert.equal(basicAuthAccepted(good, 'other'), false);
  assert.equal(basicAuthAccepted('Basic ' + Buffer.from('zip:lan-secret-more').toString('base64'), 'lan-secret'), false);
  assert.equal(isLoopbackRequest({ socket: { remoteAddress: '127.0.0.1' } }), true);
  assert.equal(isLoopbackRequest({ socket: { remoteAddress: '::ffff:127.0.0.1' } }), true);
  assert.equal(isLoopbackRequest({ socket: { remoteAddress: '192.168.1.9' } }), false);
});

test('default server stays loopback-only and exposes the bind hint', async () => {
  const cfg = await import('../server/config.js');
  assert.equal(cfg.HOST, process.env.ZIP_BROWSER_HOST || '127.0.0.1');
  assert.equal(cfg.ACCESS_CODE, process.env.ZIP_BROWSER_ACCESS_CODE || '');
  const page = await fetch(BASE);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="bindHint">仅监听 127\.0\.0\.1/);
  assert.doesNotMatch(html, /未启用访问码/);
  const health = await fetch(`${BASE}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  // 环境变量确实能改监听地址（不真的绑定 0.0.0.0，避免影响运行测试的机器）。
  const out = execFileSync(process.execPath, ['--input-type=module', '-e',
    "const c = await import('./server/config.js'); console.log(c.HOST + '|' + c.ACCESS_CODE);"], {
    cwd: ROOT,
    env: { ...process.env, ZIP_BROWSER_HOST: '0.0.0.0', ZIP_BROWSER_ACCESS_CODE: 'env-code' },
    encoding: 'utf8',
  }).trim();
  assert.equal(out, '0.0.0.0|env-code');
});

test('LAN mode gates every route behind the access code', async () => {
  const LAN_PORT = 4189;
  const LAN_BASE = `http://127.0.0.1:${LAN_PORT}`;
  const LAN_STATE = path.join(ROOT, 'tests', '.version-state.lan.json');
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(LAN_PORT),
      ZIP_BROWSER_HOST: '127.0.0.1',
      ZIP_BROWSER_TOKEN: TEST_TOKEN,
      ZIP_BROWSER_ACCESS_CODE: 'lan-secret',
      ZIP_BROWSER_VERSION_STATE: LAN_STATE,
    },
    stdio: 'ignore',
  });
  const waitReady = async () => {
    const start = Date.now();
    while (Date.now() - start < 12000) {
      try {
        const response = await fetch(`${LAN_BASE}/health`);
        if (response.ok) return true;
      } catch {
        // still starting
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return false;
  };
  try {
    assert.equal(await waitReady(), true, 'LAN-mode server started');
    const anonPage = await fetch(`${LAN_BASE}/`);
    assert.equal(anonPage.status, 401);
    assert.match(anonPage.headers.get('www-authenticate') || '', /Basic realm="ZipBrowser LAN"/);
    const denied = await anonPage.text();
    assert.ok(!denied.includes(TEST_TOKEN), '401 response never leaks the local token');
    assert.ok(!denied.includes('__ZIP_BROWSER_TOKEN__'));
    for (const url of ['/version.json', '/app.js', '/style.css',
      '/thumb/fs/C/x.png', '/fs/C/x.txt', '/api/list?path=C%3A%5C']) {
      const response = await fetch(`${LAN_BASE}${url}`);
      assert.equal(response.status, 401, `${url} must require the access code`);
    }
    const auth = (extra = {}) => ({
      Authorization: 'Basic ' + Buffer.from('zip:lan-secret').toString('base64'),
      ...extra,
    });
    const wrong = await fetch(`${LAN_BASE}/`, {
      headers: { Authorization: 'Basic ' + Buffer.from('zip:nope').toString('base64') },
    });
    assert.equal(wrong.status, 401);
    const page = await fetch(`${LAN_BASE}/`, { headers: auth() });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`window.__LOCAL_TOKEN__ = "${TEST_TOKEN}"`), 'token is only served after auth');
    assert.match(html, /id="bindHint">仅监听 127\.0\.0\.1 · 已启用访问码/);
    assert.ok(!html.includes('lan-secret'), 'access code is never written into the page');
    const noToken = await fetch(`${LAN_BASE}/api/list?path=C%3A%5C`, { headers: auth() });
    assert.equal(noToken.status, 403, 'access code does not replace the API token');
    const okApi = await fetch(`${LAN_BASE}/api/list?path=${encodeURIComponent(SAMPLES)}`, {
      headers: auth({ 'X-Local-Token': TEST_TOKEN }),
    });
    assert.equal(okApi.status, 200);
    const health = await fetch(`${LAN_BASE}/health`);
    assert.equal(health.status, 200, 'local health probe is exempt from auth');
  } finally {
    child.kill();
    await fs.rm(LAN_STATE, { force: true });
  }
});

test('launch/stop scripts work with a non-loopback bind and probe /health', async () => {
  const start = await fs.readFile(path.join(ROOT, 'start.bat'), 'utf8');
  const stop = await fs.readFile(path.join(ROOT, 'stop.bat'), 'utf8');
  assert.match(start, /set "PROBE=http:\/\/127\.0\.0\.1:%PORT%\/health"/);
  assert.ok(start.includes('ZIP_BROWSER_HOST'), 'LAN switch is documented in start.bat');
  assert.ok(start.includes('ZIP_BROWSER_ACCESS_CODE'));
  assert.ok(!start.includes('__LOCAL_TOKEN__'), 'probe no longer depends on the injected token');
  assert.ok(!start.includes('0.0.0.0:%PORT%/'), 'browser URL is back to loopback');
  assert.match(stop, /0\.0\.0\.0:%PORT%/);
  // 与 start.bat 里同一条 node -e 探活命令，确认真能跑通。
  execFileSync(process.execPath, ['-e',
    `require('http').get('${BASE}/health',r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>process.exit(r.statusCode===200&&s.includes('ok')?0:1))}).on('error',()=>process.exit(1))`],
    { stdio: 'ignore' });
});

test('mobile layout: responsive CSS, menu/drawer markup and touch zoom', async () => {
  const css = await fs.readFile(path.join(ROOT, 'web', 'style.css'), 'utf8');
  const html = await fs.readFile(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const app = await fs.readFile(path.join(ROOT, 'web', 'app.js'), 'utf8');
  const viewer = await fs.readFile(path.join(ROOT, 'web', 'image-viewer.js'), 'utf8');

  assert.match(css, /@media \(max-width: 720px\)/);
  assert.ok(css.includes('.more-btn, .side-toggle, .side-backdrop { display: none; }'),
    'new mobile-only controls must stay hidden on desktop');
  for (const text of [
    '.top-actions.open { display: flex; }',
    '.sidebar.open { transform: translateX(0); }',
    '.file-table thead { display: none; }',
    '.ex-open, .thumb-card .ex-open, .folder-chip .ex-open { display: none; }',
    'font-size: 16px',
    'env(safe-area-inset-bottom)',
    '@media (hover: none)',
  ]) {
    assert.ok(css.includes(text), `style.css must contain ${text}`);
  }

  for (const id of ['moreBtn', 'topActions', 'sideToggle', 'sideBackdrop']) {
    assert.ok(html.includes(`id="${id}"`), `index.html must contain #${id}`);
  }
  assert.ok(html.includes('class="status-desc"'));
  for (const text of ['initMobileChrome', 'closeMobileChrome()', "target.closest('#topActions')"]) {
    assert.ok(app.includes(text), `app.js must contain ${text}`);
  }

  // 图片查看器：双指缩放 + 触摸设备提示文案，桌面滚轮/双击路径保留。
  assert.ok(viewer.includes('pinch') && viewer.includes('pointerCount'));
  assert.ok(viewer.includes('(hover: none) and (pointer: coarse)'));
  assert.ok(viewer.includes('wheel') && viewer.includes('dblclick'));
  const page = renderImageViewer({ name: 'a.png', src: '/fs/x.png?raw=1' });
  assert.match(page, /@media \(max-width:720px\)/);
  assert.ok(page.includes('touch-action:none'));
  assert.ok(page.includes('name="viewport"'));
});

test('mobile row actions collapse into a single button with an option sheet', async () => {
  const css = await fs.readFile(path.join(ROOT, 'web', 'style.css'), 'utf8');
  const html = await fs.readFile(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const app = await fs.readFile(path.join(ROOT, 'web', 'app.js'), 'utf8');

  // 桌面端「⋯」必须隐藏，行内按钮全部保留。
  assert.ok(css.includes('.row-menu-btn { display: none; }'), 'the ⋯ button is desktop-hidden');
  assert.ok(!/\.file-name > button:not\(\.row-menu-btn\)[\s\S]*?\{[^}]*display: none/.test(
    css.split('@media (max-width: 720px)')[0]), 'no mobile hiding rule leaks into desktop CSS');
  const mobileCss = css.split('@media (max-width: 720px)')[1] || '';
  for (const text of [
    '.file-name > button:not(.row-menu-btn)',
    '.thumb-card > button:not(.row-menu-btn)',
    '.folder-chip > button:not(.row-menu-btn)',
    '.file-table td.trash-col-action',
    '.trash-card-controls',
    '.row-menu-btn { display: inline-flex',
    '#rowMenuModal .modal-card',
    'min-height: 46px',
  ]) {
    assert.ok(mobileCss.includes(text), `mobile CSS must contain ${text}`);
  }

  for (const id of ['rowMenuModal', 'rowMenuTitle', 'rowMenuSub', 'rowMenuList', 'rowMenuClose']) {
    assert.ok(html.includes(`id="${id}"`), `index.html must contain #${id}`);
  }

  for (const text of [
    'function rowMenuButton(', 'function openRowMenu(', 'function closeRowMenu(',
    'function initRowMenu(', 'data-action="row-menu"', "action === 'row-menu'",
    "action === 'row-menu-select'", 'cloneNode(true)',
    "source.classList.contains('ex-open')", 'closeRowMenu()',
    '删除到回收站', '选中以批量删除',
  ]) {
    assert.ok(app.includes(text), `app.js must contain ${text}`);
  }
  // 列表行、图片卡片、压缩包卡片、目录 chip 都要挂上「⋯」。
  const calls = app.match(/\$\{rowMenuButton\(/g) || [];
  assert.equal(calls.length, 4, 'all four item renderers must include the ⋯ button');
  assert.ok(app.includes('${rowMenuButton({ ...item, dir: true })}'), 'folder chips pass dir=true');
});

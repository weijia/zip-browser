import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
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

const { normalizeLocalPath, localPathToUrl, fsUrlToLocalPath } = await import('../server/fs-service.js');
const { normalizeEntryPath, openZip, unlockZip, readEntry, listZipEntries, closeZip } = await import('../server/zip-service.js');
const { renderMarkdown } = await import('../server/markdown.js');
const { renderImageViewer } = await import('../server/image-viewer.js');
const { isStaticAllowed } = await import('../server/mime.js');
const {
  encodeLocation, decodeLocation, compactTarget,
  localTargetFromCompact, winDirname, winBasename,
} = await import('../web/location.js');
const ann = await import('../web/annotations-store.js');

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

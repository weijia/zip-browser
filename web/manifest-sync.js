// struct 目录清单 + file-list 文件列表 → zen-fs-config「app-data 数据组」的单向导出。
//
// 三通道（定稿）：
//   A 收藏增量（300ms 防抖）：只重建书签固定分片、file-tags 与统一主机索引，不扫盘、不碰 scan 分片。
//   B 手动「重新扫描并生成」：物理扫描 → 新增时间戳 scan 分片 + 全量重建 file-list 分片 + 统一索引。
//   C 网络副本引用变更：读远端已生成的 file-list 片，只 patch files[].copies，零扫盘。
// 主机索引只有一份 struct/<host>.json，mounts[].files 列全远端历史分片与本次分片。
// 同步组由 <sync-group-configurator> 配置；只有含远端后端的组才允许导出。

import {
  buildV2Export, manifestPrefixFor, hostRelativePath, sanitizeKey,
} from './manifest-export.js';
import {
  buildScanShards, buildHostIndex, renameBookmarkShards, collectRemoteShards,
  bookmarkShardBase,
} from './manifest-payload.js';
import {
  buildFileListDocs, fileListSignature, removedDoc, applyCopyRefs,
} from './file-list-export.js';
import { copyRefsByRel, copyRefTotals } from './manifest-selection.js';

// 与 dir-struct-gen 共用同步组命名空间，两个生成器写同一个远端数据组。
const APP_ID = 'dir-struct-gen';

function apiUrlOf(url) {
  return typeof window !== 'undefined' && window.ZB ? window.ZB.url(url) : String(url || '');
}

function authHeaders() {
  if (typeof window !== 'undefined' && window.ZB_HOST?.auth === 'bearer') {
    const token = localStorage.getItem('zb-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return { 'X-Local-Token': window.__LOCAL_TOKEN__ };
}
const REV_KEY = 'zip-browser:manifest-revision';
const KNOWN_KEY = 'zip-browser:manifest-volumes';
const LAST_KEY = 'zip-browser:manifest-last';
const SCAN_BASES_KEY = 'zip-browser:scan-shard-bases';
const FILE_LIST_PATHS_KEY = 'zip-browser:file-list-paths';

const $ = (id) => document.getElementById(id);

let appFs = null;
let prefix = null;
let blockReason = '尚未连接同步组';
let getSnapshot = () => null;
let getFileSelection = () => null;
let getCopyRefs = () => null;
let onStatus = null;
let configurator = null;
let timer = null;
let running = false;
let queued = false;

function readRaw(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeRaw(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 隐私模式忽略 */ }
}
function readJson(key, fallback) {
  try { return JSON.parse(readRaw(key) || 'null') ?? fallback; } catch { return fallback; }
}

function pathFor(rel) {
  return prefix ? `/${prefix}/${rel}` : `/${rel}`;
}
function dirname(rel) {
  const parts = String(rel).split('/');
  parts.pop();
  return parts.join('/');
}

function report(text, ok = null, detail = '') {
  const el = $('syncStatus');
  if (el) {
    el.textContent = detail ? `${text} · ${detail}` : text;
    el.dataset.state = ok === true ? 'ok' : ok === false ? 'bad' : 'idle';
  }
  const btn = $('syncBtn');
  if (btn) btn.title = text;
  if (onStatus) onStatus({ text, ok, detail });
}

function remoteBackends(group) {
  const connected = typeof group?.listBackends === 'function' ? (group.listBackends() || []) : [];
  const declared = typeof group?.listDeclaredBackends === 'function' ? (group.listDeclaredBackends() || []) : [];
  return { connected, declared };
}

async function applyConnection(detail) {
  const conn = detail || (configurator && typeof configurator.getConnection === 'function'
    ? configurator.getConnection() : null);
  if (!conn) {
    appFs = null; prefix = null;
    blockReason = '尚未连接同步组';
    report(blockReason);
    return;
  }
  let group = null;
  if (conn.dataGroup?.fs) group = conn.dataGroup;
  if (!group && conn.repo && typeof conn.repo.listAppDataGroups === 'function') {
    const list = await conn.repo.listAppDataGroups().catch(() => []) || [];
    for (const entry of list) {
      const id = typeof entry === 'string' ? entry : entry?.id;
      if (!id || typeof conn.repo.getAppDataGroup !== 'function') continue;
      const candidate = await conn.repo.getAppDataGroup(id).catch(() => null);
      if (!candidate?.fs) continue;
      group = candidate;
      if (remoteBackends(candidate).connected.length) break;
    }
  }
  if (!group?.fs) {
    appFs = null; prefix = null;
    blockReason = '未找到 app-data 数据同步组，请在下方配置并连接一个含远端后端的组';
    report(blockReason, false);
    return;
  }
  const { connected, declared } = remoteBackends(group);
  const plan = manifestPrefixFor(connected.length ? connected : declared);
  if (!plan.ok) {
    appFs = null; prefix = null;
    blockReason = plan.reason;
    report(`清单导出不可用：${plan.reason}`, false);
    return;
  }
  appFs = group.fs;
  prefix = plan.prefix;
  blockReason = '';
  const where = prefix
    ? `/${prefix}/struct/…、/${prefix}/file-list/…`
    : '/struct/…、/file-list/…';
  report(`已就绪：${plan.types.join(' / ')} · 写入 ${where}`, true);
  scheduleSync(0);
}

function tagsByRelFrom(data) {
  const out = {};
  for (const [key, list] of Object.entries(data?.tags || {})) {
    const desc = data?.paths?.[key];
    if (!desc?.path || !Array.isArray(list)) continue;
    const rel = hostRelativePath(desc.path);
    if (rel) out[rel] = list;
  }
  return out;
}

function mergeVolumeDescriptors(bookmarkVolumes, scanVolumes, remoteShards) {
  const map = new Map();
  for (const item of [...(bookmarkVolumes || []), ...(scanVolumes || [])]) {
    const key = item.key || item.volumeId;
    if (!key) continue;
    const prev = map.get(key) || { key, drive: '', volumeId: null, letter: '' };
    map.set(key, {
      key,
      drive: item.drive || prev.drive,
      letter: item.letter || item.drive || prev.letter,
      volumeId: item.volumeId || prev.volumeId || key,
    });
  }
  for (const key of Object.keys(remoteShards || {})) {
    if (key && !map.has(key)) map.set(key, { key, drive: '', letter: '', volumeId: key });
  }
  return [...map.values()];
}

/**
 * 组装一次完整导出（纯函数，不写远端、不碰 DOM 状态）。
 * scan 为 null 时只做收藏增量：不生成 scan 分片与 file-list 分片。
 */
export function composeExport({
  scan = null, hostInfo = {}, snapshot = null, fileSelection = null,
  copyRefs = null, remoteNames = [], existing = {}, knownVolumes = [], cachedScanBases = [],
  now = Date.now(), revision = 1,
} = {}) {
  const host = hostInfo.host || 'pc';
  const volumes = hostInfo.volumes || {};
  const data = snapshot || { tags: {}, paths: {}, bookmarks: [] };
  const bookmark = buildV2Export({
    data, host, volumes, now, revision, existing, knownVolumes,
  });
  const bookmarkShards = renameBookmarkShards(
    bookmark.files.filter((file) => file.kind === 'shard'), host, volumes,
  );
  const tagFiles = bookmark.files.filter((file) => file.kind === 'tags').map((file) => ({ ...file }));
  const bookmarkBases = bookmarkShards.map((file) => ({ volumeKey: file.volumeKey, base: file.base }));
  // 没有书签的卷也要有固定分片基名，保证主机索引能挂上 bookmarks 通道。
  for (const volume of bookmark.knownVolumes || []) {
    if (!volume.key || bookmarkBases.some((item) => item.volumeKey === volume.key)) continue;
    bookmarkBases.push({ volumeKey: volume.key, base: bookmarkShardBase(host, volume.key) });
  }

  const scanned = scan
    ? buildScanShards({ scan, host, volumes, now, revision })
    : { files: [], volumes: [] };
  const scanShards = scanned.files.map((file) => ({ ...file }));

  const fileList = scan && fileSelection
    ? buildFileListDocs({
      selection: fileSelection, scan, host, volumes,
      tagsByRel: tagsByRelFrom(data), copiesByRel: copyRefsByRel(copyRefs), now, revision,
    })
    : { files: [], stats: {} };

  // 远端可能留有 dir-struct-gen 为「本机没有的卷」生成的历史分片，
  // 也要作为卷列进 descriptors，否则它们不会被写回 mounts.files 而变成孤儿。
  const remoteVolumeKeys = Object.fromEntries(
    [...new Set((remoteNames || [])
      .map((name) => /^(.+)\.\d{10,}\.json$/i.exec(String(name))?.[1])
      .filter(Boolean))].map((key) => [key, true]),
  );
  const descriptors = mergeVolumeDescriptors(bookmark.knownVolumes, scanned.volumes, remoteVolumeKeys);
  const remoteShards = collectRemoteShards(remoteNames, [
    ...descriptors,
    ...cachedScanBases.map((item) => ({ key: item.volumeKey })),
  ]);
  for (const item of cachedScanBases) {
    const list = remoteShards[item.volumeKey] || (remoteShards[item.volumeKey] = []);
    if (!list.includes(item.base)) list.push(item.base);
  }
  const hostIndex = buildHostIndex({
    host, volumes: descriptors, remoteShards, scanShards, bookmarkBases, now,
  });

  const files = [
    hostIndex,
    ...scanShards,
    ...bookmarkShards,
    ...tagFiles,
    ...fileList.files.map((file) => ({ ...file })),
  ];
  return {
    files,
    stats: {
      host: sanitizeKey(host),
      hostIndex: hostIndex.path,
      scanShardCount: scanShards.length,
      bookmarkShardCount: bookmarkShards.length,
      tagFileCount: tagFiles.length,
      fileListCount: fileList.files.length,
      fileListStats: fileList.stats,
      revision,
    },
    knownVolumes: bookmark.knownVolumes,
    bookmarkBases,
    scanShards,
    fileListPaths: fileList.files.map((file) => file.path),
  };
}

async function listRemoteStruct(fp) {
  try {
    const names = await fp.readdir(pathFor('struct'));
    return Array.isArray(names) ? names.map(String) : [];
  } catch {
    return [];
  }
}

async function readExistingTags(fp, files) {
  const existing = {};
  await Promise.all(files.filter((file) => file.kind === 'tags').map(async (file) => {
    try {
      existing[file.path] = JSON.parse(await fp.readFile(pathFor(file.path), 'utf8'));
    } catch {
      existing[file.path] = null;
    }
  }));
  return existing;
}

/** 取消选择 / 目录改名后留下的 file-list 片：优先删，删不掉就写 removed 空片。 */
async function pruneFileListOrphans(fp, currentPaths, host, now) {
  const previous = readJson(FILE_LIST_PATHS_KEY, []);
  const current = new Set(currentPaths);
  const stale = (Array.isArray(previous) ? previous : []).filter((path) => !current.has(path));
  let removed = 0;
  for (const path of stale) {
    try {
      if (typeof fp.unlink === 'function') await fp.unlink(pathFor(path));
      else throw new Error('unlink unsupported');
    } catch {
      try {
        await fp.writeFile(pathFor(path), `${JSON.stringify(removedDoc('', host, now), null, 2)}\n`);
      } catch { /* 远端不可写：保留孤儿，由诊断面板提示 */ }
    }
    removed += 1;
  }
  if (currentPaths.length) writeRaw(FILE_LIST_PATHS_KEY, JSON.stringify([...current]));
  else writeRaw(FILE_LIST_PATHS_KEY, '[]');
  return removed;
}

async function writeExport(fp, composed, host, now) {
  const dirs = new Set();
  for (const file of composed.files) {
    const dir = dirname(file.path);
    if (dir) dirs.add(dir);
  }
  for (const dir of dirs) {
    try { await fp.mkdir(pathFor(dir), { recursive: true }); } catch { /* 隐式目录 / EEXIST */ }
  }
  let written = 0;
  for (const file of composed.files) {
    if (file.kind === 'file-list' || file.kind === 'file-list-picked') {
      const signature = fileListSignature(file.json);
      try {
        const previous = JSON.parse(await fp.readFile(pathFor(file.path), 'utf8'));
        if (fileListSignature(previous) === signature) continue; // 幂等：内容未变零写入
      } catch { /* 不存在或不可读：直接写 */ }
    }
    await fp.writeFile(pathFor(file.path), `${JSON.stringify(file.json, null, 2)}\n`);
    written += 1;
  }
  const removed = composed.fileListPaths.length
    ? await pruneFileListOrphans(fp, composed.fileListPaths, host, now)
    : 0;
  return { written, removed };
}

async function commonContext() {
  const fp = appFs?.promises || appFs;
  if (!fp || prefix === null) throw new Error(blockReason || '同步组未就绪');
  const response = await fetch(apiUrlOf('/api/hostinfo'), {
    headers: authHeaders(),
    credentials: typeof window !== 'undefined' && window.ZB_HOST?.auth === 'bearer' ? 'same-origin' : undefined,
  });
  if (!response.ok) throw new Error(`读取本机信息失败：HTTP ${response.status}`);
  return { fp, hostInfo: await response.json() };
}

/**
 * 导出一次：withScan 传物理扫描结果时走 B 通道（扫描分片 + file-list），
 * 否则走 A 通道（仅收藏增量）。两阶段：先读远端 file-tags 做并集合并，再组装写入。
 */
export async function syncNow(withScan = null, { fileSelection = null, copyRefs = null } = {}) {
  const { fp, hostInfo } = await commonContext();
  const now = Date.now();
  const revision = (Number(readRaw(REV_KEY)) || 0) + 1;
  const knownVolumes = readJson(KNOWN_KEY, []);
  const cachedScanBases = readJson(SCAN_BASES_KEY, []);
  const remoteNames = await listRemoteStruct(fp);
  const args = {
    scan: withScan, hostInfo, snapshot: getSnapshot(), fileSelection,
    copyRefs: copyRefs === null ? getCopyRefs() : copyRefs,
    knownVolumes, cachedScanBases, remoteNames, now, revision,
  };
  const probe = composeExport(args);
  const existing = await readExistingTags(fp, probe.files);
  const composed = composeExport({ ...args, existing });

  const { written, removed } = await writeExport(fp, composed, hostInfo.host || 'pc', now);
  writeRaw(REV_KEY, String(revision));
  writeRaw(KNOWN_KEY, JSON.stringify(composed.knownVolumes));
  writeRaw(LAST_KEY, JSON.stringify({ at: now, ...composed.stats, written, removed }));
  if (composed.scanShards.length) {
    const bases = [...cachedScanBases, ...composed.scanShards.map((file) => ({
      volumeKey: file.volumeKey, base: file.base,
    }))];
    writeRaw(SCAN_BASES_KEY, JSON.stringify(bases.slice(-200)));
  }
  return { ...composed.stats, written, removed };
}

/** 手动「重新扫描并生成」后的上传入口。 */
export function syncScanNow(scanResult, options = {}) {
  return syncNow(scanResult, options);
}

/**
 * C 通道：网络副本引用变更后，只 patch 已生成的 file-list 片。
 * 不扫盘、不重建 struct/、不写索引；片不存在或不可读时跳过，等下次 B 通道生成时合并。
 * 未连接同步组时静默返回原因，本地引用仍然保存在 zen-fs-config 中。
 */
export async function patchCopyRefs(copyRefs = getCopyRefs()) {
  if (!appFs || prefix === null) {
    return { patched: 0, skipped: 0, reason: blockReason || '同步组未就绪' };
  }
  const fp = appFs.promises || appFs;
  const byRel = copyRefsByRel(copyRefs);
  const paths = readJson(FILE_LIST_PATHS_KEY, []);
  let patched = 0;
  let skipped = 0;
  for (const relPath of (Array.isArray(paths) ? paths : [])) {
    let doc;
    try {
      doc = JSON.parse(await fp.readFile(pathFor(relPath), 'utf8'));
    } catch {
      skipped += 1;
      continue;
    }
    if (!doc || !Array.isArray(doc.files) || doc.removed) { skipped += 1; continue; }
    const before = JSON.stringify(doc);
    applyCopyRefs(doc, byRel);
    if (JSON.stringify(doc) === before) continue; // 引用未变，零写入
    try {
      await fp.writeFile(pathFor(relPath), `${JSON.stringify(doc, null, 2)}\n`);
      patched += 1;
    } catch {
      skipped += 1;
    }
  }
  return { patched, skipped, reason: '' };
}

async function runSync(manual) {
  if (running) { queued = manual || queued; return; }
  running = true;
  try {
    if (prefix === null) {
      if (manual) report(`清单导出不可用：${blockReason}`, false);
      return;
    }
    if (manual) report('正在导出 v2 清单…');
    const stats = await syncNow(null, {
      fileSelection: getFileSelection(), copyRefs: getCopyRefs(),
    });
    const detail = `${stats.bookmarkShardCount} 书签分片 · ${stats.scanShardCount} 扫描分片 · ${stats.tagFileCount} 标签文件 · r${stats.revision}`;
    report(`已导出 v2 清单（${new Date().toLocaleTimeString()}）`, true, detail);
  } catch (err) {
    report(`导出失败：${err?.message || err}`, false);
  } finally {
    running = false;
    if (queued) { queued = false; scheduleSync(0); }
  }
}

export function scheduleSync(delay = 300) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void runSync(false); }, delay);
}

export function cancelScheduledSync() {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function openSyncModal() {
  const modal = $('syncModal');
  if (modal) modal.classList.remove('hidden');
}

export function syncState() {
  return { ready: Boolean(appFs) && prefix !== null, reason: blockReason, prefix };
}

/** 供诊断面板列出本工具缓存的扫描分片与 file-list 片。 */
export function syncDiagnostics() {
  return {
    appId: APP_ID,
    revision: Number(readRaw(REV_KEY)) || 0,
    last: readJson(LAST_KEY, null),
    scanBases: readJson(SCAN_BASES_KEY, []),
    fileListPaths: readJson(FILE_LIST_PATHS_KEY, []),
    knownVolumes: readJson(KNOWN_KEY, []),
    copyRefs: copyRefTotals(getCopyRefs()),
    state: syncState(),
  };
}

export function initManifestSync(options = {}) {
  getSnapshot = options.getSnapshot || getSnapshot;
  getFileSelection = options.getFileSelection || getFileSelection;
  getCopyRefs = options.getCopyRefs || getCopyRefs;
  onStatus = options.onStatus || null;

  $('syncBtn')?.addEventListener('click', openSyncModal);
  $('syncClose')?.addEventListener('click', () => $('syncModal')?.classList.add('hidden'));
  $('syncModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'syncModal') $('syncModal').classList.add('hidden');
  });
  $('syncNowBtn')?.addEventListener('click', () => void runSync(true));

  const host = $('syncHost');
  if (!host) return { ok: false, reason: '未找到同步组容器' };
  if (typeof customElements === 'undefined' || !customElements.get('sync-group-configurator')) {
    report('同步组组件未加载（vendor/zen-fs-config-ui.js 缺失）', false);
    return { ok: false, reason: '组件未加载' };
  }
  configurator = document.createElement('sync-group-configurator');
  configurator.setAttribute('app-id', APP_ID);
  host.appendChild(configurator);
  configurator.addEventListener('connected', (event) => { void applyConnection(event.detail); });
  configurator.addEventListener('backend-added', () => { void applyConnection(); });
  configurator.addEventListener('data-group-created', () => { void applyConnection(); });
  void applyConnection();
  return { ok: true };
}

/** M4：把用户填写的路径写成 folder-deepen/<volumeId>.json，与远端已有标记取并集。 */
export async function writeDeepenMarks(marks) {
  const { fp, hostInfo } = await commonContext();
  const host = hostInfo.host || 'pc';
  const volumes = hostInfo.volumes || {};
  const groups = new Map();
  for (const raw of Array.isArray(marks) ? marks : []) {
    const rel = hostRelativePath(raw) || String(raw || '').trim();
    if (!rel) continue;
    const drive = /^([A-Za-z]):/.exec(rel)?.[1]?.toUpperCase() || '';
    const volumeId = volumes[drive] || `${host}::${drive}:`;
    const key = sanitizeKey(volumeId);
    const list = groups.get(key) || [];
    if (!list.includes(rel)) list.push(rel);
    groups.set(key, list);
  }
  try { await fp.mkdir(pathFor('folder-deepen'), { recursive: true }); } catch { /* 隐式目录 */ }
  let written = 0;
  for (const [key, list] of groups) {
    const path = `folder-deepen/${key}.json`;
    let existing = [];
    try {
      const parsed = JSON.parse(await fp.readFile(pathFor(path), 'utf8'));
      if (Array.isArray(parsed?.marks)) existing = parsed.marks;
    } catch { /* 不存在则新建 */ }
    const merged = [...new Set([...existing, ...list])];
    await fp.writeFile(pathFor(path), `${JSON.stringify({ marks: merged }, null, 2)}\n`);
    written += 1;
  }
  return { written, marks: [...groups.values()].reduce((sum, list) => sum + list.length, 0) };
}

export function lastSyncStats() {
  return readJson(LAST_KEY, null);
}

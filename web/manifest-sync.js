// 收藏 → zen-fs-config「app-data 数据组」的 v2 清单同步。
//
// 单向导出：/annotations（zen-fs-config 配置仓 + localStorage 镜像）仍是唯一事实源，
// 这里只把当前全量收藏重建为 v2 清单写进数据同步组，不回读、不反向修改收藏。
// 同步组由 zen-fs-config-ui 的 <sync-group-configurator> 配置；只有「真有远端后端」
// 的数据组才允许导出，本地-only 组会被明确拒绝，避免制造「看起来同步了」的假象。

import { buildV2Export, manifestPrefixFor } from './manifest-export.js';

const APP_ID = 'zip-browser';
const TOKEN = window.__LOCAL_TOKEN__;
const REV_KEY = 'zip-browser:manifest-revision';
const KNOWN_KEY = 'zip-browser:manifest-volumes';
const LAST_KEY = 'zip-browser:manifest-last';

const $ = (id) => document.getElementById(id);

let appFs = null;
let prefix = null;
let blockReason = '尚未连接同步组';
let getSnapshot = () => null;
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

/** 相对路径（'struct/x.json'）→ 数据组 fs 里的绝对路径。 */
function pathFor(rel) {
  return prefix ? `/${prefix}/${rel}` : `/${rel}`;
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

/** 从同步组连接结果里挑出 data-sync 组，并按后端基准推导清单前缀。 */
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
  // config-sync 连接：数据组登记在配置仓里，挑一个含远端后端的组。
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
    ? `/${prefix}/struct/…、/${prefix}/file-tags/…`
    : '/struct/…、/file-tags/…';
  report(`已就绪：${plan.types.join(' / ')} · 写入 ${where}`, true);
  // 连接建立（或页面刷新后重连）时补一次全量导出。
  scheduleSync(0);
}

/**
 * 立即导出一次 v2 清单。
 * 流程：算文件清单 → 读回已有 file-tags 做并集合并 → 建目录 → 逐文件写入 → 落 revision。
 */
export async function syncNow() {
  const fp = appFs?.promises || appFs;
  if (!fp || prefix === null) throw new Error(blockReason || '同步组未就绪');
  const response = await fetch('/api/hostinfo', {
    headers: { 'X-Local-Token': TOKEN },
  });
  if (!response.ok) throw new Error(`读取本机信息失败：HTTP ${response.status}`);
  const hostInfo = await response.json();
  const data = getSnapshot() || { tags: {}, paths: {}, bookmarks: [] };
  const now = Date.now();
  const revision = (Number(readRaw(REV_KEY)) || 0) + 1;
  const knownVolumes = readJson(KNOWN_KEY, []);

  const probe = buildV2Export({
    data, host: hostInfo.host, volumes: hostInfo.volumes || {},
    now, revision, existing: {}, knownVolumes,
  });
  const existing = {};
  await Promise.all(probe.files.map(async (file) => {
    if (file.kind !== 'tags') return; // 分片/主机索引是本工具私有文件，全量重建即可
    try {
      existing[file.path] = JSON.parse(await fp.readFile(pathFor(file.path), 'utf8'));
    } catch {
      existing[file.path] = null;
    }
  }));
  const result = buildV2Export({
    data, host: hostInfo.host, volumes: hostInfo.volumes || {},
    now, revision, existing, knownVolumes,
  });

  for (const dir of ['struct', 'file-tags']) {
    try { await fp.mkdir(pathFor(dir), { recursive: true }); } catch { /* 隐式目录，忽略 EEXIST */ }
  }
  for (const file of result.files) {
    await fp.writeFile(pathFor(file.path), `${JSON.stringify(file.json, null, 2)}\n`);
  }
  writeRaw(REV_KEY, String(revision));
  writeRaw(KNOWN_KEY, JSON.stringify(result.knownVolumes));
  writeRaw(LAST_KEY, JSON.stringify({ at: now, ...result.stats }));
  return result.stats;
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
    const stats = await syncNow();
    const detail = `${stats.shardCount} 个卷分片 · ${stats.tagFileCount} 个标签文件 · r${stats.revision}`;
    report(`已导出 v2 清单（${new Date().toLocaleTimeString()}）`, true, detail);
  } catch (err) {
    report(`导出失败：${err?.message || err}`, false);
  } finally {
    running = false;
    if (queued) { queued = false; scheduleSync(0); }
  }
}

/** 收藏变更后调用：300ms 防抖，导出失败只写状态、不阻塞本地收藏。 */
export function scheduleSync(delay = 300) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void runSync(false); }, delay);
}

/** 取消待执行的自动导出（页面卸载 / 单测清理用）。 */
export function cancelScheduledSync() {
  if (timer) clearTimeout(timer);
  timer = null;
}

/** 打开同步设置面板。 */
export function openSyncModal() {
  const modal = $('syncModal');
  if (modal) modal.classList.remove('hidden');
}

export function initManifestSync(options = {}) {
  getSnapshot = options.getSnapshot || getSnapshot;
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
  // 组件可能在监听器绑定前就已经连好：补查一次。
  void applyConnection();
  return { ok: true };
}

/** 供设置面板展示上一次导出摘要。 */
export function lastSyncStats() {
  return readJson(LAST_KEY, null);
}

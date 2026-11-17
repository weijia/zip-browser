import {
  encodeLocation,
  decodeLocation,
  compactTarget,
  localTargetFromCompact,
  winBasename,
  winDirname,
} from './location.js';
import { initAnnotations, onRender, getAnnotationStore } from './annotations-ui.js';
import { initVault, openVault, openVaultForPassword, saveZipPassword, getVaultSessionId, getDefaultPassword, openDefaultPasswordModal } from './vault.js';
import { initManifestSync, scheduleSync } from './manifest-sync.js';
import { createSelectionStore } from './manifest-selection.js';
import {
  initManifestBuilder, addPickedFromItem, addFileListDir, openCopyRefForItem,
  openDirListForItem,
} from './manifest-builder.js';
import {
  initTrash, resetTrashSelection, trashToolbarHtml,
  trashHeadStart, trashHeadEnd, trashRowStart, trashRowEnd,
  trashCardControls, trashChipControls, handleTrashAction,
} from './trash-ui.js';

const HOST = (typeof window !== 'undefined' && window.ZB_HOST) || {};
const BASE = String(HOST.basePath || '').replace(/\/+$/, '');
const AUTH_MODE = HOST.auth === 'bearer';
const POSIX = HOST.pathStyle === 'posix';
const FEATURES = HOST.features || {};
const LABELS = HOST.labels || {};
const TOKEN = window.__LOCAL_TOKEN__;
const $ = (id) => document.getElementById(id);

function apiUrl(url) {
  const value = String(url || '');
  if (/^https?:/i.test(value)) return value;
  if (value.startsWith('/') && BASE && !value.startsWith(`${BASE}/`)) return `${BASE}${value}`;
  return value;
}

function withBase(url) {
  return apiUrl(url);
}

function authHeaders() {
  if (!AUTH_MODE) return { 'X-Local-Token': TOKEN };
  const token = localStorage.getItem('zb-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function loginRequired(err) {
  return err && (err.name === 'AuthRequired' || err.status === 401);
}

function showLogin(message) {
  const modal = $('loginModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const error = $('loginError');
  if (error) {
    error.textContent = message || '';
    error.style.display = message ? '' : 'none';
  }
  setTimeout(() => $('loginUser')?.focus(), 30);
}

function hideLogin() {
  $('loginModal')?.classList.add('hidden');
}

async function submitLogin() {
  const username = ($('loginUser')?.value || '').trim();
  const password = $('loginPass')?.value || '';
  const error = $('loginError');
  if (!username || !password) {
    if (error) error.textContent = '请填写用户名和密码';
    return;
  }
  try {
    const response = await fetch(apiUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    if (data.token) localStorage.setItem('zb-token', data.token);
    const user = (data.user && (data.user.username || data.user.name)) || username;
    localStorage.setItem('zb-user', user);
    hideLogin();
    location.reload();
  } catch (err) {
    if (error) {
      error.textContent = `登录失败：${err.message}`;
      error.style.display = '';
    }
  }
}

const stage = $('stage');
const sidebar = $('sidebar');
const crumbs = $('crumbs');

const PREVIEW_EXT = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.json', '.txt', '.md', '.markdown',
  '.xml', '.csv', '.svg', '.yaml', '.yml', '.ts', '.tsx', '.jsx', '.vue',
  '.py', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.sh', '.bat', '.ps1',
  '.log', '.ini', '.conf', '.sql', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.avif', '.bmp', '.ico', '.pdf', '.mp3', '.wav', '.ogg', '.m4a', '.mp4',
  '.webm', '.woff', '.woff2', '.ttf',
]);

const IMAGE_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.svg',
]);

let viewMode = 'list';
// 文件列表排序：none（保持服务端默认：目录在前、名称升序）/ desc / asc。
// 目录始终排在文件前，大小排序只作用于文件。
let sizeSort = (() => {
  try {
    const saved = localStorage.getItem('zb-size-sort');
    return saved === 'asc' || saved === 'desc' ? saved : 'none';
  } catch {
    return 'none';
  }
})();
const state = { index: 0, depth: 0, target: { kind: 'drives' } };
let crumbTargets = [];

// 手机端行操作菜单：把一行里被 CSS 收起的按钮原样搬到底部面板，
// 复用原有 data-action 事件委托，不复制任何业务逻辑。
let rowMenuHost = null;
function closeRowMenu() {
  $('rowMenuModal')?.classList.add('hidden');
  rowMenuHost = null;
}
function viewportHeight() {
  // Android WebView 对 dvh 的支持不稳定，个别版会把 100dvh 算成 0；
  // 菜单高度一律用运行时像素，避免样式里算出 0 高度只剩一条边。
  const vv = window.visualViewport;
  return Math.max(0, Math.round(
    (vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 0,
  ));
}

// Android 外壳的底部工具栏浮在 WebView 上方，约 80px；行菜单若贴底会被它盖住。
// 浏览器没有这个覆盖层，保持 0 即可。
const ROW_MENU_BOTTOM = /Android/i.test(navigator.userAgent) ? 88 : 0;

function fitRowMenuCard(card) {
  if (!card) return;
  card.style.bottom = `${ROW_MENU_BOTTOM}px`;
  card.style.maxHeight = `${Math.max(240, Math.round(viewportHeight() - ROW_MENU_BOTTOM - 72))}px`;
}

function openRowMenu(button) {
  const modal = $('rowMenuModal');
  const list = $('rowMenuList');
  const title = $('rowMenuTitle');
  const sub = $('rowMenuSub');
  if (!modal || !list || !title || !sub) return;
  const card = modal.querySelector('.modal-card');
  fitRowMenuCard(card);
  const host = button.closest('tr, .thumb-card, .folder-chip');
  if (!host) return;
  rowMenuHost = host;
  title.textContent = button.dataset.name || '更多操作';
  sub.textContent = button.dataset.dir === '1' ? '文件夹' : '文件';
  const labels = {
    'trash-one': '删除到回收站',
    'trash-card-x': '删除到回收站',
    'trash-chip-x': '删除到回收站',
  };
  const html = [];
  for (const source of host.querySelectorAll('button[data-action]')) {
    // 「⋯」本身与手机端隐藏的「打开位置」不进菜单。
    if (source.classList.contains('row-menu-btn') || source.classList.contains('ex-open')) continue;
    const clone = source.cloneNode(true);
    clone.classList.add('row-menu-option');
    clone.textContent = labels[source.dataset.action] || source.textContent.trim();
    html.push(clone.outerHTML);
  }
  const box = host.querySelector('.trash-check');
  if (box) {
    html.push(`<button type="button" class="row-menu-option" data-action="row-menu-select">${box.checked ? '✓ 已选中 · 点此取消' : '选中以批量删除'}</button>`);
  }
  list.innerHTML = html.join('') || '<p class="row-menu-empty">没有可用操作</p>';
  modal.classList.remove('hidden');
}
function initRowMenu() {
  const modal = $('rowMenuModal');
  if (!modal) return;
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target?.closest?.('#rowMenuClose')) { closeRowMenu(); return; }
    const option = event.target?.closest?.('#rowMenuList button[data-action]');
    // 「选中以批量删除」要留在面板里切换状态，其余选项点完即关。
    if (option && option.dataset.action !== 'row-menu-select') closeRowMenu();
  });
}
initRowMenu();

// 手机端外壳：顶栏「更多」下拉 + 侧栏抽屉。窄屏才显示（CSS 控制），
// 按钮 DOM 不复制，原有事件绑定全部保留；可选链兼容精简 DOM 环境。
let closeMobileChrome = () => {};
function initMobileChrome() {
  const moreBtn = $('moreBtn');
  const topActions = $('topActions');
  const sideToggle = $('sideToggle');
  const side = $('sidebar');
  const backdrop = $('sideBackdrop');
  const positionMenu = () => {
    if (!topActions) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const bottom = Math.max(0, Math.round(topbar.getBoundingClientRect().bottom));
    topActions.style.setProperty('--menu-top', `${bottom}px`);
    // 不用 dvh：Android WebView 里 dvh 可能为 0，会把菜单压成一条边。
    const room = viewportHeight() - bottom - 8;
    topActions.style.maxHeight = `${Math.max(160, Math.round(room))}px`;
  };
  const setMenu = (open) => {
    if (open) positionMenu();
    topActions?.classList.toggle('open', open);
    moreBtn?.setAttribute('aria-expanded', String(open));
  };
  const setSide = (open) => {
    side?.classList.toggle('open', open);
    backdrop?.classList.toggle('hidden', !open);
    sideToggle?.setAttribute('aria-expanded', String(open));
  };
  moreBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenu(!topActions?.classList.contains('open'));
    setSide(false);
  });
  sideToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    setSide(!side?.classList.contains('open'));
    setMenu(false);
  });
  backdrop?.addEventListener('click', () => setSide(false));
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest('#moreBtn') || target.closest('#sideToggle')) return;
    if (target.closest('#topActions')) {
      // 只在点按钮后收起；编码下拉展开时不要关菜单。
      if (target.closest('button')) setMenu(false);
      return;
    }
    setMenu(false);
    if (target.closest('#sidebar')) setSide(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) { setMenu(false); setSide(false); closeRowMenu(); return; }
    if (topActions?.classList.contains('open')) positionMenu();
    const rowMenu = $('rowMenuModal');
    if (rowMenu && !rowMenu.classList.contains('hidden')) {
      fitRowMenuCard(rowMenu.querySelector('.modal-card'));
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { setMenu(false); setSide(false); closeRowMenu(); }
  });
  closeMobileChrome = () => { setMenu(false); setSide(false); closeRowMenu(); };
}
initMobileChrome();

function isImageName(name) {
  return IMAGE_EXT.has((String(name).match(/\.[^.]+$/) || [''])[0].toLowerCase());
}

function localThumbUrlFront(abs) {
  return localToUrl(abs).replace(`${BASE}/fs`, `${BASE}/thumb/fs`);
}

// zip 封面缩略图：zip 内只有一个文件时用它的缩略图；加密时带 vsid/defpw 让服务端优先用记录的密码或缺省密码自动解密。
function fsCoverUrlFront(abs, vsid, defpw) {
  const base = localToUrl(abs).replace(`${BASE}/fs`, `${BASE}/thumb/zipcover/fs`);
  let url = vsid ? `${base}?vsid=${encodeURIComponent(vsid)}` : base;
  if (defpw) url += `${vsid ? '&' : '?'}defpw=${encodeURIComponent(defpw)}`;
  return url;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (!value) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function formatTime(ms) {
  if (!ms) return '—';
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sizeText(bytes) {
  return Number(bytes) > 0 ? formatSize(bytes) : '0 B';
}

// 页面上直接查目录体积：勾选目录行时按需排队，
// 一次请求批量算多个目录，结果回填到该行「大小」列，不需要打开清单生成面板。
const dirSizeCache = new Map(); // path -> summary | 'pending' | 'error'
const dirSizeQueue = new Set();
let dirSizeTimer = null;
let dirSizeRunning = false;

function pathKey(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function pickDirSummary(data, path) {
  const wanted = pathKey(path);
  const summaries = data.summaries || {};
  for (const [key, value] of Object.entries(summaries)) {
    if (pathKey(key) === wanted) return value;
  }
  const roots = Array.isArray(data.roots) ? data.roots : [];
  for (const root of roots) {
    if (pathKey(root.path) === wanted) return root;
  }
  return null;
}

function dirSizeDetail(info) {
  const files = Number(info.fileCount) || 0;
  const partial = Boolean(info.partial || info.incomplete || info.sizePartial);
  return `${files.toLocaleString('zh-CN')} 个文件 · 逻辑大小 ${sizeText(info.totalSize)} · 占用 ${sizeText(info.totalSizeOnDisk)}${partial ? ' · 部分不可读' : ''}`;
}

function dirSizeCompact(info) {
  const files = Number(info.fileCount) || 0;
  return `${files.toLocaleString('zh-CN')} 个文件 · ${sizeText(info.totalSize)}`;
}

function updateDirSizeDisplays(path, notifyName) {
  const value = dirSizeCache.get(path);
  const elements = Array.from(document.querySelectorAll('[data-size-path]'))
    .filter((element) => element.dataset.sizePath === path);
  for (const element of elements) {
    if (value === 'pending') {
      element.textContent = '计算中…';
      element.title = '正在递归统计目录体积';
      element.classList.add('size-pending');
    } else if (value === 'error') {
      element.textContent = '大小读取失败';
      element.title = '目录体积读取失败，可稍后重试';
      element.classList.remove('size-pending');
    } else if (value && typeof value === 'object') {
      element.textContent = dirSizeCompact(value);
      element.title = dirSizeDetail(value);
      element.classList.remove('size-pending');
      element.classList.add('size-known');
    }
  }
  if (value && typeof value === 'object' && notifyName) {
    status(`${notifyName}：${dirSizeDetail(value)}`);
  } else if (value === 'error' && notifyName) {
    status(`${notifyName}：目录体积读取失败`, true);
  }
}

function applyDirSizeCache() {
  for (const [path, value] of dirSizeCache.entries()) {
    if (value && typeof value === 'object') updateDirSizeDisplays(path);
  }
}

async function flushDirSizeQueue() {
  if (dirSizeRunning || !dirSizeQueue.size) return;
  const paths = Array.from(dirSizeQueue).slice(0, 40);
  for (const path of paths) dirSizeQueue.delete(path);
  dirSizeRunning = true;
  try {
    const data = await api('/api/mft/scan', {
      method: 'POST',
      body: JSON.stringify({
        paths: paths.map((path) => ({ path, recursive: true, sizeFull: true })),
        recursive: true,
        sizeFull: true,
        timeoutMs: 60_000,
      }),
    });
    for (const path of paths) {
      const summary = pickDirSummary(data, path);
      if (!summary) {
        dirSizeCache.set(path, 'error');
      } else {
        dirSizeCache.set(path, {
          fileCount: Number(summary.fileCount) || 0,
          totalSize: Number(summary.totalSize) || 0,
          totalSizeOnDisk: Number(summary.totalSizeOnDisk) || 0,
          partial: Boolean(summary.partial || summary.incomplete || summary.sizePartial),
        });
      }
      updateDirSizeDisplays(path, dirSizeNotify.get(path));
      dirSizeNotify.delete(path);
    }
  } catch (err) {
    for (const path of paths) {
      dirSizeCache.set(path, 'error');
      updateDirSizeDisplays(path, dirSizeNotify.get(path));
      dirSizeNotify.delete(path);
    }
    status(`目录体积读取失败：${err.message || err}`, true);
  } finally {
    dirSizeRunning = false;
    if (dirSizeQueue.size) scheduleDirSizeFlush();
  }
}

const dirSizeNotify = new Map(); // path -> name，勾选目录触发时回写状态栏

function scheduleDirSizeFlush() {
  if (dirSizeTimer) clearTimeout(dirSizeTimer);
  dirSizeTimer = setTimeout(() => {
    dirSizeTimer = null;
    flushDirSizeQueue();
  }, 160);
}

function requestDirSize(path, name, notify = false) {
  if (!path) return;
  const cached = dirSizeCache.get(path);
  if (cached && typeof cached === 'object') {
    updateDirSizeDisplays(path, name);
    return;
  }
  if (cached !== 'pending') {
    dirSizeCache.set(path, 'pending');
    dirSizeQueue.add(path);
  }
  if (notify) dirSizeNotify.set(path, name || path);
  updateDirSizeDisplays(path);
  scheduleDirSizeFlush();
}

// 加密归档标记：后端列目录时只读头尾探测，encrypted === true 才显示；
// false / 'unknown' 一律不显示，避免把判不准的包误标成「未加密」。
const ENC_TITLE = '这个压缩包已加密，打开时需要密码（可用缺省密码或密码库记录）';
function encBadge(item, card = false) {
  if (item.encrypted !== true) return '';
  return card
    ? `<span class="enc-badge" title="${ENC_TITLE}">🔒 加密</span>`
    : `<span class="tag tag-enc" title="${ENC_TITLE}">🔒 加密</span>`;
}

// 文件列表选择集：目录 → 收集该目录下的文件；文件 → 单个散文件。
// 文案按对象区分，避免与「+ 目录清单」（进 struct 目录树）混淆。
function flControls(item) {
  const dir = Boolean(item.dir);
  return `<button type="button" class="fl-add" data-action="fl-add"
    data-path="${esc(item.path)}" data-name="${esc(item.name)}" data-dir="${dir ? '1' : ''}"
    data-size="${Number(item.size) || 0}" data-mtime="${Number(item.mtime) || 0}"
    title="${dir ? '把该目录下的文件加入文件列表选择集' : '把该文件加入文件列表选择集'}">${dir ? '+ 目录下文件' : '+ 该文件'}</button>`;
}

// 「+ 副本」：给单个文件预留一个网络副本链接 / 远端路径（仅元数据，不上传内容）。
function copyControls(item) {
  if (item.dir) return '';
  return `<button type="button" class="cr-add-btn" data-action="cr-add"
    data-path="${esc(item.path)}" data-name="${esc(item.name)}"
    title="给这个文件预留一个网络副本链接或远端路径">+ 副本</button>`;
}

// 「+ 目录清单」：把目录加入 struct v2 目录清单，可选只加一层或整棵子树（含目录体积）。
function dirListControls(item) {
  if (!item.dir) return '';
  return `<button type="button" class="dl-add" data-action="dl-add"
    data-path="${esc(item.path)}" data-name="${esc(item.name)}"
    title="把该目录加入目录结构清单（可选一层 / 含所有子目录，并带目录体积）">+ 目录清单</button>`;
}

// 「打开位置」：调起 Windows 资源管理器；目录直接打开，文件在所在文件夹中选中。
function explorerControls(item) {
  if (!FEATURES.explorer) return '';
  return `<button type="button" class="ex-open" data-action="ex-open"
    data-path="${esc(item.path)}" data-name="${esc(item.name)}"
    title="在 Windows 资源管理器中打开${item.dir ? '该目录' : '该文件所在位置并选中它'}">打开位置</button>`;
}

// 手机端每个目录/文件项只显示这一个按钮；点开后把该行原有操作搬到底部面板。
// 桌面端由 CSS 隐藏，行内按钮与事件绑定完全不变。
function rowMenuButton(item) {
  return `<button type="button" class="row-menu-btn" data-action="row-menu"
    data-name="${esc(item.name)}" data-dir="${item.dir ? '1' : ''}"
    aria-label="${esc(item.name)} 的更多操作" title="更多操作">⋯</button>`;
}

function status(text, bad = false) {
  $('statusText').textContent = text;
  document.querySelector('.status-dot').classList.toggle('bad', bad);
}

async function api(url, options = {}) {
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(apiUrl(url), {
    ...options,
    headers,
    credentials: AUTH_MODE ? 'same-origin' : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    if (response.status === 401 && AUTH_MODE) {
      error.name = 'AuthRequired';
      showLogin(data.error === 'guest disabled' ? '该站点禁止游客访问，请登录' : '登录状态已失效，请重新登录');
    }
    throw error;
  }
  return data;
}

function current() {
  return state.target;
}

// 位置是唯一事实源：URL hash 决定刷新后回到哪里，history.state 携带完整 target。
function syncLocation(push) {
  const hash = encodeLocation({
    t: compactTarget(state.target),
    view: viewMode,
    enc: FEATURES.encoding ? $('encoding')?.value : undefined,
  });
  const payload = {
    index: state.index,
    depth: state.depth,
    target: state.target,
    sig: hash,
  };
  if (push) history.pushState(payload, '', hash);
  else history.replaceState(payload, '', hash);
}

function updateNavButtons() {
  $('back').disabled = state.index <= 0;
  $('forward').disabled = state.index >= state.depth;
}

function navigate(target, push = true) {
  state.target = target;
  if (push) {
    state.index += 1;
    state.depth = state.index;
  }
  syncLocation(push);
  updateNavButtons();
  render(target);
}

function applyEncoding(value) {
  const select = $('encoding');
  if (!select || !FEATURES.encoding) return;
  if (typeof value === 'string' && Array.from(select.options).some((option) => option.value === value)) {
    select.value = value;
  }
}

function absFromFsUrl(pathname) {
  try {
    const stripped = BASE && pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname;
    if (!stripped.startsWith('/fs/')) return null;
    const pieces = stripped.replace(/^\/fs\//, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (!pieces.length) return null;
    if (POSIX) return `/${pieces.join('/')}`;
    const letter = pieces.shift();
    if (!letter || !/^[A-Za-z]$/.test(letter)) return null;
    return `${letter}:\\${pieces.join('\\')}`;
  } catch {
    return null;
  }
}

// 从 URL 快照重建目标。zip 会话在服务端内存中，必须重新取一次条目树。
async function buildTarget(snap) {
  if (!snap || snap.k !== 'zip' || typeof snap.i !== 'string') {
    const target = localTargetFromCompact(snap);
    if (target.kind === 'preview' && !target.url) target.url = localToUrl(target.path);
    return target;
  }
  const data = await api(`/api/zip/tree?id=${encodeURIComponent(snap.i)}`).catch(() => null);
  if (!data) return { kind: 'dir', path: snap.d || winDirname(snap.p || '') };
  return {
    kind: 'zip',
    id: snap.i,
    zipName: snap.n || winBasename(data.path || snap.p || 'zip'),
    zipDir: snap.d || winDirname(data.path),
    zipPath: data.path || snap.p,
    entries: data.entries,
    current: snap.c || `/zip/${snap.i}/`,
  };
}

async function restore() {
  const snap = decodeLocation(location.hash);
  viewMode = snap?.view === 'thumbs' ? 'thumbs' : 'list';
  applyEncoding(snap?.enc);

  const saved = history.state;
  const reusable = saved && saved.sig === location.hash && saved.target;
  let target = reusable ? saved.target : await buildTarget(snap?.t);
  if (reusable) {
    state.index = Number(saved.index) || 0;
    state.depth = Math.max(Number(saved.depth) || 0, state.index);
  } else {
    state.index = 0;
    state.depth = 0;
  }

  let expired = false;
  if (target.kind === 'zip') {
    const data = await api(`/api/zip/tree?id=${encodeURIComponent(target.id)}`).catch(() => null);
    if (!data) {
      expired = true;
      target = { kind: 'dir', path: target.zipDir || winDirname(target.zipPath || '') };
    } else {
      target = { ...target, entries: data.entries, zipPath: data.path || target.zipPath };
    }
  }

  state.target = target;
  syncLocation(false);
  updateNavButtons();
  await render(target);
  if (expired) status('压缩包会话已失效（服务重启或超时），已返回所在目录，请重新打开', true);
}

function showError(err) {
  status(err.message || String(err), true);
  stage.innerHTML = `<div class="error-box"><strong>加载失败</strong><br>${esc(err.message || err)}</div>`;
}

function localToUrl(abs) {
  const value = String(abs || '');
  if (POSIX) {
    if (!value || value === '/') return `${BASE}/fs/`;
    const parts = value.replace(/^\/+/, '').split('/').filter(Boolean).map(encodeURIComponent);
    return `${BASE}/fs/${parts.join('/')}`;
  }
  const match = /^([A-Za-z]):\\(.*)$/.exec(value);
  if (!match) return '#';
  const parts = match[2] ? match[2].split('\\').filter(Boolean).map(encodeURIComponent) : [];
  return `${BASE}/fs/${match[1].toUpperCase()}/${parts.join('/')}`;
}

function zipToUrl(id, entryPath) {
  const parts = entryPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `/zip/${id}/${parts.join('/')}`;
}

function appendPathCrumbs(parts, abs) {
  if (POSIX) {
    const segments = String(abs || '').split('/').filter(Boolean);
    if (!segments.length) return;
    let acc = '';
    for (const segment of segments) {
      acc = `${acc}/${segment}`;
      parts.push({ label: segment, target: { kind: 'dir', path: acc } });
    }
    return;
  }
  const match = /^([A-Za-z]):\\(.*)$/.exec(abs || '');
  if (!match) return;
  let acc = `${match[1]}:\\`;
  parts.push({ label: `${match[1]}:`, target: { kind: 'dir', path: acc } });
  for (const segment of match[2].split('\\').filter(Boolean)) {
    acc = acc.endsWith('\\') ? `${acc}${segment}` : `${acc}\\${segment}`;
    parts.push({ label: segment, target: { kind: 'dir', path: acc } });
  }
}

function renderCrumbs(target) {
  crumbTargets = [];
  const rootLabel = LABELS.root || '此电脑';
  const parts = [{ label: rootLabel, target: { kind: 'drives' } }];

  if (target.kind === 'dir' || (target.kind === 'preview' && target.scope === 'local')) {
    appendPathCrumbs(parts, target.kind === 'dir' ? target.path : target.dir);
    if (target.kind === 'preview') parts.push({ label: target.label });
  } else if (target.kind === 'zip') {
    appendPathCrumbs(parts, target.zipDir);
    parts.push({ label: target.zipName, target: { kind: 'dir', path: target.zipDir } });
    const currentUrl = (target.current || `/zip/${target.id}/`).split('?')[0];
    const entry = decodeURIComponent(currentUrl.replace(`/zip/${target.id}/`, '')).replace(/\/$/, '');
    if (entry) parts.push({ label: entry });
  }

  crumbs.innerHTML = parts.map((part, index) => {
    crumbTargets.push(part.target || null);
    const isCurrent = index === parts.length - 1;
    const label = esc(part.label);
    const node = part.target
      ? `<span class="crumb${isCurrent ? ' current' : ''}" data-action="crumb" data-index="${index}">${label}</span>`
      : `<span class="crumb current">${label}</span>`;
    return `${index ? '<span class="crumb-sep">/</span>' : ''}${node}`;
  }).join('');
  $('mode').textContent = target.kind === 'zip' ? '压缩包内' : (target.kind === 'preview' ? '文件预览' : (LABELS.mode || '本地磁盘'));
  const label = parts[parts.length - 1].label;
  const siteTitle = HOST.siteTitle || '文件浏览器';
  document.title = label === rootLabel ? siteTitle : `${label} · ${siteTitle}`;
}

async function renderDrives() {
  const { drives } = await api('/api/drives');
  const mounts = HOST.drivesMode === 'mounts';
  const cards = drives.map((drive) => {
    const used = drive.total ? Math.round(((drive.total - drive.free) / drive.total) * 100) : 0;
    if (mounts) {
      const label = drive.label || drive.path || '存储';
      return `<div class="drive-card" data-action="drive" data-path="${esc(drive.path)}" data-name="${esc(label)}">
        <div class="drive-head"><span class="drive-letter"><span class="icon icon-dir"></span></span><span class="drive-name">${esc(label)}</span></div>
        <div class="drive-bar"><div style="width:${used}%"></div></div>
        <div class="drive-meta">${drive.total ? `${formatSize(drive.free)} 可用 / ${formatSize(drive.total)}` : '容量未知'} · ${esc(drive.kind || '存储')}<br><code>${esc(drive.path || '')}</code></div>
      </div>`;
    }
    const kindClass = drive.kind === '可移动' ? ' removable' : (drive.kind === '网络映射' ? ' network' : '');
    const label = drive.label || drive.kind;
    return `<div class="drive-card" data-action="drive" data-path="${esc(drive.path)}" data-name="${esc(label)}">
      <div class="drive-head"><span class="drive-letter${kindClass}">${drive.letter}:</span><span class="drive-name">${esc(label)}</span></div>
      <div class="drive-bar"><div style="width:${used}%"></div></div>
      <div class="drive-meta">${drive.total ? `${formatSize(drive.free)} 可用 / ${formatSize(drive.total)}` : '容量未知'} · ${esc(drive.kind)}</div>
    </div>`;
  }).join('');
  const title = LABELS.drivesTitle || '此电脑 · 磁盘';
  const unit = LABELS.drivesUnit || '磁盘';
  const empty = LABELS.drivesEmpty || '没有检测到可用磁盘';
  const hint = LABELS.drivesHint || '';
  stage.innerHTML = `<h2 class="stage-title">${esc(title)}（${drives.length}）</h2>
    <div class="drive-grid">${cards || `<div class="empty">${esc(empty)}</div>`}</div>
    ${hint ? `<p class="stage-hint">${esc(hint)}</p>` : ''}`;
  const sidebarRoot = LABELS.sidebarRoot || LABELS.root || '此电脑';
  sidebar.innerHTML = `<div class="side-title">${esc(sidebarRoot)}</div>${drives.map((drive) => {
    const label = mounts ? (drive.label || drive.path || '存储') : `${drive.letter}: ${drive.label || drive.kind}`;
    return `<div class="side-item" data-action="drive" data-path="${esc(drive.path)}"><span class="icon icon-dir"></span>${esc(label)}</div>`;
  }).join('')}`;
}

function parentOf(abs) {
  if (POSIX) {
    const segments = String(abs || '').split('/').filter(Boolean);
    if (!segments.length) return null;
    segments.pop();
    return segments.length ? `/${segments.join('/')}` : null;
  }
  const match = /^([A-Za-z]):\\(.*)$/.exec(abs);
  if (!match) return null;
  const segments = match[2].split('\\').filter(Boolean);
  segments.pop();
  return `${match[1]}:\\${segments.join('\\')}`;
}

// 目录始终在前；文件按 size 升/降序，大小相同则保持原顺序（JS sort 稳定）。
// sizeSort 为 none 时原样返回，保持服务端既有的目录/名称顺序。
function sortedDirItems(items) {
  if (sizeSort === 'none') return items;
  const sign = sizeSort === 'asc' ? 1 : -1;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.dir || b.item.dir) {
        if (a.item.dir && b.item.dir) return a.index - b.index;
        return a.item.dir ? -1 : 1;
      }
      const diff = (Number(a.item.size) || 0) - (Number(b.item.size) || 0);
      return diff ? diff * sign : a.index - b.index;
    })
    .map((entry) => entry.item);
}

function sizeSortLabel() {
  if (sizeSort === 'desc') return '大小 ↓';
  if (sizeSort === 'asc') return '大小 ↑';
  return '按大小';
}

async function cycleSizeSort() {
  sizeSort = sizeSort === 'none' ? 'desc' : (sizeSort === 'desc' ? 'asc' : 'none');
  try {
    localStorage.setItem('zb-size-sort', sizeSort);
  } catch {
    // 隐私模式/存储被禁用时只影响记忆，不影响本次排序
  }
  await render(current());
}

async function renderDir(abs) {
  const data = await api(`/api/list?path=${encodeURIComponent(abs)}`);
  // 每次重列目录都清空勾选，避免上一目录的选中项被误删
  resetTrashSelection();
  const items = sortedDirItems(data.items);
  const images = items.filter((item) => !item.dir && isImageName(item.name));
  const zips = items.filter((item) => item.zip);
  const vsid = getVaultSessionId() || undefined;
  const defpw = getDefaultPassword() || undefined;
  const thumbsCount = images.length + zips.length;
  const switcher = `<div class="view-switch">
    <button type="button" data-action="view" data-view="list" class="${viewMode === 'list' ? 'active' : ''}">列表</button>
    <button type="button" data-action="view" data-view="thumbs" class="${viewMode === 'thumbs' ? 'active' : ''}">缩略图${thumbsCount ? ` (${thumbsCount})` : ''}</button>
    <button type="button" data-action="sort-size" class="sort-toggle${sizeSort === 'none' ? '' : ' active'}" title="按文件大小排序：第一次从大到小，再点从小到大，再点恢复默认">${sizeSortLabel()}</button>
  </div>`;
  let body;
  if (viewMode === 'thumbs') {
    const folders = items.filter((item) => item.dir);
    const imageCards = images.map((item) => `<div class="thumb-card" data-action="file" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
      ${trashCardControls(item)}
      ${rowMenuButton(item)}
      ${flControls(item)}
      ${copyControls(item)}
      ${explorerControls(item)}
      <div class="thumb-box"><img src="${esc(localThumbUrlFront(item.path))}" loading="lazy" alt="${esc(item.name)}"></div>
      <div class="thumb-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="thumb-meta">${formatSize(item.size)}</div>
    </div>`).join('');
    const zipCards = zips.map((item) => `<div class="thumb-card" data-action="zip" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
      ${trashCardControls(item)}
      ${rowMenuButton(item)}
      ${flControls(item)}
      ${copyControls(item)}
      ${explorerControls(item)}
      <div class="thumb-box"><img src="${esc(fsCoverUrlFront(item.path, vsid, defpw))}" loading="lazy" alt="${esc(item.name)}">${encBadge(item, true)}</div>
      <div class="thumb-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="thumb-meta">${formatSize(item.size)}</div>
    </div>`).join('');
    const allCards = imageCards + zipCards;
    body = `<div class="thumb-head">图片/压缩包 · ${thumbsCount} 项<span>仅当前目录 · 点击缩略图查看原图或打开压缩包</span></div>
      ${folders.length ? `<div class="folder-chips">${folders.map((item) => `<span class="folder-chip" data-action="dir" data-path="${esc(item.path)}">${esc(item.name)}${trashChipControls({ ...item, dir: true })}${flControls({ ...item, dir: true })}${dirListControls({ ...item, dir: true })}${explorerControls({ ...item, dir: true })}${rowMenuButton({ ...item, dir: true })}</span>`).join('')}</div>` : ''}
      <div class="thumb-grid">${allCards || '<div class="thumb-empty">当前目录没有图片或压缩包，可切换到列表视图</div>'}</div>`;
  } else {
    const rows = items.map((item) => {
      const isZip = item.zip;
      const icon = item.dir ? 'icon-dir' : (isZip ? '' : 'icon-file');
      const action = item.dir ? 'dir' : (isZip ? 'zip' : 'file');
      const ext = (item.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      const hint = isZip ? '<span class="tag">可进入</span>' : (!item.dir && !PREVIEW_EXT.has(ext) ? '<span class="tag">点击下载</span>' : '');
      const thumb = isZip
        ? `<img class="file-thumb" src="${esc(fsCoverUrlFront(item.path, vsid, defpw))}" loading="lazy" alt="">`
        : `<span class="icon ${icon}"></span>`;
      return `<tr data-action="${action}" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
        ${trashRowStart(item)}
        <td><span class="file-name">${thumb}${esc(item.name)}${hint}${encBadge(item)}${flControls(item)}${dirListControls(item)}${copyControls(item)}${explorerControls(item)}${rowMenuButton(item)}</span></td>
        <td class="file-size${item.dir ? ' dir-size-cell' : ''}"${item.dir ? ` data-size-path="${esc(item.path)}"` : ''}>${item.dir ? '文件夹' : formatSize(item.size)}</td>
        <td class="file-time">${formatTime(item.mtime)}</td>
        ${trashRowEnd(item)}
      </tr>`;
    }).join('');
    body = `<table class="file-table"><thead><tr>${trashHeadStart()}<th>名称</th><th style="width:110px"><button type="button" class="sort-th" data-action="sort-size" title="按文件大小排序：第一次从大到小，再点从小到大，再点恢复默认">大小${sizeSort === 'none' ? '' : (sizeSort === 'desc' ? ' ↓' : ' ↑')}</button></th><th style="width:150px">修改时间</th>${trashHeadEnd()}</tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">此目录为空</td></tr>'}</tbody></table>`;
  }
  // 当前路径只由顶部面包屑显示；这里不再重复一条完整路径标题。
  stage.innerHTML = `${switcher}${trashToolbarHtml()}${body}`;
  applyDirSizeCache();
  const upper = parentOf(abs);
  const dirs = items.filter((item) => item.dir);
  const sidebarRoot = LABELS.sidebarRoot || LABELS.root || '此电脑';
  sidebar.innerHTML = `<div class="side-title">当前目录</div>
    ${upper ? `<div class="side-item" data-action="dir" data-path="${esc(upper)}">↰ 上一级</div>` : `<div class="side-item" data-action="crumb" data-index="0">↰ ${esc(sidebarRoot)}</div>`}
    ${dirs.map((item) => `<div class="side-item" data-action="dir" data-path="${esc(item.path)}"><span class="icon icon-dir"></span>${esc(item.name)}</div>`).join('')}
    ${dirs.length ? '' : '<div class="side-empty">没有子文件夹</div>'}`;
}

function buildTree(entries) {
  const root = { dirs: new Map(), files: [] };
  for (const item of entries) {
    if (item.dir) continue;
    const parts = item.path.split('/');
    let node = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (!node.dirs.has(key)) node.dirs.set(key, { dirs: new Map(), files: [] });
      node = node.dirs.get(key);
    }
    node.files.push({ name: parts[parts.length - 1], path: item.path });
  }
  return root;
}

function treeHtml(node, id) {
  let html = '';
  for (const [name, child] of node.dirs) {
    html += `<details open><summary>${esc(name)}</summary><div class="side-tree">${treeHtml(child, id)}</div></details>`;
  }
  for (const file of node.files) {
    html += `<div class="side-item" data-action="zip-entry" data-id="${id}" data-path="${esc(file.path)}">${esc(file.name)}</div>`;
  }
  return html;
}

function viewerHtml(url, target) {
  const thumbs = url.includes('view=thumbs');
  const zipSwitch = target.kind === 'zip'
    ? `<button type="button" data-action="zip-view" data-view="list" class="${thumbs ? '' : 'primary'}">列表</button>
       <button type="button" data-action="zip-view" data-view="thumbs" class="${thumbs ? 'primary' : ''}">缩略图</button>`
    : '';
  return `<div class="viewer">
    <div class="viewer-bar">
      <span class="viewer-url" id="viewerUrl">${esc(url)}</span>
      ${zipSwitch}
      <button type="button" data-action="viewer-new" data-url="${esc(withBase(url))}">新窗口打开</button>
      <button type="button" data-action="viewer-home">返回入口</button>
    </div>
    <iframe id="frame" src="${esc(withBase(url))}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  </div>`;
}

// iframe 内部点击链接后，把实际地址写回当前位置；刷新时才能停在那一页。
function syncFrameLocation(href) {
  const target = current();
  if (!target || (target.kind !== 'zip' && target.kind !== 'preview')) return;
  let parsed;
  try {
    parsed = new URL(href, location.href);
  } catch {
    return;
  }
  if (parsed.origin !== location.origin) return;
  const basePath = BASE && parsed.pathname.startsWith(`${BASE}/`) ? parsed.pathname.slice(BASE.length) : parsed.pathname;
  const path = `${basePath}${parsed.search}${parsed.hash}`;
  if (target.kind === 'zip') {
    if (!path.startsWith(`/zip/${target.id}/`) || target.current === path) return;
    target.current = path;
    const thumbs = path.includes('view=thumbs');
    document.querySelectorAll('[data-action="zip-view"]').forEach((button) => {
      button.classList.toggle('primary', (button.dataset.view === 'thumbs') === thumbs);
    });
  } else {
    if (!path.startsWith('/fs/') || target.url === path || target.url === withBase(path)) return;
    const abs = absFromFsUrl(parsed.pathname);
    target.url = path;
    if (abs) {
      target.path = abs;
      target.dir = winDirname(abs);
      target.label = winBasename(abs) || target.label;
    }
  }
  syncLocation(false);
}

function bindViewer(url) {
  const frame = $('frame');
  if (!frame) return;
  frame.addEventListener('load', () => {
    if (frame !== $('frame')) return;
    let href;
    try {
      href = frame.contentWindow.location.href;
    } catch {
      href = url;
    }
    $('viewerUrl').textContent = href;
    syncFrameLocation(href);
  });
}

function renderZip(target) {
  const url = target.current || `/zip/${target.id}/`;
  stage.innerHTML = viewerHtml(url, target);
  bindViewer(url);
  sidebar.innerHTML = `<div class="side-title">压缩包内 · ${target.entries.filter((item) => !item.dir).length} 个文件</div>
    <div class="side-item ${(target.current || `/zip/${target.id}/`).split('?')[0] === `/zip/${target.id}/` ? 'active' : ''}" data-action="zip-root" data-id="${target.id}">入口 / 目录列表</div>
    <div class="side-tree">${treeHtml(buildTree(target.entries), target.id)}</div>`;
}

function renderPreview(target) {
  stage.innerHTML = viewerHtml(target.url, target);
  bindViewer(target.url);
  const upper = target.dir;
  sidebar.innerHTML = `<div class="side-title">本地预览</div>
    <div class="side-item" data-action="dir" data-path="${esc(upper)}">↰ 返回目录</div>
    <div class="side-empty">${esc(target.label)}<br>相对引用按本地路径解析</div>`;
}

async function render(target) {
  // 导航 / 刷新 / 前进后退后自动收起手机端的菜单与抽屉。
  closeMobileChrome();
  status('正在加载…');
  try {
    if (target.kind === 'drives') await renderDrives();
    else if (target.kind === 'dir') await renderDir(target.path);
    else if (target.kind === 'zip') renderZip(target);
    else if (target.kind === 'preview') renderPreview(target);
    renderCrumbs(target);
    onRender(target);
    status('就绪 · 只读浏览');
  } catch (err) {
    showError(err);
  }
}

async function downloadFile(abs, name) {
  status(`正在下载 ${name}…`);
  const response = await fetch(apiUrl(`/api/download?path=${encodeURIComponent(abs)}`), {
    headers: authHeaders(),
    credentials: AUTH_MODE ? 'same-origin' : undefined,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
  const blob = await response.blob();
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  status('就绪 · 只读浏览');
}

function previewFile(abs, name, dir) {
  const ext = (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  if (!PREVIEW_EXT.has(ext)) return downloadFile(abs, name);
  return navigate({ kind: 'preview', scope: 'local', path: abs, dir, label: name, url: localToUrl(abs) });
}

// 解密 zip 成功后，如果密码库处于已解锁状态，把这次用到的密码按 zip 路径指纹存进库（用户已确认自动保存）。
async function tryAutoSaveVaultPassword(abs, name, password) {
  if (!abs) return;
  try {
    const saved = await saveZipPassword(abs, name, password);
    if (saved) status('密码已保存到密码库');
  } catch (err) {
    console.warn('自动保存密码失败（不影响浏览）', err);
  }
}

function askPassword(id, name, abs) {
  return new Promise((resolve) => {
    const modal = $('modal');
    const input = $('passwordInput');
    const okButton = $('modalOk');
    const cancelButton = $('modalCancel');
    const vaultButton = $('modalVault');
    $('modalHint').textContent = `${name} 已加密，输入密码后可以像普通目录一样浏览`;
    $('modalError').textContent = '';
    input.value = '';
    modal.classList.remove('hidden');
    input.focus();
    let settled = false;

    const cleanup = (value) => {
      if (settled) return;
      settled = true;
      okButton.removeEventListener('click', submit);
      cancelButton.removeEventListener('click', abort);
      input.removeEventListener('keydown', onKey);
      if (vaultButton) vaultButton.removeEventListener('click', fromVault);
      modal.classList.add('hidden');
      resolve(value);
    };
    const abort = () => cleanup(null);
    const onKey = (event) => {
      if (event.key === 'Enter') submit();
      if (event.key === 'Escape') abort();
    };
    const fromVault = () => {
      openVaultForPassword((password) => {
        input.value = password;
        submit();
      });
    };
    const submit = async () => {
      const password = input.value;
      if (!password || settled) return;
      okButton.disabled = true;
      let result;
      try {
        result = await api('/api/zip/unlock', {
          method: 'POST',
          body: JSON.stringify({ id, password }),
        });
      } catch (err) {
        result = { error: err.message };
      }
      okButton.disabled = false;
      if (result.ok) {
        cleanup(true);
        tryAutoSaveVaultPassword(abs, name, password);
      } else {
        $('modalError').textContent = result.error || '密码不正确';
        input.select();
      }
    };

    okButton.addEventListener('click', submit);
    cancelButton.addEventListener('click', abort);
    input.addEventListener('keydown', onKey);
    if (vaultButton) vaultButton.addEventListener('click', fromVault);
  });
}

// 加密压缩包需要密码时：若设置了缺省密码，先用它静默尝试；失败或不设置才弹出输入框。
async function attemptDefaultThenAsk(id, name, abs) {
  const def = getDefaultPassword();
  if (def) {
    try {
      const result = await api('/api/zip/unlock', {
        method: 'POST',
        body: JSON.stringify({ id, password: def }),
      });
      if (result.ok) {
        tryAutoSaveVaultPassword(abs, name, def);
        return true;
      }
    } catch {
      // 缺省密码不对，落到手动输入
    }
  }
  return askPassword(id, name, abs);
}

async function openZipFile(abs, name, dir) {
  status(`正在读取 ${name}…`);
  const encoding = FEATURES.encoding ? $('encoding')?.value : undefined;
  const info = await api('/api/zip/open', {
    method: 'POST',
    body: JSON.stringify({ path: abs, ...(encoding ? { encoding } : {}) }),
  });
  if (info.needsPassword) {
    const ok = await attemptDefaultThenAsk(info.id, name, abs);
    if (!ok) {
      await api('/api/zip/close', { method: 'POST', body: JSON.stringify({ id: info.id }) }).catch(() => {});
      status('已取消 · 只读浏览');
      return;
    }
  }
  navigate({
    kind: 'zip',
    id: info.id,
    zipName: name,
    zipDir: dir,
    zipPath: abs,
    entries: info.entries,
    current: `/zip/${info.id}/`,
  });
}

// 书签存的是「zip 磁盘路径 + 包内目录」，不存会话 id；跳转时重新开包再定位。
async function openZipBookmark({ zipPath, entry, label }) {
  status(`正在打开书签 ${label}…`);
  const name = winBasename(zipPath);
  const dir = winDirname(zipPath);
  const encoding = FEATURES.encoding ? $('encoding')?.value : undefined;
  const info = await api('/api/zip/open', {
    method: 'POST',
    body: JSON.stringify({ path: zipPath, ...(encoding ? { encoding } : {}) }),
  });
  if (info.needsPassword) {
    const ok = await attemptDefaultThenAsk(info.id, name, zipPath);
    if (!ok) {
      await api('/api/zip/close', { method: 'POST', body: JSON.stringify({ id: info.id }) }).catch(() => {});
      status('已取消 · 只读浏览');
      return;
    }
  }
  const suffix = entry ? `${entry.split('/').filter(Boolean).map(encodeURIComponent).join('/')}/` : '';
  navigate({
    kind: 'zip',
    id: info.id,
    zipName: name,
    zipDir: dir,
    zipPath,
    entries: info.entries,
    current: `/zip/${info.id}/${suffix}`,
  });
}

document.addEventListener('click', async (event) => {
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  // 行内勾选/删除控件优先处理，否则 closest 会落到带 data-action 的行上触发导航
  if (action.startsWith('trash-')) {
    await handleTrashAction(action, element, event);
    return;
  }
  if (action === 'row-menu') {
    openRowMenu(element);
    return;
  }
  if (action === 'row-menu-select') {
    const box = rowMenuHost?.querySelector('.trash-check');
    if (box) {
      box.click(); // 触发原有 trash-check 分支，保持批量选择集同步
      element.textContent = box.checked ? '✓ 已选中 · 点此取消' : '选中以批量删除';
    }
    return;
  }
  if (action === 'sort-size') {
    await cycleSizeSort();
    return;
  }
  if (action === 'fl-add') {
    const item = {
      path: element.dataset.path,
      name: element.dataset.name,
      size: Number(element.dataset.size) || 0,
      mtime: Number(element.dataset.mtime) || 0,
      dir: element.dataset.dir === '1',
    };
    if (item.dir) addFileListDir(item.path);
    else addPickedFromItem(item);
    return;
  }
  if (action === 'dl-add') {
    openDirListForItem({ path: element.dataset.path, name: element.dataset.name });
    return;
  }
  if (action === 'cr-add') {
    openCopyRefForItem({ path: element.dataset.path, name: element.dataset.name });
    return;
  }
  if (action === 'ex-open') {
    try {
      const result = await api('/api/explorer/open', {
        method: 'POST',
        body: JSON.stringify({ path: element.dataset.path }),
      });
      status(result.kind === 'dir'
        ? `已在资源管理器打开 ${result.path}`
        : `已在资源管理器中定位 ${result.path}`);
    } catch (err) {
      status(`打开资源管理器失败：${err.message}`, true);
    }
    return;
  }
  const target = current();
  const dir = target.kind === 'dir' ? target.path : (target.dir || target.zipDir);
  try {
    if (action === 'drive' || action === 'dir') {
      navigate({ kind: 'dir', path: element.dataset.path });
    } else if (action === 'crumb') {
      const crumbTarget = crumbTargets[Number(element.dataset.index)];
      if (crumbTarget) navigate(crumbTarget);
    } else if (action === 'zip') {
      await openZipFile(element.dataset.path, element.dataset.name, dir);
    } else if (action === 'file') {
      await previewFile(element.dataset.path, element.dataset.name, dir);
    } else if (action === 'zip-entry') {
      const id = element.dataset.id;
      navigate({ ...target, current: zipToUrl(id, element.dataset.path) });
    } else if (action === 'view') {
      viewMode = element.dataset.view === 'thumbs' ? 'thumbs' : 'list';
      syncLocation(false);
      render(current());
    } else if (action === 'zip-view') {
      const base = `/zip/${target.id}/`;
      navigate({ ...target, current: element.dataset.view === 'thumbs' ? `${base}?view=thumbs` : base });
    } else if (action === 'zip-root') {
      navigate({ ...target, current: `/zip/${element.dataset.id}/` });
    } else if (action === 'viewer-home') {
      if (target.kind === 'zip') navigate({ ...target, current: `/zip/${target.id}/` });
      else if (target.dir) navigate({ kind: 'dir', path: target.dir });
    } else if (action === 'viewer-new') {
      window.open(element.dataset.url, '_blank');
    }
  } catch (err) {
    showError(err);
  }
});

document.addEventListener('change', (event) => {
  const box = event.target.closest?.('.trash-check');
  if (!box || !box.checked || box.dataset.dir !== 'true') return;
  requestDirSize(box.dataset.path, box.dataset.name, true);
});

$('back').addEventListener('click', () => {
  if (!$('back').disabled) history.back();
});

$('forward').addEventListener('click', () => {
  if (!$('forward').disabled) history.forward();
});

$('refresh').addEventListener('click', () => render(current()));

$('encoding')?.addEventListener('change', () => {
  syncLocation(false);
  status('文件名编码设置将在下次打开压缩包时生效');
});

window.addEventListener('popstate', async (event) => {
  const snap = decodeLocation(location.hash);
  viewMode = snap?.view === 'thumbs' ? 'thumbs' : 'list';
  applyEncoding(snap?.enc);
  const saved = event.state;
  state.index = Number(saved?.index) || 0;
  // 后退时不能缩小已知的最大深度，否则「前进」会被误禁用
  state.depth = Math.max(state.depth, Number(saved?.depth) || 0, state.index);
  const target = (saved && saved.sig === location.hash && saved.target)
    ? saved.target
    : await buildTarget(snap?.t);
  state.target = target;
  syncLocation(false);
  updateNavButtons();
  render(target);
});

// 手动把别处复制来的位置粘到地址栏时，也要跟着切过去
window.addEventListener('hashchange', () => {
  if (history.state?.sig === location.hash) return;
  restore().catch(showError);
});

const selectionStore = createSelectionStore();
selectionStore.init().catch((err) => console.warn('selection store unavailable', err));

initAnnotations({
  navigate, openZipBookmark, status,
  // 收藏（含多标签页同步过来的变更）一变，就把 v2 清单重导一次。
  onMutate: () => scheduleSync(),
}).catch((err) => {
  console.warn('annotations store unavailable', err);
});

initManifestSync({
  getSnapshot: () => getAnnotationStore()?.snapshot() || null,
  getFileSelection: () => selectionStore.get('files'),
  getCopyRefs: () => selectionStore.get('copies'),
});

initManifestBuilder({
  api,
  status,
  store: selectionStore,
  getSnapshot: () => getAnnotationStore()?.snapshot() || null,
  getCurrentDir: () => {
    const target = current();
    return target.kind === 'dir' ? target.path : (target.dir || target.zipDir || '');
  },
});

initTrash({
  api,
  getDir: () => (current().kind === 'dir' ? current().path : ''),
  refresh: () => render(current()),
  status,
});

let prevVaultUnlocked = false;
initVault((snap) => {
  const btn = $('vaultBtn');
  if (!btn) return;
  if (snap.hasVault && !snap.locked) {
    btn.textContent = `密码库·已解锁`;
    btn.title = `密码库已解锁 · 共 ${snap.entries.length} 条（15 分钟或切后台后自动锁定）`;
  } else {
    btn.textContent = '密码库';
    btn.title = '打开密码库（KeePass 格式）';
  }
  // 解锁/锁定状态变化时，刷新当前目录或压缩包的封面（带/不带 vsid），让记录的密码即时生效或退出。
  const unlocked = snap.hasVault && !snap.locked;
  if (unlocked !== prevVaultUnlocked) {
    prevVaultUnlocked = unlocked;
    const t = current();
    if (t.kind === 'dir' || t.kind === 'zip') render(t);
  }
}).catch((err) => console.warn('vault init failed', err));

$('vaultBtn').addEventListener('click', () => openVault());

$('defPwBtn').addEventListener('click', () => openDefaultPasswordModal());

function applyHostUi() {
  const title = HOST.siteTitle || '文件浏览器';
  const brand = $('brandTitle');
  if (brand) brand.textContent = title;
  if (!location.hash) document.title = title;

  const encodingLabel = $('encoding')?.closest('label');
  if (encodingLabel && !FEATURES.encoding) encodingLabel.classList.add('hidden');

  const loginBtn = $('loginBtn');
  if (loginBtn) {
    // 已有登录态时（OpenList 在 index 注入 user）不再显示登录入口。
    loginBtn.classList.toggle('hidden', !FEATURES.login || !!HOST.user);
    if (HOST.user) loginBtn.title = `已登录：${HOST.user}`;
  }
  const adminBtn = $('adminBtn');
  if (adminBtn) adminBtn.classList.toggle('hidden', !FEATURES.admin);

  const bindHint = $('bindHint');
  if (bindHint) bindHint.textContent = HOST.user || '';
  const desc = $('statusDesc');
  if (desc) desc.textContent = LABELS.trashStatus || '浏览 · ';

  const warning = document.querySelector('#trashModal .trash-warning');
  if (warning && LABELS.trashWarning) warning.textContent = LABELS.trashWarning;
  const note = document.querySelector('#trashModal .modal-note');
  if (note && LABELS.trashNote) note.textContent = LABELS.trashNote;
  const confirm = $('trashConfirm');
  if (confirm && LABELS.trashAction) confirm.textContent = LABELS.trashAction;
}

applyHostUi();

$('loginBtn')?.addEventListener('click', () => showLogin(''));
$('loginClose')?.addEventListener('click', hideLogin);
$('loginCancel')?.addEventListener('click', hideLogin);
$('loginSubmit')?.addEventListener('click', () => { submitLogin().catch(() => {}); });
['loginUser', 'loginPass'].forEach((id) => {
  $(id)?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitLogin().catch(() => {});
    }
  });
});
$('adminBtn')?.addEventListener('click', () => {
  // 管理后台挂在站点根，不在宿主前缀之下。
  const root = String(BASE || '').replace(/\/zb$/, '');
  window.open(`${root || ''}/@manage`, '_blank', 'noopener');
});

restore().catch(showError);

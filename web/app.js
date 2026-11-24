import {
  encodeLocation,
  decodeLocation,
  compactTarget,
  localTargetFromCompact,
  winBasename,
  winDirname,
} from './location.js';
import { initAnnotations, onRender, getAnnotationStore } from './annotations-ui.js';
import { addTag, removeTag, rememberPath, listTags, keyForTarget } from './annotations-store.js';
import { tagEntries, matchTagEntries, tagCounts, filterTagCounts, pickTagForQuery } from './tag-filter.js';
import { initVault, openVault, openVaultForPassword, saveZipPassword, getVaultSessionId, getDefaultPassword, openDefaultPasswordModal } from './vault.js';
import { initManifestSync, scheduleSync, fetchLocalHostInfo, getDataGroupFs, getActiveDataGroup, waitForDataGroupFs } from './manifest-sync.js';
import { initDriveCache } from './drive-cache.js';
import { initManifestVolumeImport } from './manifest-volume-import.js';
import { initHostDisksPanel, hostDisksCacheInfo, hostDisksCachedDoc, cacheHostDisksDoc, restoreHostDisksFromCache, writeHostDisksDoc, rememberManualSerial } from './host-disks-panel.js';
import { loadHostDisksDoc, describeVirtual, describeTreePath, treePath, probeVolumeSources, readHideNoDisk, writeHideNoDisk, invalidateHostDisksDoc, volumeAliasesFor, setLocalVolumeAlias, applyManualDiskSerial, readPendingSerials, addPendingSerial, clearPendingSerial, applyDerivedSerials, attachVolumeAliases, partitionAliasesFor, setLocalPartitionAlias } from './host-disks-browser.js';
import { createSelectionStore, isDirSelected, isFileSelected, addDirSelection, removeDirSelection, removeFileDirSelection, removePickedFile, selectionPathKey } from './manifest-selection.js';
import { loadVolumeTree, findTreeNode } from './volume-tree.js';
import { addEntries as addUfsEntries, listYears as listUfsYears, readYear as readUfsYear, removeEntry as removeUfsEntry, UFS_ROOT } from './ufs-store.js';
import {
  initManifestBuilder, addPickedFromItem, addFileListDir, openCopyRefForItem,
  openDirListForItem, getCachedDirSummary,
} from './manifest-builder.js';
import {
  initTrash, resetTrashSelection, trashToolbarHtml,
  trashHeadStart, trashHeadEnd, trashRowStart, trashRowEnd,
  trashCardControls, trashChipControls, handleTrashAction,
  selectedItems, clearSelection,
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
let hdCrumbParts = [{ label: '主机磁盘（数据组）', path: '' }];

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
    html.push(`<button type="button" class="row-menu-option" data-action="row-menu-select">${box.checked ? '✓ 已选中 · 点此取消' : '选中这个条目'}</button>`);
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
    // 手机端「更多」已挪到面包屑行：菜单贴着按钮下沿展开，
    // 不再按 topbar 底边算，避免把菜单顶到屏幕最上面。
    const anchor = moreBtn || topbar;
    const bottom = Math.max(0, Math.round(anchor.getBoundingClientRect().bottom));
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

function cachedDirSize(path) {
  const direct = dirSizeCache.get(path);
  if (direct && typeof direct === 'object') return direct;
  // 「清单生成」的扫描会缓存整棵子树的 summaries，浏览页直接复用。
  const builder = getCachedDirSummary(path);
  if (builder) return builder;
  if (direct !== undefined) return direct;
  const wanted = pathKey(path);
  for (const [key, value] of dirSizeCache.entries()) {
    if (pathKey(key) === wanted) return value;
  }
  return undefined;
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
  const value = cachedDirSize(path);
  const wanted = pathKey(path);
  const elements = Array.from(document.querySelectorAll('[data-size-path]'))
    .filter((element) => pathKey(element.dataset.sizePath) === wanted);
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
  const paths = new Set();
  for (const element of document.querySelectorAll('[data-size-path]')) {
    if (element.dataset.sizePath) paths.add(element.dataset.sizePath);
  }
  for (const path of paths) {
    const value = cachedDirSize(path);
    if (value && typeof value === 'object') updateDirSizeDisplays(path);
  }
}

let activeDirSizeJob = null;

async function flushDirSizeQueue() {
  if (dirSizeRunning || !dirSizeQueue.size) return;
  const paths = Array.from(dirSizeQueue).slice(0, 40);
  for (const path of paths) dirSizeQueue.delete(path);
  dirSizeRunning = true;
  let jobId = '';
  let sawDone = false;
  let jobError = '';
  let lastPaint = 0;
  const controller = new AbortController();
  activeDirSizeJob = { controller, jobId: '' };
  try {
    // 一次任务可以带多个根目录；服务端全量递归，前端只拿进度和根汇总。
    const started = await api('/api/scan/jobs', {
      method: 'POST',
      body: JSON.stringify({
        paths: paths.map((path) => ({ path })),
        timeoutMs: 0,
      }),
    });
    jobId = started?.jobId || '';
    if (!jobId) throw new Error('扫描任务没有返回 jobId');
    activeDirSizeJob.jobId = jobId;
    await apiNdjson(`/api/scan/jobs/${encodeURIComponent(jobId)}/stream`, {
      signal: controller.signal,
      onEvent: (event) => {
        if (event?.type === 'progress') {
          const now = Date.now();
          if (now - lastPaint < 400) return;
          lastPaint = now;
          const dirs = Number(event.dirs) || 0;
          const files = Number(event.files) || 0;
          const bytes = Number(event.bytes) || 0;
          status(`正在扫描：${dirs.toLocaleString('zh-CN')} 个目录 / ${files.toLocaleString('zh-CN')} 个文件 / ${formatSize(bytes)}`);
          return;
        }
        if (event?.type === 'done') {
          sawDone = true;
          const results = Array.isArray(event.results) ? event.results : [];
          for (const path of paths) {
            const result = pickDirSummary({ roots: results, summaries: Object.fromEntries(results.map((item) => [item.path, item])) }, path);
            if (result) {
              dirSizeCache.set(path, {
                fileCount: Number(result.fileCount) || 0,
                totalSize: Number(result.totalSize) || 0,
                totalSizeOnDisk: Number(result.totalSizeOnDisk) || 0,
                partial: Boolean(result.partial || result.incomplete || result.sizePartial),
              });
            } else if (!(cachedDirSize(path) && typeof cachedDirSize(path) === 'object')) {
              dirSizeCache.set(path, 'error');
            }
            updateDirSizeDisplays(path, dirSizeNotify.get(path));
            dirSizeNotify.delete(path);
          }
          applyDirSizeCache();
          const root = results.find((item) => pathKey(item.path) === pathKey(paths[0]));
          if (root) status(`目录体积：${dirSizeDetail(root)}`);
          return;
        }
        if (event?.type === 'error') {
          jobError = event.error || '扫描任务失败';
        }
      },
    });
    if (!sawDone) throw new Error(jobError || '扫描连接提前结束');
  } catch (err) {
    if (err?.name === 'AbortError') {
      for (const path of paths) {
        if (dirSizeCache.get(path) === 'pending') dirSizeCache.delete(path);
        updateDirSizeDisplays(path, dirSizeNotify.get(path));
        dirSizeNotify.delete(path);
      }
    } else {
      for (const path of paths) {
        dirSizeCache.set(path, 'error');
        updateDirSizeDisplays(path, dirSizeNotify.get(path));
        dirSizeNotify.delete(path);
      }
      status(`目录体积读取失败：${err.message || err}`, true);
    }
  } finally {
    if (jobId && !sawDone) {
      // 页面切走后流已 abort，这里顺手通知服务端停止任务；失败不影响界面。
      api(`/api/scan/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', body: '{}' }).catch(() => {});
    }
    activeDirSizeJob = null;
    dirSizeRunning = false;
    if (dirSizeQueue.size) scheduleDirSizeFlush();
  }
}

function cancelActiveDirSizeScan() {
  if (!activeDirSizeJob) return;
  activeDirSizeJob.controller.abort();
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
  const cached = cachedDirSize(path);
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
    title="${dir ? '把这个目录的下一层子目录加入文件列表选择集' : '把该文件加入文件列表选择集'}">${dir ? '+ 目录下文件' : '+ 该文件'}</button>`;
}

// 文件列表 / 目录清单 / 手工文件三个选择集共用同一套持久化仓库；
// 文件浏览页用它给已选项加一个常驻标记，切换目录后仍能看到。
function dirPathKey(value) {
  return selectionPathKey(value);
}

// 父目录已选时，当前行是否也在它的范围内；非递归目录清单只覆盖直接子目录。
function dirSelectionCovers(entry, path) {
  const root = dirPathKey(entry?.path);
  const target = dirPathKey(path);
  if (!root || !target || !root.startsWith('/') && !/^[a-z]:\//.test(root)) return false;
  if (target === root) return true;
  if (!target.startsWith(`${root}/`)) return false;
  if (entry.recursive !== false) return true;
  const rest = target.slice(root.length + 1);
  return Boolean(rest) && !rest.includes('/');
}

function manifestSelectionState(item) {
  const fileSel = selectionStore.get('files');
  const dirSel = selectionStore.get('dirs');
  if (!item.dir) {
    return isFileSelected(fileSel, item.path)
      ? { kind: 'file', label: '文件', inherited: false }
      : null;
  }
  const fileRoot = (fileSel.dirs || []).find((entry) => dirSelectionCovers(entry, item.path));
  if (fileRoot) {
    return {
      kind: 'file',
      label: '文件',
      inherited: dirPathKey(fileRoot.path) !== dirPathKey(item.path),
    };
  }
  const dirRoot = (dirSel.dirs || []).find((entry) => dirSelectionCovers(entry, item.path));
  if (dirRoot) {
    return {
      kind: 'dir',
      label: '清单',
      inherited: dirPathKey(dirRoot.path) !== dirPathKey(item.path),
    };
  }
  return null;
}

function manifestSelectionBadge(item) {
  const state = manifestSelectionState(item);
  if (!state) return '';
  const title = state.kind === 'dir'
    ? (state.inherited ? '父目录已加入目录清单，本目录包含在内' : '本目录已加入目录清单')
    : (state.inherited ? '父目录已加入文件列表，本目录包含在内' : '本目录的文件已加入文件列表');
  const cls = `sel-pill ${state.kind}${state.inherited ? ' inherited' : ''}`;
  const text = `✓ ${state.label}${state.inherited ? '·含' : ''}`;
  // 精确选中的条目可直接点掉；继承自父目录的只提示来源，避免误删整棵父目录。
  if (state.inherited) {
    return `<span class="${cls}" title="${title}；要取消请到父目录或清单生成中操作">${text}</span>`;
  }
  return `<button type="button" class="${cls}" data-action="manifest-remove" data-kind="${state.kind}" data-item-dir="${item.dir ? '1' : '0'}" data-path="${esc(item.path)}" title="${title}；点击取消选择">${text} ×</button>`;
}

function manifestRowClass(item) {
  const state = manifestSelectionState(item);
  if (!state) return '';
  return state.inherited ? 'sel-row sel-row-inherited' : 'sel-row';
}

// 批量选择后的两个动作：目录按“下一层子目录”加入文件列表；
// 文件直接进文件列表；目录清单只接收目录。
async function addSelectedToFileList() {
  const items = selectedItems();
  if (!items.length) return;
  let count = 0;
  for (const item of items) {
    if (item.dir) {
      await addFileListDir(item.path);
    } else {
      addPickedFromItem(item);
    }
    count += 1;
  }
  clearSelection();
  status(`已把 ${count} 个选中项加入文件列表选择集`);
}

function addSelectedToDirList() {
  const dirs = selectedItems().filter((item) => item.dir);
  if (!dirs.length) {
    status('选中的项目里没有目录；目录清单只能加入目录', true);
    return;
  }
  const current = selectionStore.get('dirs');
  const recursive = current.options.recursive !== false;
  let next = current;
  for (const item of dirs) next = addDirSelection(next, item.path, recursive);
  selectionStore.set('dirs', next);
  clearSelection();
  status(`已把 ${dirs.length} 个目录加入${recursive ? '含所有子目录' : '仅本层'}的目录清单`);
}


// 目录自动标签（server/tag-rules.js 按直接子项名识别：.git→git、package.json→node…）
// 与用户自定义标签（annotations-store，落在 file-tags / zen-fs-config）在行上合并展示：
// 自动标签只读，自定义标签可点 × 移除，行尾「+标签」就地新增。
let lastDirAutoTags = new Map();
// 一次渲染内复用同一份收藏快照，避免每个目录行都深拷贝一遍 annotations。
let dirTagAnnoData = null;

function dirTagKey(path) {
  return keyForTarget({ kind: 'dir', path });
}

function manualTagsForDir(path) {
  const store = getAnnotationStore();
  const data = dirTagAnnoData || (store ? store.snapshot() : null);
  if (!data) return [];
  try {
    return listTags(data, dirTagKey(path));
  } catch {
    return [];
  }
}

function autoTagChip(tag) {
  return `<span class="tz-auto" title="自动标签：按目录的直接子项名识别（git / node / python 等），只读">${esc(tag)}</span>`;
}

function manualTagChip(tag, path) {
  return `<span class="tz-manual">${esc(tag)}<button type="button" class="tz-x" data-action="row-tag-remove" data-path="${esc(path)}" data-tag="${esc(tag)}" title="移除这个自定义标签">×</button></span>`;
}

function dirTagsHtml(item) {
  if (!item || !item.dir) return '';
  const auto = Array.isArray(item.tags) ? item.tags : (lastDirAutoTags.get(item.path) || []);
  const manual = manualTagsForDir(item.path).filter((tag) => !auto.includes(tag));
  const chips = [
    ...auto.map((tag) => autoTagChip(tag)),
    ...manual.map((tag) => manualTagChip(tag, item.path)),
  ].join('');
  return `<span class="row-tags" data-tag-path="${esc(item.path)}">${chips}<button type="button" class="tz-add" data-action="row-tag-add" data-path="${esc(item.path)}" title="给这个目录加自定义标签">+标签</button></span>`;
}

function refreshRowTags(path) {
  const auto = lastDirAutoTags.get(path) || [];
  document.querySelectorAll('.row-tags[data-tag-path]').forEach((node) => {
    if (node.dataset.tagPath !== path) return;
    node.outerHTML = dirTagsHtml({ dir: true, path, tags: auto });
  });
}

function commitRowTag(path, value) {
  const store = getAnnotationStore();
  const tags = String(value || '').split(/[,，、]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  if (!store || !path || !tags.length) return;
  const key = dirTagKey(path);
  const descriptor = { kind: 'dir', path, label: winBasename(path) || path };
  store.mutate((data) => {
    let next = rememberPath(data, key, descriptor);
    for (const tag of tags) next = addTag(next, key, tag);
    return next;
  });
  status(`已给「${descriptor.label}」加标签：${tags.join('、')}`);
  dirTagAnnoData = null;
  refreshRowTags(path);
}

function removeRowTag(path, tag) {
  const store = getAnnotationStore();
  if (!store || !path || !tag) return;
  store.mutate((data) => removeTag(data, dirTagKey(path), tag));
  status(`已移除标签：${tag}`);
  dirTagAnnoData = null;
  refreshRowTags(path);
}

function openRowTagInput(button) {
  const host = button.closest('.row-tags');
  if (!host || host.querySelector('.row-tag-input')) return;
  button.classList.add('hidden');
  const input = document.createElement('input');
  input.className = 'row-tag-input';
  input.maxLength = 32;
  input.placeholder = '标签名，回车确认';
  input.autocomplete = 'off';
  host.appendChild(input);
  input.focus();
  const finish = (commit) => {
    if (!input.isConnected) return;
    const value = input.value;
    input.remove();
    button.classList.remove('hidden');
    if (commit) commitRowTag(host.dataset.tagPath, value);
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
}

// 选择集在清单页、目录行按钮、右键菜单里都可能变化；只刷新标签，
// 不重列目录，避免把删除勾选状态一并清掉。
function refreshManifestBadges() {
  for (const row of document.querySelectorAll('tr[data-path]')) {
    const name = row.querySelector('.file-name');
    if (!name) continue;
    name.querySelectorAll('.tag-sel').forEach((tag) => tag.remove());
    let slot = name.querySelector('.sel-state');
    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'sel-state';
      name.prepend(slot);
    }
    const item = { path: row.dataset.path, dir: row.dataset.action === 'dir' };
    slot.innerHTML = manifestSelectionBadge(item);
    row.classList.toggle('sel-row', Boolean(slot.innerHTML));
    row.classList.toggle('sel-row-inherited', Boolean(name.querySelector('.sel-pill.inherited')));
  }
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
function ufsControl(item) {
  const name = item?.name || winBasename(item?.path || '');
  if (!name) return '';
  return `<button type="button" class="ufs-add" data-action="ufs-add" data-path="${esc(item.path || '')}"
    data-name="${esc(name)}" data-dir="${item.dir ? '1' : ''}" data-mtime="${esc(item.mtime || '')}"
    data-size="${esc(item.size ?? '')}" title="${item.dir ? '把这个目录及其所有子目录、文件加入 /ufs/' : '把这个文件加入 /ufs/'}">+ufs</button>`;
}

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

// 扫描任务用一条 NDJSON 长连接：进度与最终结果逐行到，避免等一个整包 JSON。
async function apiNdjson(url, { signal, onEvent } = {}) {
  const response = await fetch(apiUrl(url), {
    headers: authHeaders(),
    signal,
    credentials: AUTH_MODE ? 'same-origin' : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (!response.body) throw new Error('浏览器不支持流式响应');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const emit = (line) => {
    const text = line.trim();
    if (!text) return;
    let event;
    try { event = JSON.parse(text); } catch { return; }
    if (typeof onEvent === 'function') onEvent(event);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) emit(line);
  }
  buffer += decoder.decode();
  if (buffer) emit(buffer);
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
  cancelActiveDirSizeScan();
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
  stage.classList.remove('list-mode');
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

  if (target.kind === 'hd') {
    for (const part of hdCrumbParts) parts.push({ label: part.label, target: { kind: 'hd', path: part.path } });
  } else if (target.kind === 'tags') {
    parts.push({ label: '标签视图' });
  } else if (target.kind === 'ufs') {
    parts.push({ label: 'UFS 虚拟网盘', target: { kind: 'ufs', path: UFS_ROOT } });
    const year = /^\/ufs\/(\d{4})/.exec(target.path || '')?.[1];
    if (year) parts.push({ label: year });
  } else if (target.kind === 'dir' || (target.kind === 'preview' && target.scope === 'local')) {
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
  $('mode').textContent = target.kind === 'zip' ? '压缩包内'
    : (target.kind === 'preview' ? '文件预览'
      : (target.kind === 'hd' ? '数据组视图'
        : (target.kind === 'tags' ? '标签视图'
          : (target.kind === 'ufs' ? 'UFS 虚拟网盘' : (LABELS.mode || '本地磁盘')))));
  const label = parts[parts.length - 1].label;
  const siteTitle = HOST.siteTitle || '文件浏览器';
  document.title = label === rootLabel ? siteTitle : `${label} · ${siteTitle}`;
}

/** 本机卷身份（/api/hostinfo）：读一次缓存 30s，避免每次进「此电脑」都重新跑 vol / fsutil 探测。 */
let localHostCache = { at: 0, value: null };
async function localHostInfoFor(ttl = 30000) {
  if (localHostCache.value && Date.now() - localHostCache.at < ttl) return localHostCache.value;
  try {
    const info = await fetchLocalHostInfo();
    localHostCache = { at: Date.now(), value: info };
    return info;
  } catch {
    // 读不到（兼容层没有 /api/hostinfo）时沿用上次结果；一次都没有就返回 null，磁盘列表照常显示。
    return localHostCache.value;
  }
}

// 标签视图：只认手动标签（annotations），列出带选中标签的目录。
// 本机目录可逐级展开（/api/list），zip 内目录直接跳转打开压缩包。
const TAG_VIEW_LIMIT = 300;
const tagExpandState = new Map();
// 标签云过滤输入框的值（只用于收窄标签云，不进 hash）；tagViewFocus 用于回车选中后把焦点还回输入框。
let tagViewQuery = '';
let tagViewFocus = false;

function tagCloudChipsHtml(counts, selection, query) {
  const visible = filterTagCounts(counts, query);
  if (!counts.length) return '<span class="tv-empty-inline">还没有标签</span>';
  if (!visible.length) return `<span class="tv-empty-inline">没有匹配「${esc(query)}」的标签</span>`;
  return visible.map((item) => {
    const active = selection.tags.includes(item.tag);
    return `<button type="button" class="tv-cloud-chip${active ? ' active' : ''}" data-action="tags-pick" data-tag="${esc(item.tag)}">${esc(item.tag)} <span>${item.count}</span></button>`;
  }).join('');
}

function tagViewSelection(target) {
  return {
    tags: Array.isArray(target?.tags) ? target.tags.filter(Boolean) : [],
    mode: target?.mode === 'or' ? 'or' : 'and',
  };
}

function tagViewSnapshot() {
  const store = getAnnotationStore();
  return store ? store.snapshot() : { tags: {}, paths: {} };
}

function tvChipHtml(tag, key) {
  return `<span class="tv-chip">${esc(tag)}<button type="button" data-action="tags-remove" data-key="${esc(key)}" data-tag="${esc(tag)}" title="移除这个标签">×</button></span>`;
}

function tvArrow(key, open, canExpand) {
  if (!canExpand) return '<span class="tv-arrow tv-arrow-gap"></span>';
  return `<button type="button" class="tv-arrow${open ? ' open' : ''}" data-action="tags-expand" data-key="${esc(key)}" title="${open ? '收起' : '展开这个目录'}">${open ? '▾' : '▸'}</button>`;
}

function tvChildrenHtml(key, depth) {
  const expand = tagExpandState.get(key);
  if (!expand) return '';
  if (expand.loading && !expand.items) return `<div class="tv-children"><div class="tv-empty">正在读取…</div></div>`;
  if (expand.error) return `<div class="tv-children"><div class="tv-empty tv-error">${esc(expand.error)}</div></div>`;
  const items = expand.items || [];
  if (!items.length) return `<div class="tv-children"><div class="tv-empty">空目录</div></div>`;
  const data = tagViewSnapshot();
  return `<div class="tv-children">${items.map((item) => tvChildRowHtml(item, depth, data)).join('')}</div>`;
}

function tvChildRowHtml(item, depth, data) {
  const expand = tagExpandState.get(item.key);
  const open = Boolean(expand?.open);
  const tags = item.dir && !String(item.key).startsWith('vol:')
    ? (data?.tags?.[keyForTarget({ kind: 'dir', path: item.path })] || [])
    : [];
  const action = item.dir
    ? `data-action="tags-expand" data-key="${esc(item.key)}"`
    : '';
  return `<div class="tv-node">
    <div class="tv-row tv-child${open ? ' open' : ''}" ${action} style="--tv-depth:${depth}">
      ${tvArrow(item.key, open, Boolean(item.dir))}
      <span class="icon ${item.dir ? 'icon-dir' : 'icon-file'}"></span>
      <span class="tv-name">${esc(item.name)}</span>
      ${item.dir ? '' : `<span class="tv-meta">${esc(formatSize(item.size))}</span>`}
      <span class="tv-tags">${tags.map((tag) => tvChipHtml(tag, item.key)).join('')}</span>
    </div>
    ${item.dir && open ? tvChildrenHtml(item.key, depth + 1) : ''}
  </div>`;
}

function tvEntryHtml(entry) {
  const expand = tagExpandState.get(entry.key);
  const open = Boolean(expand?.open);
  const canExpand = entry.kind === 'dir' || entry.kind === 'volume';
  const pos = entry.kind === 'volume'
    ? `卷 ${entry.volumeId} / ${entry.path}`
    : `${entry.path}${entry.entry ? ` / ${entry.entry}` : ''}`;
  const action = canExpand
    ? `data-action="tags-expand" data-key="${esc(entry.key)}"`
    : `data-action="tags-open-zip" data-key="${esc(entry.sourceKey || entry.key)}"`;
  return `<div class="tv-node">
    <div class="tv-row${open ? ' open' : ''}" ${action}>
      ${tvArrow(entry.key, open, canExpand)}
      <span class="icon ${canExpand ? 'icon-dir' : 'icon-file'}"></span>
      <span class="tv-name">${esc(entry.label)}</span>
      <span class="tv-path" title="${esc(pos)}">${esc(pos)}</span>
      <span class="tv-tags">${entry.tags.map((tag) => tvChipHtml(tag, entry.sourceKey || entry.key)).join('')}</span>
    </div>
    ${canExpand && open ? tvChildrenHtml(entry.key, 1) : ''}
  </div>`;
}

function tagListHtml(entries, target) {
  if (!entries.length) {
    return '<div class="tv-empty">还没有任何手动标签。在目录行上点「+标签」加一个，再回到这里筛选。</div>';
  }
  const selection = tagViewSelection(target);
  if (!selection.tags.length) {
    return `<div class="tv-empty">从上面的标签里选一个或多个（${selection.mode === 'and' ? '同时包含' : '任一包含'}），这里会列出带这些标签的目录。</div>`;
  }
  const matched = matchTagEntries(entries, selection.tags, selection.mode);
  if (!matched.length) {
    return `<div class="tv-empty">没有${selection.mode === 'and' ? '同时' : ''}带「${esc(selection.tags.join('、'))}」的目录。</div>`;
  }
  const shown = matched.slice(0, TAG_VIEW_LIMIT);
  const more = matched.length > shown.length
    ? `<div class="tv-empty">还有 ${matched.length - shown.length} 个未显示，请缩小标签范围。</div>`
    : '';
  return `<div class="tv-summary">${matched.length} 个目录${selection.mode === 'and' ? '同时带全部选中标签' : '带任一选中标签'}${matched.length > shown.length ? `（只显示前 ${shown.length} 个）` : ''}</div>
    ${shown.map((entry) => tvEntryHtml(entry)).join('')}${more}`;
}

function paintTagList() {
  const list = document.getElementById('tvList');
  if (!list) return;
  const target = current();
  if (!target || target.kind !== 'tags') return;
  list.innerHTML = tagListHtml(tagEntries(tagViewSnapshot()), target);
}

function renderTagView(target) {
  const data = tagViewSnapshot();
  const entries = tagEntries(data);
  const counts = tagCounts(entries);
  const selection = tagViewSelection(target);
  // 标签视图也是「工具条 + 可滚动列表」：stage 进入 list-mode 后 stage-scroll 才有
  // 受限高度并自己接管滚轮；否则 overscroll-behavior: contain 会吞掉滚动且父层不动。
  stage.classList.add('list-mode');
  stage.innerHTML = `<div class="stage-tools tv-tools">
      <span class="tv-tools-label">标签</span>
      <input id="tvTagInput" class="tv-tag-input" type="text" placeholder="筛选标签，回车选中" autocomplete="off" value="${esc(tagViewQuery)}">
      <div class="tv-cloud" id="tvCloud">${tagCloudChipsHtml(counts, selection, tagViewQuery)}</div>
      <div class="tv-actions">
        <button type="button" class="tv-mini${selection.mode === 'or' ? ' active' : ''}" data-action="tags-mode" title="切换多标签匹配方式">${selection.mode === 'and' ? '同时包含' : '任一包含'}</button>
        <button type="button" class="tv-mini" data-action="tags-clear"${selection.tags.length ? '' : ' disabled'}>清空</button>
      </div>
    </div>
    <div class="stage-scroll"><div class="tv-list" id="tvList">${tagListHtml(entries, target)}</div></div>`;
  sidebar.innerHTML = `<div class="side-title">标签视图</div>
    <div class="side-empty">${entries.length ? `共 ${entries.length} 个带标签的目录` : '还没有带标签的目录'}</div>
    <div id="tvTagSide"></div>`;
  const input = document.getElementById('tvTagInput');
  if (input) {
    input.addEventListener('input', () => {
      tagViewQuery = input.value;
      const cloud = document.getElementById('tvCloud');
      if (cloud) cloud.innerHTML = tagCloudChipsHtml(counts, tagViewSelection(current()), tagViewQuery);
      paintTagSideList(counts, tagViewSelection(current()), tagViewQuery);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        tagViewQuery = '';
        input.value = '';
        render(current()).catch(showError);
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      const { pick, matches, exact } = pickTagForQuery(counts, query);
      if (!pick) {
        status(`没有标签「${query}」`, true);
        return;
      }
      tagViewFocus = true;
      if (!exact && matches > 1) status(`匹配到 ${matches} 个标签，已选中「${pick}」`);
      toggleTagSelection(pick);
    });
    if (tagViewFocus) {
      tagViewFocus = false;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
  paintTagSideList(counts, selection, tagViewQuery);
}

function paintTagSideList(counts, selection, query) {
  const side = document.getElementById('tvTagSide');
  if (!side) return;
  const visible = filterTagCounts(counts, query);
  const keyword = String(query || '').trim();
  side.innerHTML = `${counts.length ? '<div class="side-title side-sub">全部标签</div>' : ''}
    ${visible.length ? visible.map((item) => `<div class="side-item${selection.tags.includes(item.tag) ? ' active' : ''}" data-action="tags-pick" data-tag="${esc(item.tag)}">${selection.tags.includes(item.tag) ? '· ' : ''}${esc(item.tag)} <span class="anno-count">${item.count}</span></div>`).join('') : (keyword ? '<div class="side-empty">没有匹配的标签</div>' : '')}`;
}

function toggleTagSelection(tag) {
  const target = current();
  if (!target || target.kind !== 'tags' || !tag) return;
  const tags = tagViewSelection(target).tags.slice();
  const index = tags.indexOf(tag);
  if (index >= 0) tags.splice(index, 1);
  else tags.push(tag);
  target.tags = tags;
  syncLocation(false);
  render(current()).catch(showError);
}

function toggleTagMode() {
  const target = current();
  if (!target || target.kind !== 'tags') return;
  target.mode = tagViewSelection(target).mode === 'or' ? 'and' : 'or';
  syncLocation(false);
  render(current()).catch(showError);
}

/**
 * 本机目录不存在但数据组里可能有它的清单：按盘符 + 相对路径在 struct 卷树里找回
 * 只读位置（/tree/<volumeId>/<相对路径>）。找不到返回 null，调用方仍显示原错误。
 */
async function treePathForLocalPath(localPath) {
  const match = /^([A-Za-z]):\\(.*)$/.exec(String(localPath || '').trim());
  if (!match) return null;
  const letter = `${match[1].toUpperCase()}:`;
  const segments = match[2].split('\\').filter(Boolean);
  const live = await loadHostDisksDoc();
  const volumes = Array.isArray(live.doc?.volumes) ? live.doc.volumes : [];
  const sameLetter = volumes.filter((vol) => {
    const drive = String(vol.drive || vol.letter || '').toUpperCase();
    return drive === letter || drive === letter.slice(0, 1);
  });
  const candidates = sameLetter.length ? sameLetter : volumes.slice(0, 8);
  for (const vol of candidates) {
    const volumeId = vol.volumeId || vol.id;
    if (!volumeId) continue;
    const loaded = await loadVolumeTree(volumeId).catch(() => null);
    if (loaded?.ok && findTreeNode(loaded.tree || [], segments)) {
      return treePath(volumeId, segments.join('/'));
    }
  }
  return null;
}

async function toggleTagExpand(key) {
  if (!key) return;
  const expand = tagExpandState.get(key) || { open: false, items: null, error: '', loading: false };
  if (expand.open) {
    expand.open = false;
    tagExpandState.set(key, expand);
    paintTagList();
    return;
  }
  expand.open = true;
  tagExpandState.set(key, expand);
  if (!expand.items && !expand.loading) {
    expand.loading = true;
    paintTagList();
    try {
      if (String(key).startsWith('vol:')) {
        const match = /^vol:([^/]+)(\/.*)?$/.exec(key);
        const volumeId = match?.[1] || '';
        const rel = match?.[2] || '';
        const loaded = await loadVolumeTree(volumeId);
        if (!loaded.ok) throw new Error(loaded.error || '读不到这个卷的目录树');
        const node = findTreeNode(loaded.tree, rel.split('/').filter(Boolean));
        if (!node) throw new Error(`卷里找不到目录 ${rel || '/'}`);
        expand.items = (node.children || []).map((child) => ({
          name: child.name,
          key: `${key}/${child.name}`,
          path: `${rel}/${child.name}`,
          dir: child.type !== 'file',
          size: child.size,
        }));
      } else {
        // annotations 的 key 是 fs:<本地路径> 这类目标键，不是可直接给 /api/list 的路径；
        // 本机目录要用条目上的 path 去列目录，否则服务端会报 invalid windows path。
        const entry = tagEntries(tagViewSnapshot()).find((item) => item.key === key);
        const localPath = entry?.path || key;
        const result = await api(`/api/list?path=${encodeURIComponent(localPath)}`);
        expand.items = (Array.isArray(result.items) ? result.items : [])
          .map((item) => ({ ...item, key: item.path }));
      }
      expand.error = '';
    } catch (err) {
      expand.items = [];
      const msg = err?.message || String(err);
      // 本机没有这个目录（常见于别的机器打了标签后同步过来）：如果数据组 struct
      // 里有对应路径，直接切到只读卷树，而不是只给一行 ENOENT。
      if (/ENOENT|no such file/i.test(msg) && !String(key).startsWith('vol:')) {
        const entry = tagEntries(tagViewSnapshot()).find((item) => item.key === key);
        const localPath = entry?.path || key;
        const virtual = await treePathForLocalPath(localPath).catch(() => null);
        if (virtual) {
          expand.open = false;
          expand.loading = false;
          tagExpandState.set(key, expand);
          status(`本机没有 ${localPath}，已切到数据组只读结构`);
          navigate({ kind: 'hd', path: virtual });
          return;
        }
      }
      expand.error = `读取失败：${msg}`;
    }
    expand.loading = false;
    tagExpandState.set(key, expand);
  }
  paintTagList();
}

function removeTagInView(key, tag) {
  const store = getAnnotationStore();
  if (!store || !key || !tag) return;
  store.mutate((data) => removeTag(data, key, tag));
  status(`已移除标签：${tag}`);
  render(current()).catch(showError);
}

function describeKeyForTags(key) {
  const entry = tagEntries(tagViewSnapshot()).find((item) => item.key === key);
  if (!entry || entry.kind !== 'zip' || !entry.zipPath) return null;
  return { kind: 'zip', zipPath: entry.zipPath, entry: entry.entry, label: entry.label };
}

let ufsView = { path: UFS_ROOT, entries: [] };

function ufsYearPath(year) {
  return `${UFS_ROOT}/${year}`;
}

async function flushUfs() {
  const group = await getActiveDataGroup().catch(() => null);
  if (group && typeof group.flush === 'function') await group.flush().catch(() => {});
}

function ufsRowHtml(entry) {
  const icon = entry.type === 'dir' ? 'icon-dir' : 'icon-file';
  const src = entry.source || {};
  const where = src.kind === 'volume'
    ? (src.path || `卷 ${src.volumeId || ''}${src.rel ? `/${src.rel}` : ''}`)
    : (src.kind === 'zip' ? `${src.zipPath || ''}${src.entry ? ` / ${src.entry}` : ''}` : (src.path || ''));
  const meta = [
    where,
    entry.size != null ? formatSize(entry.size) : null,
    entry.addedAt ? `加入 ${new Date(entry.addedAt).toLocaleDateString('zh-CN')}` : null,
  ].filter(Boolean).join(' · ');
  return `<div class="ufs-row" data-action="ufs-entry" data-id="${esc(entry.id)}" style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--border);cursor:pointer">
    <span class="icon ${icon}"></span>
    <span class="ufs-name" style="font-size:13px">${esc(entry.name)}</span>
    <span class="ufs-meta" style="flex:1;min-width:0;font-size:10px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(meta)}">${esc(meta)}</span>
    <button type="button" data-action="ufs-remove" data-id="${esc(entry.id)}" title="只删除 /ufs/ 里的这条登记，不碰原文件">移出</button>
  </div>`;
}

async function renderUfs(target) {
  const fs = getDataGroupFs();
  const path = target.path || UFS_ROOT;
  stage.classList.remove('list-mode');
  if (!fs) {
    ufsView = { path, entries: [] };
    stage.innerHTML = `<h2 class="stage-title">UFS · 虚拟网盘</h2>
      <p class="stage-hint">数据同步组还没就绪，/ufs/ 的索引暂时读不到。连接建立后刷新即可。</p>`;
    return;
  }
  if (path === UFS_ROOT || path === '/ufs/') {
    const years = await listUfsYears(fs);
    ufsView = { path: UFS_ROOT, entries: [] };
    const rows = [];
    for (const year of years) {
      const info = await readUfsYear(fs, year);
      rows.push(`<div class="ufs-year" data-action="ufs-year" data-path="${esc(ufsYearPath(year))}" style="display:flex;align-items:center;gap:8px;padding:10px 4px;border-bottom:1px solid var(--border);cursor:pointer">
        <span class="icon icon-dir"></span>
        <span style="font-size:13px">${esc(year)}</span>
        <span style="font-size:10px;color:var(--text-3)">${info.entries.length} 项 · ${info.shards} 份分片${info.broken ? ` · ${info.broken} 份读取失败` : ''}</span>
      </div>`);
    }
    stage.innerHTML = `<h2 class="stage-title">UFS · 虚拟网盘</h2>
      <p class="stage-hint">目录按加入年、文件按最后修改年分年份；每次加入生成一份新分片，读取时合并，不改写已有文件。</p>
      ${rows.length ? rows.join('') : '<p class="stage-hint">还没有任何条目。在目录/文件行上点「+ufs」加入。</p>'}`;
    return;
  }
  const match = /^\/ufs\/(\d{4})\/?$/.exec(path);
  const year = match?.[1];
  if (!year) throw new Error(`无效的 /ufs/ 路径：${path}`);
  const info = await readUfsYear(fs, year);
  ufsView = { path, entries: info.entries };
  stage.innerHTML = `<h2 class="stage-title">UFS · ${esc(year)}</h2>
    <p class="stage-hint">${info.entries.length} 项，来自 ${info.shards} 份分片${info.broken ? ` · ${info.broken} 份读取失败已跳过` : ''}。目录按加入年、文件按最后修改年归档。</p>
    ${info.entries.length ? info.entries.map((entry) => ufsRowHtml(entry)).join('') : '<p class="stage-hint">这一年还没有条目。</p>'}`;
}

/**
 * 本机路径 → 全局卷路径（volumeId + 卷内相对路径）。
 * /ufs/ 只存这种跨设备稳定的地址，不把 C:\ 这类本机盘符写进索引。
 */
function relInVolume(abs) {
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(String(abs || '').trim());
  if (!match) return null;
  return {
    letter: `${match[1].toUpperCase()}:`,
    rel: match[2].split(/[\\/]+/).filter(Boolean).join('/'),
  };
}

async function localVolumeForPath(abs) {
  const parsed = relInVolume(abs);
  if (!parsed) return null;
  const info = await localHostInfoFor().catch(() => null);
  const volumeId = info?.volumes?.[parsed.letter[0]];
  if (!volumeId) return null;
  return { volumeId, rel: parsed.rel };
}

async function localPathForVolume(volumeId, rel) {
  const info = await localHostInfoFor().catch(() => null);
  for (const [letter, id] of Object.entries(info?.volumes || {})) {
    if (id !== volumeId) continue;
    const parts = String(rel || '').split('/').filter(Boolean);
    return `${letter}:\\${parts.join('\\')}`;
  }
  return null;
}

function volumeSource(volumeId, rel) {
  return { kind: 'volume', volumeId, rel, path: treePath(volumeId, rel) };
}

/**
 * 递归收集本机目录下的所有子目录与文件（只登记指针，不读文件内容）。
 * 子目录不可读时跳过，根目录不可读则直接失败；用大小写归一后的路径防 junction 绕回。
 */
async function collectLocalTree(root) {
  const out = [];
  const queue = [root];
  const seen = new Set();
  let scanned = 0;
  while (queue.length) {
    const dir = queue.shift();
    const key = dir.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let data;
    try {
      data = await api(`/api/list?path=${encodeURIComponent(dir)}`);
    } catch (err) {
      if (dir === root) throw err;
      continue;
    }
    for (const item of Array.isArray(data.items) ? data.items : []) {
      if (!item?.path) continue;
      out.push(item);
      if (item.dir) queue.push(item.path);
    }
    scanned += 1;
    if (scanned % 20 === 0) status(`正在收集 ${root} 下的子项… 已发现 ${out.length} 项`);
  }
  return out;
}

async function addUfsFromElement(element) {
  // 数据组连接晚于首屏：点得早时等它一下，别直接丢一次加入。
  let fs = getDataGroupFs();
  if (!fs) {
    status('等待数据同步组就绪…');
    fs = await waitForDataGroupFs(30000);
  }
  if (!fs) {
    status('数据同步组还没就绪，暂时不能加入 /ufs/', true);
    return;
  }
  const path = element.dataset.path || '';
  const name = element.dataset.name || winBasename(path);
  const dir = element.dataset.dir === '1';
  const mtime = Number(element.dataset.mtime) || null;
  const size = element.dataset.size === '' ? null : Number(element.dataset.size);
  const global = await localVolumeForPath(path);
  if (!global) {
    status(`无法生成全局路径：${path} 所在磁盘没有卷 ID`, true);
    return;
  }
  const now = Date.now();
  const raws = [{
    name,
    type: dir ? 'dir' : 'file',
    source: volumeSource(global.volumeId, global.rel),
    addedAt: now,
    mtime: dir ? null : mtime,
    size: dir ? null : (Number.isFinite(size) ? size : null),
  }];
  if (dir) {
    // 目录加入 = 目录本身 + 其下所有子目录/文件；目录统一归入本次加入年，文件按各自 mtime。
    // 子项同样落成“卷 ID + 卷内相对路径”，不写本机盘符。
    const children = await collectLocalTree(path);
    for (const item of children) {
      const child = relInVolume(item.path);
      if (!child) continue;
      raws.push({
        name: item.name,
        type: item.dir ? 'dir' : 'file',
        source: volumeSource(global.volumeId, child.rel),
        addedAt: now,
        mtime: item.dir ? null : (Number(item.mtime) || null),
        size: item.dir ? null : (Number.isFinite(Number(item.size)) ? Number(item.size) : null),
      });
    }
  }
  const result = await addUfsEntries(fs, raws);
  await flushUfs();
  const rootEntry = result.entries[0];
  const year = dir
    ? new Date(rootEntry.addedAt).getFullYear()
    : (rootEntry.mtime ? new Date(rootEntry.mtime).getFullYear() : new Date(rootEntry.addedAt).getFullYear());
  status(dir && raws.length > 1
    ? `已加入 /ufs/${year}/${name}：目录本身 + ${raws.length - 1} 个子项，生成 ${result.shards.length} 份分片`
    : `已加入 /ufs/${year}/${rootEntry.name}`);
  if (current().kind === 'ufs') render(current()).catch(showError);
}

async function openUfsEntry(entry) {
  if (!entry) return;
  const src = entry.source || {};
  if (entry.type === 'dir') {
    if (src.kind === 'volume' && src.volumeId) {
      const local = await localPathForVolume(src.volumeId, src.rel || '');
      if (local) {
        try {
          await api(`/api/list?path=${encodeURIComponent(local)}`);
          navigate({ kind: 'dir', path: local });
          return;
        } catch { /* 本机没有这个卷或目录，退回只读卷树 */ }
      }
      navigate({ kind: 'hd', path: treePath(src.volumeId, src.rel || '') });
      return;
    }
    if (src.kind === 'local' && src.path) {
      try {
        await api(`/api/list?path=${encodeURIComponent(src.path)}`);
        navigate({ kind: 'dir', path: src.path });
      } catch {
        const virtual = await treePathForLocalPath(src.path).catch(() => null);
        if (virtual) {
          status(`本机没有 ${src.path}，已切到数据组只读结构`);
          navigate({ kind: 'hd', path: virtual });
          return;
        }
        throw new Error(`来源目录不可用：${src.path}`);
      }
      return;
    }
    throw new Error('这个目录没有可用的来源');
  }
  if (src.kind === 'zip' && src.zipPath) {
    await openZipBookmark({ zipPath: src.zipPath, entry: src.entry || '', label: entry.name });
    return;
  }
  if (src.kind === 'volume' && src.volumeId) {
    const local = await localPathForVolume(src.volumeId, src.rel || '');
    if (local) {
      await previewFile(local, entry.name, winDirname(local));
      return;
    }
    const parent = String(src.rel || '').split('/').filter(Boolean).slice(0, -1).join('/');
    navigate({ kind: 'hd', path: treePath(src.volumeId, parent) });
    status('这个文件所在的卷不在本机，已显示所在目录的只读结构');
    return;
  }
  if (src.kind === 'local' && src.path) {
    await previewFile(src.path, entry.name, winDirname(src.path));
    return;
  }
  throw new Error('这个文件没有可用的来源');
}

async function removeUfsById(id) {
  const fs = getDataGroupFs();
  if (!fs || !id) return;
  const removed = await removeUfsEntry(fs, id);
  await flushUfs();
  status(removed ? `已从 /ufs/ 移出（删除 ${removed} 份分片）` : '没有找到对应分片');
  if (current().kind === 'ufs') render(current()).catch(showError);
}

async function renderDrives() {
  const [{ drives, networkDrives }, hdState] = await Promise.all([
    api('/api/drives'),
    loadHostDisksDoc(),
  ]);
  // 本机卷身份不参与这个 await：/api/hostinfo 要跑 PowerShell + vol，慢的时候能把「此电脑」拖住几秒。
  // 先用缓存里的值渲染，取到之后再补到卡片/侧栏上（冷启动时预热点已经在后台拉过一次）。
  const hostInfo = localHostCache.value;
  const hostInfoPending = localHostInfoFor();
  const volumeTagOf = (id) => (id
    ? `<br><span class="drive-volume" title="卷根的 .dir-struct-id；没有标记文件时回退 Windows 卷序列号">卷 ID <code>${esc(id)}</code></span>`
    : '');
  const registered = Array.isArray(networkDrives) ? networkDrives : [];
  const hdDoc = hdState.doc;
  const hdMeta = hdDoc
    ? `主机 ${hdDoc.hosts?.length || 0} · 卷 ${hdDoc.volumes?.length || 0}${hdDoc.generatedAt ? ` · 更新 ${esc(hdDoc.generatedAt)}` : ''}`
    : '未写回数据组（点顶部「主机磁盘」读取并写回）';
  const mounts = HOST.drivesMode === 'mounts';
  const cards = drives.map((drive) => {
    const used = drive.total ? Math.round(((drive.total - drive.free) / drive.total) * 100) : 0;
    // 本机卷身份：与「主机磁盘」归并里用的同一个 volumeId（.dir-struct-id / Windows 卷序列号）。
    const letter = String(drive.letter || '').toUpperCase();
    const localVolumeId = hostInfo?.volumes?.[letter] || null;
    const volumeTag = volumeTagOf(localVolumeId);
    if (mounts) {
      const label = drive.label || drive.path || '存储';
      const volumeID = volumeTagOf(drive.volumeId || localVolumeId);
      return `<div class="drive-card" data-action="drive" data-path="${esc(drive.path)}" data-name="${esc(label)}">
        <div class="drive-head"><span class="drive-letter"><span class="icon icon-dir"></span></span><span class="drive-name">${esc(label)}</span></div>
        <div class="drive-bar"><div style="width:${used}%"></div></div>
        <div class="drive-meta">${drive.total ? `${formatSize(drive.free)} 可用 / ${formatSize(drive.total)}` : '容量未知'} · ${esc(drive.kind || '存储')}<br><code>${esc(drive.path || '')}</code>${volumeID}</div>
      </div>`;
    }
    const kindClass = drive.kind === '可移动' ? ' removable' : (drive.kind === '网络映射' ? ' network' : '');
    const label = drive.label || drive.kind;
    return `<div class="drive-card" data-action="drive" data-path="${esc(drive.path)}" data-name="${esc(label)}" data-drive-letter="${esc(letter)}"${localVolumeId ? ` title="${esc(`${drive.letter}: · 卷 ID ${localVolumeId}`)}"` : ''}>
      <div class="drive-head"><span class="drive-letter${kindClass}">${drive.letter}:</span><span class="drive-name">${esc(label)}</span></div>
      <div class="drive-bar"><div style="width:${used}%"></div></div>
      <div class="drive-meta">${drive.total ? `${formatSize(drive.free)} 可用 / ${formatSize(drive.total)}` : '容量未知'} · ${esc(drive.kind)}${volumeTag}</div>
    </div>`;
  }).join('');

  // 网络存储只有登记信息、没有本地路径，因此渲染成不可进入的只读卡片。
  const networkCards = registered.map((item) => {
    const name = item.label || item.backend || item.dir;
    const fields = [
      ['总容量', item.total],
      ['剩余', item.free],
      ['上行/月', item.upQuota],
      ['下行/月', item.downQuota],
      ['剩余上行', item.upRemaining],
      ['剩余下行', item.downRemaining],
    ].filter(([, value]) => value);
    const meta = fields.length
      ? fields.map(([key, value]) => `${esc(key)} ${esc(value)}`).join('<br>')
      : '未填写容量信息';
    const canOpen = Boolean(item.path);
    return `<div class="drive-card network-storage${canOpen ? '' : ' net-static'}"${canOpen ? ` data-action="drive" data-path="${esc(item.path)}"` : ''} title="${canOpen ? '点击进入该网盘的本地缓存目录' : '登记的网络存储信息'}">
      <div class="drive-head"><span class="drive-letter net">网</span><span class="drive-name" title="${esc(name)}">${esc(name)}</span><button type="button" class="net-edit dc-mini" data-action="net-drive-edit" data-dir="${esc(item.dir)}" title="编辑这个网盘的信息">编辑</button></div>
      <div class="drive-meta net-meta"><span class="net-type">${esc(item.backend || '未知后端')}</span> #${esc(item.seq)}<br>${meta}${item.hasInfo === false ? '<br><span class="dc-warn">info.json 缺失或损坏</span>' : ''}</div>
    </div>`;
  }).join('');

  // 虚拟挂载点：读数据组写回的 host-disks.json，不是本机真实磁盘。
  const hdCard = `<div class="drive-card network-storage" data-action="hd" data-path="" title="数据同步组里的主机磁盘归并结果，只读">
    <div class="drive-head"><span class="drive-letter net">主</span><span class="drive-name">主机磁盘（数据组）</span></div>
    <div class="drive-meta net-meta">${hdMeta}</div>
  </div>`;
  // /ufs/ 虚拟网盘：只登记目录/文件指针，索引分片也在数据组里。
  const ufsCard = `<div class="drive-card network-storage" data-action="ufs" data-path="/ufs" title="虚拟网盘：按年份归档已加入的目录与文件">
    <div class="drive-head"><span class="drive-letter net">U</span><span class="drive-name">UFS · 虚拟网盘</span></div>
    <div class="drive-meta net-meta">/ufs/ · 目录按加入年 / 文件按修改年</div>
  </div>`;

  const title = LABELS.drivesTitle || '此电脑 · 磁盘';
  const unit = LABELS.drivesUnit || '磁盘';
  const empty = LABELS.drivesEmpty || '没有检测到可用磁盘';
  const hint = LABELS.drivesHint || '';
  stage.classList.remove('list-mode');
  const localHint = hostInfo?.host
    ? `本机 ${esc(hostInfo.host)} · 卷 ID 取卷根的 <code>.dir-struct-id</code>，没有标记文件时为 Windows 卷序列号`
    : '';
  stage.innerHTML = `<h2 class="stage-title">${esc(title)}（${drives.length + registered.length + 2}）</h2>
    <div class="drive-grid">${hdCard}${ufsCard}${cards}${networkCards || (drives.length ? '' : `<div class="empty">${esc(empty)}</div>`)}</div>
    ${hint ? `<p class="stage-hint">${esc(hint)}</p>` : ''}<p class="stage-hint" id="driveLocalHint"${localHint ? '' : ' hidden'}>${localHint}</p>`;
  const sidebarRoot = LABELS.sidebarRoot || LABELS.root || '此电脑';
  const localSidebar = drives.map((drive) => {
    const label = mounts ? (drive.label || drive.path || '存储') : `${drive.letter}: ${drive.label || drive.kind}`;
    const letter = String(drive.letter || '').toUpperCase();
    const vid = hostInfo?.volumes?.[letter] || null;
    const title = vid ? ` title="${esc(`${drive.letter}: · 卷 ID ${vid}`)}"` : '';
    return `<div class="side-item" data-action="drive" data-path="${esc(drive.path)}"${letter ? ` data-drive-letter="${esc(letter)}"` : ''}${title}><span class="icon icon-dir"></span>${esc(label)}</div>`;
  }).join('');
  const networkSidebar = registered.length
    ? `<div class="side-title side-sub">网络存储</div>${registered.map((item) => {
      const name = item.label || item.backend || item.dir;
      const nameTip = `${name}（${item.backend || ''}）`;
      return item.path
        ? `<div class="side-item net-side-item" data-action="drive" data-path="${esc(item.path)}" title="${esc(nameTip)}"><span class="icon icon-dir"></span>${esc(name)}</div>`
        : `<div class="side-item net-side-item" title="${esc(nameTip)}">网 ${esc(name)}</div>`;
    }).join('')}`
    : '';
  const hdSidebar = `<div class="side-title side-sub">数据组视图</div><div class="side-item" data-action="hd" data-path=""><span class="icon icon-dir"></span>主机磁盘（数据组）</div>
    <div class="side-item" data-action="ufs" data-path="/ufs"><span class="icon icon-dir"></span>UFS 虚拟网盘</div>`;
  const taggedCount = tagEntries(getAnnotationStore()?.snapshot() || { tags: {}, paths: {} }).length;
  const tagSidebar = `<div class="side-title side-sub">标签</div><div class="side-item" data-action="tags-view"><span class="icon icon-dir"></span>标签视图${taggedCount ? ` <span class="anno-count">${taggedCount}</span>` : ''}</div>`;
  sidebar.innerHTML = `<div class="side-title">${esc(sidebarRoot)}</div>${localSidebar}${networkSidebar}${hdSidebar}${tagSidebar}`;
  // 卷身份晚到也不阻塞首屏：拿到之后直接补进对应卡片/侧栏，不重绘整页。
  void hostInfoPending.then((info) => {
    if (!info || current().kind !== 'drives') return;
    fillDriveVolumeIds(info);
  });
}

/** 把本机卷身份补进已渲染的磁盘卡片与侧栏（慢接口后到，避免整页重排）。 */
function fillDriveVolumeIds(hostInfo) {
  const hint = stage.querySelector('#driveLocalHint');
  if (hint && hostInfo?.host && hint.hidden) {
    hint.hidden = false;
    hint.innerHTML = `本机 ${esc(hostInfo.host)} · 卷 ID 取卷根的 <code>.dir-struct-id</code>，没有标记文件时为 Windows 卷序列号`;
  }
  for (const card of stage.querySelectorAll('.drive-card[data-drive-letter]')) {
    const letter = card.dataset.driveLetter;
    const id = hostInfo?.volumes?.[letter];
    if (!id) continue;
    const meta = card.querySelector('.drive-meta');
    if (!meta || meta.querySelector('.drive-volume')) continue;
    meta.insertAdjacentHTML('beforeend', `<br><span class="drive-volume" title="卷根的 .dir-struct-id；没有标记文件时回退 Windows 卷序列号">卷 ID <code>${esc(id)}</code></span>`);
    card.title = `${letter}: · 卷 ID ${id}`;
  }
  for (const item of sidebar.querySelectorAll('.side-item[data-drive-letter]')) {
    const letter = item.dataset.driveLetter;
    const id = hostInfo?.volumes?.[letter];
    if (id) item.title = `${letter}: · 卷 ID ${id}`;
  }
}

async function renderHostDisks(target) {
  // 连接建立、本机身份晚到、面板写回都会触发重渲染；先发起的渲染可能后返回，
  // 直接写会把较新的结果盖掉（表现为一直停在「同步组未连接」）。用序号丢弃过期结果。
  const seq = (hdRenderSeq += 1);
  const live = await loadHostDisksDoc();
  let doc = live.doc;
  let error = live.error;
  let from = live.from;
  // 数据组读不到（多半是刷新后连接还在建立）时，先用本机快照把内容画出来：
  // 用户看到的是已知的归并结果，而不是「未连接」这张空页面；连接就绪后自动换成实时数据。
  let snapshotAt = 0;
  if (!doc) {
    const snap = hostDisksCachedDoc();
    if (snap?.doc) {
      doc = snap.doc;
      from = 'cache';
      snapshotAt = snap.at;
    }
  }
  // openlist 扫出来的卷（openlist-xxxx-0/1/2/3）没有磁盘信息时，用 ID 中间那段当物理盘 SN，
  // 能对上磁盘的直接挂到该盘下。只在渲染时算，不写文档：任何端都算出同样结果。
  if (doc) doc = applyDerivedSerials(doc);
  if (live.doc) {
    hdConnectRetry = { path: '', count: 0 };
    cacheHostDisksDoc(live.doc);
    // 连接就绪后把「连接未就绪时填的手工 SN」补写进数据组（有冷却，避免反复重写）。
    if (readPendingSerials().length && Date.now() - hdPendingFlushAt > 8000) {
      hdPendingFlushAt = Date.now();
      void flushPendingSerials(live.doc).then((ok) => {
        if (!ok) return;
        const now = current();
        if (now?.kind === 'hd') render(now);
      }).catch(() => {});
    }
  }
  const hideNoDisk = readHideNoDisk();
  // 本机卷身份同样不阻塞：先用缓存值判定「能不能直接落本地」，取到后再补一次渲染。
  const localHost = localHostCache.value;
  if (!localHost) {
    void localHostInfoFor().then((info) => {
      const now = current();
      if (info && now?.kind === 'hd' && (now.path || '') === (target.path || '')) renderHostDisks(target);
    });
  }
  let view = doc ? await describeTreePath(doc, target.path || '') : null;
  if (!view) view = describeVirtual(doc, target.path || '', { hideNoDiskHosts: hideNoDisk, local: localHost, volumeAliases: volumeAliasesFor(doc) });
  hdLastDoc = doc;
  if (seq !== hdRenderSeq) return;
  hdCrumbParts = view.crumbs;
  const openAttrs = (path, extra = '') => (path !== undefined && path !== null
    ? ` data-action="hd" data-path="${esc(path)}"${extra} style="cursor:pointer"` : '');
  const rowsHtml = (section) => {
    if (!section.rows.length) return `<tr><td colspan="2" class="dc-empty">${esc(section.placeholder || '无')}</td></tr>`;
    return section.rows.map((item) => {
      const label = esc(item.label);
      const meta = esc(item.meta || '');
      if (item.aliasEdit) {
        // volumeId / 逻辑分区：别名就在这一行直接加/改，不另开页面。
        const vid = item.aliasEdit;
        const kind = item.aliasKind || 'volume';
        const hint = kind === 'partition'
          ? '给这个逻辑分区加一个便于识别的名字（存数据组文档，跨端可见）'
          : '给这个卷加一个便于识别的名字（存数据组文档，跨端可见）';
        return `<tr class="hd-alias-row" data-alias-id="${esc(vid)}" data-alias-kind="${esc(kind)}"><td>${label}</td>
          <td><span class="hd-alias-value">${meta}</span>
          <button type="button" class="hd-part-detail" data-action="hd-alias-edit" data-path="${esc(vid)}" data-kind="${esc(kind)}"
            title="${hint}">${item.aliasSet ? '修改别名' : '＋增加别名'}</button></td>
        </tr>`;
      }
      if (item.serialEdit) {
        // 所属磁盘为空时的兜底：手工填物理盘 SN，保存后卷挂到该盘下。
        const vid = item.serialEdit;
        return `<tr class="hd-serial-row" data-serial-id="${esc(vid)}"><td>${label}</td>
          <td><span class="hd-alias-value">${meta}</span>
          <button type="button" class="hd-part-detail" data-action="hd-serial-edit" data-path="${esc(vid)}"
            title="手工指定物理磁盘 SN；保存后会写回数据组文档，并记住这条映射">${item.serialSet ? '修改 SN' : '＋填写 SN'}</button></td>
        </tr>`;
      }
      if (item.kind === 'partition') {
        const localPath = item.localPath || '';
        const singlePath = item.singlePath || '';
        const detailPath = item.detailPath || item.path || '';
        const letter = String(item.label || '').slice(0, 1).toUpperCase();
        const volumeIds = Array.isArray(item.volumeIds) ? item.volumeIds : [];
        // 主点击：本机 → 本地目录；非本机单卷 → 直接进卷树；其余 → 分区详情。
        return `<tr class="hd-partition" data-action="hd-part" data-path="${esc(detailPath)}"
          data-local-path="${esc(localPath)}" data-single-path="${esc(singlePath)}"
          data-host-local="${item.hostLocal ? '1' : ''}" data-letter="${esc(letter)}" style="cursor:pointer"
          data-hd-volumes="${esc(volumeIds.join('|'))}" data-hd-drive="${esc(letter ? `${letter}:` : '')}"
          title="${esc(item.hostLocal ? '本机分区：点击直接打开本地盘符' : '非本机分区：点击进入关联卷的只读目录树')}">
          <td>${label}</td>
          <td>${meta}${detailPath ? ` <button type="button" class="hd-part-detail" data-action="hd-part-detail" data-path="${esc(detailPath)}" title="分区详情：信息与全部关联卷">详情</button>` : ''}</td>
        </tr>`;
      }
      if (item.kind === 'tree-file') return `<tr class="hd-file"><td>${label}</td><td>${meta}</td></tr>`;
      if (item.kind === 'volume' && item.volumeId) {
        // 分区详情里的关联卷：本机卷主点击进本地，同时保留「只读结构」入口，数据组里的结构/文件列表不会被藏起来。
        const localPath = item.localPath || '';
        const tree = item.path || '';
        return `<tr class="hd-volume-row" data-action="hd-open" data-path="${esc(tree)}" data-local-path="${esc(localPath)}"
          data-hd-volume="${esc(item.volumeId)}" data-hd-drive="${esc(item.volumeDrive || '')}" style="cursor:pointer"
          title="${esc(localPath ? `本机卷：点击打开 ${localPath}；数据组里的结构/文件列表点右侧「只读结构」` : '清单卷：点击只读浏览目录结构')}">
          <td>${label}</td>
          <td>${meta}${tree ? ` <button type="button" class="hd-part-detail" data-action="hd-tree" data-path="${esc(tree)}" title="只读浏览数据组里的目录结构与文件列表">只读结构</button>` : ''}</td>
        </tr>`;
      }
      if (item.localPath !== undefined && item.localPath !== null && item.localPath !== '') {
        // 卷行带本机路径时同样直达本地目录（本机卷 ID 命中才给这个字段）。
        return `<tr data-action="hd-open" data-path="${esc(item.path || '')}" data-local-path="${esc(item.localPath)}" style="cursor:pointer"><td>${label}</td><td>${meta}</td></tr>`;
      }
      return `<tr${openAttrs(item.path)}><td>${label}</td><td>${meta}</td></tr>`;
    }).join('');
  };
  const sections = view.sections.map((section) => {
    const rows = rowsHtml(section);
    return `<details class="hd-host hd-fold" open><summary class="hd-host-title">${esc(section.title)}</summary><table class="file-table"><tbody>${rows}</tbody></table></details>`;
  }).join('');
  stage.classList.add('list-mode');
  // 「隐藏无磁盘的主机」只作用于根视图的主机列表，下钻后的磁盘/卷层级不受影响。
  const hiddenCount = view.hostStats?.hidden || 0;
  const filter = doc && view.view === 'root'
    ? `<label class="hd-filter" title="只影响这里列出的主机，不改变数据组里已写回的归并结果">
        <input id="hdVirtualHideNoDisk" type="checkbox"${hideNoDisk ? ' checked' : ''}>
        <span>隐藏无磁盘的主机</span>
        <span id="hdVirtualHideNoDiskHint" class="hd-filter-hint">${hideNoDisk ? `（已隐藏 ${hiddenCount} 台）` : ''}</span>
      </label>`
    : '';
  const notes = Array.isArray(view.notes) && view.notes.length
    ? `<ul class="stage-hint hd-notes">${view.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul>`
    : '';
  // 读到的是旧路径/镜像时明确标出来，不假装一切正常。
  const mirrorNote = doc && from === 'mirror'
    ? `<p class="stage-hint">主文件缺失，当前内容来自镜像 /host-disks/host-disks.mirror.json；点顶部「主机磁盘 → 写回」可把主文件重建。</p>`
    : doc && from === 'canonical'
      ? `<p class="stage-hint">当前读的是旧文件 /host-disks/host-disks.json；点顶部「主机磁盘 → 写回」会升级写到 /host-disks/host-disks.v2.json。</p>`
      : '';
  // 快照模式：内容是本机上次读到的归并结果，连接就绪后会自动换成实时数据。
  const cacheNote = doc && from === 'cache'
    ? `<p class="stage-hint">当前显示本机快照${snapshotAt ? `（${esc(new Date(snapshotAt).toLocaleString())}）` : ''}：同步组连接/读取就绪后会自动换成数据组里的最新内容，卷的「结构 / 文件列表」提示也会在那时补齐。
      <button type="button" class="hd-part-detail" data-action="hd-reload">立即重新读取</button></p>`
    : '';
  const footer = view.view === 'tree'
    ? '只读浏览：目录结构来自数据组 struct/，文件大小/时间来自 file-list/；不会访问本机磁盘。'
    : '此视图只读，数据来自数据组里的 host-disks 文档（host-disks.v2.json → 旧路径 → 镜像）；刷新本地缓存不会重新拉取 RS 遥测。';
  let html;
  // 实时文档没读到时定时重试。连接是异步建立的，重试让连接就绪后自动换成真实内容；
  // 有本机快照占位时页面不空，可以等得更久（60 次 ≈ 2 分钟），没快照就只重试 8 次。
  if (!live.doc) {
    const key = target.path || '';
    if (hdConnectRetry.path === key) hdConnectRetry.count += 1;
    else hdConnectRetry = { path: key, count: 1 };
    const maxTry = snapshotAt ? 60 : 8;
    if (hdConnectRetry.count <= maxTry) {
      setTimeout(() => {
        const now = current();
        if (now?.kind === 'hd' && (now.path || '') === key) renderHostDisks(target);
      }, 2000);
    }
  }
  if (!doc) {
    // 文件被别的端按残留墓碑删掉时给出无损恢复入口：本机缓存的文档就是刚归并出的完整结果。
    const cached = hostDisksCacheInfo();
    let autoHtml = '';
    // 缓存可用时自动恢复一次（30 秒冷却，避免和别的端互相删写形成死循环）；失败再让用户手动点。
    if (cached && !/未连接/.test(error || '') && Date.now() - hdAutoRestoreAt > 30000) {
      hdAutoRestoreAt = Date.now();
      autoHtml = `<div class="stage-hint">数据组里的文件不见了，正在用本机缓存自动恢复…</div>`;
      void restoreHostDisksFromCache().then(() => {
        const now = current();
        if (now?.kind === 'hd' && (now.path || '') === (target.path || '')) return render(current());
      }).catch(() => {});
    }
    const cacheHtml = cached
      ? `<div class="stage-hint">本机缓存：${cached.volumes} 卷 / ${cached.hosts} 主机 · ${cached.at ? esc(new Date(cached.at).toLocaleString()) : '时间未知'}，可直接写回数据组。</div>
        <button type="button" class="primary" data-action="hd-restore">用本机缓存恢复写回</button>`
      : '';
    html = `<h2 class="stage-title">${esc(view.title)}</h2>
      <div class="empty">${esc(error || '数据组中没有主机磁盘文件')}
        <div class="stage-hint">请先点顶部「主机磁盘」读取遥测，再点「写回同步组数据组」，然后回到本页。</div>
        ${autoHtml}
        <button type="button" class="primary" data-action="hd-reload">重新读取</button>
        ${cacheHtml}
      </div>`;
  } else {
    html = `<h2 class="stage-title">${esc(view.title)}</h2>
      ${cacheNote}
      ${filter}
      ${mirrorNote}
      ${view.empty ? `<div class="empty">${esc(view.empty)}</div>` : ''}
      ${notes}
      ${sections}
      <p class="stage-hint">${esc(footer)}</p>`;
  }
  stage.innerHTML = `<div class="hd-virtual-scroll">${html}</div>`;
  // 快照模式下数据组还没读到，探测结构/文件列表只会白跑一轮，等实时数据回来再补。
  if (from !== 'cache') void fillVolumeSourceHints();
  const side = view.crumbs.map((part, index) => {
    const active = index === view.crumbs.length - 1;
    return `<div class="side-item${active ? ' active' : ''}" data-action="hd" data-path="${esc(part.path)}">${active ? '· ' : '<span class="icon icon-dir"></span>'}${esc(part.label)}</div>`;
  }).join('');
  sidebar.innerHTML = `<div class="side-title">主机磁盘（数据组）</div>${side}`;
}

/** 把卷 / 逻辑分区详情的那一行切成行内别名编辑器（Enter 保存 / Esc 取消）。 */
function openVolumeAliasEditor(button) {
  const rowEl = button.closest('tr.hd-alias-row');
  if (!rowEl) return;
  const key = rowEl.dataset.aliasId || '';
  const kind = button.dataset.kind || rowEl.dataset.aliasKind || 'volume';
  const cell = rowEl.querySelector('td:nth-child(2)');
  if (!cell || !key) return;
  if (cell.querySelector('#hdAliasInput')) { cell.querySelector('#hdAliasInput').focus(); return; }
  const aliases = kind === 'partition' ? partitionAliasesFor(hdLastDoc) : volumeAliasesFor(hdLastDoc);
  const alias = aliases[key] || '';
  cell.innerHTML = `<span class="hd-alias-edit">
      <input id="hdAliasInput" class="hd-alias-input" value="${esc(alias)}" placeholder="例如 系统盘、备份盘" maxlength="40">
      <button type="button" class="hd-part-detail" data-action="hd-alias-save" data-path="${esc(key)}" data-kind="${esc(kind)}">保存</button>
      <button type="button" class="hd-part-detail" data-action="hd-alias-cancel">取消</button>
      <span class="stage-hint">留空＝清除别名</span>
    </span>`;
  const input = cell.querySelector('#hdAliasInput');
  if (!input) return;
  input.focus();
  input.select();
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      cell.querySelector('[data-action="hd-alias-save"]')?.click();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      render(current());
    }
  });
}

/**
 * 保存别名（卷 / 逻辑分区）：先落本机（立刻可见、连接未就绪也不丢），再写进数据组文档（跨端共享）。
 * 写回失败不算白改：别名仍在本机，页面照旧显示，状态栏说明没写进数据组。
 */
async function saveVolumeAlias(key, value, kind = 'volume') {
  const alias = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const isPart = kind === 'partition';
  const label = isPart ? (() => {
    try { return decodeURIComponent(String(key).split('/').filter(Boolean).pop() || key); } catch { return key; }
  })() : key;
  if (isPart) setLocalPartitionAlias(key, alias);
  else setLocalVolumeAlias(key, alias);
  status(alias ? `${label} 的别名：${alias}` : `已清除 ${label} 的别名`);
  await render(current());
  const live = await loadHostDisksDoc({ force: true });
  const doc = live.doc;
  if (!doc) {
    status(`别名已存在本机；同步组未连接或文档缺失，暂未写入数据组`, true);
    return;
  }
  // 卷与分区的别名各管一张表：先按本次操作落定（清除时要从文档里真的删掉，
  // 否则「本机 ∪ 文档」的合并会把清掉的别名又带回来），再把本机别名并进去。
  const patched = { ...doc };
  if (isPart) {
    const parts = { ...(doc.partitionAliases || {}) };
    if (alias) parts[key] = alias; else delete parts[key];
    patched.partitionAliases = parts;
  } else {
    const vols = { ...(doc.volumeAliases || {}) };
    if (alias) vols[key] = alias; else delete vols[key];
    patched.volumeAliases = vols;
  }
  const finalDoc = attachVolumeAliases(patched);
  try {
    await writeHostDisksDoc(finalDoc);
    status(`已写回数据组 · ${label} ${alias ? `别名「${alias}」` : '别名已清除'}`);
  } catch (err) {
    status(`别名已存在本机，写回数据组失败：${err?.message || err}`, true);
  }
  invalidateHostDisksDoc();
  await render(current());
}

/** 所属磁盘为空时，行内填写/修改该卷的物理磁盘 SN。 */
function openManualSerialEditor(button) {
  const rowEl = button.closest('tr.hd-serial-row');
  if (!rowEl) return;
  const volumeId = rowEl.dataset.serialId || '';
  const cell = rowEl.querySelector('td:nth-child(2)');
  if (!cell || !volumeId) return;
  if (cell.querySelector('#hdSerialInput')) { cell.querySelector('#hdSerialInput').focus(); return; }
  const currentValue = hdVolumeManualSerial(volumeId);
  const hasValue = Boolean(currentValue);
  cell.innerHTML = `<span class="hd-alias-edit">
      <input id="hdSerialInput" class="hd-alias-input" value="${esc(currentValue)}" placeholder="物理磁盘 SN，如 001B_448B_48B6_F5C2." maxlength="80">
      <button type="button" class="hd-part-detail" data-action="hd-serial-save" data-path="${esc(volumeId)}">保存</button>
      ${hasValue ? `<button type="button" class="hd-part-detail" data-action="hd-serial-clear" data-path="${esc(volumeId)}">清除</button>` : ''}
      <button type="button" class="hd-part-detail" data-action="hd-serial-cancel">取消</button>
      <span class="stage-hint">保存后把这个卷挂到该 SN 的磁盘下，并记住这条映射</span>
    </span>`;
  const input = cell.querySelector('#hdSerialInput');
  if (!input) return;
  input.focus();
  input.select();
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      cell.querySelector('[data-action="hd-serial-save"]')?.click();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      render(current());
    }
  });
}

/** 取当前文档里该卷已记录的手工磁盘 SN（没有则退回按 ID 推断的 SN，没有则空串）。 */
function hdVolumeManualSerial(volumeId) {
  const key = String(volumeId || '').toLowerCase();
  const volume = (hdLastDoc?.volumes || []).find((v) => String(v?.volumeId || '').toLowerCase() === key);
  return String(volume?.manualSerial || volume?.derivedSerial || '');
}

/**
 * 保存手工磁盘 SN：注册表里先记一条「卷 → SN」映射（下次归并也认），
 * 再把这条关联直接打进当前文档并写回，页面立刻能看到所属磁盘。
 * 若此刻同步组还没连上（刷新后很常见），把补丁挂起，连接就绪后自动补写——不让用户重填。
 */
async function saveManualDiskSerial(volumeId, value) {
  const serial = String(value ?? '').trim();
  try {
    await rememberManualSerial(volumeId, serial);
  } catch (err) {
    status(`SN 未保存：${err?.message || err}`, true);
    return;
  }
  const live = await loadHostDisksDoc({ force: true });
  if (!live.doc) {
    addPendingSerial(volumeId, serial);
    // 本机快照也打上补丁，页面立刻反映；连接就绪后由 renderHostDisks 统一补写数据组。
    const snap = hostDisksCachedDoc();
    if (snap?.doc) cacheHostDisksDoc(applyManualDiskSerial(snap.doc, volumeId, serial).doc);
    status(`已记住 ${volumeId} 的磁盘 SN${serial ? `：${serial}` : '（已清除）'}；同步组还没连上，连接就绪后会自动写进数据组`);
    await render(current());
    return;
  }
  const { doc, matched } = applyManualDiskSerial(live.doc, volumeId, serial);
  try {
    await writeHostDisksDoc(doc);
    clearPendingSerial(volumeId, serial);
    status(matched
      ? `已把 ${volumeId} 挂到磁盘 ${matched.serial}`
      : (serial ? `已记住 ${volumeId} 的磁盘 SN：${serial}（数据组里还没有这块盘，等遥测补到后会自动对上）` : `已取消 ${volumeId} 的手工磁盘关联`));
  } catch (err) {
    status(`已记住该 SN，但写回数据组失败：${err?.message || err}`, true);
  }
  invalidateHostDisksDoc();
  await render(current());
}

/**
 * 把挂起的手工 SN 补丁统一写进数据组：连接就绪、读到实时文档后调用。
 * 成功后清补丁并重渲染一次；失败保留补丁，等下一轮渲染再试（有冷却，不会打转）。
 */
async function flushPendingSerials(doc) {
  const pending = readPendingSerials();
  if (!pending.length || !doc) return false;
  let working = doc;
  for (const item of pending) working = applyManualDiskSerial(working, item.volumeId, item.serial).doc;
  await writeHostDisksDoc(working);
  for (const item of pending) clearPendingSerial(item.volumeId, item.serial);
  invalidateHostDisksDoc();
  return true;
}

let hdRenderSeq = 0;
// 当前渲染用的文档（快照模式时也是快照），给别名/SN 编辑取「已有什么」用。
let hdLastDoc = null;
// 自动恢复冷却：文件被别的端删除时用缓存重建，但避免两端互删互写打成死循环。
let hdAutoRestoreAt = 0;
// 挂起的手工 SN 补写冷却（连接建立后统一补写，避免每轮渲染都重写文档）。
let hdPendingFlushAt = 0;
let hdConnectRetry = { path: '', count: 0 };
/** 探测数据组里每块卷的目录结构 / 文件列表是否可浏览，补到当前行（只补不重绘）。 */
async function fillVolumeSourceHints() {
  const seq = hdRenderSeq;
  const rows = [...stage.querySelectorAll('tr[data-hd-volume], tr[data-hd-volumes]')];
  if (!rows.length) return;
  await Promise.all(rows.map(async (rowEl) => {
    const ids = rowEl.dataset.hdVolume
      ? [rowEl.dataset.hdVolume]
      : String(rowEl.dataset.hdVolumes || '').split('|').filter(Boolean);
    if (!ids.length) return;
    const drive = rowEl.dataset.hdDrive || (rowEl.dataset.letter ? `${rowEl.dataset.letter}:` : '');
    const probes = await Promise.all(ids.map((id) => probeVolumeSources(id, drive).catch(() => null)));
    if (seq !== hdRenderSeq || !rowEl.isConnected) return;
    const cell = rowEl.querySelector('td:nth-child(2)');
    if (!cell) return;
    let hint;
    let tips;
    if (ids.length === 1) {
      const p = probes[0];
      if (!p) return;
      hint = `${p.tree.ok ? `结构 ${p.tree.count} 项` : '无目录结构'} · ${p.files.ok ? `文件列表 ${p.files.count} 个` : (p.files.error ? '文件列表不可读' : '无文件列表')}`;
      tips = [p.tree.error, p.files.error, p.files.note].filter(Boolean).join('；');
    } else {
      const trees = probes.filter((p) => p?.tree.ok).length;
      const fileLists = probes.filter((p) => p?.files.ok).length;
      hint = `数据组：结构 ${trees}/${ids.length} · 文件列表 ${fileLists}/${ids.length}`;
      tips = probes.filter(Boolean).flatMap((p) => [p.tree.error, p.files.error, p.files.note].filter(Boolean)).slice(0, 3).join('；');
    }
    const existing = cell.querySelector('.hd-src');
    if (existing) { existing.textContent = ` · ${hint}`; existing.title = tips; return; }
    cell.insertAdjacentHTML('beforeend', `<span class="hd-src" title="${esc(tips)}"> · ${esc(hint)}</span>`);
  }));
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

// 目录始终在前；有已缓存体积的目录按真实体积排序，未知体积的目录保持原顺序并排在后面。
// 文件按 size 升/降序，大小相同则保持原顺序（JS sort 稳定）。
// sizeSort 为 none 时原样返回，保持服务端既有的目录/名称顺序。
function sortableDirSize(item) {
  if (!item?.dir) return null;
  const cached = cachedDirSize(item.path);
  if (cached && typeof cached === 'object') return Number(cached.totalSize) || 0;
  const raw = Number(item.size);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function sortedDirItems(items) {
  if (sizeSort === 'none') return items;
  const sign = sizeSort === 'asc' ? 1 : -1;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.dir || b.item.dir) {
        if (a.item.dir && b.item.dir) {
          const aSize = sortableDirSize(a.item);
          const bSize = sortableDirSize(b.item);
          if (aSize === null || bSize === null) {
            if (aSize !== null) return -1;
            if (bSize !== null) return 1;
            return a.index - b.index;
          }
          const diff = aSize - bSize;
          return diff ? diff * sign : a.index - b.index;
        }
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
  dirTagAnnoData = getAnnotationStore() ? getAnnotationStore().snapshot() : null;
  // 自动标签随 /api/list 一起回来：子目录行显示自己的标签，当前目录的标签显示在工具栏。
  lastDirAutoTags = new Map(items.filter((item) => item.dir).map((item) => [item.path, item.tags || []]));
  const currentAutoTags = Array.isArray(data.tags) ? data.tags : [];
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
      ${ufsControl(item)}
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
      ${ufsControl(item)}
      ${flControls(item)}
      ${copyControls(item)}
      ${explorerControls(item)}
      <div class="thumb-box"><img src="${esc(fsCoverUrlFront(item.path, vsid, defpw))}" loading="lazy" alt="${esc(item.name)}">${encBadge(item, true)}</div>
      <div class="thumb-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="thumb-meta">${formatSize(item.size)}</div>
    </div>`).join('');
    const allCards = imageCards + zipCards;
    body = `<div class="thumb-head">图片/压缩包 · ${thumbsCount} 项<span>仅当前目录 · 点击缩略图查看原图或打开压缩包</span></div>
      ${folders.length ? `<div class="folder-chips">${folders.map((item) => `<span class="folder-chip" data-action="dir" data-path="${esc(item.path)}">${esc(item.name)}${dirTagsHtml({ ...item, dir: true })}${trashChipControls({ ...item, dir: true })}${flControls({ ...item, dir: true })}${dirListControls({ ...item, dir: true })}${explorerControls({ ...item, dir: true })}${ufsControl({ ...item, dir: true })}${rowMenuButton({ ...item, dir: true })}</span>`).join('')}</div>` : ''}
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
      return `<tr class="${manifestRowClass(item)}" data-action="${action}" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
        ${trashRowStart(item)}
        <td><span class="file-name"><span class="sel-state">${manifestSelectionBadge(item)}</span>${thumb}${esc(item.name)}${hint}${encBadge(item)}${dirTagsHtml(item)}${flControls(item)}${dirListControls(item)}${copyControls(item)}${explorerControls(item)}${ufsControl(item)}${rowMenuButton(item)}</span></td>
        <td class="file-size${item.dir ? ' dir-size-cell' : ''}"${item.dir ? ` data-size-path="${esc(item.path)}"` : ''}>${item.dir ? '文件夹' : formatSize(item.size)}</td>
        <td class="file-time">${formatTime(item.mtime)}</td>
        ${trashRowEnd(item)}
      </tr>`;
    }).join('');
    body = `<table class="file-table"><thead><tr>${trashHeadStart()}<th>名称</th><th style="width:110px"><button type="button" class="sort-th" data-action="sort-size" title="按文件大小排序：第一次从大到小，再点从小到大，再点恢复默认">大小${sizeSort === 'none' ? '' : (sizeSort === 'desc' ? ' ↓' : ' ↑')}</button></th><th style="width:150px">修改时间</th>${trashHeadEnd()}</tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">此目录为空</td></tr>'}</tbody></table>`;
  }
  // 当前路径只由顶部面包屑显示；这里不再重复一条完整路径标题。
  stage.classList.add('list-mode');
  const autoStrip = currentAutoTags.length
    ? `<div class="auto-tag-strip" title="自动标签按本目录的直接子项名识别，只读；子目录的标签显示在各自行上"><span class="auto-tag-label">自动标签</span>${currentAutoTags.map((tag) => autoTagChip(tag)).join('')}</div>`
    : '';
  stage.innerHTML = `<div class="stage-tools">${switcher}${trashToolbarHtml()}${autoStrip}</div><div class="stage-scroll">${body}</div>`;
  // 新工具栏插入后再同步一次数量/按钮状态（勾选状态已由行模板带出）。
  resetTrashSelection();
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
  stage.classList.remove('list-mode');
  stage.innerHTML = viewerHtml(url, target);
  bindViewer(url);
  sidebar.innerHTML = `<div class="side-title">压缩包内 · ${target.entries.filter((item) => !item.dir).length} 个文件</div>
    <div class="side-item ${(target.current || `/zip/${target.id}/`).split('?')[0] === `/zip/${target.id}/` ? 'active' : ''}" data-action="zip-root" data-id="${target.id}">入口 / 目录列表</div>
    <div class="side-tree">${treeHtml(buildTree(target.entries), target.id)}</div>`;
}

function renderPreview(target) {
  stage.classList.remove('list-mode');
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
    else if (target.kind === 'ufs') await renderUfs(target);
    else if (target.kind === 'tags') renderTagView(target);
    else if (target.kind === 'hd') await renderHostDisks(target);
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

// 同步组是晚于首屏建立的：连接就绪会派发 zb:host-disks-change，UFS 视图借此自动重读，
// 不必让用户手动刷新。
window.addEventListener('zb:host-disks-change', () => {
  if (current()?.kind === 'ufs') render(current()).catch(showError);
});

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
  // 行内标签区（含就地输入框）没有要导航的动作，避免 closest 落到行上触发目录导航。
  const tagHost = event.target.closest?.('.row-tags');
  if (tagHost && !event.target.closest?.('[data-action="row-tag-add"], [data-action="row-tag-remove"]')) return;
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'row-tag-add') {
    openRowTagInput(element);
    return;
  }
  if (action === 'row-tag-remove') {
    removeRowTag(element.dataset.path, element.dataset.tag);
    return;
  }
  if (action === 'ufs-add') {
    event.preventDefault();
    event.stopPropagation();
    await addUfsFromElement(element);
    return;
  }
  if (action === 'ufs') {
    navigate({ kind: 'ufs', path: UFS_ROOT });
    return;
  }
  if (action === 'ufs-year') {
    navigate({ kind: 'ufs', path: element.dataset.path || UFS_ROOT });
    return;
  }
  if (action === 'ufs-entry') {
    event.preventDefault();
    const entry = ufsView.entries.find((item) => item.id === element.dataset.id);
    await openUfsEntry(entry);
    return;
  }
  if (action === 'ufs-remove') {
    event.preventDefault();
    event.stopPropagation();
    await removeUfsById(element.dataset.id || '');
    return;
  }
  if (action === 'tags-view') {
    navigate({ kind: 'tags', tags: [], mode: 'and' });
    return;
  }
  if (action === 'tags-pick') {
    toggleTagSelection(element.dataset.tag || '');
    return;
  }
  if (action === 'tags-mode') {
    toggleTagMode();
    return;
  }
  if (action === 'tags-clear') {
    const tagTarget = current();
    if (tagTarget?.kind === 'tags') {
      tagTarget.tags = [];
      syncLocation(false);
      render(current()).catch(showError);
    }
    return;
  }
  if (action === 'tags-remove') {
    removeTagInView(element.dataset.key || '', element.dataset.tag || '');
    return;
  }
  if (action === 'tags-expand') {
    await toggleTagExpand(element.dataset.key || element.dataset.path || '');
    return;
  }
  if (action === 'tags-file') {
    const filePath = element.dataset.path || '';
    await previewFile(filePath, element.dataset.name || winBasename(filePath), winDirname(filePath));
    return;
  }
  if (action === 'tags-open-zip') {
    const key = element.dataset.key || '';
    const desc = describeKeyForTags(key);
    if (!desc) {
      status('这个标签条目缺少路径信息，无法打开压缩包', true);
      return;
    }
    await openZipBookmark(desc);
    return;
  }
  // 行内勾选/删除控件优先处理，否则 closest 会落到带 data-action 的行上触发导航
  if (action === 'net-drive-edit') {
    driveCache?.edit(element.dataset.dir);
    return;
  }
  if (action === 'hd-alias-edit') {
    openVolumeAliasEditor(element);
    return;
  }
  if (action === 'hd-alias-save') {
    const rowEl = element.closest('tr.hd-alias-row');
    await saveVolumeAlias(element.dataset.path || '', rowEl?.querySelector('#hdAliasInput')?.value ?? '', element.dataset.kind || rowEl?.dataset.aliasKind || 'volume');
    return;
  }
  if (action === 'hd-alias-cancel') {
    await render(current());
    return;
  }
  if (action === 'hd-serial-edit') {
    openManualSerialEditor(element);
    return;
  }
  if (action === 'hd-serial-save') {
    const rowEl = element.closest('tr.hd-serial-row');
    await saveManualDiskSerial(element.dataset.path || '', rowEl?.querySelector('#hdSerialInput')?.value ?? '');
    return;
  }
  if (action === 'hd-serial-clear') {
    await saveManualDiskSerial(element.dataset.path || '', '');
    return;
  }
  if (action === 'hd-serial-cancel') {
    await render(current());
    return;
  }
  if (action.startsWith('trash-')) {
    await handleTrashAction(action, element, event);
    return;
  }
  if (action === 'selection-add-files') {
    await addSelectedToFileList();
    return;
  }
  if (action === 'selection-add-dirs') {
    addSelectedToDirList();
    return;
  }
  if (action === 'selection-clear') {
    clearSelection();
    return;
  }
  if (action === 'manifest-clear') {
    const dirSelNow = selectionStore.get('dirs');
    const fileSelNow = selectionStore.get('files');
    const dirCount = (dirSelNow.dirs || []).length;
    const fileCount = (fileSelNow.dirs || []).length + (fileSelNow.files || []).length;
    if (!dirCount && !fileCount) {
      status('当前没有目录清单或文件列表选择');
      return;
    }
    const message = `清空 ${dirCount} 个目录清单目录和 ${fileCount} 个文件列表项？`;
    if (typeof window.confirm === 'function' && !window.confirm(message)) return;
    selectionStore.set('dirs', { ...dirSelNow, dirs: [] });
    selectionStore.set('files', { ...fileSelNow, dirs: [], files: [] });
    status(`已清空目录清单和文件列表选择（${dirCount} 个目录 / ${fileCount} 个文件列表项）`);
    return;
  }
  if (action === 'manifest-remove') {
    const kind = element.dataset.kind;
    const path = element.dataset.path;
    if (kind === 'dir') {
      selectionStore.set('dirs', removeDirSelection(selectionStore.get('dirs'), path));
      status(`已从目录清单移出：${path}`);
    } else if (element.dataset.itemDir === '1') {
      selectionStore.set('files', removeFileDirSelection(selectionStore.get('files'), path));
      status(`已从文件列表移出：${path}`);
    } else {
      selectionStore.set('files', removePickedFile(selectionStore.get('files'), path));
      status(`已从文件列表移出：${path}`);
    }
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
      element.textContent = box.checked ? '✓ 已选中 · 点此取消' : '选中这个条目';
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
    if (item.dir) await addFileListDir(item.path);
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
    if (action === 'hd') {
      navigate({ kind: 'hd', path: element.dataset.path || '' });
    } else if (action === 'hd-open') {
      // 卷行：本机卷直达本地目录，清单卷进只读树。
      const localPath = element.dataset.localPath || '';
      navigate(localPath ? { kind: 'dir', path: localPath } : { kind: 'hd', path: element.dataset.path || '' });
    } else if (action === 'hd-part-detail') {
      navigate({ kind: 'hd', path: element.dataset.path || '' });
    } else if (action === 'hd-tree') {
      // 本地卷也能从「只读结构」进数据组里的 struct / file-list 浏览，不被本地路径挡住。
      navigate({ kind: 'hd', path: element.dataset.path || '' });
    } else if (action === 'hd-part') {
      // 逻辑分区主点击：本机 → 本地盘符；非本机单卷 → 该卷目录树；多卷/无卷 → 分区详情。
      const localPath = element.dataset.localPath || '';
      if (localPath) { navigate({ kind: 'dir', path: localPath }); return; }
      const letter = String(element.dataset.letter || '').toUpperCase();
      const hostLocal = element.dataset.hostLocal === '1';
      let resumedLocal = '';
      if (hostLocal && /^[A-Z]$/.test(letter)) {
        const cached = localHostCache.value;
        // 主机就是本机时盘符必定指本机盘；已缓存的卷清单里没有该盘符 → 现在拔掉了，退回只读视图。
        if (!cached) resumedLocal = `${letter}:\\`;
        else if (cached.volumes?.[letter]) resumedLocal = `${letter}:\\`;
      }
      if (resumedLocal) { navigate({ kind: 'dir', path: resumedLocal }); return; }
      const single = element.dataset.singlePath || '';
      navigate({ kind: 'hd', path: single || element.dataset.path || '' });
    } else if (action === 'hd-reload') {
      await loadHostDisksDoc({ force: true });
      await render(current());
    } else if (action === 'hd-restore') {
      // 数据组里的文档被别的端按墓碑删掉：用本机缓存重建，不必再等十几秒的 RS 遥测。
      const info = await restoreHostDisksFromCache();
      status(`已用 ${new Date(info.at).toLocaleString()} 的缓存写回 · ${info.volumes} 卷 / ${info.hosts} 主机`);
      await loadHostDisksDoc({ force: true });
      await render(current());
    } else if (action === 'drive' || action === 'dir') {
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
  if (event.target?.id === 'hdVirtualHideNoDisk') {
    writeHideNoDisk(event.target.checked);
    render(current()).catch(showError);
    return;
  }
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

// 选择集也只走数据同步组的 /selection.json，不再读写配置同步组或 localStorage 镜像。
const selectionStore = createSelectionStore({
  readFs: () => getDataGroupFs(),
  flush: async () => {
    const group = await getActiveDataGroup();
    if (group && typeof group.flush === 'function') await group.flush();
  },
  onChange: () => refreshManifestBadges(),
});
selectionStore.init()
  .then(() => refreshManifestBadges())
  .catch((err) => console.warn('selection store unavailable', err));

initAnnotations({
  navigate, openZipBookmark, status,
  openTagView: () => navigate({ kind: 'tags', tags: [], mode: 'and' }),
  // 收藏（含多标签页同步过来的变更）一变，就把 v2 清单重导一次。
  onMutate: () => {
    dirTagAnnoData = null; // 行上自定义标签的缓存跟着失效，下次渲染/刷新重取
    scheduleSync();
  },
}).catch((err) => {
  console.warn('annotations store unavailable', err);
});

initManifestSync({
  getSnapshot: () => getAnnotationStore()?.snapshot() || null,
  getFileSelection: () => selectionStore.get('files'),
  getCopyRefs: () => selectionStore.get('copies'),
});

const driveCache = initDriveCache({ api, status });
initManifestVolumeImport({ api, status });
initHostDisksPanel({ status });

// 预热本机卷身份：/api/hostinfo 要跑 PowerShell + 逐个盘 vol，先取一次，打开「此电脑」时卷 ID 直接就有。
void localHostInfoFor();

// 文本选择保护按需加载：未重启的旧服务没有该模块白名单时也不影响主程序。
import('./text-selection-guard.js')
  .then((m) => m.installTextSelectionGuard())
  .catch((err) => console.warn('text selection guard unavailable', err));

// 网盘登记增删后，磁盘列表里的「网络存储」卡片要立即跟着变。
window.addEventListener('zb:drive-cache-change', () => {
  if (current().kind === 'drives') render(current());
});

// 主机磁盘面板写回后，此电脑的虚拟挂载点 / 当前虚拟视图立即刷新。
window.addEventListener('zb:host-disks-change', () => {
  // 数据组连上/同步完成后，选择集与标签都从组内文件重读一次。
  void selectionStore.reload();
  const kind = current().kind;
  if (kind === 'drives' || kind === 'hd') render(current());
});

// 标签数据从数据组重读后，标签视图用新快照重画，不能停留在首帧的空状态。
window.addEventListener('zb:annotations-change', () => {
  if (current().kind === 'tags') render(current()).catch(() => {});
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

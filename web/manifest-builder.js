// 「清单生成」面板：目录勾选树、文件列表选择、预览/复制/下载 ZIP、上传、诊断与反向加载。
// 物理扫描只在点「重新扫描并生成」时触发；收藏/选择集变化不扫盘。

import {
  composeExport, syncScanNow, syncDiagnostics, syncState, writeDeepenMarks,
  patchCopyRefs,
} from './manifest-sync.js';
import {
  addDirSelection, removeDirSelection, isDirSelected,
  addFileDirSelection, removeFileDirSelection, isFileSelected,
  addPickedFile, removePickedFile,
  addCopyRef, updateCopyRef, removeCopyRef, cleanCopyRef, copyRefsFor,
} from './manifest-selection.js';
import { hostRelativePath } from './manifest-export.js';
import { makeZip } from './zip-writer.js';

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

let api = null;
let store = null;
let getSnapshot = () => null;
let getCurrentDir = () => '';
let status = () => {};
let hostInfo = null;
let lastScan = null;
let lastScanSig = null;
let lastScanFileSel = null;
let preview = null;
let tab = 'dirs';
let copyDraft = null; // 正在编辑的网络副本引用（null = 新增）
let dirDraft = null;  // 正在加入目录清单的目录（path + 层数选择）
const dirSummaryCache = new Map(); // 归一化 path -> 最近一次算出的目录体积（仅 UI 展示，不进选择集）

const TREE_CACHE_TTL_MS = 5 * 60 * 1000; // 展开子目录缓存 5 分钟，与 dir-struct-gen 目录缓存对齐
const SCAN_BATCH_SIZE = 4;               // 目录体积/清单扫描每批根数，避免单请求共享 deadline 饿死后面的根
const SCAN_BATCH_TIMEOUT_MS = 60_000;    // 每批独立超时；OpenList 单请求上限 120 秒
const treeCache = new Map();             // 归一化 path -> { children, at }
const expandedTree = new Set();          // 已展开的归一化目录路径；重绘后用它恢复目录树
const treeInflight = new Map();          // 归一化 path -> Promise，避免并发展开重复请求
const sizePending = new Set();           // 正在排队/计算的归一化目录路径
const sizeFailures = new Map();          // 归一化 path -> 错误信息
const sizeQueue = [];                    // 待扫描目录路径（展示用原始路径）
let sizeQueueTimer = null;
let sizeQueueRunning = false;

function normPath(value) {
  return String(value ?? '').trim()
    .replace(/\//g, '\\')
    .replace(/\\+/g, '\\')
    .replace(/\\$/, '')
    .toLowerCase();
}

function pathIsUnder(parent, child) {
  const p = normPath(parent);
  const c = normPath(child);
  if (!p || !c) return false;
  if (c === p) return true;
  return c.startsWith(p.endsWith('\\') ? p : `${p}\\`);
}

// 与文件列表行的「含子目录」语义保持一致：
// recursive=false 只覆盖直接子目录；recursive=true 覆盖所有后代。
function dirCoveredByAncestor(dirSel, path) {
  const key = normPath(path);
  return (dirSel?.dirs || []).some((entry) => {
    const root = normPath(entry.path);
    if (!root || root === key || !pathIsUnder(root, key)) return false;
    if (entry.recursive !== false) return true;
    const rest = key.slice(root.length + 1);
    return !rest.includes('\\');
  });
}

function scanSummaryOf(scan, path) {
  const sums = scan?.summaries || {};
  const direct = sums[path];
  if (direct) return direct;
  const key = normPath(path);
  const found = Object.keys(sums).find((item) => normPath(item) === key);
  return found ? sums[found] : null;
}

function cacheGetSummary(path) {
  return dirSummaryCache.get(normPath(path)) || null;
}

/** 供文件浏览页读取「清单生成」已经扫描过的目录体积，避免重复请求。 */
export function getCachedDirSummary(path) {
  return cacheGetSummary(path);
}

function cacheScanSummaries(scan) {
  for (const [path, sum] of Object.entries(scan?.summaries || {})) {
    dirSummaryCache.set(normPath(path), {
      fileCount: Number(sum.fileCount) || 0,
      totalSize: Number(sum.totalSize) || 0,
      totalSizeOnDisk: Number(sum.totalSizeOnDisk) || 0,
      partial: Boolean(sum.partial),
      at: Date.now(),
    });
  }
}

function cacheRootSummaries(scan) {
  for (const root of scan?.roots || []) {
    if (!root?.path) continue;
    dirSummaryCache.set(normPath(root.path), {
      fileCount: Number(root.fileCount) || 0,
      totalSize: Number(root.totalSize) || 0,
      totalSizeOnDisk: Number(root.totalSizeOnDisk) || 0,
      partial: Boolean(root.sizePartial),
      at: Date.now(),
    });
  }
}

function selectionSignature(dirSel, fileSel) {
  return JSON.stringify({
    opts: {
      includeSize: dirSel?.options?.includeSize !== false,
      recursive: dirSel?.options?.recursive !== false,
    },
    dirs: (dirSel?.dirs || [])
      .map((item) => [normPath(item.path), item.recursive !== false])
      .sort((a, b) => a[0].localeCompare(b[0])),
    fileDirs: (fileSel?.dirs || [])
      .map((item) => [normPath(item.path), item.recursive !== false])
      .sort((a, b) => a[0].localeCompare(b[0])),
    files: (fileSel?.files || [])
      .map((item) => [normPath(item.path), Number(item.size) || 0, Number(item.mtime) || 0])
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
}

function invalidateScan() {
  lastScan = null;
  lastScanSig = null;
  lastScanFileSel = null;
  preview = null;
}

function clearTreeCacheFor(paths) {
  const roots = (paths || []).map((item) => (typeof item === 'string' ? item : item.path)).filter(Boolean);
  for (const key of treeCache.keys()) {
    if (roots.some((root) => pathIsUnder(root, key))) treeCache.delete(key);
  }
}

function scanIsFresh() {
  if (!lastScan || !store) return false;
  return lastScanSig === selectionSignature(store.get('dirs'), store.get('files'));
}

function sizeTextOf(sum) {
  return `${Number(sum.fileCount) || 0} 个文件 · 逻辑大小 ${formatBytes(sum.totalSize)} · 占用 ${formatBytes(sum.totalSizeOnDisk)}${sum.partial ? ' · 部分不可读' : ''}`;
}

function dirSizeText(path, { includeSize = true, compact = false } = {}) {
  const key = normPath(path);
  if (!includeSize) return compact ? '' : '未启用体积计算';
  const sum = cacheGetSummary(path);
  if (sum) return compact
    ? `${Number(sum.fileCount) || 0} 项 · ${formatBytes(sum.totalSize)}${sum.partial ? ' · 部分' : ''}`
    : sizeTextOf(sum);
  if (sizePending.has(key)) return '计算中…';
  const error = sizeFailures.get(key);
  if (error) return compact ? '计算失败' : `计算失败：${error}`;
  return compact ? '' : '体积未计算';
}

function totalsHtml() {
  if (!store) return '';
  const dirSel = store.get('dirs');
  const fileSel = store.get('files');
  const dirs = dirSel.dirs || [];
  const files = fileSel.files || [];
  const counted = minimalScanEntries(dirs.map((item) => ({
    path: item.path,
    recursive: item.recursive !== false,
  })), { recursive: true });
  const dirBytes = counted.reduce((sum, item) => sum + (cacheGetSummary(item.path)?.totalSize || 0), 0);
  const fileBytes = files.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  const previewBytes = (preview?.files || []).reduce(
    (sum, file) => sum + new TextEncoder().encode(`${JSON.stringify(file.json, null, 2)}\n`).length,
    0,
  );
  return `已选 <strong>${dirs.length}</strong> 个目录 · <strong>${files.length}</strong> 个文件 · 已算目录体积 <strong>${formatBytes(dirBytes)}</strong> · 文件大小合计 <strong>${formatBytes(fileBytes)}</strong> · 预计清单 JSON <strong>${formatBytes(previewBytes)}</strong>`;
}

function updateBuilderTotals() {
  const el = $('builderTotals');
  if (el) el.innerHTML = totalsHtml();
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function setStatus(text, bad = false) {
  const el = $('builderStatus');
  if (el) {
    el.textContent = text;
    el.dataset.state = bad ? 'bad' : 'ok';
  }
  status(text, bad);
}

async function ensureHostInfo() {
  if (!hostInfo) hostInfo = await api('/api/hostinfo');
  return hostInfo;
}

function treeNodeHtml(node) {
  const dirSel = store.get('dirs');
  const fileSel = store.get('files');
  const key = normPath(node.path);
  const exact = isDirSelected(dirSel, node.path);
  const covered = !exact && dirCoveredByAncestor(dirSel, node.path);
  const checked = exact ? 'checked' : '';
  const coveredAttr = covered ? 'data-covered="1"' : '';
  const checkTitle = exact
    ? '本目录已作为清单根单独选中'
    : (covered ? '已被上层目录的“含子目录/仅本层”覆盖，不需要重复勾选' : '未加入目录清单');
  const inFiles = isFileSelected(fileSel, node.path) || (fileSel.dirs || []).some((d) => d.path.toLowerCase() === node.path.toLowerCase());
  const tags = (node.tags || []).slice(0, 3).map((t) => `<span class="bt-tag">${esc(t)}</span>`).join('');
  const size = dirSizeText(node.path, {
    includeSize: dirSel.options.includeSize !== false,
    compact: true,
  });
  const expanded = expandedTree.has(key);
  let childrenHtml = '';
  if (expanded) {
    const cached = treeCache.get(key);
    childrenHtml = cached
      ? ((cached.children || []).length
        ? (cached.children || []).map(treeNodeHtml).join('')
        : '<div class="bt-empty">没有子目录</div>')
      : '<div class="bt-empty">读取子目录…</div>';
  }
  return `<div class="bt-node" data-path="${esc(node.path)}">
    <div class="bt-row">
      <button type="button" class="bt-expand" data-bt="expand" title="展开子目录">${expanded ? '▾' : '▸'}</button>
      <label class="bt-check"><input type="checkbox" data-bt="check" data-path="${esc(node.path)}" ${checked}${coveredAttr} title="${checkTitle}"> <span>${esc(node.name || node.path)}</span></label>
      ${tags}
      <span class="bt-size" data-size-path="${esc(node.path)}" title="整棵物理子树的体积">${esc(size)}</span>
      <button type="button" class="bt-add ${inFiles ? 'active' : ''}" data-bt="add-fl" data-path="${esc(node.path)}" title="把该目录下的文件加入文件列表选择集">${inFiles ? '已加入' : '+ 目录下文件'}</button>
    </div>
    <div class="bt-children${expanded ? '' : ' hidden'}">${childrenHtml}</div>
  </div>`;
}

async function renderDirs() {
  const pane = $('builderDirs');
  if (!pane) return;
  const root = getCurrentDir();
  const sel = store.get('dirs');
  const includeSize = sel.options.includeSize !== false;
  const rows = (sel.dirs || []).map((item) => {
    const size = dirSizeText(item.path, { includeSize });
    return `<div class="bl-row">
      <span class="bl-path" title="${esc(item.path)}">${esc(item.path)}</span>
      <span class="dl-size" data-size-path="${esc(item.path)}" title="整棵物理子树口径，与清单显示几层无关">${esc(size)}</span>
      <button type="button" data-bt="dl-refresh" data-path="${esc(item.path)}" title="重新计算这个目录的体积">刷新</button>
      <button type="button" data-bt="dl-toggle" data-path="${esc(item.path)}" title="切换只加一层 / 含所有子目录">${item.recursive === false ? '仅本层' : '含所有子目录'}</button>
      <button type="button" class="danger-text" data-bt="dl-remove" data-path="${esc(item.path)}">移除</button>
    </div>`;
  }).join('');
  if (!root) {
    pane.innerHTML = '<p class="builder-hint">请先进入一个磁盘目录，再从这里勾选要生成清单的子目录。</p>';
    return;
  }
  pane.innerHTML = `<p class="builder-hint">从 <strong>${esc(root)}</strong> 开始勾选；也可在文件浏览页的目录行点 <strong>+ 目录清单</strong>，选择只加一层或含所有子目录，并查看目录体积。勾选表示把这个目录作为清单根；父目录已选“含子目录”时，子目录显示为半选，不需要重复勾。展开子目录只按需读取一层，体积单独异步计算。</p>
    <p class="builder-totals" id="builderTotals">${totalsHtml()}</p>
    <div class="bl-section-title">已选目录（${(sel.dirs || []).length}）</div>
    <div class="bl-list">${rows || '<div class="bl-empty">尚未选择目录</div>'}</div>
    <div class="bl-section-title">目录勾选树</div>
    <div class="bt-tree">${treeNodeHtml({ path: root, name: root.split(/[\\/]/).filter(Boolean).pop() || root, tags: [] })}</div>
    <div class="builder-options">
      <label><input type="checkbox" id="builderOptRecursive" ${sel.options.recursive ? 'checked' : ''}> 递归包含子目录（仅对未单独指定层数的目录生效）</label>
      <label><input type="checkbox" id="builderOptSize" ${sel.options.includeSize ? 'checked' : ''}> 计算目录体积</label>
      <label><input type="checkbox" id="builderOptMtime" ${sel.options.includeMtime ? 'checked' : ''}> 记录 mtime</label>
    </div>`;
  applyCoveredChecks(pane);
  void hydrateExpandedNodes(pane);
}

function copyRowHtml(path, ref) {
  const isLink = ref.kind === 'url' && /^https?:\/\//i.test(ref.value);
  const title = esc(ref.label || ref.value);
  const display = isLink
    ? `<a class="cr-link" href="${esc(ref.value)}" target="_blank" rel="noopener noreferrer" title="${esc(ref.value)}">${title}</a>`
    : `<span class="cr-value" title="${esc(ref.value)}">${title}</span>`;
  return `<div class="bl-row cr-row">
    <span class="bl-path" title="${esc(path)}">${esc(path)}</span>
    <span class="cr-kind">${esc(ref.kind)}</span>
    ${display}
    <button type="button" data-bt="cr-edit" data-path="${esc(path)}" data-id="${esc(ref.id)}" title="编辑这条引用">编辑</button>
    <button type="button" class="danger-text" data-bt="cr-remove" data-path="${esc(path)}" data-id="${esc(ref.id)}" title="删除这条引用">删除</button>
  </div>`;
}

function renderFiles() {
  const pane = $('builderFiles');
  if (!pane) return;
  const sel = store.get('files');
  const dirSel = store.get('dirs');
  const includeSize = dirSel.options.includeSize !== false;
  const copies = store.get('copies');
  const dirRows = (sel.dirs || []).map((item) => `<div class="bl-row">
    <span class="bl-path" title="${esc(item.path)}">${esc(item.path)}</span>
    <span class="dl-size" data-size-path="${esc(item.path)}" title="整棵物理子树口径">${esc(dirSizeText(item.path, { includeSize }))}</span>
    <button type="button" data-bt="fl-refresh-size" data-path="${esc(item.path)}" title="重新计算这个目录的体积">刷新</button>
    <button type="button" data-bt="fl-recursive" data-path="${esc(item.path)}" title="切换是否递归">${item.recursive === false ? '仅本层' : '递归'}</button>
    <button type="button" data-bt="fl-scan-one" data-path="${esc(item.path)}" title="只扫描并上传这一个目录">上传这个</button>
    <button type="button" class="danger-text" data-bt="fl-remove" data-path="${esc(item.path)}">移除</button>
  </div>`).join('');
  const fileRows = (sel.files || []).map((item) => {
    const size = Number(item.size) || 0;
    return `<div class="bl-row">
      <span class="bl-path" title="${esc(item.path)}">${esc(item.name || item.path)}${item.archive ? ' · 包内' : ''}</span>
      <span class="fl-size" title="源文件大小 ${size} 字节">${esc(formatBytes(size))}</span>
      <button type="button" class="cr-add-btn" data-bt="cr-add" data-path="${esc(item.path)}" title="给这个文件预留一个网络副本链接或路径">+ 副本</button>
      <button type="button" class="danger-text" data-bt="fp-remove" data-path="${esc(item.path)}">移除</button>
    </div>`;
  }).join('');
  const copyEntries = Object.entries(copies.refs || {});
  const copyRows = copyEntries.map(([path, refs]) => refs.map((ref) => copyRowHtml(path, ref)).join('')).join('');
  const total = copyEntries.reduce((sum, [, refs]) => sum + refs.length, 0);
  const root = getCurrentDir();
  pane.innerHTML = `<p class="builder-hint">「哪些目录下的文件列表要上传」完全由你决定：在目录清单里点 <strong>+ 目录下文件</strong>，或在文件浏览页的目录行/文件行点 <strong>+ 目录下文件</strong> / <strong>+ 该文件</strong>。</p>
    <p class="builder-totals" id="builderTotals">${totalsHtml()}</p>
    <div class="bl-section-title">已选目录（${(sel.dirs || []).length}）</div>
    <div class="bl-list">${dirRows || '<div class="bl-empty">尚未选择目录</div>'}</div>
    <div class="bl-section-title">手工加入的文件（${(sel.files || []).length}）</div>
    <div class="bl-list">${fileRows || '<div class="bl-empty">无</div>'}</div>
    <div class="bl-section-title">预留的网络副本（${total} 条 / ${copyEntries.length} 个文件）
      <button type="button" class="bt-add" data-bt="cr-new">+ 按路径添加</button></div>
    <p class="builder-hint">仅登记 Web 链接或远端服务路径，<strong>本程序不会上传文件内容，也不会校验链接是否可用</strong>。这些内容会写入你配置的网络数据组；引用变更只回写相关的文件列表片，不重新扫盘。</p>
    <div class="bl-list cr-list">${copyRows || '<div class="bl-empty">还没有预留引用；在文件浏览页的文件行点「+ 副本」，或点上面「按路径添加」</div>'}</div>
    ${root ? `<div class="bl-section-title">当前目录快捷加入</div>
      <button type="button" class="bt-add" data-bt="add-fl" data-path="${esc(root)}">+ 把 ${esc(root)} 加入文件列表</button>` : ''}`;
}

/* ---------------- 目录清单弹窗（一层 / 递归 + 整棵子树体积） ---------------- */

function closeDirListModal() {
  $('dirListModal')?.classList.add('hidden');
  dirDraft = null;
}

function dirListSummaryHtml(sum) {
  const partial = sum.partial
    ? ' · <span class="dl-warn">部分目录不可读，数值可能偏小</span>' : '';
  return `<strong>${Number(sum.fileCount) || 0}</strong> 个文件 · 逻辑大小 <strong>${formatBytes(sum.totalSize)}</strong> · 占用 <strong>${formatBytes(sum.totalSizeOnDisk)}</strong>${partial}`;
}

/** 体积口径照 dir-struct-gen：整棵物理子树，与清单里显示几层无关。 */
async function loadDirSummary() {
  if (!dirDraft) return;
  const path = dirDraft.path;
  const box = $('dirListSummary');
  const children = $('dirListChildren');
  const err = $('dirListError');
  if (box) box.textContent = '正在扫描整棵子树以计算体积…';
  if (children) children.innerHTML = '';
  if (err) err.textContent = '';
  try {
    const scan = await runScanBatches(
      [{ path, recursive: false, sizeFull: true }],
      { timeoutMs: 20_000 },
    );
    const root = (scan.roots || []).find((item) => normPath(item.path) === normPath(path))
      || (scan.roots || [])[0];
    if (!root) throw new Error('扫描没有返回该目录');
    cacheRootSummaries(scan);
    const sum = cacheGetSummary(path) || {
      fileCount: Number(root.fileCount) || 0,
      totalSize: Number(root.totalSize) || 0,
      totalSizeOnDisk: Number(root.totalSizeOnDisk) || 0,
      partial: Boolean(root.sizePartial),
    };
    if (dirDraft?.path !== path) return; // 期间换了目录，丢弃过期结果
    if (box) box.innerHTML = dirListSummaryHtml(sum);
    const subs = root.children || [];
    if (children) {
      const rows = subs.slice(0, 12).map((item) => `<div class="bl-row">
        <span class="bl-path">${esc(item.name)}</span>
        <span class="dl-size">${Number(item.fileCount) || 0} 个文件 · ${formatBytes(item.totalSize)}</span>
      </div>`).join('');
      children.innerHTML = `<div class="bl-section-title">一层子目录（${subs.length}）</div>
        <div class="bl-list dl-children-list">${rows || '<div class="bl-empty">没有子目录</div>'}</div>
        ${subs.length > 12 ? '<p class="builder-hint">仅列出前 12 个；生成清单后可查看完整子树。</p>' : ''}`;
    }
    updateSizeDisplays();
  } catch (error) {
    if (dirDraft?.path !== path) return;
    if (box) box.textContent = '体积计算失败';
    if (err) err.textContent = `无法计算目录体积：${error.message}`;
  }
}

/* ---------------- 批量扫描与体积队列 ---------------- */

function normalizeScanEntries(rawEntries, defaults = {}) {
  const recursive = defaults.recursive !== false;
  const sizeFull = defaults.sizeFull !== false;
  const out = [];
  for (const raw of rawEntries || []) {
    if (!raw) continue;
    const path = typeof raw === 'string' ? raw : raw.path;
    if (!path) continue;
    const entry = typeof raw === 'string'
      ? { path, recursive, sizeFull }
      : {
        path,
        recursive: raw.recursive === undefined ? recursive : raw.recursive !== false,
        sizeFull: raw.sizeFull === undefined ? sizeFull : Boolean(raw.sizeFull),
      };
    out.push(entry);
  }
  return out;
}

/**
 * 最小扫描根：完全相同路径合并；祖先已经递归覆盖子树时，丢掉后代根。
 * 注意：祖先 recursive=false 时只输出一层，不能覆盖后代，必须保留后代根。
 */
function minimalScanEntries(rawEntries, defaults = {}) {
  const entries = normalizeScanEntries(rawEntries, defaults);
  const sorted = [...entries].sort((a, b) => normPath(a.path).length - normPath(b.path).length);
  const roots = [];
  for (const entry of sorted) {
    const key = normPath(entry.path);
    const same = roots.find((item) => normPath(item.path) === key);
    if (same) {
      same.recursive = same.recursive || entry.recursive;
      same.sizeFull = same.sizeFull || entry.sizeFull;
      continue;
    }
    const covered = roots.some((root) => root.recursive
      && root.path !== entry.path
      && pathIsUnder(root.path, entry.path));
    if (!covered) roots.push({ ...entry });
  }
  return roots;
}

function emptyScanResult() {
  return { roots: [], summaries: {}, files: {}, status: {}, failed: [] };
}

function mergeScanResult(target, part) {
  if (Array.isArray(part?.roots)) target.roots.push(...part.roots);
  if (part?.summaries && typeof part.summaries === 'object') {
    Object.assign(target.summaries, part.summaries);
    cacheScanSummaries(part);
  }
  for (const [path, rows] of Object.entries(part?.files || {})) {
    target.files[path] = (target.files[path] || []).concat(Array.isArray(rows) ? rows : []);
  }
  if (part?.status && typeof part.status === 'object') Object.assign(target.status, part.status);
}

/** 按批扫描：每批独立请求、独立超时；一批失败不会丢掉其他批的结果。 */
async function runScanBatches(rawEntries, {
  timeoutMs = SCAN_BATCH_TIMEOUT_MS,
  onProgress = null,
  continueOnError = false,
  defaults = {},
  hash = false,
} = {}) {
  const entries = minimalScanEntries(rawEntries, defaults);
  const out = emptyScanResult();
  const total = entries.length;
  for (let index = 0; index < total; index += SCAN_BATCH_SIZE) {
    const batch = entries.slice(index, index + SCAN_BATCH_SIZE);
    onProgress?.({ done: index, total, batch });
    try {
      const part = await api('/api/mft/scan', {
        method: 'POST',
        body: JSON.stringify({
          paths: batch,
          timeoutMs,
          ...(hash ? { hash: true } : {}),
        }),
      });
      mergeScanResult(out, part);
    } catch (err) {
      out.failed.push({
        paths: batch.map((entry) => entry.path),
        message: err.message,
      });
      if (!continueOnError) throw err;
    }
  }
  onProgress?.({ done: total, total, batch: [] });
  return out;
}

function updateSizeDisplays(paths = null) {
  if (!store) return;
  const includeSize = store.get('dirs').options.includeSize !== false;
  const only = paths ? new Set(paths.map((path) => normPath(path))) : null;
  for (const el of document.querySelectorAll('[data-size-path]')) {
    const path = el.dataset.sizePath;
    if (!path) continue;
    if (only && !only.has(normPath(path))) continue;
    const compact = el.classList.contains('bt-size');
    el.textContent = dirSizeText(path, { includeSize, compact });
  }
  updateBuilderTotals();
}

function scheduleSizeFlush(delay = 250) {
  if (sizeQueueTimer) return;
  sizeQueueTimer = setTimeout(() => {
    sizeQueueTimer = null;
    void flushSizeQueue();
  }, delay);
}

async function flushSizeQueue() {
  if (sizeQueueRunning || !store) return;
  sizeQueueRunning = true;
  try {
    while (sizeQueue.length) {
      const rawBatch = sizeQueue.splice(0, SCAN_BATCH_SIZE);
      const entries = minimalScanEntries(
        rawBatch.map((path) => ({ path, recursive: true, sizeFull: true })),
      );
      if (!entries.length) continue;
      setStatus(`正在计算 ${entries.length} 个目录的体积…`);
      try {
        const scan = await runScanBatches(entries, {
          timeoutMs: SCAN_BATCH_TIMEOUT_MS,
          continueOnError: true,
        });
        cacheRootSummaries(scan);
        for (const entry of entries) {
          const key = normPath(entry.path);
          sizePending.delete(key);
          sizeFailures.delete(key);
          if (!cacheGetSummary(entry.path)) {
            const failed = scan.failed?.find((item) => item.paths.includes(entry.path));
            sizeFailures.set(key, failed?.message || '扫描没有返回该目录的体积');
          }
        }
        updateSizeDisplays();
      } catch (err) {
        for (const entry of entries) {
          const key = normPath(entry.path);
          sizePending.delete(key);
          sizeFailures.set(key, err.message);
        }
        updateSizeDisplays();
      }
    }
  } finally {
    sizeQueueRunning = false;
    if (sizeQueue.length) scheduleSizeFlush(0);
    else updateBuilderTotals();
  }
}

/**
 * 把目录加进体积计算队列。
 * force=false 时缓存命中直接跳过；force=true 时忽略缓存重新计算。
 */
function queueSizes(paths, { force = false } = {}) {
  if (!store) return;
  const includeSize = store.get('dirs').options.includeSize !== false;
  if (!includeSize) {
    updateSizeDisplays(paths);
    return;
  }
  const entries = minimalScanEntries(
    (paths || []).map((path) => ({ path, recursive: true, sizeFull: true })),
  );
  let added = 0;
  for (const entry of entries) {
    const key = normPath(entry.path);
    if (!force && cacheGetSummary(entry.path)) continue;
    sizeFailures.delete(key);
    if (sizePending.has(key)) continue;
    sizePending.add(key);
    sizeQueue.push(entry.path);
    added += 1;
  }
  if (!added) {
    updateSizeDisplays(paths);
    return;
  }
  updateSizeDisplays(entries.map((entry) => entry.path));
  scheduleSizeFlush();
}

/** 文件浏览页目录行「+ 目录清单」入口：只打开弹窗，不写选择集、不上传。 */
export function openDirListForItem(item) {
  if (!store || !item?.path) return;
  const sel = canonicalDirSelection(store.get('dirs'));
  if (sel !== store.get('dirs')) store.set('dirs', sel);
  const existing = (sel.dirs || []).find(
    (entry) => normPath(entry.path) === normPath(item.path),
  );
  dirDraft = { path: item.path, recursive: existing ? existing.recursive !== false : false };
  const input = $('dirListPath');
  if (input) input.value = item.path;
  const one = $('dirListOne');
  const all = $('dirListAll');
  if (one) one.checked = !dirDraft.recursive;
  if (all) all.checked = dirDraft.recursive;
  const save = $('dirListSave');
  if (save) save.textContent = existing ? '更新目录清单' : '加入目录清单';
  const fileSel = store.get('files');
  const inFiles = (fileSel.dirs || []).some(
    (entry) => String(entry.path).toLowerCase() === String(item.path).toLowerCase(),
  );
  const includeFiles = $('dirListIncludeFiles');
  if (includeFiles) includeFiles.checked = inFiles;
  const err = $('dirListError');
  if (err) err.textContent = '';
  $('dirListModal')?.classList.remove('hidden');
  void loadDirSummary();
}

function saveDirList() {
  if (!dirDraft) return;
  const path = dirDraft.path;
  const recursive = $('dirListAll')?.checked === true;
  const includeFiles = $('dirListIncludeFiles')?.checked === true;
  let sel = canonicalDirSelection(store.get('dirs'));
  sel = removeDirSelection(sel, path); // 已存在时先移除，允许改层数
  sel = addDirSelection(sel, path, recursive);
  store.set('dirs', sel);

  // 目录清单只负责 struct；勾选“同时加入文件列表”后，才把这个目录作为
  // 文件列表根加入（从而包含该目录/子树下的所有文件）。
  let fileSel = store.get('files');
  fileSel = removeFileDirSelection(fileSel, path);
  if (includeFiles) fileSel = addFileDirSelection(fileSel, path, recursive);
  store.set('files', fileSel);

  invalidateScan();
  closeDirListModal();
  setStatus(`已把 ${path} 加入目录清单（${recursive ? '含所有子目录' : '仅本层'}）${includeFiles ? '，并加入文件列表' : ''}；点「重新扫描并生成」写入 struct v2`);
  render();
  if (store.get('dirs').options.includeSize !== false) void queueSizes([path]);
}

function openCopyRefModal(draft = {}) {
  copyDraft = { ...draft };
  $('copyRefTitle').textContent = draft.id ? '编辑网络副本引用' : '预留网络副本';
  $('copyRefPath').value = draft.path || '';
  $('copyRefKind').value = draft.kind || 'url';
  $('copyRefValue').value = draft.value || '';
  $('copyRefLabel').value = draft.label || '';
  $('copyRefNote').value = draft.note || '';
  $('copyRefError').textContent = '';
  $('copyRefModal')?.classList.remove('hidden');
  $('copyRefValue')?.focus?.();
}

function closeCopyRefModal() {
  $('copyRefModal')?.classList.add('hidden');
  copyDraft = null;
}

function formCopyRef() {
  return cleanCopyRef({
    id: copyDraft?.id,
    addedAt: copyDraft?.addedAt,
    kind: $('copyRefKind')?.value || 'url',
    value: $('copyRefValue')?.value || '',
    label: $('copyRefLabel')?.value || '',
    note: $('copyRefNote')?.value || '',
  });
}

/** 引用变更后只 patch 受影响的文件列表片；同步组未连接时保留本地引用并如实提示。 */
async function afterCopyChange() {
  render();
  try {
    const result = await patchCopyRefs(store.get('copies'));
    if (result.reason) setStatus(`引用已保存到本机；远端未更新（${result.reason}）`);
    else setStatus(`引用已保存 · 回写 ${result.patched} 份文件列表片${result.skipped ? ` · 跳过 ${result.skipped} 份（尚未生成）` : ''}`);
  } catch (err) {
    setStatus(`引用已保存到本机，但回写失败：${err.message}`, true);
  }
}

function saveCopyRef() {
  const path = String($('copyRefPath')?.value || '').trim();
  const ref = formCopyRef();
  if (!path || (!hostRelativePath(path) && !path.startsWith('zip:'))) {
    $('copyRefError').textContent = '请填写本机文件的完整路径（如 C:\\Photos\\a.jpg）或 zip: 伪路径';
    return;
  }
  if (!ref) {
    $('copyRefError').textContent = '链接/路径不能为空，也不能是 javascript:/data:/file: 或本机盘符路径（C:\\…）';
    return;
  }
  const state = store.get('copies');
  let next = state;
  if (copyDraft?.id) {
    next = removeCopyRef(next, copyDraft.path, copyDraft.id);
    next = addCopyRef(next, path, { ...ref, id: copyDraft.id, addedAt: copyDraft.addedAt || ref.addedAt });
  } else {
    next = addCopyRef(next, path, ref);
  }
  store.set('copies', next);
  closeCopyRefModal();
  void afterCopyChange();
}

function renderPreview() {
  const pane = $('builderPreview');
  if (!pane) return;
  if (!preview) {
    pane.innerHTML = '<p class="builder-hint">还没有生成预览。点底部「重新扫描并生成」后，这里会列出全部待写入的文件。</p>';
    return;
  }
  const rows = preview.files.map((file) => {
    const text = `${JSON.stringify(file.json, null, 2)}\n`;
    const size = new TextEncoder().encode(text).length;
    return `<div class="bp-card"><div class="bp-path">${esc(file.path)} <span class="bp-kind">${esc(file.kind)}</span></div>
      <div class="bp-meta">${(size / 1024).toFixed(1)} KB · ${Array.isArray(file.json.files) ? `${file.json.files.length} 条` : 'JSON'}</div>
      <pre class="bp-code">${esc(text.slice(0, 420))}${text.length > 420 ? '\n…' : ''}</pre></div>`;
  }).join('');
  const s = preview.stats;
  pane.innerHTML = `<p class="builder-hint">共 <strong>${preview.files.length}</strong> 个文件 · 扫描分片 ${s.scanShardCount} · 书签分片 ${s.bookmarkShardCount} · 文件列表 ${s.fileListCount} · r${s.revision}。</p>
    <div class="bp-grid">${rows}</div>`;
}

function renderDiag() {
  const pane = $('builderDiag');
  if (!pane) return;
  const diag = syncDiagnostics();
  const vols = Object.entries(hostInfo?.volumes || {}).map(([k, v]) => `${k}: → ${v || '（无 volumeId，回退 主机::盘符）'}`).join('<br>');
  pane.innerHTML = `<div class="bl-section-title">本机与同步组</div>
    <p class="builder-hint">主机 <strong>${esc(hostInfo?.host || '未知')}</strong> · 同步组 app-id <code>${esc(diag.appId)}</code> · ${diag.state.ready ? '已连接' : `未连接（${esc(diag.state.reason)}）`} · 上次导出 r${diag.revision}</p>
    <p class="builder-hint">${vols || '未读到卷身份'}</p>
    <div class="bl-section-title">缓存</div>
    <p class="builder-hint">扫描分片 ${diag.scanBases.length} 份 · file-list 片 ${diag.fileListPaths.length} 份 · 已知卷 ${diag.knownVolumes.length} 个 · 网络副本引用 ${diag.copyRefs?.refs || 0} 条 / ${diag.copyRefs?.files || 0} 个文件</p>
    <div class="bl-section-title">反向加载清单</div>
    <p class="builder-hint">选择本地导出的 JSON（主机索引 / 卷分片 / file-list 片），把其中的 <code>dir</code> 回填成选择集。</p>
    <input type="file" id="builderLoadFile" accept=".json,application/json" multiple>
    <div class="bl-section-title">深挖标记 folder-deepen</div>
    <p class="builder-hint">每行一个 host-relative 路径（如 <code>C:/Photos/2024</code>），写入 <code>folder-deepen/&lt;volumeId&gt;.json</code>。</p>
    <textarea id="builderDeepen" rows="3" placeholder="C:/Photos/2024"></textarea>
    <button type="button" data-bt="deepen">写入深挖标记</button>`;
}

function render() {
  for (const [name, id] of [['dirs', 'builderDirs'], ['files', 'builderFiles'], ['preview', 'builderPreview'], ['diag', 'builderDiag']]) {
    const pane = $(id);
    if (pane) pane.classList.toggle('hidden', name !== tab);
  }
  document.querySelectorAll('[data-builder-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.builderTab === tab);
  });
  if (tab === 'dirs') void renderDirs();
  if (tab === 'files') renderFiles();
  if (tab === 'preview') renderPreview();
  if (tab === 'diag') renderDiag();
}

function applyCoveredChecks(rootEl) {
  for (const input of rootEl?.querySelectorAll?.('input[data-bt="check"][data-covered="1"]') || []) {
    input.indeterminate = true;
  }
}

function renderTreeChildren(childrenEl, children) {
  childrenEl.innerHTML = (children || []).length
    ? (children || []).map(treeNodeHtml).join('')
    : '<div class="bt-empty">没有子目录</div>';
  childrenEl.dataset.loaded = '1';
  childrenEl.classList.remove('hidden');
  applyCoveredChecks(childrenEl);
  void hydrateExpandedNodes(childrenEl);
}

async function hydrateExpandedNodes(rootEl) {
  for (const nodeEl of rootEl?.querySelectorAll?.('.bt-node') || []) {
    const key = normPath(nodeEl.dataset.path);
    if (!expandedTree.has(key) || treeCache.has(key)) continue;
    const childrenEl = nodeEl.querySelector(':scope > .bt-children');
    if (!childrenEl || childrenEl.dataset.loading === '1') continue;
    childrenEl.dataset.loading = '1';
    try {
      const result = await treeChildrenFor(nodeEl.dataset.path);
      if (childrenEl.isConnected && expandedTree.has(key)) {
        renderTreeChildren(childrenEl, result.children);
      }
    } catch (err) {
      if (childrenEl.isConnected) {
        childrenEl.innerHTML = `<div class="bt-empty">读取失败：${esc(err.message)}</div>`;
      }
    } finally {
      delete childrenEl.dataset.loading;
    }
  }
}

function toCurrentPath(value) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('zip:')) return text;
  const currentDir = String(getCurrentDir() || '');
  if (/^[A-Za-z]:[\\/]/.test(currentDir)) {
    const match = text.match(/^\/([A-Za-z])(?:\/(.*))?$/);
    if (match) return `${match[1].toUpperCase()}:\\${(match[2] || '').replace(/\//g, '\\')}`;
    return text.replace(/\//g, '\\');
  }
  if (currentDir.startsWith('/')) {
    const match = text.match(/^([A-Za-z]):[\\/](.*)$/);
    if (match) return `/${match[1].toUpperCase()}/${match[2].replace(/\\/g, '/')}`;
    return text.replace(/\\/g, '/');
  }
  return text;
}

function uiPathFromHost(path) {
  return toCurrentPath(path);
}

function canonicalDirSelection(sel) {
  let changed = false;
  const seen = new Set();
  const dirs = [];
  for (const item of sel?.dirs || []) {
    const path = toCurrentPath(item.path);
    if (path !== item.path) changed = true;
    const key = normPath(path);
    if (!key || seen.has(key)) { changed = true; continue; }
    seen.add(key);
    dirs.push(path === item.path ? item : { ...item, path });
  }
  return changed ? { ...sel, dirs } : sel;
}

function treeChildrenFor(path, { force = false } = {}) {
  const key = normPath(path);
  if (!force) {
    const cached = treeCache.get(key);
    if (cached && Date.now() - cached.at < TREE_CACHE_TTL_MS) {
      return Promise.resolve({ children: cached.children, cached: true, stale: false });
    }
    if (treeInflight.has(key)) {
      return treeInflight.get(key).then((children) => ({ children, cached: false, stale: false }));
    }
  }
  const promise = api(`/api/mft/tree?path=${encodeURIComponent(path)}`)
    .then((data) => {
      const rawChildren = Array.isArray(data?.children) ? data.children : [];
      const children = rawChildren.map((child) => ({ ...child, path: uiPathFromHost(child.path) }));
      treeCache.set(key, { children, at: Date.now() });
      return children;
    })
    .finally(() => treeInflight.delete(key));
  treeInflight.set(key, promise);
  return promise.then((children) => ({ children, cached: false, stale: false }));
}

async function refreshTreeInBackground(path, childrenEl) {
  try {
    const result = await treeChildrenFor(path, { force: true });
    if (childrenEl?.isConnected) renderTreeChildren(childrenEl, result.children);
  } catch {
    // 过期缓存先继续显示；刷新失败不把节点变成错误态。
  }
}

async function expandNode(nodeEl) {
  const childrenEl = nodeEl.querySelector(':scope > .bt-children');
  if (!childrenEl) return;
  const path = nodeEl.dataset.path;
  const key = normPath(path);
  const expandBtn = nodeEl.querySelector(':scope > .bt-row .bt-expand');
  if (!childrenEl.classList.contains('hidden')) {
    childrenEl.classList.add('hidden');
    expandedTree.delete(key);
    if (expandBtn) expandBtn.textContent = '▸';
    return;
  }
  expandedTree.add(key);
  if (expandBtn) expandBtn.textContent = '▾';
  const cached = treeCache.get(key);
  if (cached) {
    renderTreeChildren(childrenEl, cached.children);
    if (Date.now() - cached.at >= TREE_CACHE_TTL_MS) {
      void refreshTreeInBackground(path, childrenEl);
    }
    return;
  }
  childrenEl.innerHTML = '<div class="bt-empty">读取子目录…</div>';
  childrenEl.classList.remove('hidden');
  try {
    const result = await treeChildrenFor(path);
    renderTreeChildren(childrenEl, result.children);
  } catch (err) {
    childrenEl.dataset.loaded = '0';
    childrenEl.innerHTML = `<div class="bt-empty">读取失败：${esc(err.message)}
      <button type="button" data-bt="tree-retry" data-path="${esc(path)}">重试</button></div>`;
  }
}

/**
 * struct 目录逐项带层数选择（对应 dir-struct-gen 的「⊕ 含子目录」）；
 * 文件列表目录也保留逐项递归语义；体积口径由「计算目录体积」统一控制。
 */
function scanRootEntries(dirSel, fileSel) {
  const includeSize = dirSel.options.includeSize !== false;
  const entries = (dirSel.dirs || []).map((item) => ({
    path: item.path,
    recursive: item.recursive !== false,
    sizeFull: includeSize, // struct 节点需要精确体积时才让后端递归整棵物理子树
  }));
  const known = new Set(entries.map((item) => normPath(item.path)));
  for (const item of fileSel.dirs || []) {
    if (!item?.path || known.has(normPath(item.path))) continue;
    known.add(normPath(item.path));
    entries.push({
      path: item.path,
      recursive: item.recursive !== false,
      sizeFull: includeSize,
    });
  }
  return entries;
}

async function doScan(paths = null, fileSelection = null) {
  const dirSel = store.get('dirs');
  const fileSel = fileSelection || store.get('files');
  const defaults = {
    recursive: dirSel.options.recursive !== false,
    sizeFull: dirSel.options.includeSize !== false,
  };
  const entries = minimalScanEntries(paths || scanRootEntries(dirSel, fileSel), defaults);
  if (!entries.length) {
    setStatus('请先勾选至少一个目录，或用「+ 目录下文件」加入文件列表目录', true);
    return null;
  }
  const capturedSig = selectionSignature(dirSel, fileSel);
  const rootCount = entries.length;
  const wantsHash = (fileSel?.dirs || []).length > 0
    || (fileSel?.files || []).some((item) => {
      const itemPath = typeof item === 'string' ? item : item?.path;
      return Boolean(itemPath) && !String(itemPath).startsWith('zip:') && !item?.archive;
    });
  clearTreeCacheFor(entries);
  setStatus(`正在扫描 ${rootCount} 个目录（每批最多 ${SCAN_BATCH_SIZE} 个，整棵子树体积单独计算）…`);
  try {
    const scan = await runScanBatches(entries, {
      timeoutMs: SCAN_BATCH_TIMEOUT_MS,
      defaults,
      hash: wantsHash,
      onProgress: ({ done, total }) => {
        if (total) setStatus(`正在扫描 ${done}/${total} 个目录根…`);
      },
    });
    cacheRootSummaries(scan);
    if (!scan.roots.length) throw new Error('扫描没有返回任何目录');
    lastScan = scan;
    lastScanSig = capturedSig;
    lastScanFileSel = fileSel;
    await ensureHostInfo();
    const revision = syncDiagnostics().revision + 1;
    preview = composeExport({
      scan, hostInfo, snapshot: getSnapshot(), fileSelection: fileSel,
      copyRefs: store.get('copies'), now: Date.now(), revision,
    });
    render();
    const stats = preview.stats;
    const stat = Object.values(scan.status || {});
    const partial = stat.some((item) => item?.partial);
    setStatus(`已生成 ${preview.files.length} 个文件（扫描分片 ${stats.scanShardCount} / 文件列表 ${stats.fileListCount}）${partial ? ' · 部分目录超时/不可读' : ''}；点「上传到同步组」写入远端`, partial);
    return scan;
  } catch (err) {
    setStatus(`扫描失败：${err.message}`, true);
    return null;
  }
}

function previewEntries() {
  return (preview?.files || []).map((file) => ({
    name: file.path,
    content: `${JSON.stringify(file.json, null, 2)}\n`,
  }));
}

function downloadZip() {
  const entries = previewEntries();
  if (!entries.length) { setStatus('请先生成预览', true); return; }
  const bytes = makeZip(entries);
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zip-browser-manifest-${hostInfo?.host || 'pc'}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(`已下载 ${entries.length} 个文件的 ZIP`);
}

async function copyJson() {
  const entries = previewEntries();
  if (!entries.length) { setStatus('请先生成预览', true); return; }
  const text = JSON.stringify(Object.fromEntries(entries.map((e) => [e.name, JSON.parse(e.content)])), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`已复制 ${entries.length} 个文件的 JSON`);
  } catch {
    setStatus('浏览器拒绝剪贴板访问，请改用「下载 ZIP」', true);
  }
}

async function upload({ skipFreshCheck = false } = {}) {
  if (!syncState().ready) {
    setStatus(`同步组未就绪：${syncState().reason}，请先在「同步收藏」面板连接`, true);
    return;
  }
  const currentSig = selectionSignature(store.get('dirs'), store.get('files'));
  if (!lastScan || (!skipFreshCheck && lastScanSig !== currentSig)) {
    const scan = await doScan();
    if (!scan) return;
  }
  const dirCount = (store.get('dirs').dirs || []).length;
  const fileCount = (store.get('files').files || []).length;
  setStatus(`准备上传：${dirCount} 个目录 / ${fileCount} 个文件；只写清单 JSON，不传文件内容…`);
  try {
    const stats = await syncScanNow(lastScan, { fileSelection: lastScanFileSel || store.get('files') });
    const skipped = Math.max(0, (preview?.files?.length || 0) - stats.written);
    setStatus(`已写入 ${stats.written} 个文件（跳过未变化的 ${skipped} 个，清理孤儿片 ${stats.removed}）`);
  } catch (err) {
    setStatus(`上传失败：${err.message}`, true);
  }
}

function toggleFileDir(path) {
  const sel = store.get('files');
  const existing = (sel.dirs || []).find((item) => item.path.toLowerCase() === String(path).toLowerCase());
  if (existing) store.set('files', removeFileDirSelection(sel, path));
  else store.set('files', addFileDirSelection(sel, path));
  invalidateScan();
  render();
  if (!existing && store.get('dirs').options.includeSize !== false) void queueSizes([path]);
}

async function loadBack(files) {
  const collected = [];
  for (const file of files || []) {
    try {
      const parsed = JSON.parse(await file.text());
      const docs = Array.isArray(parsed) ? parsed : [parsed];
      for (const doc of docs) {
        const dir = doc?.dir || (doc?.mounts ? '' : '');
        const rel = hostRelativePath(doc?.path) || (String(dir).startsWith('zip:') ? dir : hostRelativePath(dir));
        if (rel) collected.push(rel);
        for (const child of doc?.children || []) {
          if (child?.path && hostRelativePath(child.path)) collected.push(child.path);
        }
      }
    } catch { /* 跳过无法解析的文件 */ }
  }
  if (!collected.length) { setStatus('没有从文件里找到可回填的目录路径', true); return; }
  let sel = store.get('dirs');
  for (const path of collected) sel = addDirSelection(sel, path);
  store.set('dirs', sel);
  invalidateScan();
  setStatus(`已从 ${files.length} 个文件回填 ${collected.length} 条路径到目录选择集`);
  render();
  if (store.get('dirs').options.includeSize !== false) void queueSizes(collected);
}

async function onAction(action, element) {
  const path = element.dataset.path;
  switch (action) {
    case 'tab': tab = element.dataset.builderTab; render(); break;
    case 'expand': await expandNode(element.closest('.bt-node')); break;
    case 'tree-retry': {
      const nodeEl = element.closest('.bt-node');
      if (!nodeEl) break;
      treeCache.delete(normPath(nodeEl.dataset.path));
      const childrenEl = nodeEl.querySelector(':scope > .bt-children');
      if (childrenEl) {
        childrenEl.dataset.loaded = '0';
        childrenEl.classList.add('hidden');
      }
      await expandNode(nodeEl);
      break;
    }
    case 'check': {
      const sel = canonicalDirSelection(store.get('dirs'));
      const recursive = sel.options.recursive !== false;
      store.set('dirs', element.checked ? addDirSelection(sel, path, recursive) : removeDirSelection(sel, path));
      invalidateScan();
      render();
      if (element.checked) void queueSizes([path]);
      break;
    }
    case 'add-fl': toggleFileDir(path); break;
    case 'dl-refresh': void queueSizes([path], { force: true }); break;
    case 'fl-refresh-size': void queueSizes([path], { force: true }); break;
    case 'dl-toggle': {
      const sel = store.get('dirs');
      store.set('dirs', {
        ...sel,
        dirs: (sel.dirs || []).map((item) => (normPath(item.path) === normPath(path)
          ? { ...item, recursive: item.recursive === false } : item)),
      });
      invalidateScan();
      render();
      if (store.get('dirs').options.includeSize !== false) void queueSizes([path]);
      break;
    }
    case 'dl-remove':
      store.set('dirs', removeDirSelection(store.get('dirs'), path));
      invalidateScan();
      render();
      break;
    case 'fl-remove':
      store.set('files', removeFileDirSelection(store.get('files'), path));
      invalidateScan();
      render();
      break;
    case 'fp-remove':
      store.set('files', removePickedFile(store.get('files'), path));
      invalidateScan();
      render();
      break;
    case 'cr-new': openCopyRefModal({}); break;
    case 'cr-add': openCopyRefModal({ path, kind: 'url' }); break;
    case 'cr-edit': {
      const ref = copyRefsFor(store.get('copies'), path).find((item) => item.id === element.dataset.id);
      if (ref) openCopyRefModal({ ...ref, path });
      break;
    }
    case 'cr-remove': {
      const next = removeCopyRef(store.get('copies'), path, element.dataset.id);
      store.set('copies', next);
      void afterCopyChange();
      break;
    }
    case 'fl-recursive': {
      const sel = store.get('files');
      store.set('files', {
        ...sel,
        dirs: (sel.dirs || []).map((item) => (item.path === path ? { ...item, recursive: item.recursive === false } : item)),
      });
      invalidateScan();
      render();
      break;
    }
    case 'fl-scan-one': {
      const scan = await doScan([path], {
        dirs: [{ path, recursive: true }], files: [],
      });
      if (scan) await upload({ skipFreshCheck: true });
      break;
    }
    case 'scan': await doScan(); break;
    case 'copy': await copyJson(); break;
    case 'download': downloadZip(); break;
    case 'upload': await upload(); break;
    case 'deepen': {
      const marks = ($('builderDeepen')?.value || '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (!marks.length) { setStatus('请先填写至少一个路径', true); break; }
      try {
        const result = await writeDeepenMarks(marks);
        setStatus(`已写入 ${result.written} 份深挖标记文件（共 ${result.marks} 条）`);
      } catch (err) { setStatus(`写入失败：${err.message}`, true); }
      break;
    }
    default: break;
  }
}

const MOBILE_BUILDER_QUERY = '(max-width: 720px)';

function builderInlineActive() {
  return !!(window.matchMedia && window.matchMedia(MOBILE_BUILDER_QUERY).matches);
}

/** 手机端不叠一层弹窗：把清单面板当作页面内面板铺开，关闭后回到文件列表。 */
function syncBuilderInline() {
  const modal = $('builderModal');
  const active = !!modal && !modal.classList.contains('hidden') && builderInlineActive();
  document.body.classList.toggle('builder-inline', active);
}

export function closeBuilder() {
  $('builderModal')?.classList.add('hidden');
  document.body.classList.remove('builder-inline');
}

export function openBuilder() {
  const modal = $('builderModal');
  if (modal) modal.classList.remove('hidden');
  syncBuilderInline();
  const canonical = canonicalDirSelection(store?.get('dirs'));
  if (canonical && canonical !== store.get('dirs')) store.set('dirs', canonical);
  void ensureHostInfo().then(() => render()).catch((err) => setStatus(`读取本机信息失败：${err.message}`, true));
  render();
  const dirSel = store?.get('dirs');
  if (dirSel?.options?.includeSize !== false) {
    void queueSizes((dirSel?.dirs || []).map((item) => item.path));
  }
}

/** 文件浏览页行内「+ 副本」入口：只打开引用表单，不打开清单面板、不上传任何内容。 */
export function openCopyRefForItem(item) {
  if (!store || !item?.path) return;
  openCopyRefModal({ path: item.path, kind: 'url' });
}

export function addPickedFromItem(item) {
  if (!store || !item?.path) return;
  const sel = store.get('files');
  if (isFileSelected(sel, item.path)) return;
  store.set('files', addPickedFile(sel, {
    path: item.path,
    name: item.name,
    size: item.size,
    sizeOnDisk: item.size,
    mtime: item.mtime,
    archive: false,
  }));
  invalidateScan();
  status(`已把 ${item.name} 加入文件列表选择集`);
  render();
}

export async function addFileListDir(path) {
  if (!store || !path) return;
  const sel = store.get('files');
  const key = String(path).toLowerCase();
  // zip 包内目录没有宿主机 /api/list，保留原来“整目录加入”的行为。
  if (String(path).startsWith('zip:')) {
    if ((sel.dirs || []).some((item) => item.path.toLowerCase() === key)) return;
    store.set('files', addFileDirSelection(sel, path));
    invalidateScan();
    status(`已把 ${path} 加入文件列表选择集`);
    render();
    return;
  }

  let data;
  try {
    data = await api(`/api/list?path=${encodeURIComponent(path)}`);
  } catch (err) {
    setStatus(`读取 ${path} 的下一层目录失败：${err.message}`, true);
    return;
  }
  const children = (data?.items || []).filter((item) => item?.dir && item.path);
  if (!children.length) {
    setStatus(`${path} 没有下一层子目录`, true);
    return;
  }

  let next = sel;
  let added = 0;
  for (const child of children) {
    if ((next.dirs || []).some((item) => item.path.toLowerCase() === String(child.path).toLowerCase())) continue;
    next = addFileDirSelection(next, child.path);
    added += 1;
  }
  if (!added) {
    setStatus(`下一层目录都已在文件列表选择集中`);
    return;
  }
  store.set('files', next);
  invalidateScan();
  status(`已把 ${added} 个下一层目录加入文件列表选择集`);
  render();
  if (store.get('dirs').options.includeSize !== false) {
    void queueSizes(children.map((item) => item.path));
  }
}

export function initManifestBuilder(options = {}) {
  api = options.api;
  store = options.store;
  getSnapshot = options.getSnapshot || getSnapshot;
  getCurrentDir = options.getCurrentDir || getCurrentDir;
  status = options.status || status;

  $('builderBtn')?.addEventListener('click', openBuilder);
  $('builderClose')?.addEventListener('click', closeBuilder);
  $('builderModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'builderModal') closeBuilder();
  });
  if (typeof window.addEventListener === 'function') window.addEventListener('resize', syncBuilderInline);
  $('builderBody')?.addEventListener('click', async (event) => {
    const element = event.target.closest('[data-bt], [data-builder-tab]');
    if (!element) return;
    const action = element.dataset.bt || 'tab';
    if (element.tagName === 'INPUT' && action === 'check') return; // change 事件处理
    event.preventDefault();
    try { await onAction(action, element); } catch (err) { setStatus(`操作失败：${err.message}`, true); }
  });
  $('builderBody')?.addEventListener('change', (event) => {
    const element = event.target;
    if (element.dataset.bt === 'check') {
      const sel = canonicalDirSelection(store.get('dirs'));
      const recursive = sel.options.recursive !== false;
      store.set('dirs', element.checked
        ? addDirSelection(sel, element.dataset.path, recursive)
        : removeDirSelection(sel, element.dataset.path));
      invalidateScan();
      render();
      if (element.checked) void queueSizes([element.dataset.path]);
    }
    if (element.id === 'builderOptRecursive' || element.id === 'builderOptSize' || element.id === 'builderOptMtime') {
      const sel = store.get('dirs');
      const nextOptions = {
        ...sel.options,
        recursive: $('builderOptRecursive')?.checked ?? true,
        includeSize: $('builderOptSize')?.checked ?? true,
        includeMtime: $('builderOptMtime')?.checked ?? true,
      };
      store.set('dirs', { ...sel, options: nextOptions });
      invalidateScan();
      render();
      if (nextOptions.includeSize !== false) {
        void queueSizes((store.get('dirs').dirs || []).map((item) => item.path));
      }
    }
    if (element.id === 'builderLoadFile') void loadBack(element.files);
  });
  $('builderScan')?.addEventListener('click', () => void onAction('scan', { dataset: {} }));
  $('builderCopy')?.addEventListener('click', () => void onAction('copy', { dataset: {} }));
  $('builderDownload')?.addEventListener('click', () => void onAction('download', { dataset: {} }));
  $('builderUpload')?.addEventListener('click', () => void onAction('upload', { dataset: {} }));
  $('dirListSave')?.addEventListener('click', saveDirList);
  $('dirListCancel')?.addEventListener('click', closeDirListModal);
  $('dirListClose')?.addEventListener('click', closeDirListModal);
  $('dirListRefresh')?.addEventListener('click', () => void loadDirSummary());
  $('dirListModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'dirListModal') closeDirListModal();
  });
  $('copyRefSave')?.addEventListener('click', saveCopyRef);
  $('copyRefCancel')?.addEventListener('click', closeCopyRefModal);
  $('copyRefClose')?.addEventListener('click', closeCopyRefModal);
  $('copyRefModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'copyRefModal') closeCopyRefModal();
  });
  $('copyRefValue')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveCopyRef();
  });
  // Tab 按钮位于 builderBody 之外，单独绑定；body 内只处理 [data-bt]。
  document.querySelectorAll('[data-builder-tab]').forEach((btn) => {
    btn.addEventListener('click', () => void onAction('tab', btn));
  });
  return { openBuilder, addPickedFromItem, addFileListDir, openDirListForItem };
}

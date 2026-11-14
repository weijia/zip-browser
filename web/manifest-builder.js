// 「清单生成」面板：目录勾选树、文件列表选择、预览/复制/下载 ZIP、上传、诊断与反向加载。
// 物理扫描只在点「重新扫描并生成」时触发；收藏/选择集变化不扫盘。

import {
  composeExport, syncScanNow, syncDiagnostics, syncState, writeDeepenMarks,
} from './manifest-sync.js';
import {
  addDirSelection, removeDirSelection, isDirSelected,
  addFileDirSelection, removeFileDirSelection, isFileSelected,
  addPickedFile, removePickedFile,
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
let preview = null;
let tab = 'dirs';

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

function uniqueRoots(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const item of list || []) {
      const path = typeof item === 'string' ? item : item?.path;
      if (!path) continue;
      const key = path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(path);
    }
  }
  return out;
}

function treeNodeHtml(node) {
  const dirSel = store.get('dirs');
  const fileSel = store.get('files');
  const checked = isDirSelected(dirSel, node.path) ? 'checked' : '';
  const inFiles = isFileSelected(fileSel, node.path) || (fileSel.dirs || []).some((d) => d.path.toLowerCase() === node.path.toLowerCase());
  const tags = (node.tags || []).slice(0, 3).map((t) => `<span class="bt-tag">${esc(t)}</span>`).join('');
  return `<div class="bt-node" data-path="${esc(node.path)}">
    <div class="bt-row">
      <button type="button" class="bt-expand" data-bt="expand" title="展开子目录">▸</button>
      <label class="bt-check"><input type="checkbox" data-bt="check" data-path="${esc(node.path)}" ${checked}> <span>${esc(node.name || node.path)}</span></label>
      ${tags}
      <button type="button" class="bt-add ${inFiles ? 'active' : ''}" data-bt="add-fl" data-path="${esc(node.path)}" title="把该目录下的文件列表加入上传">${inFiles ? '已加入' : '+ 列表'}</button>
    </div>
    <div class="bt-children hidden"></div>
  </div>`;
}

async function renderDirs() {
  const pane = $('builderDirs');
  if (!pane) return;
  const root = getCurrentDir();
  const count = store.get('dirs').dirs.length;
  if (!root) {
    pane.innerHTML = '<p class="builder-hint">请先进入一个磁盘目录，再从这里勾选要生成清单的子目录。</p>';
    return;
  }
  pane.innerHTML = `<p class="builder-hint">从 <strong>${esc(root)}</strong> 开始勾选；展开子目录会按需读取一层，不会扫描整盘。已选 <strong>${count}</strong> 个目录。</p>
    <div class="bt-tree">${treeNodeHtml({ path: root, name: root.split(/[\\/]/).filter(Boolean).pop() || root, tags: [] })}</div>
    <div class="builder-options">
      <label><input type="checkbox" id="builderOptRecursive" ${store.get('dirs').options.recursive ? 'checked' : ''}> 递归包含子目录</label>
      <label><input type="checkbox" id="builderOptSize" ${store.get('dirs').options.includeSize ? 'checked' : ''}> 计算目录体积</label>
      <label><input type="checkbox" id="builderOptMtime" ${store.get('dirs').options.includeMtime ? 'checked' : ''}> 记录 mtime</label>
    </div>`;
}

function renderFiles() {
  const pane = $('builderFiles');
  if (!pane) return;
  const sel = store.get('files');
  const dirRows = (sel.dirs || []).map((item) => `<div class="bl-row">
    <span class="bl-path" title="${esc(item.path)}">${esc(item.path)}</span>
    <button type="button" data-bt="fl-recursive" data-path="${esc(item.path)}" title="切换是否递归">${item.recursive === false ? '仅本层' : '递归'}</button>
    <button type="button" data-bt="fl-scan-one" data-path="${esc(item.path)}" title="只扫描并上传这一个目录">上传这个</button>
    <button type="button" class="danger-text" data-bt="fl-remove" data-path="${esc(item.path)}">移除</button>
  </div>`).join('');
  const fileRows = (sel.files || []).map((item) => `<div class="bl-row">
    <span class="bl-path" title="${esc(item.path)}">${esc(item.name || item.path)}${item.archive ? ' · 包内' : ''}</span>
    <button type="button" class="danger-text" data-bt="fp-remove" data-path="${esc(item.path)}">移除</button>
  </div>`).join('');
  const root = getCurrentDir();
  pane.innerHTML = `<p class="builder-hint">「哪些目录下的文件列表要上传」完全由你决定：在目录清单里点 <strong>+ 列表</strong>，或在文件浏览页的目录行点同名按钮。</p>
    <div class="bl-section-title">已选目录（${(sel.dirs || []).length}）</div>
    <div class="bl-list">${dirRows || '<div class="bl-empty">尚未选择目录</div>'}</div>
    <div class="bl-section-title">手工加入的文件（${(sel.files || []).length}）</div>
    <div class="bl-list">${fileRows || '<div class="bl-empty">无</div>'}</div>
    ${root ? `<div class="bl-section-title">当前目录快捷加入</div>
      <button type="button" class="bt-add" data-bt="add-fl" data-path="${esc(root)}">+ 把 ${esc(root)} 加入文件列表</button>` : ''}`;
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
    <p class="builder-hint">扫描分片 ${diag.scanBases.length} 份 · file-list 片 ${diag.fileListPaths.length} 份 · 已知卷 ${diag.knownVolumes.length} 个</p>
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

async function expandNode(nodeEl) {
  const childrenEl = nodeEl.querySelector(':scope > .bt-children');
  if (!childrenEl) return;
  if (!childrenEl.classList.contains('hidden')) {
    childrenEl.classList.add('hidden');
    return;
  }
  if (childrenEl.dataset.loaded === '1') {
    childrenEl.classList.remove('hidden');
    return;
  }
  const path = nodeEl.dataset.path;
  try {
    const data = await api(`/api/mft/tree?path=${encodeURIComponent(path)}`);
    childrenEl.innerHTML = (data.children || []).length
      ? (data.children || []).map(treeNodeHtml).join('')
      : '<div class="bt-empty">没有子目录</div>';
    childrenEl.dataset.loaded = '1';
    childrenEl.classList.remove('hidden');
  } catch (err) {
    childrenEl.innerHTML = `<div class="bt-empty">读取失败：${esc(err.message)}</div>`;
    childrenEl.dataset.loaded = '1';
    childrenEl.classList.remove('hidden');
  }
}

async function doScan(paths = null, fileSelection = null) {
  const dirSel = store.get('dirs');
  const fileSel = fileSelection || store.get('files');
  const roots = paths || uniqueRoots(dirSel.dirs, fileSel.dirs);
  if (!roots.length) {
    setStatus('请先勾选至少一个目录，或用「+ 列表」加入文件列表目录', true);
    return null;
  }
  setStatus(`正在扫描 ${roots.length} 个目录…`);
  try {
    const scan = await api('/api/mft/scan', {
      method: 'POST',
      body: JSON.stringify({ paths: roots, recursive: dirSel.options.recursive !== false }),
    });
    lastScan = scan;
    await ensureHostInfo();
    const revision = syncDiagnostics().revision + 1;
    preview = composeExport({
      scan, hostInfo, snapshot: getSnapshot(), fileSelection: fileSel,
      now: Date.now(), revision,
    });
    render();
    const stats = preview.stats;
    setStatus(`已生成 ${preview.files.length} 个文件（扫描分片 ${stats.scanShardCount} / 文件列表 ${stats.fileListCount}）；点「上传到同步组」写入远端`, false);
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

async function upload() {
  if (!lastScan) {
    const scan = await doScan();
    if (!scan) return;
  }
  if (!syncState().ready) {
    setStatus(`同步组未就绪：${syncState().reason}，请先在「同步收藏」面板连接`, true);
    return;
  }
  try {
    const stats = await syncScanNow(lastScan, { fileSelection: store.get('files') });
    setStatus(`已写入 ${stats.written} 个文件（跳过未变化的 ${preview.files.length - stats.written} 个，清理孤儿片 ${stats.removed}）`);
  } catch (err) {
    setStatus(`上传失败：${err.message}`, true);
  }
}

function toggleFileDir(path) {
  const sel = store.get('files');
  const existing = (sel.dirs || []).find((item) => item.path.toLowerCase() === String(path).toLowerCase());
  if (existing) store.set('files', removeFileDirSelection(sel, path));
  else store.set('files', addFileDirSelection(sel, path));
  render();
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
  setStatus(`已从 ${files.length} 个文件回填 ${collected.length} 条路径到目录选择集`);
  render();
}

async function onAction(action, element) {
  const path = element.dataset.path;
  switch (action) {
    case 'tab': tab = element.dataset.builderTab; render(); break;
    case 'expand': await expandNode(element.closest('.bt-node')); break;
    case 'check': {
      const sel = store.get('dirs');
      store.set('dirs', element.checked ? addDirSelection(sel, path) : removeDirSelection(sel, path));
      break;
    }
    case 'add-fl': toggleFileDir(path); break;
    case 'fl-remove': store.set('files', removeFileDirSelection(store.get('files'), path)); render(); break;
    case 'fp-remove': store.set('files', removePickedFile(store.get('files'), path)); render(); break;
    case 'fl-recursive': {
      const sel = store.get('files');
      store.set('files', {
        ...sel,
        dirs: (sel.dirs || []).map((item) => (item.path === path ? { ...item, recursive: item.recursive === false } : item)),
      });
      render();
      break;
    }
    case 'fl-scan-one': {
      const scan = await doScan([path], {
        dirs: [{ path, recursive: true }], files: [],
      });
      if (scan) await upload();
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

export function openBuilder() {
  const modal = $('builderModal');
  if (modal) modal.classList.remove('hidden');
  void ensureHostInfo().then(() => render()).catch((err) => setStatus(`读取本机信息失败：${err.message}`, true));
  render();
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
  status(`已把 ${item.name} 加入文件列表选择集`);
}

export function addFileListDir(path) {
  if (!store || !path) return;
  const sel = store.get('files');
  if ((sel.dirs || []).some((item) => item.path.toLowerCase() === String(path).toLowerCase())) return;
  store.set('files', addFileDirSelection(sel, path));
  status(`已把 ${path} 加入文件列表选择集`);
}

export function initManifestBuilder(options = {}) {
  api = options.api;
  store = options.store;
  getSnapshot = options.getSnapshot || getSnapshot;
  getCurrentDir = options.getCurrentDir || getCurrentDir;
  status = options.status || status;

  $('builderBtn')?.addEventListener('click', openBuilder);
  $('builderClose')?.addEventListener('click', () => $('builderModal')?.classList.add('hidden'));
  $('builderModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'builderModal') $('builderModal').classList.add('hidden');
  });
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
      const sel = store.get('dirs');
      store.set('dirs', element.checked
        ? addDirSelection(sel, element.dataset.path)
        : removeDirSelection(sel, element.dataset.path));
      render();
    }
    if (element.id === 'builderOptRecursive' || element.id === 'builderOptSize' || element.id === 'builderOptMtime') {
      const sel = store.get('dirs');
      store.set('dirs', {
        ...sel,
        options: {
          ...sel.options,
          recursive: $('builderOptRecursive')?.checked ?? true,
          includeSize: $('builderOptSize')?.checked ?? true,
          includeMtime: $('builderOptMtime')?.checked ?? true,
        },
      });
    }
    if (element.id === 'builderLoadFile') void loadBack(element.files);
  });
  $('builderScan')?.addEventListener('click', () => void onAction('scan', { dataset: {} }));
  $('builderCopy')?.addEventListener('click', () => void onAction('copy', { dataset: {} }));
  $('builderDownload')?.addEventListener('click', () => void onAction('download', { dataset: {} }));
  $('builderUpload')?.addEventListener('click', () => void onAction('upload', { dataset: {} }));
  // Tab 按钮位于 builderBody 之外，单独绑定；body 内只处理 [data-bt]。
  document.querySelectorAll('[data-builder-tab]').forEach((btn) => {
    btn.addEventListener('click', () => void onAction('tab', btn));
  });
  return { openBuilder, addPickedFromItem, addFileListDir };
}

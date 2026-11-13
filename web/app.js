import {
  encodeLocation,
  decodeLocation,
  compactTarget,
  localTargetFromCompact,
  winBasename,
  winDirname,
} from './location.js';
import { initAnnotations, onRender } from './annotations-ui.js';
import { initVault, openVault, openVaultForPassword, saveZipPassword, getVaultSessionId, getDefaultPassword, openDefaultPasswordModal } from './vault.js';

const TOKEN = window.__LOCAL_TOKEN__;
const $ = (id) => document.getElementById(id);
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
const state = { index: 0, depth: 0, target: { kind: 'drives' } };
let crumbTargets = [];

function isImageName(name) {
  return IMAGE_EXT.has((String(name).match(/\.[^.]+$/) || [''])[0].toLowerCase());
}

function localThumbUrlFront(abs) {
  return localToUrl(abs).replace(/^\/fs\//, '/thumb/fs/');
}

// zip 封面缩略图：zip 内只有一个文件时用它的缩略图；加密时带 vsid/defpw 让服务端优先用记录的密码或缺省密码自动解密。
function fsCoverUrlFront(abs, vsid, defpw) {
  const base = localToUrl(abs).replace(/^\/fs\//, '/thumb/zipcover/fs/');
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

function status(text, bad = false) {
  $('statusText').textContent = text;
  document.querySelector('.status-dot').classList.toggle('bad', bad);
}

async function api(url, options = {}) {
  const headers = { 'X-Local-Token': TOKEN, ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
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
    enc: $('encoding').value,
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
  if (typeof value === 'string' && Array.from(select.options).some((option) => option.value === value)) {
    select.value = value;
  }
}

function absFromFsUrl(pathname) {
  try {
    const pieces = pathname.replace(/^\/fs\//, '').split('/').filter(Boolean).map(decodeURIComponent);
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
  const match = /^([A-Za-z]):\\(.*)$/.exec(abs);
  if (!match) return '#';
  const parts = match[2] ? match[2].split('\\').filter(Boolean).map(encodeURIComponent) : [];
  return `/fs/${match[1].toUpperCase()}/${parts.join('/')}`;
}

function zipToUrl(id, entryPath) {
  const parts = entryPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `/zip/${id}/${parts.join('/')}`;
}

function appendPathCrumbs(parts, abs) {
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
  const parts = [{ label: '此电脑', target: { kind: 'drives' } }];

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
  $('mode').textContent = target.kind === 'zip' ? '压缩包内' : (target.kind === 'preview' ? '文件预览' : '本地磁盘');
  const label = parts[parts.length - 1].label;
  document.title = label === '此电脑' ? '本地文件浏览器' : `${label} · 本地文件浏览器`;
}

async function renderDrives() {
  const { drives } = await api('/api/drives');
  const cards = drives.map((drive) => {
    const used = drive.total ? Math.round(((drive.total - drive.free) / drive.total) * 100) : 0;
    const kindClass = drive.kind === '可移动' ? ' removable' : (drive.kind === '网络映射' ? ' network' : '');
    const label = drive.label || drive.kind;
    return `<div class="drive-card" data-action="drive" data-path="${esc(drive.path)}" data-name="${esc(label)}">
      <div class="drive-head"><span class="drive-letter${kindClass}">${drive.letter}:</span><span class="drive-name">${esc(label)}</span></div>
      <div class="drive-bar"><div style="width:${used}%"></div></div>
      <div class="drive-meta">${drive.total ? `${formatSize(drive.free)} 可用 / ${formatSize(drive.total)}` : '容量未知'} · ${esc(drive.kind)}</div>
    </div>`;
  }).join('');
  stage.innerHTML = `<h2 class="stage-title">此电脑 · 磁盘（${drives.length}）</h2>
    <div class="drive-grid">${cards || '<div class="empty">没有检测到可用磁盘</div>'}</div>
    <p class="stage-hint">点击盘符进入目录；遇到 zip / 7z / rar / tar.gz 等压缩包可直接点开，加密压缩包会提示输入密码（可自动用缺省密码或密码库记录尝试）。</p>`;
  sidebar.innerHTML = `<div class="side-title">此电脑</div>${drives.map((drive) =>
    `<div class="side-item" data-action="drive" data-path="${esc(drive.path)}"><span class="icon icon-dir"></span>${drive.letter}: ${esc(drive.label || drive.kind)}</div>`
  ).join('')}`;
}

function parentOf(abs) {
  const match = /^([A-Za-z]):\\(.*)$/.exec(abs);
  if (!match) return null;
  const segments = match[2].split('\\').filter(Boolean);
  segments.pop();
  return `${match[1]}:\\${segments.join('\\')}`;
}

async function renderDir(abs) {
  const data = await api(`/api/list?path=${encodeURIComponent(abs)}`);
  const images = data.items.filter((item) => !item.dir && isImageName(item.name));
  const zips = data.items.filter((item) => item.zip);
  const vsid = getVaultSessionId() || undefined;
  const defpw = getDefaultPassword() || undefined;
  const thumbsCount = images.length + zips.length;
  const switcher = `<div class="view-switch">
    <button type="button" data-action="view" data-view="list" class="${viewMode === 'list' ? 'active' : ''}">列表</button>
    <button type="button" data-action="view" data-view="thumbs" class="${viewMode === 'thumbs' ? 'active' : ''}">缩略图${thumbsCount ? ` (${thumbsCount})` : ''}</button>
  </div>`;
  let body;
  if (viewMode === 'thumbs') {
    const folders = data.items.filter((item) => item.dir);
    const imageCards = images.map((item) => `<div class="thumb-card" data-action="file" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
      <div class="thumb-box"><img src="${esc(localThumbUrlFront(item.path))}" loading="lazy" alt="${esc(item.name)}"></div>
      <div class="thumb-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="thumb-meta">${formatSize(item.size)}</div>
    </div>`).join('');
    const zipCards = zips.map((item) => `<div class="thumb-card" data-action="zip" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
      <div class="thumb-box"><img src="${esc(fsCoverUrlFront(item.path, vsid, defpw))}" loading="lazy" alt="${esc(item.name)}"></div>
      <div class="thumb-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="thumb-meta">${formatSize(item.size)}</div>
    </div>`).join('');
    const allCards = imageCards + zipCards;
    body = `<div class="thumb-head">图片/压缩包 · ${thumbsCount} 项<span>仅当前目录 · 点击缩略图查看原图或打开压缩包</span></div>
      ${folders.length ? `<div class="folder-chips">${folders.map((item) => `<span class="folder-chip" data-action="dir" data-path="${esc(item.path)}">${esc(item.name)}</span>`).join('')}</div>` : ''}
      <div class="thumb-grid">${allCards || '<div class="thumb-empty">当前目录没有图片或压缩包，可切换到列表视图</div>'}</div>`;
  } else {
    const rows = data.items.map((item) => {
      const isZip = item.zip;
      const icon = item.dir ? 'icon-dir' : (isZip ? '' : 'icon-file');
      const action = item.dir ? 'dir' : (isZip ? 'zip' : 'file');
      const ext = (item.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      const hint = isZip ? '<span class="tag">可进入</span>' : (!item.dir && !PREVIEW_EXT.has(ext) ? '<span class="tag">点击下载</span>' : '');
      const thumb = isZip
        ? `<img class="file-thumb" src="${esc(fsCoverUrlFront(item.path, vsid, defpw))}" loading="lazy" alt="">`
        : `<span class="icon ${icon}"></span>`;
      return `<tr data-action="${action}" data-path="${esc(item.path)}" data-name="${esc(item.name)}">
        <td><span class="file-name">${thumb}${esc(item.name)}${hint}</span></td>
        <td class="file-size">${item.dir ? '文件夹' : formatSize(item.size)}</td>
        <td class="file-time">${formatTime(item.mtime)}</td>
      </tr>`;
    }).join('');
    body = `<table class="file-table"><thead><tr><th>名称</th><th style="width:110px">大小</th><th style="width:150px">修改时间</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3" class="empty">此目录为空</td></tr>'}</tbody></table>`;
  }
  stage.innerHTML = `<h2 class="stage-title">${esc(abs)}</h2>${switcher}${body}`;
  const upper = parentOf(abs);
  const dirs = data.items.filter((item) => item.dir);
  sidebar.innerHTML = `<div class="side-title">当前目录</div>
    ${upper ? `<div class="side-item" data-action="dir" data-path="${esc(upper)}">↰ 上一级</div>` : '<div class="side-item" data-action="crumb" data-index="0">↰ 此电脑</div>'}
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
      <button type="button" data-action="viewer-new" data-url="${esc(url)}">新窗口打开</button>
      <button type="button" data-action="viewer-home">返回入口</button>
    </div>
    <iframe id="frame" src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
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
  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (target.kind === 'zip') {
    if (!path.startsWith(`/zip/${target.id}/`) || target.current === path) return;
    target.current = path;
    const thumbs = path.includes('view=thumbs');
    document.querySelectorAll('[data-action="zip-view"]').forEach((button) => {
      button.classList.toggle('primary', (button.dataset.view === 'thumbs') === thumbs);
    });
  } else {
    if (!path.startsWith('/fs/') || target.url === path) return;
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
  const response = await fetch(`/api/download?path=${encodeURIComponent(abs)}`, {
    headers: { 'X-Local-Token': TOKEN },
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
  const encoding = $('encoding').value;
  const info = await api('/api/zip/open', {
    method: 'POST',
    body: JSON.stringify({ path: abs, encoding: encoding || undefined }),
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
  const encoding = $('encoding').value;
  const info = await api('/api/zip/open', {
    method: 'POST',
    body: JSON.stringify({ path: zipPath, encoding: encoding || undefined }),
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

$('back').addEventListener('click', () => {
  if (!$('back').disabled) history.back();
});

$('forward').addEventListener('click', () => {
  if (!$('forward').disabled) history.forward();
});

$('refresh').addEventListener('click', () => render(current()));

$('encoding').addEventListener('change', () => {
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

initAnnotations({ navigate, openZipBookmark, status }).catch((err) => {
  console.warn('annotations store unavailable', err);
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

restore().catch(showError);

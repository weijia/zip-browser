// 网盘信息登记的 UI：顶部按钮 → 弹窗表单 → 登记清单写进数据组（网络磁盘）。
// 登记清单是数据组根下的 /drive-registry.json（跨机唯一来源）；
// 本机 codes/cached/<后端>-<序号>/info.json 只是该条目在本机的落地副本，服务端 /api/drive-cache/* 读写它。
// 不再读写 zen-fs-config 的配置组；数据组未连接时明确提示「只保存在本机」，不谎报已同步。

import { OPENLIST_BACKENDS } from './drive-backends.js';
import { createDriveRegistryStore, makeCopyPayload, mergeEntries, REGISTRY_PATH } from './drive-cache-store.js';
import { getDataGroupFs, getActiveDataGroup } from './manifest-sync.js';

const $ = (id) => document.getElementById(id);

const store = createDriveRegistryStore({
  onChange: () => refreshBadge(),
  readFs: () => getDataGroupFs(),
  flush: async () => {
    const group = await getActiveDataGroup();
    if (group && typeof group.flush === 'function') await group.flush();
  },
});

const REMOTE_MANIFEST = REGISTRY_PATH; // 数据组根下的登记清单

let apiFetch = null;
let statusFn = null;
let ready = false;
let currentEntries = [];
let currentCacheRoot = null;
let editingDir = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function setSync(text, ok = null) {
  const el = $('dcSync');
  if (!el) return;
  el.textContent = text;
  el.dataset.state = ok === true ? 'ok' : ok === false ? 'bad' : 'idle';
}

function setError(text) {
  const el = $('dcError');
  if (el) el.textContent = text || '';
}

function refreshBadge() {
  const count = $('driveCount');
  if (count) count.textContent = String(currentEntries.length);
}

function notifyDiskList() {
  // 磁盘列表把登记条目作为「网络存储」卡片展示，增删后通知它重绘。
  window.dispatchEvent(new CustomEvent('zb:drive-cache-change'));
}

function fillBackends() {
  const select = $('dcBackend');
  if (!select || select.dataset.filled === '1') return;
  const frag = document.createDocumentFragment();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = '请选择后端';
  frag.appendChild(first);
  for (const name of OPENLIST_BACKENDS) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    frag.appendChild(option);
  }
  select.appendChild(frag);
  select.dataset.filled = '1';
}

function renderList(info) {
  const box = $('dcList');
  if (!box) return;
  const entries = Array.isArray(info?.entries) ? info.entries : [];
  currentEntries = entries;
  if (info?.cacheRoot !== undefined) currentCacheRoot = info.cacheRoot || null;
  refreshBadge();
  const countEl = $('dcCount');
  if (countEl) countEl.textContent = String(entries.length);
  const rootEl = $('dcRoot');
  if (rootEl) {
    rootEl.textContent = info?.cacheRoot
      ? `本机落地目录：${info.cacheRoot}（登记清单在数据组 ${REMOTE_MANIFEST}）`
      : `本机落地目录：未知（当前宿主不提供本机接口）`;
  }
  if (!entries.length) {
    box.innerHTML = '<div class="dc-empty">还没有登记网盘，用上面的表单添加第一个。</div>';
    return;
  }
  const rows = entries.map((item) => {
    const missing = item.hasInfo === false;
    const shown = item.visible !== false;
    const fields = [
      ['总容量', item.total],
      ['剩余', item.free],
      ['上行/月', item.upQuota],
      ['下行/月', item.downQuota],
      ['剩余上行', item.upRemaining],
      ['剩余下行', item.downRemaining],
    ].filter(([, value]) => value);
    const meta = fields.length
      ? fields.map(([key, value]) => `<span class="dc-chip">${esc(key)}: ${esc(value)}</span>`).join('')
      : '<span class="dc-chip dc-chip-empty">未填写容量信息</span>';
    const name = item.label || item.backend || item.dir;
    return `<div class="dc-item${shown ? '' : ' dc-off'}" data-dir="${esc(item.dir)}">
      <div class="dc-item-head">
        <label class="dc-visible" title="勾选后显示在「此电脑」磁盘列表；取消勾选只是隐藏入口，登记仍然保留">
          <input type="checkbox" data-visible="${esc(item.dir)}"${shown ? ' checked' : ''}> 显示
        </label>
        <span class="dc-item-name">${esc(name)}</span>
        <span class="dc-item-backend">${esc(item.backend || '?')}</span>
        <span class="dc-item-seq">#${esc(item.seq)}</span>
        <span class="dc-actions">
          <button type="button" class="dc-edit dc-mini" data-edit="${esc(item.dir)}" title="编辑这条登记">编辑</button>
          <button type="button" class="dc-copy dc-mini" data-copy="${esc(item.dir)}" title="按这份信息登记一个新网盘">复制</button>
          <button type="button" class="dc-del dc-mini" data-del="${esc(item.dir)}" title="删除这条登记">删除</button>
        </span>
      </div>
      <div class="dc-item-meta">${missing ? '<span class="dc-warn">数据组有登记，本机未落地（点「从同步清单导入」）</span>' : meta}</div>
    </div>`;
  }).join('');
  box.innerHTML = rows;
}

/**
 * 把数据组清单里的显示开关同步到本机 info.json。
 * /api/drives 只读本机 info.json 决定是否列出条目，所以别处（另一台机器）改过开关后，
 * 本机要在加载清单时对齐，否则会出现「清单里隐藏了、此电脑里还在」。
 * 只处理两边状态不同的条目；失败不阻塞列表，下次加载再对齐。
 */
async function alignLocalVisibility(merged, localEntries) {
  if (!apiFetch) return 0;
  let changed = 0;
  const localByDir = new Map(localEntries.map((item) => [item.dir, item]));
  for (const entry of merged) {
    const local = localByDir.get(entry.dir);
    if (!local || entry.hasInfo === false) continue;
    const wantShown = entry.visible !== false;
    if ((local.visible !== false) === wantShown) continue;
    try {
      await apiFetch('/api/drive-cache/update', {
        method: 'POST',
        body: JSON.stringify({ dir: entry.dir, visible: wantShown }),
      });
      local.visible = wantShown;
      changed += 1;
    } catch {
      // 本机副本不可写：保留当前状态，下次加载再试
    }
  }
  return changed;
}

async function loadList({ quiet = false } = {}) {
  if (!apiFetch) return;
  if (!quiet) setSync('正在读取登记清单…');
  const remote = await store.readRemote();
  const remoteEntries = remote.doc?.entries || [];
  let info = null;
  try {
    info = await apiFetch('/api/drive-cache/info');
  } catch (err) {
    // 服务端不可用（OpenList /zb 模式）：只展示数据组里的登记清单，标注「本机未落地」。
    const msg = (err && err.status === 404)
      ? '当前宿主不提供本机接口（可能运行在 OpenList /zb 模式），只能读数据组清单，无法登记'
      : `读取本机落地副本失败：${err?.message || err}`;
    store.adoptDoc({ v: 1, updatedAt: remote.doc?.updatedAt || 0, entries: remoteEntries });
    renderList({ entries: remoteEntries, cacheRoot: null });
    setSync(msg, false);
    if (statusFn && !quiet) statusFn(`${msg}；网盘信息登记不可用`, true);
    return;
  }
  const localEntries = Array.isArray(info.entries) ? info.entries : [];
  const merged = mergeEntries(remoteEntries, localEntries);
  store.adoptDoc({ v: 1, updatedAt: remote.doc?.updatedAt || 0, entries: merged });
  const aligned = await alignLocalVisibility(merged, localEntries);
  if (aligned) notifyDiskList(); // 本机可见性和清单对齐过，磁盘列表要重绘
  renderList({ entries: merged, cacheRoot: info.cacheRoot });
  if (editingDir && !merged.some((e) => e.dir === editingDir)) exitEditMode();

  // 本机有、数据组清单里没有的条目（新登记或以前没写成功）补写到数据组；
  // 只做逐条 upsert，绝不用本机列表整体覆盖远端。
  const pending = localEntries.filter((e) => !remoteEntries.some((r) => r.dir === e.dir));
  let write = null;
  if (!remote.doc || pending.length) {
    write = await store.upsert(localEntries);
  }
  const count = merged.length;
  if (write?.ok) {
    setSync(`已读取 ${count} 条登记 · 已写入数据组 ${REMOTE_MANIFEST}`, true);
  } else if (write && !write.ok) {
    setSync(`已读取 ${count} 条登记 · 写入数据组失败：${write.error}`, false);
  } else if (!remote.doc && remote.error === 'no-group') {
    setSync(`已读取 ${count} 条登记 · 同步组未连接，只保存在本机 codes/cached`, false);
  } else {
    setSync(`已读取 ${count} 条登记（数据组 ${REMOTE_MANIFEST}）`, true);
  }
}

/**
 * 读数据组里的登记清单（本地 fs 读，不碰 RS）。
 * 返回 sanitize 后的清单；未连接同步组或清单不存在时返回 null 并给出状态提示。
 */
async function readRemoteManifest() {
  const remote = await store.readRemote();
  if (remote.error === 'no-group') {
    setSync('同步组未连接：请先在「收藏同步」面板连接并等待清单同步完成', false);
    return null;
  }
  if (remote.error === 'not-found') {
    setSync(`数据组里没有 ${REMOTE_MANIFEST}（远端尚未写入或尚未同步）`, false);
    return null;
  }
  if (remote.error === 'parse') {
    setSync('登记清单不是合法 JSON', false);
    return null;
  }
  if (remote.error) {
    setSync(`读取登记清单失败：${remote.error}`, false);
    return null;
  }
  const clean = remote.doc;
  if (!clean || !clean.entries.length) {
    setSync('登记清单为空或格式不符（需要 { v, updatedAt, entries[] }）', false);
    return null;
  }
  return clean;
}

/** 列出本机尚未落地（或 info.json 缺失）的条目，供用户确认导入。 */
async function pendingFromManifest(manifest) {
  let have = new Set();
  try {
    const info = await apiFetch('/api/drive-cache/info');
    have = new Set((info.entries || []).map((e) => e.dir));
  } catch {
    have = new Set();
  }
  return manifest.entries.filter((e) => !have.has(e.dir));
}

/** 从远端同步清单导入本机缓存目录：按条目 dir 原样建，不重算序号、已存在跳过。 */
async function onImportRemote() {
  if (!apiFetch) {
    setSync('当前宿主不提供本机缓存接口，无法落地到 codes/cached', false);
    return;
  }
  const btn = $('dcImport');
  setSync('正在读取同步清单…');
  const manifest = await readRemoteManifest();
  if (!manifest) return;
  const pending = await pendingFromManifest(manifest);
  if (!pending.length) {
    setSync(`同步清单 ${manifest.entries.length} 条，本机已全部落地，无需导入`, true);
    return;
  }
  const names = pending.map((e) => `${e.dir} (${e.label || e.backend})`);
  const ok = window.confirm(
    `同步清单共 ${manifest.entries.length} 条，其中 ${pending.length} 条尚未落地本机：\n\n`
    + `${names.slice(0, 12).join('\n')}${names.length > 12 ? `\n…等共 ${pending.length} 条` : ''}\n\n`
    + '将按原目录名创建缓存目录（不改序号、不覆盖已有登记），确认导入？'
  );
  if (!ok) {
    setSync('已取消导入', null);
    return;
  }
  if (btn) btn.disabled = true;
  setSync(`正在导入 ${pending.length} 条…`);
  try {
    const result = await apiFetch('/api/drive-cache/import', {
      method: 'POST',
      body: JSON.stringify({ entries: pending }),
    });
    await loadList({ quiet: true });
    notifyDiskList();
    const bad = result.invalid || 0;
    setSync(
      `导入完成：新增 ${result.imported || 0}、跳过 ${result.skipped || 0}`
      + (bad ? `、非法 ${bad}` : '') + ` · 数据组 ${REMOTE_MANIFEST}`,
      bad === 0,
    );
    if (statusFn) statusFn(`从同步清单导入 ${result.imported || 0} 个网盘`, false);
  } catch (err) {
    setSync(`导入失败：${err?.message || err}`, false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function resetFields() {
  const form = $('dcForm');
  if (form) form.reset();
  setError('');
  const select = $('dcBackend');
  if (select) select.value = '';
}

function resetForm() {
  // 清空表单也退出编辑模式，避免残留的 editingDir 让下一次提交变成误覆盖。
  exitEditMode();
}

function enterEditMode(entry) {
  if (!entry?.dir || !entry?.backend) {
    setSync('编辑失败：找不到原登记的后端类型', false);
    return;
  }
  if (entry.hasInfo === false) {
    setSync(`「${entry.dir}」只在数据组登记清单里，本机还没有落地副本；先点「从同步清单导入」`, false);
    return;
  }
  editingDir = entry.dir;
  const select = $('dcBackend');
  if (select) {
    select.value = entry.backend;
    select.disabled = true; // 后端与目录名绑定，编辑时锁定
  }
  const setVal = (id, value) => { const el = $(id); if (el) el.value = value || ''; };
  setVal('dcLabel', entry.label);
  setVal('dcTotal', entry.total);
  setVal('dcFree', entry.free);
  setVal('dcUp', entry.upQuota);
  setVal('dcDown', entry.downQuota);
  setVal('dcUpLeft', entry.upRemaining);
  setVal('dcDownLeft', entry.downRemaining);
  const hint = $('dcEditHint');
  if (hint) hint.classList.remove('hidden');
  const hintText = $('dcEditText');
  if (hintText) hintText.textContent = `正在编辑 ${entry.dir}（后端类型与目录绑定，不可修改）`;
  const saveBtn = $('dcSave');
  if (saveBtn) saveBtn.textContent = '保存修改';
  setError('');
  setSync(`正在编辑 ${entry.dir}，修改后点「保存修改」`, null);
  $('dcForm')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

function exitEditMode() {
  editingDir = null;
  const select = $('dcBackend');
  if (select) select.disabled = false;
  $('dcEditHint')?.classList.add('hidden');
  const saveBtn = $('dcSave');
  if (saveBtn) saveBtn.textContent = '登记';
  resetFields();
}

function openModal(editDir = null) {
  if (!ready) {
    setError('网盘信息模块未就绪');
  }
  fillBackends();
  const modal = $('driveCacheModal');
  if (modal) modal.classList.remove('hidden');
  if (!editDir) {
    void loadList({ quiet: true });
    return;
  }
  // 从磁盘页的「编辑」按钮进入：先刷新登记列表，再定位到该条进入编辑模式。
  void loadList({ quiet: true }).then(() => {
    const entry = currentEntries.find((item) => item.dir === editDir);
    if (entry) enterEditMode(entry);
    else setSync('编辑失败：找不到该网盘登记', false);
  }).catch(() => {});
}

function closeModal() {
  const modal = $('driveCacheModal');
  if (modal) modal.classList.add('hidden');
  exitEditMode();
}

async function onSave(event) {
  event.preventDefault();
  setError('');
  if (!apiFetch) {
    setError('当前宿主不提供本机缓存接口，无法登记网盘信息');
    return;
  }
  const backend = $('dcBackend')?.value || '';
  if (!backend) {
    setError('请选择后端类型');
    return;
  }
  const payload = {
    backend,
    label: $('dcLabel')?.value || '',
    total: $('dcTotal')?.value || '',
    free: $('dcFree')?.value || '',
    upQuota: $('dcUp')?.value || '',
    downQuota: $('dcDown')?.value || '',
    upRemaining: $('dcUpLeft')?.value || '',
    downRemaining: $('dcDownLeft')?.value || '',
  };
  const isEdit = Boolean(editingDir);
  const endpoint = isEdit ? '/api/drive-cache/update' : '/api/drive-cache/save';
  const body = isEdit ? { ...payload, dir: editingDir } : payload;
  const saveBtn = $('dcSave');
  if (saveBtn) saveBtn.disabled = true;
  setSync(isEdit ? '正在保存修改…' : '正在写入本机落地副本…');
  try {
    const result = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const entry = { ...(result.entry || {}), hasInfo: true };
    const write = await store.upsert([entry]);
    renderList({ entries: store.snapshot().entries, cacheRoot: currentCacheRoot });
    notifyDiskList();
    const dir = result.entry?.dir || '本机';
    setSync(
      write.ok
        ? `已${isEdit ? '更新' : '登记'} ${dir} · 已写入数据组 ${REMOTE_MANIFEST}`
        : `已${isEdit ? '更新' : '登记'} ${dir} · 数据组写入失败：${write.error}`,
      write.ok,
    );
    exitEditMode();
    if (statusFn) statusFn(`已${isEdit ? '更新' : '登记'}网盘：${backend}`, false);
  } catch (err) {
    setError(`${isEdit ? '保存修改' : '登记'}失败：${err?.message || err}`);
    setSync(isEdit ? '保存修改失败' : '登记失败', false);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function copyEntry(dir) {
  if (!dir || !apiFetch) return;
  const source = currentEntries.find((item) => item.dir === dir);
  if (!source || !source.backend) {
    setSync('复制失败：找不到原登记的后端类型', false);
    return;
  }
  const payload = makeCopyPayload(source);
  setSync('正在复制…');
  try {
    const result = await apiFetch('/api/drive-cache/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const entry = { ...(result.entry || {}), hasInfo: true };
    const write = await store.upsert([entry]);
    renderList({ entries: store.snapshot().entries, cacheRoot: currentCacheRoot });
    notifyDiskList();
    setSync(
      write.ok
        ? `已复制为 ${result.entry?.dir || '新登记'} · 已写入数据组 ${REMOTE_MANIFEST}`
        : `已复制为 ${result.entry?.dir || '新登记'} · 数据组写入失败：${write.error}`,
      write.ok,
    );
    if (statusFn) statusFn(`已复制网盘：${result.entry?.dir || ''}`, false);
  } catch (err) {
    setSync(`复制失败：${err?.message || err}`, false);
  }
}

async function toggleVisible(dir, visible) {
  const entry = currentEntries.find((item) => item.dir === dir);
  if (!entry) return;
  setSync(visible ? `正在显示 ${dir}…` : `正在隐藏 ${dir}…`);
  // 数据组清单是跨机事实源：先写清单；本机 info.json 供 /api/drives 决定是否列出，
  // 因此能落地时也同步一份（本机未落地条目只写清单）。
  const write = await store.upsert([{ ...entry, visible }]);
  let localOk = null;
  if (apiFetch && entry.hasInfo !== false) {
    try {
      await apiFetch('/api/drive-cache/update', {
        method: 'POST',
        body: JSON.stringify({ dir, visible }),
      });
      localOk = true;
    } catch (err) {
      localOk = err?.message || String(err);
    }
  } else if (entry.hasInfo === false) {
    localOk = '本机未落地，只写了数据组清单';
  }
  renderList({ entries: store.snapshot().entries, cacheRoot: currentCacheRoot });
  notifyDiskList();
  const action = visible ? '显示' : '隐藏';
  if (write.ok && localOk === true) {
    setSync(`已${action} ${dir}（数据组 ${REMOTE_MANIFEST} + 本机 info.json）`, true);
    if (statusFn) statusFn(`已${action}网盘入口：${dir}`, false);
    return;
  }
  if (write.ok) {
    setSync(`已${action} ${dir}（数据组 ${REMOTE_MANIFEST}；本机副本未同步：${localOk}）`, localOk === null ? null : false);
    return;
  }
  setSync(`本机可能已${action} ${dir}，但写入数据组失败：${write.error}`, false);
}

async function onListClick(event) {
  const edit = event.target?.closest?.('[data-edit]');
  if (edit) {
    const dir = edit.getAttribute('data-edit');
    const entry = currentEntries.find((item) => item.dir === dir);
    if (entry) enterEditMode(entry);
    return;
  }
  const copy = event.target?.closest?.('[data-copy]');
  if (copy) {
    await copyEntry(copy.getAttribute('data-copy'));
    return;
  }
  const del = event.target?.closest?.('[data-del]');
  if (!del) return;
  const dir = del.getAttribute('data-del');
  if (!dir || !apiFetch) return;
  if (!window.confirm(`删除网盘登记「${dir}」？这会移除本机 codes/cached 下的 info.json，并从数据组 ${REMOTE_MANIFEST} 里删除这条记录。`)) return;
  setSync('正在删除…');
  try {
    await apiFetch('/api/drive-cache/delete', {
      method: 'POST',
      body: JSON.stringify({ dir }),
    });
    const write = await store.remove(dir);
    renderList({ entries: store.snapshot().entries, cacheRoot: currentCacheRoot });
    notifyDiskList();
    if (editingDir === dir) exitEditMode();
    setSync(
      write.ok
        ? `已删除 ${dir} · 已从数据组 ${REMOTE_MANIFEST} 移除`
        : `已删除本机副本 ${dir} · 数据组写入失败：${write.error}`,
      write.ok,
    );
  } catch (err) {
    setSync(`删除失败：${err?.message || err}`, false);
  }
}

export function initDriveCache({ api, status } = {}) {
  apiFetch = typeof api === 'function' ? api : null;
  statusFn = typeof status === 'function' ? status : null;

  fillBackends();
  $('driveCacheBtn')?.addEventListener('click', () => openModal());
  $('dcClose')?.addEventListener('click', closeModal);
  $('dcReset')?.addEventListener('click', resetForm);
  $('dcCancelEdit')?.addEventListener('click', exitEditMode);
  $('dcRefresh')?.addEventListener('click', () => void loadList());
  $('dcImport')?.addEventListener('click', () => void onImportRemote());
  $('dcForm')?.addEventListener('submit', (event) => { void onSave(event); });
  $('dcList')?.addEventListener('click', (event) => { void onListClick(event); });
  $('dcList')?.addEventListener('change', (event) => {
    const box = event.target?.closest?.('[data-visible]');
    if (!box) return;
    void toggleVisible(box.getAttribute('data-visible'), box.checked);
  });
  $('driveCacheModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'driveCacheModal') closeModal();
  });

  ready = Boolean(apiFetch);
  store.init()
    .then(() => {
      currentEntries = store.snapshot().entries || [];
      refreshBadge();
    })
    .catch((err) => console.warn('drive cache store unavailable', err));

  return { ok: true, open: () => openModal(), edit: (dir) => openModal(dir) };
}

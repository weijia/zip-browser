// 目录标签条 + 书签面板 + 左侧栏快捷区。
// 只通过 hooks 与 app.js 交互，不碰导航状态与位置持久化。
import {
  createAnnotationStore, STORAGE_KEY,
  keyForTarget, zipEntryDir,
  rememberPath, describeKey,
  listTags, addTag, removeTag, allTags, keysByTag,
  isBookmarked, addBookmark, removeBookmark, renameBookmark,
  tagColor,
} from './annotations-store.js';
import { winBasename } from './location.js';

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

let store = null;
let hooks = null;
let currentKey = null;
let currentDescriptor = null;
let activeTab = 'bookmarks';
let selectedTag = '';
let panelOpen = false;

function descriptorFor(target) {
  if (!target) return null;
  if (target.kind === 'dir') {
    return { kind: 'dir', path: target.path, label: winBasename(target.path) || target.path };
  }
  if (target.kind === 'preview' && target.dir) {
    return { kind: 'dir', path: target.dir, label: winBasename(target.dir) || target.dir };
  }
  if (target.kind === 'zip' && target.zipPath) {
    const entry = zipEntryDir(target.current, target.id);
    const name = target.zipName || winBasename(target.zipPath);
    return {
      kind: 'zip',
      path: target.zipPath,
      zipPath: target.zipPath,
      entry,
      label: entry ? `${name}/${entry}` : name,
    };
  }
  return null;
}

function chipHtml(tag, removable) {
  const color = tagColor(tag);
  return `<span class="anno-chip" style="background:${color.bg};color:${color.fg}">${esc(tag)}${
    removable
      ? `<button type="button" data-action="anno-remove-tag" data-tag="${esc(tag)}" title="移除标签">×</button>`
      : ''
  }</span>`;
}

function renderBar() {
  const data = store.snapshot();
  const tags = listTags(data, currentKey);
  const marked = isBookmarked(data, currentKey);
  const suggestions = allTags(data).map((item) => `<option value="${esc(item.tag)}"></option>`).join('');
  const html = `<div class="anno-bar">
    <span class="anno-bar-label">标签</span>
    ${tags.length ? tags.map((tag) => chipHtml(tag, true)).join('') : '<span class="anno-none">未标记</span>'}
    <button type="button" class="anno-add" data-action="anno-add-tag">+ 标签</button>
    <input id="annoTagInput" class="anno-tag-input hidden" list="annoTagSuggestions" placeholder="输入标签名，回车确认" autocomplete="off">
    <datalist id="annoTagSuggestions">${suggestions}</datalist>
    <button type="button" class="anno-bookmark${marked ? ' active' : ''}" data-action="anno-toggle-bookmark">${marked ? '★ 已收藏' : '☆ 加入书签'}</button>
  </div>`;
  const title = document.querySelector('.stage-title');
  if (title) title.insertAdjacentHTML('afterend', html);
  else $('stage')?.insertAdjacentHTML('afterbegin', html);
}

function renderSide() {
  const data = store.snapshot();
  const items = data.bookmarks.slice(0, 8);
  const html = `<div class="anno-side-section">
    <div class="side-title anno-side-head">书签 <span class="anno-side-more" data-action="anno-open-panel" data-tab="bookmarks">全部 ${data.bookmarks.length}</span></div>
    ${items.length
      ? items.map((item) => `<div class="side-item anno-side-item" data-action="anno-goto-bookmark" data-id="${esc(item.id)}" title="${esc(item.path)}">${esc(item.label)}</div>`).join('')
      : '<div class="side-empty">还没有书签</div>'}
  </div>`;
  $('sidebar')?.insertAdjacentHTML('beforeend', html);
}

function updateTopButtons() {
  const data = store.snapshot();
  $('bookmarkCount').textContent = String(data.bookmarks.length);
  $('tagCount').textContent = String(allTags(data).length);
}

function bookmarksHtml(data) {
  if (!data.bookmarks.length) {
    return '<div class="anno-empty">还没有书签。进入任意目录后点标题下方的「加入书签」。</div>';
  }
  return `<div class="anno-list">${data.bookmarks.map((item) => {
    const tags = listTags(data, item.key);
    return `<div class="anno-item" data-action="anno-goto-bookmark" data-id="${esc(item.id)}">
      <div class="anno-item-main">
        <div class="anno-item-title">${esc(item.label)}</div>
        <div class="anno-item-path">${esc(item.path)}${item.entry ? ` · /${esc(item.entry)}` : ''}</div>
        ${tags.length ? `<div class="anno-item-tags">${tags.map((tag) => chipHtml(tag, false)).join('')}</div>` : ''}
      </div>
      <div class="anno-item-actions">
        <button type="button" data-action="anno-rename-bookmark" data-id="${esc(item.id)}">改名</button>
        <button type="button" data-action="anno-delete-bookmark" data-id="${esc(item.id)}">删除</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function tagsHtml(data) {
  const tags = allTags(data);
  if (!tags.length) return '<div class="anno-empty">还没有标签。在目录页点「+ 标签」创建第一个。</div>';
  const cloud = tags.map((item) => {
    const color = tagColor(item.tag);
    return `<button type="button" class="anno-cloud-chip${selectedTag === item.tag ? ' active' : ''}" data-action="anno-select-tag" data-tag="${esc(item.tag)}" style="background:${color.bg};color:${color.fg}">${esc(item.tag)} <span>${item.count}</span></button>`;
  }).join('');
  let result = '<div class="anno-empty">点上面的标签，列出所有带该标签的目录。</div>';
  if (selectedTag) {
    const keys = keysByTag(data, selectedTag);
    result = keys.length
      ? `<div class="anno-list">${keys.map((key) => {
        const desc = describeKey(data, key);
        return `<div class="anno-item anno-result" data-action="anno-goto-key" data-key="${esc(key)}">
          <div class="anno-item-main">
            <div class="anno-item-title">${esc(desc?.label || key)}</div>
            <div class="anno-item-path">${esc(desc?.path || key)}${desc?.entry ? ` · /${esc(desc.entry)}` : ''}</div>
          </div>
        </div>`;
      }).join('')}</div>`
      : '<div class="anno-empty">这个标签下没有目录。</div>';
  }
  return `<div class="anno-cloud">${cloud}</div>
    <div class="anno-section-title">${selectedTag ? `标签「${esc(selectedTag)}」下的目录` : '按标签筛选'}</div>
    ${result}`;
}

function renderPanel() {
  const data = store.snapshot();
  $('annoPanel').innerHTML = `<div class="anno-panel-head">
      <span>书签与标签</span>
      <button type="button" data-action="anno-close-panel" title="关闭">×</button>
    </div>
    <div class="anno-tabs">
      <button type="button" data-action="anno-tab" data-tab="bookmarks" class="${activeTab === 'bookmarks' ? 'active' : ''}">书签 (${data.bookmarks.length})</button>
      <button type="button" data-action="anno-tab" data-tab="tags" class="${activeTab === 'tags' ? 'active' : ''}">标签 (${allTags(data).length})</button>
    </div>
    <div class="anno-panel-body">${activeTab === 'bookmarks' ? bookmarksHtml(data) : tagsHtml(data)}</div>
    <div class="anno-panel-foot">数据保存在本机的 zen-fs-config${store.backend === 'zenfs' ? '' : '（当前为本地兜底存储）'}</div>`;
}

function refresh() {
  document.querySelectorAll('.anno-bar, .anno-side-section').forEach((node) => node.remove());
  if (currentKey) renderBar();
  renderSide();
  updateTopButtons();
  if (panelOpen) renderPanel();
}

function openPanel(tab) {
  if (tab) activeTab = tab;
  panelOpen = true;
  $('annoPanel').classList.remove('hidden');
  $('annoBackdrop').classList.remove('hidden');
  renderPanel();
}

function closePanel() {
  panelOpen = false;
  $('annoPanel').classList.add('hidden');
  $('annoBackdrop').classList.add('hidden');
}

function toggleBookmark() {
  if (!currentKey || !currentDescriptor) return;
  const existing = store.data.bookmarks.find((item) => item.key === currentKey);
  if (existing) {
    store.mutate((data) => removeBookmark(data, existing.id));
    hooks.status('已移出书签');
    return;
  }
  store.mutate((data) => addBookmark(data, {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: currentKey,
    kind: currentDescriptor.kind,
    label: currentDescriptor.label,
    path: currentDescriptor.path,
    zipPath: currentDescriptor.zipPath || '',
    entry: currentDescriptor.entry || '',
  }));
  hooks.status('已加入书签');
}

function commitTag(value) {
  const tag = String(value || '').trim();
  if (tag && currentKey) {
    store.mutate((data) => addTag(rememberPath(data, currentKey, currentDescriptor), currentKey, tag));
  } else {
    refresh();
  }
}

async function gotoDescriptor(desc) {
  if (!desc) return;
  closePanel();
  try {
    if (desc.kind === 'zip' && desc.zipPath) {
      await hooks.openZipBookmark({ zipPath: desc.zipPath, entry: desc.entry || '', label: desc.label });
    } else if (desc.path) {
      hooks.navigate({ kind: 'dir', path: desc.path });
    }
  } catch (err) {
    hooks.status(err.message || String(err), true);
  }
}

async function onDocumentClick(event) {
  const element = event.target.closest('[data-action^="anno-"]');
  if (!element) return;
  const action = element.dataset.action;
  const data = store.snapshot();

  if (action === 'anno-add-tag') {
    const input = $('annoTagInput');
    if (!input) return;
    input.classList.remove('hidden');
    element.classList.add('hidden');
    input.focus();
    return;
  }
  if (action === 'anno-remove-tag') {
    store.mutate((d) => removeTag(d, currentKey, element.dataset.tag));
    return;
  }
  if (action === 'anno-toggle-bookmark') {
    toggleBookmark();
    return;
  }
  if (action === 'anno-open-panel') {
    openPanel(element.dataset.tab);
    return;
  }
  if (action === 'anno-close-panel') {
    closePanel();
    return;
  }
  if (action === 'anno-tab') {
    activeTab = element.dataset.tab === 'tags' ? 'tags' : 'bookmarks';
    renderPanel();
    return;
  }
  if (action === 'anno-select-tag') {
    selectedTag = element.dataset.tag || '';
    renderPanel();
    return;
  }
  if (action === 'anno-goto-bookmark') {
    const item = data.bookmarks.find((bookmark) => bookmark.id === element.dataset.id);
    if (item) await gotoDescriptor(item);
    return;
  }
  if (action === 'anno-delete-bookmark') {
    store.mutate((d) => removeBookmark(d, element.dataset.id));
    return;
  }
  if (action === 'anno-rename-bookmark') {
    const item = data.bookmarks.find((bookmark) => bookmark.id === element.dataset.id);
    const title = element.closest('.anno-item')?.querySelector('.anno-item-title');
    if (item && title) {
      title.innerHTML = `<input class="anno-rename-input" value="${esc(item.label)}" data-id="${esc(item.id)}" maxlength="32">`;
      const input = title.querySelector('input');
      input.focus();
      input.select();
    }
    return;
  }
  if (action === 'anno-goto-key') {
    await gotoDescriptor(describeKey(data, element.dataset.key));
  }
}

function onKeyDown(event) {
  if (event.key === 'Escape' && panelOpen) {
    closePanel();
    return;
  }
  if (event.key !== 'Enter') return;
  if (event.target.id === 'annoTagInput') {
    commitTag(event.target.value);
  } else if (event.target.classList?.contains('anno-rename-input')) {
    const value = event.target.value;
    const id = event.target.dataset.id;
    store.mutate((d) => renameBookmark(d, id, value));
  }
}

/** app.js 在每次 render 完成后调用，用来把标签条与书签区贴回新 DOM。 */
export function onRender(target) {
  currentKey = keyForTarget(target);
  currentDescriptor = descriptorFor(target);
  refresh();
}

export function initAnnotations(options) {
  hooks = options;
  store = createAnnotationStore({ onChange: refresh });

  $('bookmarksBtn').addEventListener('click', () => openPanel('bookmarks'));
  $('tagsBtn').addEventListener('click', () => openPanel('tags'));
  $('annoBackdrop').addEventListener('click', closePanel);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) store.reload();
  });
  window.addEventListener('pagehide', () => store.flush());

  return store.init().then(({ backend }) => {
    document.body.dataset.annoBackend = backend;
    refresh();
    return backend;
  });
}

export function getAnnotationStore() {
  return store;
}

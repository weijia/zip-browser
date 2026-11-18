/**
 * 行选择 + 批量动作（加入文件列表 / 加入目录清单 / 删除到回收站）。
 * 勾选不再是「删除专用」：切换目录后选择仍然保留，删除只作用于当前目录。
 * 所有交互都从 app.js 的全局 click 代理转进来，避免行内控件触发导航。
 */

/** 与服务端 MAX_TRASH_BATCH 一致：一次请求最多 10 项，超出则分批串行执行。 */
export const TRASH_BATCH = 10;

let deps = null;
let pending = [];
let busy = false;
const selected = new Map(); // path -> { name, dir }

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function $ (id) {
  return document.getElementById(id);
}

function hostLabels() {
  return (typeof window !== 'undefined' && window.ZB_HOST?.labels) || {};
}

function isPosixHost() {
  return typeof window !== 'undefined' && Boolean(window.ZB?.posix);
}

function trashHintText(batch) {
  return `勾选后可加入文件列表或目录清单；删除仅限本目录、移入回收站，每批最多 ${batch} 项`;
}

export function initTrash(options) {
  deps = options;
  document.addEventListener('keydown', (event) => {
    const modal = $('trashModal');
    if (event.key === 'Escape' && !busy && modal && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

export function resetTrashSelection() {
  // 切换目录时不再清空选择；只把当前行的勾选状态对齐到持久选择集。
  for (const box of document.querySelectorAll('.trash-check')) {
    box.checked = selected.has(box.dataset.path);
  }
  updateToolbar();
}

export function selectedItems() {
  return Array.from(selected.values());
}

export function clearSelection() {
  selected.clear();
  for (const box of document.querySelectorAll('.trash-check')) box.checked = false;
  updateToolbar();
}

function sameDir(a, b) {
  const norm = (value) => String(value || '').replace(/[\\/]+$/, '').toLowerCase();
  return norm(a) === norm(b);
}

function currentSelection() {
  const dir = deps?.getDir?.() || '';
  return Array.from(selected.values()).filter((item) => sameDir(item.parent, dir));
}

function updateToolbar() {
  const count = $('trashCount');
  const currentCount = $('trashCurrentCount');
  const dirCount = $('selectionDirCount');
  const btn = $('trashSelectedBtn');
  const addFiles = $('selectionAddFilesBtn');
  const addDirs = $('selectionAddDirsBtn');
  const clearBtn = $('selectionClearBtn');
  const all = $('trashAll');
  const current = currentSelection();
  const dirs = Array.from(selected.values()).filter((item) => item.dir).length;
  if (count) count.textContent = String(selected.size);
  if (currentCount) currentCount.textContent = String(current.length);
  if (dirCount) dirCount.textContent = String(dirs);
  if (btn) btn.disabled = busy || !canRemove() || current.length === 0;
  if (addFiles) addFiles.disabled = busy || selected.size === 0;
  if (addDirs) addDirs.disabled = busy || dirs === 0;
  if (clearBtn) clearBtn.disabled = busy || selected.size === 0;
  if (all) {
    const boxes = Array.from(document.querySelectorAll('.trash-check'));
    all.checked = boxes.length > 0 && boxes.every((box) => selected.has(box.dataset.path));
    all.indeterminate = !all.checked && boxes.some((box) => selected.has(box.dataset.path));
  }
}

function canRemove() {
  if (typeof window === 'undefined') return true;
  const features = window.ZB_HOST?.features;
  return !features || features.remove !== false;
}

export function trashToolbarHtml() {
  return `<div class="trash-toolbar">
    <label class="trash-all-label"><input type="checkbox" id="trashAll" data-action="trash-all"> 全选</label>
    <span class="trash-selected-count">已选 <span id="trashCount">0</span> 项</span>
    <button id="selectionAddFilesBtn" type="button" class="selection-add-btn" data-action="selection-add-files" title="把选中的目录按下一层子目录、选中的文件直接加入文件列表" disabled>+ 文件列表</button>
    <button id="selectionAddDirsBtn" type="button" class="selection-add-btn" data-action="selection-add-dirs" title="把选中的目录加入目录清单" disabled>+ 目录清单（<span id="selectionDirCount">0</span>）</button>
    ${canRemove() ? '<button id="trashSelectedBtn" type="button" class="trash-selected-btn" data-action="trash-selected" disabled>删除（<span id="trashCurrentCount">0</span>）</button>' : ''}
    <button id="selectionClearBtn" type="button" class="selection-clear-btn" data-action="selection-clear" disabled>清空</button>
    <button id="manifestClearBtn" type="button" class="selection-clear-btn" data-action="manifest-clear" title="清空目录清单和文件列表的全部选择，不影响当前目录里的勾选">清空清单</button>
    <span class="trash-hint">${esc(trashHintText(TRASH_BATCH))}</span>
  </div>`;
}

export const trashHeadStart = () => '<th class="trash-col-check"></th>';
export const trashHeadEnd = () => (canRemove() ? '<th class="trash-col-action"></th>' : '');

function checkBoxHtml(item) {
  const checked = selected.has(item.path) ? ' checked' : '';
  return `<input type="checkbox" class="trash-check" data-action="trash-check" data-path="${esc(item.path)}" data-name="${esc(item.name)}" data-size="${Number(item.size) || 0}" data-mtime="${Number(item.mtime) || 0}" data-dir="${item.dir ? 'true' : 'false'}"${checked} title="选中这个条目，可批量加入文件列表 / 目录清单">`;
}

function deleteButtonHtml(item, className = 'trash-one', label = '删除') {
  return `<button type="button" class="${className}" data-action="trash-one" data-path="${esc(item.path)}" data-name="${esc(item.name)}" data-dir="${item.dir ? 'true' : 'false'}" title="${esc(item.name)} · 删除到回收站">${label}</button>`;
}

export const trashRowStart = (item) => `<td class="trash-col-check">${checkBoxHtml(item)}</td>`;
export const trashRowEnd = (item) => (canRemove() ? `<td class="trash-col-action">${deleteButtonHtml(item)}</td>` : '');

export function trashCardControls(item) {
  return `<div class="trash-card-controls">${checkBoxHtml(item)}${canRemove() ? deleteButtonHtml(item, 'trash-card-x', '×') : ''}</div>`;
}

export function trashChipControls(item) {
  return canRemove() ? deleteButtonHtml(item, 'trash-chip-x', '×') : '';
}

function openConfirm(items) {
  if (!deps || !items.length || busy) return;
  pending = items;
  const list = $('trashList');
  const count = $('trashCountText');
  const modal = $('trashModal');
  if (!list || !modal) return;
  if (count) count.textContent = String(items.length);
  list.innerHTML = items.map((item) => `<div class="trash-item">
    <span class="trash-kind">${item.dir ? '文件夹' : '文件'}</span>
    <code>${esc(item.path)}</code>
  </div>`).join('');
  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = $('trashModal');
  if (modal) modal.classList.add('hidden');
  pending = [];
  const btn = $('trashConfirm');
  if (btn) btn.disabled = false;
}

async function executeTrash() {
  if (!deps || !pending.length || busy) return;
  const items = pending.slice();
  const dir = deps.getDir();
  busy = true;
  const confirmBtn = $('trashConfirm');
  if (confirmBtn) confirmBtn.disabled = true;
  updateToolbar();
  const results = [];
  try {
    if (!dir) throw new Error(isPosixHost() ? '当前不在目录内，无法删除' : '当前不在磁盘目录，无法删除');
    for (let offset = 0; offset < items.length; offset += TRASH_BATCH) {
      const chunk = items.slice(offset, offset + TRASH_BATCH);
      // eslint-disable-next-line no-await-in-loop -- 分批必须串行，且每批失败即停
      const data = await deps.api('/api/trash', {
        method: 'POST',
        body: JSON.stringify({ dir, paths: chunk.map((item) => item.path) }),
      });
      results.push(...(Array.isArray(data.results) ? data.results : []));
      if (!data.ok) break; // 有一项失败就停止后续批次，避免扩大影响面
    }
    const ok = results.filter((row) => row.ok).length;
    const failed = results.filter((row) => !row.ok);
    if (ok) {
      deps.status(isPosixHost()
        ? `已删除 ${ok} 项${failed.length ? `，${failed.length} 项失败：${failed[0].error || '未知原因'}` : '（删除由服务端按存储能力执行）'}`
        : `已把 ${ok} 项移入回收站${failed.length ? `，${failed.length} 项失败：${failed[0].error || '未知原因'}` : '，可在 Windows 回收站还原'}`,
        failed.length > 0);
    } else {
      deps.status(`删除未成功：${failed[0]?.error || '回收站没有接受这些项目'}`, true);
    }
  } catch (err) {
    deps.status(`删除失败：${err.message || err}`, true);
  } finally {
    busy = false;
    closeModal();
    // 只移除本批删除项，其他目录里的勾选继续保留。
    for (const item of items) selected.delete(item.path);
    updateToolbar();
    // 无论成功失败都重列目录，以磁盘真实状态为准（回收站可能已删掉部分项）
    deps.refresh();
  }
}

export async function handleTrashAction(action, element) {
  if (!deps) return;
  switch (action) {
    case 'trash-check': {
      const item = {
        path: element.dataset.path,
        name: element.dataset.name,
        size: Number(element.dataset.size) || 0,
        mtime: Number(element.dataset.mtime) || 0,
        dir: element.dataset.dir === 'true',
        parent: deps?.getDir?.() || '',
      };
      if (element.checked) selected.set(item.path, item);
      else selected.delete(item.path);
      updateToolbar();
      return;
    }
    case 'trash-all': {
      const check = element.checked;
      const boxes = Array.from(document.querySelectorAll('.trash-check'));
      for (const box of boxes) {
        box.checked = check;
        const item = {
          path: box.dataset.path,
          name: box.dataset.name,
          size: Number(box.dataset.size) || 0,
          mtime: Number(box.dataset.mtime) || 0,
          dir: box.dataset.dir === 'true',
          parent: deps?.getDir?.() || '',
        };
        if (check) selected.set(item.path, item);
        else selected.delete(item.path);
      }
      updateToolbar();
      return;
    }
    case 'trash-one': {
      openConfirm([{
        path: element.dataset.path,
        name: element.dataset.name,
        dir: element.dataset.dir === 'true',
      }]);
      return;
    }
    case 'trash-selected': {
      const items = currentSelection();
      if (!items.length) {
        deps.status('当前目录没有选中项；已选项目在其他目录，切换回去再删除', true);
        return;
      }
      openConfirm(items);
      return;
    }
    case 'trash-confirm': {
      await executeTrash();
      return;
    }
    case 'selection-clear': {
      clearSelection();
      return;
    }
    case 'trash-cancel':
    case 'trash-close': {
      if (!busy) closeModal();
      return;
    }
    default:
  }
}

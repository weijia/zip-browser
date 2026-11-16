/**
 * 删除到回收站（仅磁盘文件/文件夹，压缩包内部保持只读）。
 * 所有交互都从 app.js 的全局 click 代理以 data-action="trash-*" 转进来，
 * 避免行内控件触发「进入目录 / 打开文件」的导航。
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
  const text = hostLabels().trashHint;
  return text ? `${text}，每批最多 ${batch} 项` : `删除会移入 Windows 回收站，可还原；仅限本地固定磁盘，每批最多 ${batch} 项`;
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
  selected.clear();
  updateToolbar();
}

function updateToolbar() {
  const btn = $('trashSelectedBtn');
  const count = $('trashCount');
  const all = $('trashAll');
  if (count) count.textContent = String(selected.size);
  if (btn) btn.disabled = busy || selected.size === 0;
  if (all) {
    const boxes = Array.from(document.querySelectorAll('.trash-check'));
    all.checked = boxes.length > 0 && boxes.every((box) => box.checked);
    all.indeterminate = selected.size > 0 && !all.checked;
  }
}

function canRemove() {
  if (typeof window === 'undefined') return true;
  const features = window.ZB_HOST?.features;
  return !features || features.remove !== false;
}

export function trashToolbarHtml() {
  if (!canRemove()) return '';
  return `<div class="trash-toolbar">
    <label class="trash-all-label"><input type="checkbox" id="trashAll" data-action="trash-all"> 全选</label>
    <button id="trashSelectedBtn" type="button" class="trash-selected-btn" data-action="trash-selected" disabled>删除选中（<span id="trashCount">0</span>）</button>
    <span class="trash-hint">${esc(trashHintText(TRASH_BATCH))}</span>
  </div>`;
}

export const trashHeadStart = () => (canRemove() ? '<th class="trash-col-check"></th>' : '');
export const trashHeadEnd = () => (canRemove() ? '<th class="trash-col-action"></th>' : '');

function checkBoxHtml(item) {
  return `<input type="checkbox" class="trash-check" data-action="trash-check" data-path="${esc(item.path)}" data-name="${esc(item.name)}" data-dir="${item.dir ? 'true' : 'false'}" title="选择以批量删除">`;
}

function deleteButtonHtml(item, className = 'trash-one', label = '删除') {
  return `<button type="button" class="${className}" data-action="trash-one" data-path="${esc(item.path)}" data-name="${esc(item.name)}" data-dir="${item.dir ? 'true' : 'false'}" title="${esc(item.name)} · 删除到回收站">${label}</button>`;
}

export const trashRowStart = (item) => (canRemove() ? `<td class="trash-col-check">${checkBoxHtml(item)}</td>` : '');
export const trashRowEnd = (item) => (canRemove() ? `<td class="trash-col-action">${deleteButtonHtml(item)}</td>` : '');

export function trashCardControls(item) {
  if (!canRemove()) return '';
  return `<div class="trash-card-controls">${checkBoxHtml(item)}${deleteButtonHtml(item, 'trash-card-x', '×')}</div>`;
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
    selected.clear();
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
        dir: element.dataset.dir === 'true',
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
          dir: box.dataset.dir === 'true',
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
      if (!selected.size) return;
      openConfirm(Array.from(selected.values()));
      return;
    }
    case 'trash-confirm': {
      await executeTrash();
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

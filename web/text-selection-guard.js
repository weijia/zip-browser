// 文本选择保护：拖拽选中一段文字后松手，浏览器会补发一次 click，
// 导致「此电脑」里的卡片/表格行误触发进入。这里在捕获阶段吞掉这类 click。
// 只拦截真正的拖选（按下到松开有位移）或松手时仍存在非空文本选区，
// 且不对按钮/输入框等交互控件生效，避免影响正常点击。

const MOVE_THRESHOLD = 6; // px，超过视为拖拽而非单击

/**
 * 纯判断函数（便于单测）。
 * @param {{dx?:number, dy?:number, selectionText?:string, interactive?:boolean}} ctx
 */
export function shouldIgnoreClickAfterSelection({ dx = 0, dy = 0, selectionText = '', interactive = false } = {}) {
  const moved = Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD;
  const hasSelection = !interactive && !!selectionText && String(selectionText).trim().length > 0;
  return moved || hasSelection;
}

let installed = false;

/** 安装全局 mousedown/click 捕获监听（幂等，只装一次）。 */
export function installTextSelectionGuard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  let press = null;
  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0) { press = null; return; }
    press = { x: event.clientX, y: event.clientY };
  }, true);

  document.addEventListener('click', (event) => {
    const start = press;
    press = null;
    if (!start) return;
    const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
    const interactive = !!event.target?.closest?.(
      'button, input, select, textarea, a, label, [contenteditable="true"]',
    );
    if (shouldIgnoreClickAfterSelection({
      dx: event.clientX - start.x,
      dy: event.clientY - start.y,
      selectionText: sel?.isCollapsed ? '' : String(sel || ''),
      interactive,
    })) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
}

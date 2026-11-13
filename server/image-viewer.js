function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

// 内嵌在内容响应里，避免依赖主页面的样式；CONTENT_CSP 允许 unsafe-inline 样式与同源脚本。
const STYLE = `
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:#14171c;color:#e8ecf1;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;overflow:hidden}
.iv{display:flex;flex-direction:column;height:100%}
.iv-bar{display:flex;align-items:center;gap:6px;padding:7px 10px;background:#1e232b;border-bottom:1px solid #2c333d;flex:0 0 auto;min-width:0}
.iv-name{font-weight:600;max-width:36%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iv-dims{color:#8b95a3;font-size:11px;white-space:nowrap}
.iv-grow{flex:1 1 auto}
.iv-bar button,.iv-link{appearance:none;border:1px solid #38414e;background:#272e38;color:#e8ecf1;border-radius:6px;font:inherit;font-size:12px;line-height:1;padding:6px 10px;cursor:pointer;text-decoration:none;white-space:nowrap}
.iv-bar button:hover,.iv-link:hover{background:#333c49;border-color:#4a90d9}
.iv-bar button:active{background:#1b2028}
.iv-zoom{min-width:62px;text-align:center;font-variant-numeric:tabular-nums;color:#9ecbff}
.iv-viewport{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;outline:none;cursor:grab;touch-action:none;background-color:#14171c;background-image:linear-gradient(45deg,#1b2028 25%,transparent 25%),linear-gradient(-45deg,#1b2028 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b2028 75%),linear-gradient(-45deg,transparent 75%,#1b2028 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}
.iv-viewport.dragging{cursor:grabbing}
.iv-canvas{position:absolute;left:50%;top:50%;transform-origin:center center;will-change:transform}
.iv-canvas img{display:block;max-width:none;height:auto;user-select:none;-webkit-user-drag:none;transform-origin:center center}
.iv-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);padding:4px 12px;border-radius:99px;background:rgba(20,23,28,.78);color:#aab3c0;font-size:11px;pointer-events:none;white-space:nowrap}
.iv-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ff9b9b;font-size:14px;background:#14171c}
.hidden{display:none!important}
`;

/**
 * 导航到图片时返回的查看器页面。URL 保持原样（相对路径基准不变），
 * 原图通过 ?raw=1 获取，脚本实现缩放 / 平移 / 旋转。
 */
export function renderImageViewer({ name = 'image', src }) {
  const safeName = escapeHtml(name);
  const safeSrc = escapeHtml(src);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeName} · 图片查看器</title>
<style>${STYLE}</style></head><body>
<div class="iv" data-image-viewer>
  <div class="iv-bar">
    <span class="iv-name" title="${safeName}">${safeName}</span>
    <span class="iv-dims" id="ivDims">载入中…</span>
    <span class="iv-grow"></span>
    <button type="button" id="ivOut" title="缩小（滚轮向下 / -）">−</button>
    <button type="button" id="ivZoom" class="iv-zoom" title="点击适应窗口">100%</button>
    <button type="button" id="ivIn" title="放大（滚轮向上 / +）">+</button>
    <button type="button" id="ivFit" title="适应窗口（0 / F）">适应</button>
    <button type="button" id="ivActual" title="原始尺寸（1）">1:1</button>
    <button type="button" id="ivRotate" title="旋转 90°（R）">↻</button>
    <a class="iv-link" href="${safeSrc}" target="_blank" rel="noopener" title="在新窗口打开原图">原图 ↗</a>
  </div>
  <div class="iv-viewport" id="ivViewport" tabindex="0" aria-label="图片区域，可滚轮缩放与拖拽平移">
    <div class="iv-canvas" id="ivCanvas"><img id="ivImage" src="${safeSrc}" alt="${safeName}" draggable="false"></div>
    <div class="iv-hint">滚轮缩放 · 按住拖拽平移 · 双击切换 1:1 / 适应</div>
    <div class="iv-error hidden" id="ivError">图片无法加载，或该格式不受浏览器支持</div>
  </div>
</div>
<script type="module" src="/image-viewer.js"></script>
</body></html>`;
}

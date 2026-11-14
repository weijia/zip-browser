const MIN_SCALE = 0.02;
const MAX_SCALE = 32;
const STEP = 1.25;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function boot() {
  const root = document.querySelector('[data-image-viewer]');
  if (!root) return;

  const viewport = root.querySelector('#ivViewport');
  const canvas = root.querySelector('#ivCanvas');
  const img = root.querySelector('#ivImage');
  const zoomLabel = root.querySelector('#ivZoom');
  const dimsLabel = root.querySelector('#ivDims');
  const errorBox = root.querySelector('#ivError');
  const hint = root.querySelector('.iv-hint');
  if (hint && window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches) {
    hint.textContent = '双指缩放 · 单指拖动 · 双击切换 1:1 / 适应';
  }

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let rotation = 0;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let fitted = true;
  let ready = false;

  function apply() {
    canvas.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`;
    img.style.transform = `rotate(${rotation}deg)`;
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    zoomLabel.title = `当前 ${Math.round(scale * 100)}% · 点击适应窗口`;
  }

  function fitScale() {
    if (!naturalWidth || !naturalHeight) return 1;
    const rect = viewport.getBoundingClientRect();
    const swapped = rotation % 180 !== 0;
    const width = swapped ? naturalHeight : naturalWidth;
    const height = swapped ? naturalWidth : naturalHeight;
    const padding = 24;
    return clamp(
      Math.min((rect.width - padding) / width, (rect.height - padding) / height),
      MIN_SCALE,
      MAX_SCALE,
    );
  }

  function fit() {
    scale = fitScale();
    tx = 0;
    ty = 0;
    fitted = true;
    apply();
  }

  // 以指针位置为锚点：cx = tx + ix * scale，缩放后保持 ix 不变。
  function zoomTo(next, cx = 0, cy = 0) {
    const target = clamp(next, MIN_SCALE, MAX_SCALE);
    const ratio = target / scale;
    tx = cx - (cx - tx) * ratio;
    ty = cy - (cy - ty) * ratio;
    scale = target;
    fitted = false;
    apply();
  }

  function zoomBy(factor, cx = 0, cy = 0) {
    zoomTo(scale * factor, cx, cy);
  }

  function actual() {
    scale = 1;
    tx = 0;
    ty = 0;
    fitted = false;
    apply();
  }

  function rotate() {
    rotation = (rotation + 90) % 360;
    if (fitted) fit();
    else apply();
  }

  function pointerOffset(event) {
    const rect = viewport.getBoundingClientRect();
    return {
      cx: event.clientX - rect.left - rect.width / 2,
      cy: event.clientY - rect.top - rect.height / 2,
    };
  }

  root.querySelector('#ivIn').addEventListener('click', () => zoomBy(STEP));
  root.querySelector('#ivOut').addEventListener('click', () => zoomBy(1 / STEP));
  root.querySelector('#ivFit').addEventListener('click', fit);
  root.querySelector('#ivZoom').addEventListener('click', fit);
  root.querySelector('#ivActual').addEventListener('click', actual);
  root.querySelector('#ivRotate').addEventListener('click', rotate);

  viewport.addEventListener('wheel', (event) => {
    if (!ready) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const dy = event.deltaMode === 1
      ? event.deltaY * 16
      : (event.deltaMode === 2 ? event.deltaY * rect.height : event.deltaY);
    const { cx, cy } = pointerOffset(event);
    zoomBy(Math.exp(-clamp(dy, -240, 240) * 0.002), cx, cy);
  }, { passive: false });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  // 触摸：单指平移、双指捏合缩放。桌面端滚轮 / 按钮 / 双击路径完全不变。
  const pointers = new Map();
  let pinch = null;
  const pointList = () => Array.from(pointers.values());
  const distanceOf = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const centerOf = (pts) => ({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 });
  const centerOffset = (center) => {
    const rect = viewport.getBoundingClientRect();
    return { cx: center.x - rect.left - rect.width / 2, cy: center.y - rect.top - rect.height / 2 };
  };

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !ready) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const pts = pointList();
      pinch = {
        startDistance: Math.max(1, distanceOf(pts[0], pts[1])),
        startScale: scale,
        center: centerOf(pts),
      };
      dragging = false;
      viewport.classList.remove('dragging');
      return;
    }
    if (pointers.size > 2) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    viewport.classList.add('dragging');
    viewport.focus({ preventScroll: true });
    try { viewport.setPointerCapture(event.pointerId); } catch { /* synthetic events */ }
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const pts = pointList();
      const center = centerOf(pts);
      const { cx, cy } = centerOffset(center);
      // 先跟随双指中心平移，再以新中心为锚点缩放，避免画面跳动。
      tx += center.x - pinch.center.x;
      ty += center.y - pinch.center.y;
      const nextDistance = Math.max(1, distanceOf(pts[0], pts[1]));
      zoomTo(pinch.startScale * (nextDistance / pinch.startDistance), cx, cy);
      pinch.center = center;
      return;
    }
    if (!dragging) return;
    tx += event.clientX - lastX;
    ty += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    apply();
  });

  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pinch && pointers.size < 2) {
      pinch = null;
      const rest = pointList()[0];
      // 抬起一指后继续单指拖动，重置基准防止跳变。
      if (rest) { dragging = true; lastX = rest.x; lastY = rest.y; }
    }
    if (pointers.size === 0) {
      dragging = false;
      viewport.classList.remove('dragging');
    } else if (!pinch && !dragging) {
      viewport.classList.remove('dragging');
    }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('lostpointercapture', endPointer);

  viewport.addEventListener('dblclick', (event) => {
    if (!ready) return;
    const { cx, cy } = pointerOffset(event);
    if (fitted) zoomTo(1, cx, cy);
    else fit();
  });

  window.addEventListener('keydown', (event) => {
    if (!ready) return;
    const key = event.key.toLowerCase();
    if (key === '+' || key === '=') zoomBy(STEP);
    else if (key === '-' || key === '_') zoomBy(1 / STEP);
    else if (key === '0' || key === 'f') fit();
    else if (key === '1') actual();
    else if (key === 'r') rotate();
    else return;
    event.preventDefault();
  });

  function onReady() {
    if (ready) return;
    naturalWidth = img.naturalWidth;
    naturalHeight = img.naturalHeight;
    if (!naturalWidth || !naturalHeight) return;
    ready = true;
    dimsLabel.textContent = `${naturalWidth} × ${naturalHeight} px`;
    fit();
  }

  img.addEventListener('load', onReady);
  img.addEventListener('error', () => errorBox.classList.remove('hidden'));
  if (img.complete) onReady();

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (ready && fitted) fit();
    }).observe(viewport);
  } else {
    window.addEventListener('resize', () => {
      if (ready && fitted) fit();
    });
  }

  // 供自动化验证读取当前变换状态（只读视图 + 少量控制方法）。
  window.__imageViewer = {
    get scale() { return scale; },
    get translate() { return { x: tx, y: ty }; },
    get rotation() { return rotation; },
    get fitted() { return fitted; },
    get ready() { return ready; },
    get pointerCount() { return pointers.size; },
    get natural() { return { width: naturalWidth, height: naturalHeight }; },
    fit, actual, rotate, zoomBy, zoomTo,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

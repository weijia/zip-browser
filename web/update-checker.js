// 版本显示 + 自动检测更新
// 参考 my-skills/version-display（构建版本信息）与 pwa-update-toast
// （发现新版本后让用户手动刷新、去重守卫、不自动刷新）。
// 本项目没有构建步骤与 Service Worker，改为轮询 /version.json 对比源码指纹。
const FIRST_CHECK_DELAY = 3000;
const POLL_INTERVAL = 30 * 1000;

const HOST = (typeof window !== 'undefined' && window.ZB_HOST) || {};
const OPENLIST = HOST.versionKind === 'openlist';
const VERSION_URL = HOST.versionEndpoint || '/version.json';
const rawBoot = window.__APP_VERSION__;
const boot = typeof rawBoot === 'string'
  ? { version: rawBoot || 'unknown' }
  : (rawBoot || null);
const $ = (id) => document.getElementById(id);
const badge = $('appVersion');
const toast = $('updateToast');

let checking = false;
let updateAvailable = false;   // 去重守卫：同一版本只提示一次
let shownBuildId = '';
let dismissedBuildId = '';
let latest = null;
let badgeTimer = null;

function versionTitle(info) {
  if (OPENLIST) {
    return [
      `版本 v${info.version}`,
      info.webVersion ? `前端版本 ${info.webVersion}` : '',
      '点击可立即检查更新',
    ].filter(Boolean).join('\n');
  }
  return [
    `版本 v${info.version}`,
    `修订号 #${info.revision}`,
    `构建指纹 ${info.sha}`,
    `发布时间 ${info.buildTime}（北京时间）`,
    `参与指纹的源码 ${info.fileCount} 个文件`,
    '点击可立即检查更新',
  ].join('\n');
}

function renderBadge(info) {
  if (!badge || !boot) return;
  // 始终显示「本页面实际运行的版本」，不因为检测到新版就改数字
  badge.textContent = `v${boot.version}`;
  badge.title = versionTitle(boot)
    + (info && info.version && info.version !== boot.version
      ? `\n\n检测到新版本 v${info.version}`
      : '');
}

function flashBadge(text) {
  if (!badge || !boot) return;
  clearTimeout(badgeTimer);
  badge.textContent = text;
  badge.classList.add('checked');
  badgeTimer = setTimeout(() => {
    badge.textContent = `v${boot.version}`;
    badge.classList.remove('checked');
  }, 1600);
}

function hideToast() {
  toast?.classList.add('hidden');
  updateAvailable = false;
  shownBuildId = '';
}

function showToast(current, next) {
  if (!toast) return;
  if (OPENLIST) {
    $('updateTitle').textContent = `服务端已更新到 v${next.version}`;
    $('updateSub').textContent = '刷新页面以加载新版本';
  } else {
    const onlyServer = next.webBuildId === current.webBuildId
      && next.serverBuildId !== current.serverBuildId;
    $('updateTitle').textContent = onlyServer ? '服务端文件已更新' : `发现新版本 v${next.version}`;
    $('updateSub').textContent = onlyServer
      ? '刷新后若功能未生效，请重启本地服务'
      : `当前 v${current.version} · 发布于 ${next.buildTime}`;
  }
  toast.classList.remove('hidden');
  updateAvailable = true;
  shownBuildId = next.buildId || next.version;
}

async function check({ force = false, manual = false } = {}) {
  if (checking || (!force && document.hidden)) return;
  checking = true;
  try {
    const url = HOST.versionEndpoint && window.ZB
      ? window.ZB.url(`${VERSION_URL}?t=${Date.now()}`)
      : `${VERSION_URL}?t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const info = await response.json();
    if (!info) return;
    if (!OPENLIST && !info.buildId) return;
    latest = info;
    renderBadge(info);
    if (boot && info.version && info.version !== boot.version) {
      const marker = info.buildId || info.version;
      // updateAvailable 守卫 + shownBuildId：同一版本只弹一次，版本再变才更新文案
      const shouldNotify = !updateAvailable || shownBuildId !== marker;
      if (marker !== dismissedBuildId && shouldNotify) {
        showToast(boot, info);
      }
    } else {
      hideToast();
      if (manual) flashBadge('✓ 已是最新');
    }
  } catch {
    // 服务重启或网络抖动时静默，下一轮继续检测
  } finally {
    checking = false;
  }
}

renderBadge(null);

badge?.addEventListener('click', () => check({ force: true, manual: true }));
$('updateNow')?.addEventListener('click', () => location.reload());
$('updateLater')?.addEventListener('click', () => {
  dismissedBuildId = latest?.buildId || '';
  hideToast();
});

window.addEventListener('zip-browser:check-update', () => check({ force: true }));
window.addEventListener('focus', () => check());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) check();
});

setTimeout(() => check(), FIRST_CHECK_DELAY);
setInterval(() => check(), POLL_INTERVAL);

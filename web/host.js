// 宿主配置层：让同一份前端既能跑在自带 Node 服务上，也能被 OpenList 的 /zb 兼容层托管。
// 宿主在 index.html 的 <head> 里先注入 window.ZB_HOST（或保留旧版 __ZB_* 全局），
// 这里补默认值并把 URL / 鉴权 / 路径风格的判断集中到 window.ZB 上。
(function () {
  'use strict';

  var defaults = {
    // 前端挂载前缀，例如 '/zb'；空字符串表示挂在站点根。
    basePath: '',
    // 'local-token'：自带服务，使用 X-Local-Token；'bearer'：OpenList，使用 Bearer/cookie。
    auth: 'local-token',
    // 'windows'：C:\...；'posix'：/存储名/...
    pathStyle: 'windows',
    // 'drives'：枚举盘符；'mounts'：枚举 OpenList 已挂载存储。
    drivesMode: 'drives',
    // 'server'：KDBX 由本机服务解密；'browser'：KDBX 全部在浏览器端解密。
    vaultMode: 'server',
    versionEndpoint: '/version.json',
    // 'fingerprint'：zip-browser 的 /version.json；'openlist'：/api/version。
    versionKind: 'fingerprint',
    versionValue: '',
    siteTitle: '本地文件浏览器',
    user: '',
    labels: {
      root: '此电脑',
      mode: '本地磁盘',
      drivesTitle: '此电脑 · 磁盘',
      drivesUnit: '磁盘',
      drivesEmpty: '没有检测到可用磁盘',
      drivesHint: '点击盘符进入目录；遇到 zip / 7z / rar / tar.gz 等压缩包可直接点开，加密压缩包会提示输入密码（可自动用缺省密码或密码库记录尝试）。进入目录后可用行内「删除」或勾选批量删除，把文件/文件夹移入 Windows 回收站（可还原）。',
      sidebarRoot: '此电脑',
      previewTitle: '本地预览',
      previewHint: '相对引用按本地路径解析',
      trashHint: '删除会移入 Windows 回收站，可还原；仅限本地固定磁盘',
      trashAction: '删除到回收站',
      trashWarning: '⚠️ 以下项目会被移入 Windows 回收站；文件夹会连同内部全部内容一起移动，回收站一旦清空数据将无法恢复。请核对完整路径。',
      trashNote: 'U 盘 / 网络盘 / 光驱与超过 1 GiB 的单个文件会被拒绝，避免 Windows 把「移入回收站」降级为永久删除；这类文件请到资源管理器手动处理。',
      trashStatus: '浏览 · 删除到回收站 · ',
    },
    features: {
      explorer: true,
      encoding: true,
      admin: false,
      login: false,
      remove: true,
    },
  };

  var legacy = {
    basePath: typeof window.__ZB_BASE__ === 'string' ? window.__ZB_BASE__ : undefined,
    auth: window.__ZB_AUTH__ === '1' ? 'bearer' : undefined,
    siteTitle: typeof window.__ZB_TITLE__ === 'string' ? window.__ZB_TITLE__ : undefined,
    user: typeof window.__ZB_USER__ === 'string' ? window.__ZB_USER__ : undefined,
    versionValue: typeof window.__ZB_VERSION__ === 'string' ? window.__ZB_VERSION__ : undefined,
  };

  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (key) { out[key] = base[key]; });
    Object.keys(extra || {}).forEach(function (key) {
      var value = extra[key];
      if (value === undefined || value === null) return;
      if (key === 'labels' || key === 'features') {
        out[key] = merge(base[key] || {}, value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  var incoming = merge(merge(defaults, legacy), window.ZB_HOST || {});
  var base = String(incoming.basePath || '').replace(/\/+$/, '');
  if (base && base.charAt(0) !== '/') base = '/' + base;
  incoming.basePath = base;
  incoming.auth = incoming.auth === 'bearer' ? 'bearer' : 'local-token';
  incoming.pathStyle = incoming.pathStyle === 'posix' ? 'posix' : 'windows';

  window.ZB_HOST = incoming;
  window.ZB = {
    base: base,
    posix: incoming.pathStyle === 'posix',
    bearer: incoming.auth === 'bearer',
    // 把站内绝对路径加上宿主前缀；外链与已带前缀的地址原样返回。
    url: function (value) {
      var text = String(value || '');
      if (/^https?:/i.test(text)) return text;
      if (text.charAt(0) === '/' && base && text.indexOf(base + '/') !== 0) return base + text;
      return text;
    },
    // 与 url 相反：去掉宿主前缀，得到兼容层内部使用的站内路径（用于 hash / iframe 比较）。
    strip: function (value) {
      var text = String(value || '');
      return base && text.indexOf(base + '/') === 0 ? text.slice(base.length) : text;
    },
  };

  // 兼容旧代码的全局读取；新代码统一用 window.ZB_HOST / window.ZB。
  if (!window.__ZB_BASE__) window.__ZB_BASE__ = base;
  if (incoming.user && !window.__ZB_USER__) window.__ZB_USER__ = incoming.user;
  if (incoming.versionValue && !window.__APP_VERSION__) window.__APP_VERSION__ = incoming.versionValue;
  if (incoming.siteTitle && !window.__ZB_TITLE__) window.__ZB_TITLE__ = incoming.siteTitle;
  if (!window.__APP_VERSION__) window.__APP_VERSION__ = 'unknown';
  if (incoming.siteTitle) document.title = incoming.siteTitle;
})();

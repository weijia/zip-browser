/**
 * 局域网访问的「访问码」层。
 *
 * 为什么需要它：X-Local-Token 是启动时生成后直接注入 index.html 的，
 * 任何人打开页面就自动拿到，它只防跨站误调用、不防人；而且 /thumb /fs /zip
 * 连 token 都不校验。所以对外开放时必须有一层独立的、不写进页面的凭据。
 *
 * 这里用 HTTP Basic Auth：浏览器原生弹框，且 <img> / iframe / fetch 请求
 * 都会自动带上 Authorization，能一次性盖住所有静态资源与 API，零前端改动。
 * 用户名任意（浏览器要求有用户名），密码就是 ZIP_BROWSER_ACCESS_CODE。
 */
import { timingSafeEqual } from 'node:crypto';

/** 校验 Authorization: Basic <base64(user:code)>；未启用访问码时恒为 true。 */
export function basicAuthAccepted(header, code) {
  if (!code) return true;
  const match = /^Basic\s+(.+)$/i.exec(String(header || ''));
  if (!match) return false;
  let decoded;
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return false;
  }
  const colon = decoded.indexOf(':');
  if (colon < 0) return false;
  const given = Buffer.from(decoded.slice(colon + 1), 'utf8');
  const expected = Buffer.from(String(code), 'utf8');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** /health 只给本机探活用，不向局域网暴露任何端点。 */
export function isLoopbackRequest(req) {
  const addr = String(req.socket?.remoteAddress || '');
  return addr === '127.0.0.1' || addr === '::1'
    || addr === '::ffff:127.0.0.1' || addr === '0:0:0:0:0:0:0:1';
}

export function sendAccessChallenge(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="ZipBrowser LAN", charset="UTF-8"',
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end('需要访问码（用户名任意，密码为 ZIP_BROWSER_ACCESS_CODE）');
}

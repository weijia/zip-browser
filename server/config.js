import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 默认只绑回环网卡；要被局域网访问必须显式设置 ZIP_BROWSER_HOST=0.0.0.0
// （或某个具体网卡 IP，更安全）。
export const HOST = process.env.ZIP_BROWSER_HOST || '127.0.0.1';
export const PORT = Number(process.env.PORT) || 4173;
export const TOKEN = process.env.ZIP_BROWSER_TOKEN || randomBytes(24).toString('hex');
// 对外监听时强烈建议设置：HTTP Basic Auth 的密码，用户名任意。
// 不写进页面、不写进配置仓，只从进程环境变量读取。
export const ACCESS_CODE = process.env.ZIP_BROWSER_ACCESS_CODE || '';
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_ZIP_BYTES = 512 * 1024 * 1024;

export const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
export const WEB_DIR = fileURLToPath(new URL('../web/', import.meta.url));
export const SAMPLES_DIR = fileURLToPath(new URL('../samples/', import.meta.url));

export const CONTENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

export const DIRECTORY_CSP = [
  "default-src 'self'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

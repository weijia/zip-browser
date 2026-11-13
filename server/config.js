import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HOST = '127.0.0.1';
export const PORT = Number(process.env.PORT) || 4173;
export const TOKEN = process.env.ZIP_BROWSER_TOKEN || randomBytes(24).toString('hex');
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

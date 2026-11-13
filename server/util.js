import { TOKEN } from './config.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

export function fail(res, err) {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err && err.message ? err.message : 'internal error';
  if (status >= 500) console.error('[error]', err);
  json(res, status, { error: message });
}

export async function readJson(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid json');
  }
}

export function requireToken(req) {
  const token = req.headers['x-local-token'];
  if (!token || token !== TOKEN) throw new HttpError(403, 'forbidden');
}

export function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError(400, 'malformed url');
  }
}

export function sendBuffer(req, res, buffer, options = {}) {
  const { contentType, csp, attachment, name } = options;
  const headers = {
    'Content-Type': contentType || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (csp) headers['Content-Security-Policy'] = csp;
  if (attachment) {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(name || 'file')}`;
  }
  const range = req.headers.range;
  if (range && !attachment) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (match) {
      const total = buffer.length;
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : total - 1;
      if (start >= total || end < start) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${total}` });
        res.end();
        return;
      }
      end = Math.min(end, total - 1);
      const chunk = buffer.subarray(start, end + 1);
      res.writeHead(206, {
        ...headers,
        'Content-Length': chunk.length,
        'Content-Range': `bytes ${start}-${end}/${total}`,
      });
      res.end(chunk);
      return;
    }
  }
  res.writeHead(200, { ...headers, 'Content-Length': buffer.length });
  res.end(buffer);
}

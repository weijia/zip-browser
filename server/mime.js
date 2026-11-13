const TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.xml': 'text/xml',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.yaml': 'text/plain',
  '.yml': 'text/plain',
};

const TEXT_EXT = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.map', '.txt',
  '.md', '.markdown', '.xml', '.csv', '.svg', '.yaml', '.yml', '.ts', '.tsx',
  '.jsx', '.vue', '.py', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.sh',
  '.bat', '.ps1', '.log', '.ini', '.conf', '.sql', '.gitignore',
]);

export const STATIC_EXTENSIONS = new Set([
  ...TEXT_EXT,
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf',
  '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm', '.wasm',
]);

const SENSITIVE_NAME = /^(?:\.env(?:\..*)?|id_rsa.*|id_ed25519.*|.*\.key|.*\.pem|.*\.pfx|.*\.p12|.*\.kdbx|\.npmrc|\.netrc|\.htpasswd|credentials.*|secrets?\.json|.*\.sqlite|.*\.db|.*\.ldb|ntuser\.dat|.*\.crt)$/i;

export function extensionOf(name) {
  return String(name).toLowerCase().match(/\.[^.\\/]+$/)?.[0] || '';
}

export function mimeOf(name) {
  const ext = extensionOf(name);
  const base = TYPES[ext] || (TEXT_EXT.has(ext) ? 'text/plain' : 'application/octet-stream');
  if (base.startsWith('text/') || base === 'application/json' || base === 'image/svg+xml') {
    return `${base}; charset=utf-8`;
  }
  return base;
}

export function isTextPreview(name) {
  return TEXT_EXT.has(extensionOf(name));
}

export function isMarkdown(name) {
  return extensionOf(name) === '.md' || extensionOf(name) === '.markdown';
}

export function isStaticAllowed(name) {
  const ext = extensionOf(name);
  if (!STATIC_EXTENSIONS.has(ext)) return false;
  const base = String(name).split(/[\\/]/).pop() || '';
  return !SENSITIVE_NAME.test(base);
}

export const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.svg',
]);

export function isImage(name) {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

// 归档容器：浏览器可"进入"查看内部的压缩包。zip 走 zip.js 引擎，其余走 7z 二进制（7z 还能读 rar/tar.gz 等）。
export const ARCHIVE_EXTENSIONS = new Set([
  '.zip', '.7z', '.rar', '.tar', '.tgz', '.gz', '.bz2', '.xz',
  '.iso', '.cab', '.wim', '.lzh', '.arj', '.z', '.rpm', '.deb', '.cpio',
]);

export function isArchiveName(name) {
  const lower = String(name).toLowerCase();
  if (ARCHIVE_EXTENSIONS.has(extensionOf(lower))) return true;
  if (/\.tar\.(gz|bz2|xz|zst)$/.test(lower)) return true;
  return false;
}

// 返回处理该归档的引擎：'zip'（zip.js）或 'seven'（7z 二进制）。仅当扩展名属于归档时才有意义。
export function archiveEngineOf(name) {
  return /\.zip$/i.test(String(name)) ? 'zip' : 'seven';
}

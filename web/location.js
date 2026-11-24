// 位置快照：URL hash 里放紧凑信息（可复制、刷新后仍在），
// 完整目标对象（含 zip 条目列表）放在 history.state，避免 URL 过长。
const PREFIX = '#!';

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeLocation(snapshot) {
  return `${PREFIX}${toBase64Url(JSON.stringify({ v: 1, ...snapshot }))}`;
}

export function decodeLocation(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)));
    if (!data || data.v !== 1 || !data.t || typeof data.t.k !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

export function compactTarget(target) {
  if (!target || target.kind === 'drives') return { k: 'drives' };
  if (target.kind === 'tags') {
    return {
      k: 'tags',
      s: Array.isArray(target.tags) ? target.tags.slice(0, 24) : [],
      m: target.mode === 'or' ? 'or' : 'and',
    };
  }
  if (target.kind === 'hd') return { k: 'hd', p: target.path || '' };
  if (target.kind === 'ufs') return { k: 'ufs', p: target.path || '/ufs' };
  if (target.kind === 'dir') return { k: 'dir', p: target.path };
  if (target.kind === 'preview') {
    return { k: 'preview', p: target.path, d: target.dir, u: target.url };
  }
  if (target.kind === 'zip') {
    return {
      k: 'zip',
      i: target.id,
      p: target.zipPath,
      d: target.zipDir,
      n: target.zipName,
      c: target.current,
    };
  }
  return { k: 'drives' };
}

function isPosix() {
  return typeof window !== 'undefined' && Boolean(window.ZB && window.ZB.posix);
}

export function winBasename(abs) {
  const value = String(abs || '').replace(/[\\/]+$/, '');
  if (!value || value === '/') return '';
  const parts = value.split(isPosix() ? '/' : /[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || value;
}

export function winDirname(abs) {
  const value = String(abs || '');
  if (isPosix()) {
    const clean = value.replace(/\/+$/, '');
    if (!clean || clean === '/') return '/';
    const index = clean.lastIndexOf('/');
    return index <= 0 ? '/' : clean.slice(0, index);
  }
  const index = value.lastIndexOf('\\');
  if (index <= 2) return value.slice(0, 3);
  return value.slice(0, index);
}

// 从 URL 快照重建本地目录 / 预览目标；zip 需要额外的服务端会话，由调用方处理。
export function localTargetFromCompact(snap) {
  if (!snap) return { kind: 'drives' };
  if (snap.k === 'tags') {
    return {
      kind: 'tags',
      tags: Array.isArray(snap.s) ? snap.s.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 24) : [],
      mode: snap.m === 'or' ? 'or' : 'and',
    };
  }
  if (snap.k === 'hd') return { kind: 'hd', path: snap.p || '' };
  if (snap.k === 'ufs') return { kind: 'ufs', path: snap.p || '/ufs' };
  if (snap.k === 'dir' && typeof snap.p === 'string' && snap.p) {
    return { kind: 'dir', path: snap.p };
  }
  if (snap.k === 'preview' && typeof snap.p === 'string' && snap.p) {
    return {
      kind: 'preview',
      scope: 'local',
      path: snap.p,
      dir: snap.d || winDirname(snap.p),
      label: winBasename(snap.p),
      url: snap.u || null,
    };
  }
  return { kind: 'drives' };
}

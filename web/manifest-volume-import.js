// 从 zen-fs-config 同步组里的 dir-struct-gen v2 清单读取「磁盘/卷」信息，
// 让用户勾选后在本机创建对应的 drive-cache 条目（cached/<volumeId>-n/ + data/）。
//
// 数据源：复用 manifest-sync 已连接的同步组 fs（与写出侧同一连接，不重复建 configurator）。
// struct/ 下文件形态（见 dir-struct-manifest-format.md v2）：
//   - 含 mounts 数组 → 主机索引 { source, mounts:[{ volumeId, files:[分片基名] }] }
//   - 含 volumeId + children → 卷分片根，带 fileCount/totalSize/sources/part
//   - 含 root → legacy v1（本模块只取 v2 卷，v1 单树忽略）
// 同一 volumeId 的多份分片按时间合并统计字段，结果确定；已在本机建过 Cache 的卷会被标记。
//
// 解析函数是纯函数（给定 docs 数组即可），便于单测；UI 层只负责取数、渲染与提交。

import { getConnectedFs } from './manifest-sync.js';

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function text(value, max = 200) {
  if (value === null || value === undefined) return null;
  const out = String(value).trim().slice(0, max);
  return out || null;
}

/** RemoteStorage 安全名（与 dir-struct-gen sanitizeKey 同口径）。 */
export function sanitizeKey(value) {
  return String(value || '').replace(/[^A-Za-z0-9._-]/g, '_');
}

function baseOf(name) {
  return String(name || '').replace(/\.json$/i, '');
}

function mountShardBases(mount) {
  const fromFiles = Array.isArray(mount.files)
    ? mount.files
      .map((f) => (typeof f === 'string' ? f : f && typeof f === 'object' ? f.file : null))
      .filter((b) => typeof b === 'string' && !!b)
    : [];
  const bases = fromFiles.length
    ? fromFiles
    : typeof mount.file === 'string' && mount.file ? [mount.file] : [];
  return [...new Set(bases.map(baseOf))].sort((a, b) => a.localeCompare(b));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * 纯解析：把 struct/ 下读到的 [{ base, raw }] 合并成卷列表。
 * 每项：{ volumeId, drive, sourceHost, fileCount, totalSize, hasChildren, shardBases, sources }
 * 去重按 volumeId（安全化后作目录名前缀），统计字段取各分片最大值，来源主机并集。
 */
export function collectVolumes(docs) {
  const shardByBase = new Map();
  const hostIndexes = [];
  for (const { base, raw } of Array.isArray(docs) ? docs : []) {
    if (!raw || typeof raw !== 'object') continue;
    if (Array.isArray(raw.mounts)) {
      hostIndexes.push(raw);
    } else if ('volumeId' in raw && Array.isArray(raw.children)) {
      shardByBase.set(base, raw);
    }
    // 含 root 的 legacy v1 不参与（本模块只导入 v2 卷）。
  }

  const volumes = new Map();
  const ensure = (volumeId) => {
    const vid = String(volumeId || '');
    if (!vid) return null;
    if (!volumes.has(vid)) {
      volumes.set(vid, {
        volumeId: vid,
        drive: null,
        sourceHost: null,
        fileCount: 0,
        totalSize: 0,
        hasChildren: false,
        shardBases: [],
        sources: [],
      });
    }
    return volumes.get(vid);
  };

  for (const index of hostIndexes) {
    const source = text(index.source, 100) || '';
    for (const mount of Array.isArray(index.mounts) ? index.mounts : []) {
      if (!mount || typeof mount !== 'object') continue;
      const bases = mountShardBases(mount);
      const vid = text(mount.volumeId, 200);
      const entry = ensure(vid || (bases[0] && text(shardByBase.get(bases[0])?.volumeId, 200)));
      if (!entry) continue;
      const letter = text(mount.letter, 20);
      if (letter && !entry.drive) entry.drive = letter;
      if (source) entry.sources.push(source);
      entry.shardBases.push(...bases);
      for (const base of bases) {
        const shard = shardByBase.get(base);
        if (!shard) continue;
        const shardVid = text(shard.volumeId, 200);
        if (shardVid && !entry.volumeId) ensure(shardVid);
        if (Array.isArray(shard.sources)) {
          for (const s of shard.sources) {
            const host = text(s, 100);
            if (host && !entry.sources.includes(host)) entry.sources.push(host);
          }
        }
        entry.fileCount = Math.max(entry.fileCount, toNumber(shard.fileCount));
        entry.totalSize = Math.max(entry.totalSize, toNumber(shard.totalSize));
        if (shard.sizePartial === true) entry.sizePartial = true;
        const rootName = text(shard.name, 100);
        if (rootName && !entry.drive && /^[A-Za-z]:$|^\/$/.test(rootName)) entry.drive = rootName;
        if (Array.isArray(shard.children) && shard.children.length) entry.hasChildren = true;
      }
    }
  }

  // 未被主机索引引用的分片：按 volumeId 归组，作为「未索引卷」也导入（不丢数据）。
  const referenced = new Set();
  for (const vol of volumes.values()) for (const base of vol.shardBases) referenced.add(base);
  for (const [base, shard] of shardByBase) {
    if (referenced.has(base)) continue;
    const vid = text(shard.volumeId, 200);
    if (!vid) continue;
    const entry = ensure(vid);
    entry.shardBases.push(base);
    entry.fileCount = Math.max(entry.fileCount, toNumber(shard.fileCount));
    entry.totalSize = Math.max(entry.totalSize, toNumber(shard.totalSize));
    const rootName = text(shard.name, 100);
    if (rootName && !entry.drive && /^[A-Za-z]:$|^\/$/.test(rootName)) entry.drive = rootName;
    if (Array.isArray(shard.sources)) {
      for (const s of shard.sources) {
        const host = text(s, 100);
        if (host && !entry.sources.includes(host)) entry.sources.push(host);
      }
    }
    if (Array.isArray(shard.children) && shard.children.length) entry.hasChildren = true;
  }

  const out = [];
  for (const vol of volumes.values()) {
    vol.shardBases = [...new Set(vol.shardBases)].sort((a, b) => a.localeCompare(b));
    vol.sources = [...new Set(vol.sources)];
    vol.sourceHost = vol.sources.join(' / ') || null;
    vol.backend = sanitizeKey(vol.volumeId);
    if (!vol.backend) continue;
    out.push(vol);
  }
  const byKey = (a, b) => String(a.volumeId).localeCompare(String(b.volumeId), 'en');
  out.sort(byKey);
  return out;
}

/** 人类可读体积。 */
export function formatBytes(n) {
  const value = toNumber(n);
  if (!value) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  let x = value;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i += 1; }
  return `${x >= 10 || i === 0 || Number.isInteger(x) ? Math.round(x) : x.toFixed(1)} ${units[i]}`;
}

let ready = false;
let apiFetch = null;
let statusFn = null;
let currentVolumes = [];
let existingEntries = [];

function setStatus(text, ok = null) {
  const el = $('mvStatus');
  if (!el) return;
  el.textContent = text;
  el.dataset.state = ok === true ? 'ok' : ok === false ? 'bad' : 'idle';
}

function setError(text) {
  const el = $('mvError');
  if (el) el.textContent = text || '';
}

function renderList() {
  const host = $('mvList');
  if (!host) return;
  if (!currentVolumes.length) {
    host.innerHTML = '<div class="dc-empty">没有读到 v2 卷清单。请确认同步组已连接且 struct/ 下有主机索引与卷分片。</div>';
    return;
  }
  host.innerHTML = currentVolumes.map((vol, i) => {
    const existing = existingEntries.find((e) => e.volumeId === vol.volumeId
      || e.backend === vol.backend);
    const checked = existing ? '' : 'checked';
    const badge = existing
      ? `<span class="mv-existing">已创建 ${esc(existing.dir)}</span>`
      : '';
    const drive = vol.drive ? ` · <span class="mv-drive">${esc(vol.drive)}</span>` : '';
    const meta = [
      vol.sourceHost ? `来源 ${esc(vol.sourceHost)}` : null,
      vol.fileCount ? `${Number(vol.fileCount).toLocaleString('en-US')} 项` : null,
      vol.totalSize ? formatBytes(vol.totalSize) : null,
      vol.hasChildren ? '含目录' : null,
      vol.sizePartial ? '体积为下界' : null,
    ].filter(Boolean).join(' · ');
    return `<label class="mv-item${existing ? ' mv-item-done' : ''}">
      <input type="checkbox" class="mv-check" data-index="${i}" ${checked} ${existing ? 'disabled' : ''}>
      <span class="mv-item-body">
        <span class="mv-item-title"><code>${esc(vol.volumeId)}</code>${drive}${badge}</span>
        <span class="mv-item-meta">${meta || '（清单未提供统计字段）'}</span>
      </span>
    </label>`;
  }).join('');
}

async function loadVolumes() {
  if (!ready || !apiFetch) {
    setError('本机 API 不可用：网盘缓存功能需要 zip-browser 本地服务');
    setStatus('读取失败', false);
    return;
  }
  setError('');
  setStatus('正在读取同步组清单…');
  try {
    const connected = getConnectedFs();
    if (!connected) {
      throw new Error('同步组未连接：请先在「同步收藏」面板配置并连接一个含远端后端的组');
    }
    const { fp, pathFor } = connected;
    let names = [];
    try {
      names = await fp.readdir(pathFor('struct'));
    } catch (err) {
      throw new Error(`读取 struct/ 失败：${err?.message || err}`);
    }
    const jsonNames = (Array.isArray(names) ? names : [])
      .map(String)
      .filter((n) => /\.json$/i.test(n));
    const docs = [];
    for (const name of jsonNames) {
      try {
        const raw = JSON.parse(await fp.readFile(pathFor(`struct/${name}`), 'utf8'));
        if (raw && typeof raw === 'object') docs.push({ base: baseOf(name), raw });
      } catch {
        // 单个清单文件解析失败跳过，不影响其它卷。
      }
    }
    currentVolumes = collectVolumes(docs);
    const cache = await apiFetch('/api/drive-cache/info');
    existingEntries = Array.isArray(cache?.entries) ? cache.entries : [];
    renderList();
    setStatus(`读到 ${currentVolumes.length} 块卷 · 已创建 ${existingEntries.length} 条缓存`, true);
  } catch (err) {
    currentVolumes = [];
    renderList();
    setError(err?.message || String(err));
    setStatus('读取失败', false);
  }
}

async function createSelected() {
  if (!ready || !apiFetch) {
    setError('本机 API 不可用');
    return;
  }
  const checks = Array.from(document.querySelectorAll('.mv-check:checked:not(:disabled)'));
  if (!checks.length) {
    setError('请先勾选要创建的卷');
    return;
  }
  setError('');
  const btn = $('mvCreate');
  if (btn) btn.disabled = true;
  let created = 0;
  let failed = 0;
  try {
    for (const check of checks) {
      const vol = currentVolumes[Number(check.getAttribute('data-index'))];
      if (!vol) continue;
      const payload = {
        backend: vol.backend,
        volumeId: vol.volumeId,
        drive: vol.drive,
        sourceHost: vol.sourceHost,
        fileCount: vol.fileCount ? String(vol.fileCount) : null,
        totalSize: vol.totalSize ? String(vol.totalSize) : null,
        hasChildren: vol.hasChildren ? 'true' : null,
        label: vol.drive ? `${vol.drive} ${vol.volumeId}` : vol.volumeId,
        total: vol.totalSize ? formatBytes(vol.totalSize) : null,
      };
      try {
        await apiFetch('/api/drive-cache/save', { method: 'POST', body: JSON.stringify(payload) });
        created += 1;
      } catch (err) {
        failed += 1;
        console.warn('[manifest-volume-import] 创建失败:', vol.volumeId, err);
      }
    }
    window.dispatchEvent(new CustomEvent('zb:drive-cache-change'));
    await loadVolumes();
    setError(failed ? `已创建 ${created} 块，失败 ${failed} 块（详见控制台）` : '');
    setStatus(`已创建 ${created} 块磁盘 Cache · 已同步到 zen-fs-config`, true);
    if (statusFn) statusFn(`已从清单创建 ${created} 块磁盘缓存`, failed > 0);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function openModal() {
  const modal = $('importVolModal');
  if (modal) modal.classList.remove('hidden');
  setError('');
  currentVolumes = [];
  existingEntries = [];
  renderList();
  void loadVolumes();
}

function closeModal() {
  const modal = $('importVolModal');
  if (modal) modal.classList.add('hidden');
}

export function initManifestVolumeImport({ api, status } = {}) {
  apiFetch = typeof api === 'function' ? api : null;
  statusFn = typeof status === 'function' ? status : null;
  $('importVolBtn')?.addEventListener('click', openModal);
  $('mvClose')?.addEventListener('click', closeModal);
  $('mvRefresh')?.addEventListener('click', () => void loadVolumes());
  $('mvCreate')?.addEventListener('click', () => void createSelected());
  $('importVolModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'importVolModal') closeModal();
  });
  ready = Boolean(apiFetch);
  return { ok: true, open: openModal };
}

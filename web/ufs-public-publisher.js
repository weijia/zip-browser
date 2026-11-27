// UFS public 标签文件 → public_target 网盘中转站的发布流程。
// 只由显式按钮/命令触发；模块内没有定时器、没有后台轮询。

import {
  listBundleYears,
  listBundles,
  readBundle,
} from './ufs-store.js';
import { getConnectedFs, fetchLocalHostInfo } from './manifest-sync.js';
import {
  listShards,
  appendShard,
  readUfsTags,
  readNetDriveTags,
  setNetDriveTag,
  ufsTagKey,
  safeKey,
  stamp,
} from './tags-sharded.js';

const BASE = String(window.ZB_HOST?.basePath || '').replace(/\/+$/, '');
const AUTH_MODE = window.ZB_HOST?.auth === 'bearer';
const PUBLIC_TAG = 'public';
const TARGET_TAG = 'public_target';

function apiUrl(url) {
  const value = String(url || '');
  if (/^https?:/i.test(value)) return value;
  if (value.startsWith('/') && BASE && !value.startsWith(`${BASE}/`)) return `${BASE}${value}`;
  return value;
}

function authHeaders() {
  if (!AUTH_MODE) return { 'X-Local-Token': window.__LOCAL_TOKEN__ || '' };
  const token = localStorage.getItem('zb-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(url, options = {}) {
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(apiUrl(url), {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `请求失败 ${response.status}`);
  return data;
}

function winJoin(root, rel) {
  const parts = String(rel || '').split('/').filter((part) => part && part !== '.' && part !== '..');
  if (!parts.length) return root;
  return `${String(root || '').replace(/[\\/]+$/, '')}\\${parts.join('\\')}`;
}

/** 建立 volumeId → 本机盘符的反向映射；只依赖运行时 hostInfo。 */
async function volumeLetters() {
  const info = await fetchLocalHostInfo().catch(() => null);
  const map = new Map();
  for (const [letter, volumeId] of Object.entries(info?.volumes || {})) {
    if (volumeId) map.set(String(volumeId), String(letter).replace(/:$/, '').toUpperCase());
  }
  return map;
}

/** UFS 节点 → 本机绝对路径；无法解析时返回 null（不猜盘符）。 */
function resolveSource(source, nodeRel, letters) {
  const kind = String(source?.kind || '');
  if (kind === 'zip') return null;
  if (kind === 'volume') {
    const letter = letters.get(String(source.volumeId || ''));
    if (!letter) return null;
    return winJoin(`${letter}:\\`, `${source.rel || ''}/${nodeRel || ''}`);
  }
  if (kind === 'local' && source.path) return winJoin(source.path, nodeRel);
  return null;
}

function isTagged(tags, nodeRel) {
  if (!tags.length) return false;
  if (tags.includes('')) return true;
  if (tags.includes(nodeRel)) return true;
  return tags.some((tagged) => tagged && nodeRel.startsWith(`${tagged}/`));
}

async function hashIfNeeded(node, localPath) {
  if (node.hash) return node.hash;
  const data = await api('/api/ufs/hash', {
    method: 'POST',
    body: JSON.stringify({ path: localPath }),
  }).catch(() => null);
  return data?.hash || null;
}

/** 读发布状态：跨所有 runId 目录枚举，按片名排序，取每个 key 最近一次非 failed 记录。 */
async function latestPublished(connected) {
  const base = 'ufs-public-state';
  const runs = (await connected.fp.readdir(connected.pathFor(base)).catch(() => [])).map(String);
  const shards = [];
  for (const run of runs) {
    for (const shard of await listShards(connected, `${base}/${safeKey(run)}`)) shards.push(shard);
  }
  shards.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  const latest = new Map();
  for (const shard of shards) {
    for (const [key, value] of Object.entries(shard.doc?.results || {})) {
      if (value?.action && value.action !== 'failed') latest.set(key, value);
    }
  }
  return latest;
}

/** 预检：收集候选与目标，不写任何文件。 */
export async function preparePublish() {
  const connected = getConnectedFs();
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');

  const fs = connected.fp;
  const years = await listBundleYears(fs);
  const letters = await volumeLetters();

  // 目标：所有打 public_target 的网盘登记（大小写敏感）。
  const driveData = await api('/api/drives').catch(() => ({ networkDrives: [] }));
  const targets = [];
  for (const entry of driveData.networkDrives || []) {
    const dir = String(entry?.dir || '');
    if (!dir) continue;
    const tags = await readNetDriveTags(connected, dir);
    if (tags.has(TARGET_TAG)) targets.push({ dir, name: entry.name || dir });
  }

  const files = [];
  const skipped = { zip: 0, legacy: years.reduce((n, row) => n + Number(row.legacy || 0), 0), noSource: 0 };
  const errors = [];
  for (const row of years) {
    const { bundles } = await listBundles(fs, String(row.year));
    for (const bundle of bundles) {
      const bundleId = String(bundle.id || '');
      if (!bundleId) continue;
      const tags = await readUfsTags(connected, bundleId);
      const tagged = [...tags.entries()].filter(([, list]) => list.includes(PUBLIC_TAG)).map(([rel]) => rel);
      if (!tagged.length) continue;
      const { nodes } = await readBundle(fs, bundle.bundlePath);
      for (const node of nodes) {
        if (node.type !== 'file') continue;
        if (String(bundle.source?.kind || '') === 'zip') { skipped.zip += 1; continue; }
        if (!isTagged(tagged, node.rel)) continue;
        const localPath = resolveSource(bundle.source, node.rel, letters);
        if (!localPath) { skipped.noSource += 1; continue; }
        files.push({
          bundleId,
          year: String(row.year),
          rel: node.rel,
          bundleKey: ufsTagKey(bundleId),
          localPath,
          size: Number(node.size) || 0,
          mtime: Number(node.mtime) || 0,
          hash: node.hash || null,
        });
      }
    }
  }

  return { connected, targets, files, skipped, errors, years: years.length };
}

function buildDestRel(file) {
  return `${file.year}/${file.bundleKey}/${file.rel.split('/').filter(Boolean).join('/')}`;
}

/** 执行：逐目标 × 逐文件，失败隔离；追加一片发布状态。 */
export async function executePublish(plan, options = {}) {
  const { connected, targets, files } = plan;
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');
  if (!targets.length) return { ok: false, reason: 'no-target', results: [] };

  // 先补齐 hash（没 hash 的节点发布前算一次），失败的文件单独记失败。
  const prepared = [];
  for (const file of files) {
    try {
      const hash = await hashIfNeeded(file, file.localPath);
      prepared.push({ ...file, hash });
    } catch (err) {
      prepared.push({ ...file, hash: null, error: String(err?.message || err) });
    }
  }

  const prior = await latestPublished(connected);
  const results = [];
  const now = Date.now();
  const host = String(window.ZB_HOST?.host || 'pc');

  for (const target of targets) {
    const payload = [];
    const destByKey = new Map();
    for (const file of prepared) {
      const key = `${file.bundleId}|${file.rel}|${target.dir}`;
      const destRel = buildDestRel(file);
      destByKey.set(key, destRel);
      if (file.error) {
        results.push({ key, action: 'failed', reason: file.error });
        continue;
      }
      const old = prior.get(key);
      if (old && old.hash === file.hash && old.size === file.size && old.mtime === file.mtime) {
        results.push({ key, action: 'skipped', destRel });
        continue;
      }
      payload.push({
        source: file.localPath,
        bundleId: file.bundleId,
        year: file.year,
        rel: file.rel,
        destRel,
        hash: file.hash,
        skipIfUnchanged: true,
      });
    }
    if (!payload.length) continue;
    const data = await api('/api/ufs/publish', {
      method: 'POST',
      body: JSON.stringify({ target: target.dir, files: payload }),
    }).catch((err) => ({ target: target.dir, results: payload.map((item) => ({
      key: `${item.bundleId}|${item.rel}|${target.dir}`,
      action: 'failed',
      reason: String(err?.message || err),
    })) }));
    for (const item of data.results || []) {
      results.push({ ...item, destRel: destByKey.get(item.key) || '' });
    }
  }

  const runId = stamp(now);
  const out = {
    version: 1,
    at: now,
    host,
    targets: targets.map((target) => target.dir),
    results: Object.fromEntries(results.map((item) => [item.key, item])),
  };
  await appendShard(connected, `ufs-public-state/${safeKey(runId)}`, 'publish', out, { at: now, host });
  return { ok: true, runId, results, targets: targets.map((target) => target.dir) };
}

/** 命令入口：预检 → 确认 → 执行。UI 按钮也走这里，保证逻辑同源。 */
export async function runPublicPublish(options = {}) {
  const plan = await preparePublish();
  const summary = {
    targets: plan.targets,
    files: plan.files.length,
    skipped: plan.skipped,
    years: plan.years,
  };
  if (!plan.targets.length) return { ok: false, reason: 'no-target', summary };
  if (!plan.files.length) return { ok: false, reason: 'no-files', summary };
  if (!options.autoConfirm) {
    const lines = [
      `将发布 ${plan.files.length} 个文件到 ${plan.targets.length} 个网盘：${plan.targets.map((t) => t.name).join('、')}。`,
      `跳过：zip 源 ${plan.skipped.zip} 个、旧分片 ${plan.skipped.legacy} 个、源不可用 ${plan.skipped.noSource} 个。`,
      '确认继续？',
    ];
    if (typeof window !== 'undefined' && !window.confirm(lines.join('\n'))) return { ok: false, reason: 'cancelled', summary };
  }
  const result = await executePublish(plan, options);
  return { ...result, summary };
}

/** 网盘标签入口：给登记条目打/取消 public_target。 */
export async function setPublicTarget(dir, enabled) {
  const connected = getConnectedFs();
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');
  return setNetDriveTag(connected, dir, TARGET_TAG, enabled, {
    host: String(window.ZB_HOST?.host || 'pc'),
  });
}

export function installPublisherCommand() {
  const zb = window.ZB || (window.ZB = {});
  zb.runPublicPublish = runPublicPublish;
  zb.setPublicTarget = setPublicTarget;
}

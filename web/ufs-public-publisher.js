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

// 模块可能被 Node 测试直接导入，顶层不假设 window 存在。
const ZB_HOST = (typeof window !== 'undefined' && window.ZB_HOST) || {};
const BASE = String(ZB_HOST.basePath || '').replace(/\/+$/, '');
const AUTH_MODE = ZB_HOST.auth === 'bearer';
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

/** 预检：收集候选与目标，不写任何文件。 */
export async function preparePublish() {
  const connected = getConnectedFs();
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');

  const fs = connected.fp;
  const years = await listBundleYears(fs);
  const letters = await volumeLetters();

  // 目标：所有打 public_target 的网盘登记（大小写敏感）。
  // 读取失败必须留痕，不能静默变成「没有目标网盘」。
  const errors = [];
  let driveData = { networkDrives: [] };
  try {
    driveData = await api('/api/drives');
  } catch (err) {
    errors.push({ stage: 'drives', message: String(err?.message || err) });
  }
  const targets = [];
  for (const entry of driveData.networkDrives || []) {
    const dir = String(entry?.dir || '');
    if (!dir) continue;
    const tags = await readNetDriveTags(connected, dir);
    if (tags.has(TARGET_TAG)) targets.push({ dir, name: entry.name || dir });
  }

  const files = [];
  const skipped = { zip: 0, legacy: years.reduce((n, row) => n + Number(row.legacy || 0), 0), noSource: 0 };
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

/** 预检失败也写一片状态，让发布历史能看到失败尝试与原因。 */
async function appendPreflightFailure(connected, reason, summary) {
  const now = Date.now();
  const runId = stamp(now);
  const host = typeof window !== 'undefined' ? String(window.ZB_HOST?.host || 'pc') : 'pc';
  await appendShard(connected, `ufs-public-state/${safeKey(runId)}`, 'publish', {
    version: 1,
    at: now,
    host,
    targets: (summary?.targets || []).map((target) => target.dir),
    results: {},
    preflight: { reason, summary },
  }, { at: now, host });
  return runId;
}

/** 执行：逐目标 × 逐文件，失败隔离；追加一片发布状态。 */
export async function executePublish(plan, options = {}) {
  const { connected, targets, files } = plan;
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');
  if (!targets.length) return { ok: false, reason: 'no-target', results: [] };

  // 服务重启会清空内存白名单，UFS 快照里的源路径会全部变成「本次会话未打开」。
  // 点发布是用户显式授权：先把真实存在的源路径批量放行，不存在的逐条记失败。
  const unauthorized = new Map();
  const sourcePaths = [...new Set(files.map((file) => file.localPath).filter(Boolean))];
  if (sourcePaths.length) {
    const auth = await api('/api/fs/allow', {
      method: 'POST',
      body: JSON.stringify({ paths: sourcePaths }),
    }).catch((err) => ({
      results: sourcePaths.map((p) => ({ path: p, ok: false, reason: String(err?.message || err) })),
    }));
    for (const item of auth.results || []) {
      if (!item?.ok) unauthorized.set(String(item?.path || '').toLowerCase(), String(item?.reason || '授权失败'));
    }
  }

  // 先补齐 hash（没 hash 的节点发布前算一次），失败的文件单独记失败。
  const prepared = [];
  for (const file of files) {
    const denied = unauthorized.get(String(file.localPath || '').toLowerCase());
    if (denied) {
      prepared.push({ ...file, hash: null, error: `源路径不可访问：${denied}` });
      continue;
    }
    try {
      const hash = await hashIfNeeded(file, file.localPath);
      prepared.push({ ...file, hash });
    } catch (err) {
      prepared.push({ ...file, hash: null, error: String(err?.message || err) });
    }
  }

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
      // 幂等完全交给服务端：状态片只作审计，不能凭它跳过——目标文件可能已被删/覆盖。
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
  if (!plan.targets.length || !plan.files.length) {
    let reason;
    if (!plan.targets.length) {
      const driveError = (plan.errors || []).find((item) => item.stage === 'drives');
      reason = driveError
        ? `没有目标网盘：读取网盘登记失败（${driveError.message}）`
        : '没有目标网盘：请先给网盘登记打上 public_target 标签';
    } else {
      const parts = [];
      if (plan.skipped.zip) parts.push(`zip 源 ${plan.skipped.zip} 个暂不支持`);
      if (plan.skipped.legacy) parts.push(`旧分片 ${plan.skipped.legacy} 个`);
      if (plan.skipped.noSource) parts.push(`源路径解析不出 ${plan.skipped.noSource} 个`);
      reason = `没有可发布文件${parts.length ? `（${parts.join('、')}）` : '：请先给 UFS 节点打上 public 标签'}`;
    }
    let runId = null;
    try {
      runId = await appendPreflightFailure(plan.connected, reason, summary);
    } catch {
      // 历史写入失败不能挡住用户看到原因；状态栏仍然显示。
    }
    return { ok: false, reason, summary, runId };
  }
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

/**
 * 读发布历史：跨所有 runId 与年目录枚举状态片，按片名升序返回每次运行。
 * 状态片只追加不覆盖，因此这里读到的是完整历史；计数中的「成功」= linked + copied。
 */
export async function readPublishHistory(connected = getConnectedFs()) {
  if (!connected?.fp) throw new Error('数据同步组尚未就绪');
  const base = 'ufs-public-state';
  const runs = (await connected.fp.readdir(connected.pathFor(base)).catch(() => [])).map(String);
  const shards = [];
  for (const run of runs) {
    for (const shard of await listShards(connected, `${base}/${safeKey(run)}`)) {
      shards.push({ run, ...shard });
    }
  }
  shards.sort((a, b) => a.path.localeCompare(b.path) || a.run.localeCompare(b.run));
  return shards.map(({ run, path, doc }) => {
    const source = doc?.results && typeof doc.results === 'object' ? doc.results : {};
    const values = Object.values(source);
    const count = (action) => values.filter((item) => item?.action === action).length;
    return {
      run,
      shard: path,
      at: Number(doc?.at) || 0,
      host: typeof doc?.host === 'string' ? doc.host : '',
      targets: Array.isArray(doc?.targets) ? doc.targets.map(String) : [],
      counts: {
        total: values.length,
        linked: count('linked'),
        copied: count('copied'),
        skipped: count('skipped'),
        failed: count('failed'),
      },
      results: source,
      preflight: doc?.preflight && typeof doc.preflight === 'object'
        ? { reason: String(doc.preflight.reason || ''), summary: doc.preflight.summary || null }
        : null,
    };
  });
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

// 物理扫描树 → dir-struct v2 的「扫描分片 + 统一主机索引」。
// 纯函数，不依赖 DOM。与 manifest-export.js 的书签分片互补：
//   struct/<volumeKey>.<createdAt>.json                    扫描分片（时间戳累积）
//   struct/zip-browser.<host>.<volumeKey>.bookmarks.json  书签分片（固定名覆盖，由 buildV2Export 生成）
//   struct/<host>.json                                    唯一主机索引（本文件生成）
//
// 读取侧按形态分类（含 mounts → 索引；含 volumeId+children → 分片），文件名不参与合并判定。

import {
  sanitizeKey, hostRelativePath, driveOfHostRelative,
  volumeIdOf, volumeKeyFor, shardBaseFor, FILE_PREFIX,
} from './manifest-export.js';

export const SCAN_GENERATOR = 'fluentos-dir-struct-gen';
export const BOOKMARK_SUFFIX = 'bookmarks';

/** 书签固定分片基名：在已有 shardBaseFor 后加 .bookmarks，避免与扫描分片混淆。 */
export function bookmarkShardBase(host, volumeKey) {
  return `${shardBaseFor(host, volumeKey)}.${BOOKMARK_SUFFIX}`;
}

/** 扫描分片基名：<volumeKey>.<createdAt>，每次生成都不同 → 累积历史快照。 */
export function scanShardBase(volumeKey, now) {
  return `${sanitizeKey(volumeKey)}.${Number(now)}`;
}

function ensureFolder(children, name, now) {
  let node = children.find((item) => item.type === 'folder' && item.name === name);
  if (!node) {
    node = { name, type: 'folder', children: [], updatedAt: now };
    children.push(node);
  }
  if (!Array.isArray(node.children)) node.children = [];
  return node;
}

function convertNode(node, now) {
  const out = {
    name: node.name,
    type: 'folder',
    children: (node.children || []).map((child) => convertNode(child, now)),
    updatedAt: now,
  };
  if (Array.isArray(node.tags) && node.tags.length) out.tags = node.tags.slice();
  if (Number.isFinite(node.mtime)) out.mtime = node.mtime;
  if (Number.isFinite(node.fileCount)) out.fileCount = node.fileCount;
  if (Number.isFinite(node.totalSize)) out.totalSize = node.totalSize;
  if (Number.isFinite(node.totalSizeOnDisk)) out.totalSizeOnDisk = node.totalSizeOnDisk;
  if (node.sizePartial) out.sizePartial = true;
  return out;
}

function mergeInto(target, source, now) {
  if (Array.isArray(source.tags) && source.tags.length) {
    target.tags = [...new Set([...(target.tags || []), ...source.tags])];
  }
  for (const key of ['mtime', 'fileCount', 'totalSize', 'totalSizeOnDisk']) {
    if (Number.isFinite(source[key])) target[key] = Math.max(target[key] ?? 0, source[key]);
  }
  if (source.sizePartial) target.sizePartial = true;
  target.updatedAt = Math.max(target.updatedAt ?? 0, now);
  for (const child of source.children || []) {
    const existing = target.children.find((item) => item.type === 'folder' && item.name === child.name);
    if (existing) mergeInto(existing, child, now);
    else target.children.push(child);
  }
}

/**
 * 把 /api/mft/scan 的 roots 按卷分桶，补齐中间父节点，生成标准 v2 扫描分片。
 * @returns {{files:Array<{path,json,kind,volumeKey,base}>, volumes:Array}}
 */
export function buildScanShards({ scan = {}, host = 'pc', volumes = {}, now = Date.now(), revision = 1 } = {}) {
  const safeHost = String(host || 'pc').trim() || 'pc';
  const buckets = new Map();
  for (const root of Array.isArray(scan.roots) ? scan.roots : []) {
    const rel = hostRelativePath(root?.path);
    if (!rel) continue;
    const drive = driveOfHostRelative(rel);
    const volumeKey = volumeKeyFor(drive, safeHost, volumes);
    const volumeId = volumeIdOf(drive, volumes) || volumeKey;
    const bucket = buckets.get(volumeKey) || { volumeKey, volumeId, letter: drive || '', children: [] };
    const parts = rel.split('/').filter(Boolean).slice(1); // 第 0 段是盘符，对应分片根
    let level = bucket.children;
    let node = null;
    for (const part of parts) {
      node = ensureFolder(level, part, now);
      level = node.children;
    }
    if (node) mergeInto(node, convertNode(root, now), now);
    buckets.set(volumeKey, bucket);
  }
  const files = [];
  const volumeList = [];
  for (const bucket of buckets.values()) {
    const base = scanShardBase(bucket.volumeKey, now);
    const path = `struct/${base}.json`;
    const json = {
      generator: SCAN_GENERATOR,
      source: safeHost,
      volumeId: bucket.volumeId,
      name: bucket.letter || bucket.volumeKey,
      type: 'folder',
      part: { id: sanitizeKey(safeHost), revision, generatedAt: now },
      children: bucket.children,
      sources: [safeHost],
      generatedAt: now,
    };
    files.push({ path, json, kind: 'scan-shard', volumeKey: bucket.volumeKey, base });
    volumeList.push({ key: bucket.volumeKey, drive: bucket.letter, volumeId: bucket.volumeId });
  }
  return { files, volumes: volumeList };
}

/** 从远端已有的 struct/ 文件名里，按 <volumeKey>. 前缀收集分片基名。 */
export function collectRemoteShards(remoteNames, volumes) {
  const out = {};
  const names = Array.isArray(remoteNames) ? remoteNames : [];
  for (const volume of Array.isArray(volumes) ? volumes : []) {
    const prefix = `${sanitizeKey(volume.key || volume.volumeId || '')}.`;
    const found = names
      .map((name) => String(name).replace(/\.json$/i, ''))
      .filter((base) => base.startsWith(prefix) && /\.\d{10,}$/.test(base));
    out[volume.key || volume.volumeId] = [...new Set(found)].sort();
  }
  return out;
}

/**
 * 统一主机索引 struct/<host>.json。
 * mounts[].files 列全：dir-struct-gen 历史分片 + 本次扫描分片 + 书签固定分片 + 本工具旧扫描分片。
 */
export function buildHostIndex({
  host = 'pc', volumes = [], remoteShards = {}, scanShards = [],
  bookmarkBases = [], now = Date.now(),
} = {}) {
  const safeHost = String(host || 'pc').trim() || 'pc';
  const known = new Map();
  for (const item of volumes) {
    const key = item.key || item.volumeId;
    if (!key || known.has(key)) continue;
    known.set(key, { volumeId: item.volumeId || key, letter: item.letter || item.drive || '', key });
  }
  const extra = [
    ...scanShards.map((shard) => shard.volumeKey),
    ...bookmarkBases.map((entry) => entry.volumeKey),
    ...Object.keys(remoteShards),
  ];
  for (const key of extra) {
    if (!key || known.has(key)) continue;
    known.set(key, { volumeId: key, letter: '', key });
  }
  const mounts = [];
  for (const volume of known.values()) {
    const files = new Set(remoteShards[volume.key] || []);
    for (const shard of scanShards) {
      if (shard.volumeKey === volume.key) files.add(shard.base);
    }
    for (const entry of bookmarkBases) {
      if (entry.volumeKey === volume.key) files.add(entry.base);
    }
    if (!files.size) continue;
    mounts.push({
      volumeId: volume.volumeId,
      letter: volume.letter,
      files: [...files].sort(),
    });
  }
  mounts.sort((a, b) => String(a.volumeId).localeCompare(String(b.volumeId), 'zh-CN'));
  return {
    path: `struct/${sanitizeKey(safeHost)}.json`,
    json: {
      version: 2,
      generator: SCAN_GENERATOR,
      source: safeHost,
      generatedAt: now,
      mounts,
    },
    kind: 'host-index',
  };
}

/** 把 buildV2Export 生成的书签分片改名成固定 .bookmarks 基名。 */
export function renameBookmarkShards(files, host, volumes = {}) {
  const out = [];
  for (const file of Array.isArray(files) ? files : []) {
    if (file.kind !== 'shard') continue;
    const match = /^struct\/([^/]+)\.json$/.exec(file.path || '');
    if (!match) continue;
    const volumeKey = file.volumeKey || match[1].replace(`${FILE_PREFIX}.${sanitizeKey(host)}.`, '');
    const base = bookmarkShardBase(host, volumeKey);
    out.push({
      path: `struct/${base}.json`,
      json: { ...file.json, generator: FILE_PREFIX },
      kind: 'bookmark-shard',
      volumeKey,
      base,
    });
  }
  return out;
}

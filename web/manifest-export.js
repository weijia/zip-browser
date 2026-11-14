// 收藏（/annotations）→ 目录结构清单 v2 的纯函数转换层。
//
// 格式依据：my-data/docs/formats/dir-struct-manifest-format.md「v2：卷级拆分」一节。
//   struct/<host>.json        主机索引 { version:2, source, generatedAt, generator, mounts:[{volumeId,files}] }
//   struct/<分片基名>.json    卷分片   { volumeId, name, type:'folder', part, children, sources }
//   file-tags/<key>.json      用户标签 { tags: { "<host-relative>": [...] } }
//
// 约定（与 dir-struct-gen 对齐，但有意为本工具做的收窄）：
//   * 主机索引不叫 <host>.json —— 那是 dir-struct-gen 的索引，同名会覆盖它。
//     读取侧按「形态」分类（含 mounts 数组即主机索引），不依赖文件名。
//   * 分片用固定名覆盖写而非每次生成带时间戳的新文件：收藏是高频操作，
//     v2 的历史分片语义会让远端迅速堆积垃圾。文档明确「分片文件名不参与合并判定」，
//     所以自定义基名是合法的；分片内容仍是标准 v2 结构。
//     基名带主机名，多台机器写同一 volumeId 也不会互相覆盖。
//   * tags 绝不回写 struct（文档硬性要求），只落在 file-tags；
//     file-tags 的 key = 卷稳定身份 volumeId，回退 <host>::<盘符>。
//   * 本工具只读本地磁盘，不写 .dir-struct-id；volumeId 由 /api/hostinfo 只读探测。

export const GENERATOR = 'zip-browser';
export const MANIFEST_BASE = 'app_data/folders';
export const BOOKMARK_TAG = '书签';
export const ZIP_BOOKMARK_TAG = 'zip-bookmark';
export const FILE_PREFIX = 'zip-browser';

const RESERVED_TAGS = new Set([BOOKMARK_TAG, ZIP_BOOKMARK_TAG]);
const LOCAL_BACKEND_TYPES = new Set(['InMemory', 'IndexedDB']);

/** RemoteStorage / Gitee 等文件名安全键，与 dir-struct-gen sanitizeKey 同规则。 */
export function sanitizeKey(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9._-]/g, '_');
}

/** 本机绝对路径 → host-relative（盘符 + / 分隔，保留原始大小写）。 */
export function hostRelativePath(abs) {
  if (typeof abs !== 'string' || !abs.trim()) return null;
  const text = abs.trim().replace(/\//g, '\\').replace(/\\+/g, '\\');
  const match = /^([A-Za-z]):\\?(.*)$/.exec(text);
  if (!match) return null;
  const tail = match[2].replace(/\\+$/, '').replace(/\\/g, '/');
  return `${match[1].toUpperCase()}:${tail ? `/${tail}` : ''}`;
}

/** host-relative 路径 → 盘符（如 'C:'）；伪路径返回 null。 */
export function driveOfHostRelative(rel) {
  const match = /^([A-Za-z]):/.exec(String(rel || ''));
  return match ? `${match[1].toUpperCase()}:` : null;
}

/** 清理包内目录段：反斜杠归一、去掉 . / .. 越界。 */
export function normalizeEntry(entry) {
  return String(entry || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

/** 卷稳定身份：优先 /api/hostinfo 读到的 volumeId，否则回退 <host>::<盘符>。 */
export function volumeIdOf(drive, volumes = {}) {
  const letter = String(drive || '').charAt(0).toUpperCase();
  const value = volumes?.[letter] ?? volumes?.[drive];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function volumeKeyFor(drive, host, volumes = {}) {
  return volumeIdOf(drive, volumes) || `${host}::${drive || 'zip'}`;
}

export function hostIndexFile(host) {
  return `struct/${FILE_PREFIX}.${sanitizeKey(host)}.json`;
}

/** 分片基名（不含 .json）：zip-browser.<host>.<volumeKey>。 */
export function shardBaseFor(host, volumeKey) {
  return `${FILE_PREFIX}.${sanitizeKey(host)}.${sanitizeKey(volumeKey)}`;
}

export function tagFileFor(volumeKey) {
  return `file-tags/${sanitizeKey(volumeKey)}.json`;
}

/**
 * 由数据组后端推导清单落点前缀（与 dir-struct-gen 的 SyncDedup.manifestPlan 同规则）。
 *   RemoteStorage basePath=app_data/folders → 组根即基目录 → 写 /struct/...
 *   其它后端组根=仓库根                    → 写 /app_data/folders/struct/...
 * 推导不出唯一前缀时 ok=false，调用方必须中止，绝不猜一个位置降级写入。
 */
export function manifestPrefixFor(backends) {
  const remotes = (Array.isArray(backends) ? backends : [])
    .filter((b) => b && !LOCAL_BACKEND_TYPES.has(b.type));
  if (!remotes.length) {
    return { ok: false, prefix: null, types: [], reason: '数据组没有连上的远端后端（仅本地后端或后端尚未加载）' };
  }
  const prefixes = [];
  const types = [];
  for (const backend of remotes) {
    const base = backend.type === 'RemoteStorage'
      ? String(backend.options?.basePath ?? '').replace(/^\/+/, '').replace(/\/+$/, '')
      : '';
    let prefix;
    if (base === MANIFEST_BASE) prefix = '';
    else if (base === '') prefix = MANIFEST_BASE;
    else {
      return {
        ok: false, prefix: null, types,
        reason: `${backend.type} 的 basePath=${base}/ 无法对齐 ${MANIFEST_BASE}/struct`,
      };
    }
    prefixes.push(prefix);
    types.push(backend.type);
  }
  if (new Set(prefixes).size > 1) {
    return { ok: false, prefix: null, types, reason: '多个远端后端要求的路径前缀不一致，无法用同一个相对路径写入' };
  }
  return { ok: true, prefix: prefixes[0], types: [...new Set(types)], reason: '' };
}

/** 由一组 host-relative 目录路径搭出「仅文件夹」的 children 树。 */
export function buildFolderTree(rels, now) {
  const root = [];
  const sortLevel = (level) => {
    level.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    for (const node of level) sortLevel(node.children);
  };
  for (const rel of rels || []) {
    if (typeof rel !== 'string' || !rel) continue;
    const parts = rel.split('/').filter(Boolean).slice(1); // 丢掉盘符段
    let level = root;
    for (const part of parts) {
      let node = level.find((item) => item.name === part && item.type === 'folder');
      if (!node) {
        node = { name: part, type: 'folder', updatedAt: now, children: [] };
        level.push(node);
      }
      if (!Array.isArray(node.children)) node.children = [];
      level = node.children;
    }
  }
  sortLevel(root);
  return root;
}

/**
 * file-tags 合并：保留别的工具写的标签（并集），但先剔除本工具上一轮写入的保留标签
 * （书签 / zip-bookmark）再重新写入，这样「取消收藏」能传播到远端。
 */
export function mergeTagDoc(existingDoc, generated) {
  const out = {};
  const prev = existingDoc && typeof existingDoc === 'object'
    && existingDoc.tags && typeof existingDoc.tags === 'object'
    ? existingDoc.tags : {};
  for (const [path, list] of Object.entries(prev)) {
    if (typeof path !== 'string' || !Array.isArray(list)) continue;
    const kept = [...new Set(list.filter((tag) => typeof tag === 'string' && tag.trim() && !RESERVED_TAGS.has(tag)))];
    if (kept.length) out[path] = kept;
  }
  for (const [path, list] of Object.entries(generated || {})) {
    if (typeof path !== 'string' || !Array.isArray(list)) continue;
    const merged = [...new Set([
      ...(out[path] || []),
      ...list.filter((tag) => typeof tag === 'string' && tag.trim()),
    ])];
    if (merged.length) out[path] = merged;
  }
  return { tags: out };
}

/** 描述符 → { rel, drive }；zip 描述符用 file-tags 伪路径。 */
function descriptorTarget(desc) {
  if (!desc || typeof desc !== 'object') return null;
  if (desc.kind === 'dir') {
    const rel = hostRelativePath(desc.path);
    return rel ? { rel, drive: driveOfHostRelative(rel) } : null;
  }
  if (desc.kind === 'zip') {
    const zipRel = hostRelativePath(desc.zipPath || desc.path);
    if (!zipRel) return null;
    const entry = normalizeEntry(desc.entry);
    return {
      rel: `zip:${zipRel}${entry ? `#${entry}` : ''}`,
      drive: driveOfHostRelative(zipRel),
    };
  }
  return null;
}

function addTags(bucket, rel, tags) {
  if (!Array.isArray(tags)) return;
  const list = bucket.tags.get(rel) || new Set();
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.trim()) list.add(tag.trim());
  }
  bucket.tags.set(rel, list);
}

/**
 * 生成一次完整导出（全量状态重建，/annotations 仍是唯一事实源）。
 *
 * @param {object} options
 * @param {object} options.data        sanitizeData 后的收藏数据
 * @param {string} options.host        os.hostname()
 * @param {object} options.volumes     盘符字母 -> volumeId（可为 null）
 * @param {number} options.now         毫秒 epoch
 * @param {number} options.revision    分片 part.revision
 * @param {object} options.existing    相对路径 -> 已存在的远端 JSON（用于 file-tags 合并）
 * @param {Array}  options.knownVolumes 之前导出过的卷，保证清空收藏后不留孤儿分片
 * @returns {{files: Array<{path,kind,json}>, knownVolumes: Array, stats: object}}
 */
export function buildV2Export({
  data, host, volumes = {}, now = Date.now(), revision = 1,
  existing = {}, knownVolumes = [],
} = {}) {
  const safeHost = String(host || 'pc').trim() || 'pc';
  const source = `${safeHost} (${GENERATOR})`;
  const partId = sanitizeKey(safeHost);

  // volumeKey -> { key, drive, volumeId }；先放入历史卷，再补本轮出现的卷。
  const known = new Map();
  for (const item of Array.isArray(knownVolumes) ? knownVolumes : []) {
    if (!item || typeof item.key !== 'string') continue;
    known.set(item.key, {
      key: item.key,
      drive: typeof item.drive === 'string' ? item.drive : '',
      volumeId: typeof item.volumeId === 'string' ? item.volumeId : null,
    });
  }

  // drive -> 本轮的目录树路径与标签
  const buckets = new Map();
  function bucketForDrive(drive) {
    const key = drive || '';
    if (!buckets.has(key)) {
      const volumeId = volumeIdOf(key, volumes);
      const volumeKey = volumeId || `${safeHost}::${key || 'zip'}`;
      buckets.set(key, { drive: key, volumeId, volumeKey, rels: new Set(), tags: new Map() });
      if (!known.has(volumeKey)) {
        known.set(volumeKey, { key: volumeKey, drive: key, volumeId });
      }
    }
    return buckets.get(key);
  }

  // 1) 标签：dir 描述符进目录树，zip 描述符只进 file-tags 伪路径。
  for (const [key, list] of Object.entries(data?.tags || {})) {
    const target = descriptorTarget(data?.paths?.[key]);
    if (!target || !Array.isArray(list)) continue;
    const bucket = bucketForDrive(target.drive);
    if (data.paths[key].kind === 'dir') bucket.rels.add(target.rel);
    addTags(bucket, target.rel, list);
  }

  // 2) 书签：目录书签进树并打「书签」；zip 内书签只打「zip-bookmark」伪路径标签。
  for (const item of data?.bookmarks || []) {
    if (!item || (item.kind !== 'dir' && item.kind !== 'zip')) continue;
    const target = descriptorTarget(item.kind === 'zip'
      ? { kind: 'zip', zipPath: item.zipPath || item.path, entry: item.entry }
      : { kind: 'dir', path: item.path });
    if (!target) continue;
    const bucket = bucketForDrive(target.drive);
    if (item.kind === 'dir') {
      bucket.rels.add(target.rel);
      addTags(bucket, target.rel, [BOOKMARK_TAG]);
    } else {
      addTags(bucket, target.rel, [ZIP_BOOKMARK_TAG]);
    }
    addTags(bucket, target.rel, data?.tags?.[item.key]);
  }

  const allVolumes = [...known.values()].sort((a, b) => a.key.localeCompare(b.key));
  const files = [];
  const mounts = [];
  let tagEntryCount = 0;
  let folderCount = 0;

  for (const volume of allVolumes) {
    const bucket = [...buckets.values()].find((item) => item.volumeKey === volume.key);
    const children = buildFolderTree(bucket?.rels || [], now);
    folderCount += children.length;
    const volumeId = volume.volumeId || bucket?.volumeId || null;
    const drive = volume.drive || bucket?.drive || '';
    const base = shardBaseFor(safeHost, volume.key);

    files.push({
      path: `struct/${base}.json`,
      kind: 'shard',
      volumeKey: volume.key,
      json: {
        volumeId,
        name: drive || '（未命名卷）',
        type: 'folder',
        part: { id: partId, revision, generatedAt: now },
        children,
        sources: [safeHost],
      },
    });
    const mount = { volumeId, files: [base] };
    if (drive) mount.letter = drive;
    mounts.push(mount);

    const tagPath = tagFileFor(volume.key);
    const generated = {};
    for (const [rel, list] of bucket?.tags || []) {
      generated[rel] = [...list];
      tagEntryCount += 1;
    }
    files.push({ path: tagPath, kind: 'tags', json: mergeTagDoc(existing?.[tagPath], generated) });
  }

  files.unshift({
    path: hostIndexFile(safeHost),
    kind: 'host',
    json: {
      version: 2,
      source,
      generatedAt: new Date(now).toISOString(),
      generator: GENERATOR,
      mounts,
    },
  });

  return {
    files,
    knownVolumes: allVolumes,
    stats: {
      host: safeHost,
      source,
      shardCount: mounts.length,
      tagFileCount: mounts.length,
      tagEntryCount,
      topLevelFolders: folderCount,
      revision,
    },
  };
}

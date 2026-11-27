// 按年分片、只追加不覆盖的标签/状态片读写工具。
//
// 片路径：<类别>/<身份>/<年>/<前缀>-<YYYYMMDD-HHMMSS>-<6位十六进制>.json
// 读取：跨年目录枚举 → 按片名升序 → 重放事件片；旧整表片先作为基线。
// 排序不依赖本机时钟、文件系统 mtime 或片内字段，片名本身就是确定性键。

const YEAR_RE = /^\d{4}$/;
const JSON_RE = /\.json$/i;

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

/** 32 位 FNV-1a → base36，与 onenav ufsTree.ts:shortHash 逐字一致。 */
export function shortHash(value) {
  const raw = String(value || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** /ufs-tags/<key>.json 的 key，与 onenav ufsTree.ts:ufsTagKey 逐字一致。 */
export function ufsTagKey(bundleId) {
  const raw = String(bundleId || 'unknown');
  const safe = raw
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `${safe || 'bundle'}-${shortHash(raw)}`;
}

export function safeKey(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'unknown';
}

export function ufsTagsDir(bundleId) {
  return `ufs-tags/${ufsTagKey(bundleId)}`;
}

export function netDriveTagsDir(dir) {
  return `net-drive-tags/${safeKey(dir)}`;
}

export function fileTagsDir(volumeId) {
  return `file-tags/${safeKey(volumeId)}`;
}

export function stamp(now = Date.now(), random = Math.random()) {
  const date = new Date(now);
  const time = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-`
    + `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const rand = Math.floor(random * 0xffffff).toString(16).padStart(6, '0');
  return `${time}-${rand}`;
}

async function entries(connected, dir) {
  const { fp, pathFor } = connected;
  const names = await fp.readdir(pathFor(dir)).catch(() => []);
  return names.map(String);
}

/** 跨年目录枚举所有片，按片名升序返回 {name, path, doc}。 */
export async function listShards(connected, baseDir) {
  const years = (await entries(connected, baseDir)).filter((name) => YEAR_RE.test(name)).sort();
  const out = [];
  for (const year of years) {
    const dir = `${baseDir}/${year}`;
    const names = (await entries(connected, dir)).filter((name) => JSON_RE.test(name));
    for (const name of names) {
      let doc = null;
      try {
        doc = JSON.parse(await connected.fp.readFile(connected.pathFor(`${dir}/${name}`), 'utf8'));
      } catch {
        continue;
      }
      if (doc && typeof doc === 'object') out.push({ name, path: `${dir}/${name}`, doc });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  return out;
}

/** 追加一片；只新建，不修改已有片。 */
export async function appendShard(connected, baseDir, prefix, doc, options = {}) {
  const now = options.at ?? Date.now();
  const dir = `${baseDir}/${new Date(now).getFullYear()}`;
  const path = `${dir}/${prefix}-${stamp(now, options.random)}.json`;
  const { fp, pathFor } = connected;
  await fp.mkdir(pathFor(dir), { recursive: true }).catch(() => {});
  await fp.writeFile(pathFor(path), `${JSON.stringify(doc, null, 2)}\n`);
  return path;
}

function asTags(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

/**
 * 重放 UFS 节点标签：旧整表片 {tags:{rel:[...]}} 作基线，新事件片按序覆盖。
 * 返回 Map<rel, string[]>，根节点 rel 为空串。
 */
export function replayUfsTags(shards) {
  const tags = new Map();
  for (const shard of shards) {
    const doc = shard.doc;
    if (doc.tags && !Array.isArray(doc.events)) {
      for (const [rel, list] of Object.entries(doc.tags)) tags.set(rel, asTags(list));
      continue;
    }
    for (const event of Array.isArray(doc.events) ? doc.events : []) {
      const rel = String(event?.rel ?? '');
      if (event?.op === 'remove') tags.delete(rel);
      else if (event?.op === 'set') tags.set(rel, asTags(event.tags));
    }
  }
  return tags;
}

/** 重放网盘标签：旧数组片作基线，新事件片按序覆盖。返回 Set<string>。 */
export function replayNetDriveTags(shards) {
  const tags = new Set();
  for (const shard of shards) {
    const doc = shard.doc;
    if (Array.isArray(doc.tags) && !Array.isArray(doc.events)) {
      for (const tag of doc.tags) if (typeof tag === 'string') tags.add(tag);
      continue;
    }
    for (const event of Array.isArray(doc.events) ? doc.events : []) {
      const tag = String(event?.tag || '');
      if (!tag) continue;
      if (event.op === 'remove') tags.delete(tag);
      else if (event.op === 'set') tags.add(tag);
    }
  }
  return tags;
}

export async function readUfsTags(connected, bundleId) {
  const key = ufsTagKey(bundleId);
  const shards = [];
  // onenav 目前仍写旧单片 ufs-tags/<key>.json，必须作为基线读入，
  // 否则它打的 public 标签在发布侧完全看不见。
  const legacyPath = `ufs-tags/${key}.json`;
  try {
    const doc = JSON.parse(await connected.fp.readFile(connected.pathFor(legacyPath), 'utf8'));
    if (doc && typeof doc === 'object') shards.push({ name: '0000-legacy.json', path: legacyPath, doc });
  } catch { /* 旧片不存在属正常 */ }
  shards.push(...await listShards(connected, ufsTagsDir(bundleId)));
  shards.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  return replayUfsTags(shards);
}

/**
 * 给 UFS 节点打/改标签：整表写回 diff 成事件片追加，不改旧片。
 * rel 为 bundle 内相对路径（根节点为空串），标签大小写原样保留。
 * 标签变空时用 op:'remove'，与重放语义一致（不留下空数组键）。
 */
export async function setUfsNodeTags(connected, bundleId, rel, tags, options = {}) {
  const cleanTags = [];
  const seen = new Set();
  for (const tag of Array.isArray(tags) ? tags : []) {
    const value = String(tag ?? '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    cleanTags.push(value);
  }
  const event = cleanTags.length
    ? { op: 'set', rel: String(rel ?? ''), tags: cleanTags }
    : { op: 'remove', rel: String(rel ?? '') };
  return appendShard(connected, ufsTagsDir(bundleId), 'tags', {
    version: 1,
    at: options.at ?? Date.now(),
    host: options.host || 'zip-browser',
    bundleId,
    events: [event],
  }, options);
}

export async function readNetDriveTags(connected, dir) {
  return replayNetDriveTags(await listShards(connected, netDriveTagsDir(dir)));
}

/** 给网盘打/取消一个标签：追加一片，不修改旧片。 */
export async function setNetDriveTag(connected, dir, tag, enabled, options = {}) {
  return appendShard(connected, netDriveTagsDir(dir), 'tags', {
    version: 1,
    at: options.at ?? Date.now(),
    host: options.host || 'pc',
    events: [{ op: enabled ? 'set' : 'remove', tag: String(tag) }],
  }, options);
}

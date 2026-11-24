// /ufs/ 虚拟网盘的数据层：每次「加入 ufs」生成一份不可变的分片索引，
// 放在 /ufs/<年份>/ 下；读取时把该年份目录里的所有分片在内存里合并。
//
// 约定：
//   - 目录按加入年份归桶；文件按最后修改年份归桶，mtime 缺失时退回加入年。
//   - 分片文件只新增、不改写；删除时直接删掉包含该 id 的分片文件。
//   - 同一来源在合并时按 id 去重，updatedAt 新的胜出。
//   - 这里只存指针与元信息，不复制真实文件内容。

export const UFS_ROOT = '/ufs';

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

export function yearOf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(n);
  const year = date.getFullYear();
  return year >= 1970 && year <= 9999 ? year : null;
}

/** 目录看加入年，文件看最后修改年；mtime 缺失/非法时退回加入年。 */
export function bucketYear(entry) {
  const added = yearOf(entry?.addedAt);
  if (entry?.type !== 'file') return added || new Date().getFullYear();
  return yearOf(entry?.mtime) || added || new Date().getFullYear();
}

export function entryId(source, name = '') {
  const src = source || {};
  switch (src.kind) {
    case 'local':
      return `local:${String(src.path || '').toLowerCase()}`;
    case 'zip':
      return `zip:${String(src.zipPath || '').toLowerCase()}#${String(src.entry || '')}`;
    case 'volume':
      return `vol:${String(src.volumeId || '')}/${String(src.rel || '')}`;
    default:
      return `${src.kind || 'unknown'}:${String(src.path || name)}`;
  }
}

/** 分片文件名：带时间与随机后缀，保证同名不撞、永不覆盖。 */
export function shardFileName(now = Date.now(), random = Math.random()) {
  const date = new Date(now);
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-`
    + `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const rand = Math.floor(random * 0xffffff).toString(16).padStart(6, '0');
  return `ufs-${stamp}-${rand}.json`;
}

export function shardPath(year, file = shardFileName()) {
  return `${UFS_ROOT}/${year}/${file}`;
}

export function makeEntry(raw, now = Date.now()) {
  const source = raw?.source && typeof raw.source === 'object' ? raw.source : null;
  if (!source) throw new Error('缺少来源');
  const type = raw.type === 'file' ? 'file' : 'dir';
  const name = String(raw.name || raw.label || '').trim();
  if (!name) throw new Error('缺少名称');
  const sizeValue = raw.size == null || raw.size === '' ? null : Number(raw.size);
  return {
    v: 1,
    id: raw.id || entryId(source, name),
    name,
    type,
    source,
    size: Number.isFinite(sizeValue) ? sizeValue : null,
    mtime: Number.isFinite(Number(raw.mtime)) && Number(raw.mtime) > 0 ? Number(raw.mtime) : null,
    addedAt: Number.isFinite(Number(raw.addedAt)) && Number(raw.addedAt) > 0 ? Number(raw.addedAt) : now,
    updatedAt: now,
  };
}

/** 合并同一年的多份分片；坏分片跳过，同 id 取 updatedAt 新的。 */
export function mergeShards(docs) {
  const byId = new Map();
  for (const doc of Array.isArray(docs) ? docs : []) {
    const entries = Array.isArray(doc?.entries) ? doc.entries : [];
    for (const entry of entries) {
      if (!entry || !entry.id || !entry.name) continue;
      const prev = byId.get(entry.id);
      if (!prev || Number(entry.updatedAt || 0) >= Number(prev.updatedAt || 0)) byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'zh-CN', { numeric: true });
  });
}

/** 数据组 fs 有的是 zen-fs 实例（直接方法），有的是 .promises 包装，统一取异步 API。 */
function io(fs) {
  return fs?.promises || fs;
}

function isMissing(err) {
  return err?.code === 'ENOENT' || /ENOENT|no such file/i.test(String(err?.message || ''));
}

/** StoreFS 的 recursive mkdir 不会把已存在的目录当成功，需自己吞掉 EEXIST。 */
function isExists(err) {
  return err?.code === 'EEXIST' || /already exists|已存在/i.test(String(err?.message || ''));
}

async function ensureDir(fp, path) {
  try {
    await fp.mkdir(path, { recursive: true });
  } catch (err) {
    if (!isExists(err)) throw err;
  }
}

async function readDir(fs, path) {
  try {
    return await io(fs).readdir(path);
  } catch (err) {
    if (isMissing(err)) return [];
    throw err;
  }
}

async function readJson(fs, path) {
  try {
    return JSON.parse(await io(fs).readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

export async function listYears(fs) {
  const names = await readDir(fs, UFS_ROOT);
  return names
    .map(String)
    .filter((name) => /^\d{4}$/.test(name))
    .sort((a, b) => Number(b) - Number(a));
}

export async function readYear(fs, year) {
  const names = await readDir(fs, `${UFS_ROOT}/${year}`);
  const files = names.map(String).filter((name) => /^ufs-.*\.json$/i.test(name)).sort();
  const docs = [];
  let broken = 0;
  for (const name of files) {
    const doc = await readJson(fs, `${UFS_ROOT}/${year}/${name}`);
    if (doc) docs.push(doc);
    else broken += 1;
  }
  return { entries: mergeShards(docs), shards: files.length, broken, files };
}

/** 批量加入：同一批里按归档年份分组，每个年份目录只写一份新分片。 */
export async function addEntries(fs, raws, { now = Date.now(), random = Math.random() } = {}) {
  const entries = (Array.isArray(raws) ? raws : []).map((raw) => makeEntry(raw, now));
  const byYear = new Map();
  for (const entry of entries) {
    const year = bucketYear(entry);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(entry);
  }
  const fp = io(fs);
  await ensureDir(fp, UFS_ROOT);
  const shards = [];
  let index = 0;
  for (const [year, group] of byYear) {
    await ensureDir(fp, `${UFS_ROOT}/${year}`);
    // 同一年只生成一份；年份目录不同，即使时间戳相同也不会互相覆盖。
    const path = shardPath(year, shardFileName(now, (random + index * 0.137) % 1));
    index += 1;
    await fp.writeFile(path, `${JSON.stringify({
      v: 1,
      year,
      entries: group,
      createdAt: now,
    }, null, 2)}\n`);
    shards.push({ year, path, count: group.length });
  }
  return { entries, shards };
}

/** 单条加入：内部仍走批量写分片，保持「每次加入生成新分片」的语义。 */
export async function addEntry(fs, raw, options = {}) {
  const result = await addEntries(fs, [raw], options);
  const entry = result.entries[0];
  return { entry, year: bucketYear(entry), path: result.shards[0].path };
}

/** 删除包含该 id 的所有分片文件（分片只增不改，所以直接删文件）。 */
export async function removeEntry(fs, id) {
  if (!id) return 0;
  const fp = io(fs);
  const years = await listYears(fs);
  let removed = 0;
  for (const year of years) {
    const { files } = await readYear(fs, year);
    for (const file of files) {
      const doc = await readJson(fs, `${UFS_ROOT}/${year}/${file}`);
      const hit = Array.isArray(doc?.entries) && doc.entries.some((entry) => entry?.id === id);
      if (!hit) continue;
      try {
        await fp.unlink(`${UFS_ROOT}/${year}/${file}`);
        removed += 1;
      } catch {
        // 单个分片删除失败不影响其它分片。
      }
    }
  }
  return removed;
}

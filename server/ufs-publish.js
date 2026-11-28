// UFS public 发布的服务端受控写入端。
// 只接受「本会话已打开的源路径」+「已登记网盘的缓存目录」，不做任意路径读写。
// 同卷硬链接、跨卷复制；逐文件返回，单文件失败不影响整批。

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';
import { ensureCacheRoot, listEntries, DATA_DIRNAME, parseDirName } from './drive-cache.js';
import { ufsTagKey } from '../web/tags-sharded.js';

const YEAR_RE = /^\d{4}$/;
const MAX_FILES = 500;

/** 纯函数：校验 destRel 形状 <年>/<bundleKey>/<rel>，只返回规范化 rel 分段；年份与 bundleKey 由调用方拼进目标路径。 */
export function validateDestRel(destRel, bundleId, year) {
  const raw = String(destRel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const parts = raw.split('/');
  if (!YEAR_RE.test(String(year))) throw new HttpError(400, '无效的 bundle 年份');
  if (parts.length < 3) throw new HttpError(400, 'destRel 必须包含年、bundleKey 和相对路径');
  if (parts[0] !== String(year)) throw new HttpError(400, 'destRel 年份与 bundle 不一致');
  if (parts[1] !== ufsTagKey(bundleId)) throw new HttpError(400, 'destRel 的 bundleKey 与 bundleId 不一致');
  const rel = parts.slice(2);
  if (rel.some((seg) => !seg || seg === '.' || seg === '..' || /[<>:"|?*\x00-\x1f]/.test(seg)
    || /[.: ]$/.test(seg) || /^[A-Za-z]:$/.test(seg))) {
    throw new HttpError(400, 'destRel 含非法路径段');
  }
  return rel;
}

/** 纯函数：同卷（且同文件系统）优先硬链接。 */
export function sameVolume(sourceAbs, destAbs) {
  return path.parse(sourceAbs).root.toLowerCase() === path.parse(destAbs).root.toLowerCase();
}

async function sha256File(file) {
  const buf = await fs.readFile(file);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function writeOne(source, destAbs, preferLink) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  await fs.rm(destAbs, { force: true }).catch(() => {});
  if (preferLink) {
    try {
      await fs.link(source, destAbs);
      return 'link';
    } catch (err) {
      const code = String(err?.code || '');
      if (!['EXDEV', 'EPERM', 'EMLINK', 'ENOSYS', 'EOPNOTSUPP', 'EEXIST'].includes(code)) throw err;
    }
  }
  await fs.copyFile(source, destAbs);
  return 'copy';
}

/** 提交一批文件的写入；target 必须是已登记网盘的缓存目录名。 */
export async function publishFiles(body) {
  const target = String(body?.target || '').trim();
  if (!parseDirName(target)) throw new HttpError(400, '无效的网盘登记名');
  const files = Array.isArray(body?.files) ? body.files : [];
  if (!files.length || files.length > MAX_FILES) throw new HttpError(400, `files 数量必须在 1..${MAX_FILES} 之间`);

  const { cacheRoot } = await ensureCacheRoot();
  const registered = await listEntries(cacheRoot);
  if (!registered.some((entry) => entry.dir === target)) throw new HttpError(404, '目标网盘未登记');
  const publicRoot = path.join(cacheRoot, target, DATA_DIRNAME, 'public');

  const results = [];
  for (const file of files) {
    // key 必须与前端 destByKey 一致（带目标），否则多目标时同文件的记录会互相覆盖、destRel 显示为空。
    const key = `${file?.bundleId || ''}|${file?.rel || ''}|${target}`;
    try {
      const source = normalizeLocalPath(file?.source);
      if (!isPathAllowed(source)) throw new HttpError(403, '源文件未在本次会话中打开');
      const stat = await fs.stat(source);
      if (!stat.isFile()) throw new HttpError(400, '源路径不是文件');
      const relParts = validateDestRel(file.destRel, file.bundleId, file.year);
      // destRel 是 <年>/<bundleKey>/<rel>：年份与 bundleKey 必须落成真实目录，
      // 否则不同 bundle 的同名 rel 会写进同一个扁平路径、互相覆盖（设计 §2 P0-4）。
      const destAbs = path.join(publicRoot, String(file.year), ufsTagKey(file.bundleId), ...relParts);
      const inside = path.relative(publicRoot, destAbs);
      if (inside.startsWith('..') || path.isAbsolute(inside)) throw new HttpError(400, '目标路径越界');
      if (file.skipIfUnchanged) {
        const destStat = await fs.stat(destAbs).catch(() => null);
        if (destStat?.isFile()) {
          const expected = String(file.hash || '').replace(/^sha256:/i, '').toLowerCase();
          const actual = expected ? await sha256File(destAbs).catch(() => null) : null;
          if (!expected || actual === expected) {
            results.push({ key, action: 'skipped', method: null, size: destStat.size, hash: file.hash || null });
            continue;
          }
        }
      }
      const method = await writeOne(source, destAbs, sameVolume(source, destAbs));
      const destStat = await fs.stat(destAbs);
      results.push({ key, action: method === 'link' ? 'linked' : 'copied', method, size: destStat.size, hash: file.hash || null });
    } catch (err) {
      results.push({
        key,
        action: 'failed',
        reason: String(err?.message || err),
        status: err?.status || 500,
      });
    }
  }
  return { target, results };
}

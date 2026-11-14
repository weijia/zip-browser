// 只读探测本机主机名与各盘的「稳定卷身份」。
//
// 目录结构清单 v2 用 volumeId（盘根 .dir-struct-id 的内容）作为卷分片文件名、
// file-tags 文件名与跨主机去重依据。dir-struct-gen 在  /api/drives 里用同样的
// readVolumeId() 逻辑（标记文件优先，回退卷序列号），这里保持一致，否则本工具
// 导出的 file-tags 会挂到另一把 key 上、读取侧命中不到。
//
// 与 dir-struct-gen 的差别：本程序是只读浏览器，**绝不写 .dir-struct-id**。
// 盘根没有标记文件时回退卷序列号；两者都取不到时返回 null，由前端回退 <host>::<盘符>。

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { listDrives } from './fs-service.js';

export const VOLUME_MARKER = '.dir-struct-id';
const ID_RE = /^[0-9a-fA-F-]{8,}$/;

/** Windows 卷序列号（vol / fsutil），与 dir-struct-gen getVolumeSerial 同口径。 */
function volumeSerial(root) {
  if (process.platform !== 'win32') return null;
  const match = /^([A-Za-z]):/.exec(root || '');
  if (!match) return null;
  const letter = match[1];
  const parse = (out) => {
    let hit = /([0-9A-F]{4}-[0-9A-F]{4})/i.exec(String(out));
    if (hit) return hit[1].toUpperCase();
    hit = /0x([0-9A-F]{8})/i.exec(String(out));
    if (hit) {
      const hex = hit[1].toUpperCase();
      return `${hex.slice(0, 4)}-${hex.slice(4)}`;
    }
    return null;
  };
  try {
    const out = execFileSync('cmd', ['/c', 'vol', `${letter}:`], {
      windowsHide: true, timeout: 3000,
    }).toString();
    const serial = parse(out);
    if (serial) return serial;
  } catch { /* 尝试 fsutil */ }
  try {
    const out = execFileSync('cmd', ['/c', 'fsutil', 'fsinfo', 'volumeinfo', `${letter}:\\`], {
      windowsHide: true, timeout: 3000,
    }).toString();
    return parse(out);
  } catch { return null; }
}

/** 只读：优先标记文件，其次卷序列号，都没有返回 null。 */
export function readVolumeId(root) {
  if (!root) return null;
  try {
    const existing = fs.readFileSync(path.join(root, VOLUME_MARKER), 'utf8').trim();
    if (ID_RE.test(existing)) return existing;
  } catch { /* 盘根没有标记文件 */ }
  return volumeSerial(root);
}

export async function getHostInfo() {
  let host = 'pc';
  try { host = os.hostname() || 'pc'; } catch { /* 保持兜底 */ }
  const drives = await listDrives().catch(() => []);
  const volumes = {};
  for (const drive of drives) {
    const letter = String(drive?.letter || '').toUpperCase();
    if (!/^[A-Z]$/.test(letter)) continue;
    volumes[letter] = readVolumeId(`${letter}:\\`);
  }
  return { host, volumes };
}

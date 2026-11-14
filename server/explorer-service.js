// 「在 Windows 资源管理器中打开」：只调起系统外壳，不读写文件内容。
// 安全边界与 /api/list 一致：路径必须归一化、且落在本次会话已浏览过的目录下；
// zip: 伪路径、盘符外的路径、未浏览路径一律拒绝。绝不拼 shell 命令行。

import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';

/** 纯函数，便于单测：目录直接打开；文件用 /select, 让资源管理器选中它。 */
export function explorerArgs(abs, isDirectory) {
  return isDirectory ? [abs] : [`/select,${abs}`];
}

function launchExplorer(args) {
  // detached + unref：资源管理器是独立 GUI 进程，不能让 HTTP 请求等它退出。
  const child = spawn('explorer.exe', args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  // explorer.exe 找不到 / 无桌面会话时不能变成未捕获异常拖垮服务。
  child.on('error', () => {});
  child.unref();
}

/** options.run 仅供测试注入；生产永远走真实 explorer.exe。 */
export async function openInExplorer(input, options = {}) {
  if (process.platform !== 'win32' && !options.run) {
    throw new HttpError(501, '在资源管理器中打开目前仅支持 Windows');
  }
  const abs = normalizeLocalPath(input?.path ?? input);
  if (!isPathAllowed(abs)) {
    throw new HttpError(403, '该路径未在本次会话中打开，拒绝调用资源管理器');
  }
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    throw new HttpError(404, `路径不存在：${abs}`);
  }
  if (!stat.isDirectory() && !stat.isFile()) {
    throw new HttpError(400, '不是普通文件或目录');
  }
  const isDirectory = stat.isDirectory();
  const args = explorerArgs(abs, isDirectory);
  (options.run || launchExplorer)(args);
  return { ok: true, path: abs, kind: isDirectory ? 'dir' : 'file', args };
}

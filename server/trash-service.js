import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from './util.js';
import { normalizeLocalPath, isPathAllowed } from './fs-service.js';
import { ROOT_DIR } from './config.js';

const execFileAsync = promisify(execFile);

/** 单次最多处理 10 项：误勾选时把影响面控制在最小。 */
export const MAX_TRASH_BATCH = 10;
/** 超过回收站配额的文件可能被 Windows 直接永久删除，先挡住。 */
export const MAX_RECYCLE_FILE_BYTES = 1024 ** 3;
const POWERSHELL_TIMEOUT_MS = 30_000;
const DRIVE_TYPE_QUERY = 'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,DriveType | ConvertTo-Json -Compress';

function encodedCommand(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

/** Win32_LogicalDisk.DriveType：3 = 本地固定磁盘，其它都不可靠（可移动 2 / 网络 4 / 光驱 5 / RAM 6）。 */
export const isRecyclableDriveType = (type) => Number(type) === 3;

let driveTypePromise = null;
async function getDriveTypes() {
  if (!driveTypePromise) {
    driveTypePromise = (async () => {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand(DRIVE_TYPE_QUERY)],
        { timeout: 8000, windowsHide: true, maxBuffer: 256 * 1024 },
      );
      const text = String(stdout).replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(text || '[]');
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const map = new Map(rows
        .filter((row) => row && row.DeviceID)
        .map((row) => [String(row.DeviceID).toUpperCase().replace(/:$/, ''), Number(row.DriveType)]));
      if (!map.size) throw new Error('no logical disks reported');
      return map;
    })().catch((err) => {
      driveTypePromise = null; // 允许下次重试
      throw err;
    });
  }
  return driveTypePromise;
}

async function assertRecyclableVolume(letter) {
  let types;
  try {
    types = await getDriveTypes();
  } catch (err) {
    // 探测不了就拒绝，绝不在「不知道能不能还原」的情况下删除。
    throw new HttpError(502, `无法确认 ${letter}: 是否支持回收站，已拒绝删除：${err.message}`);
  }
  if (!isRecyclableDriveType(types.get(letter.toUpperCase()))) {
    throw new HttpError(400, `${letter}: 不是本地固定磁盘，Windows 可能把删除变成永久删除，已拒绝`);
  }
}

function key(value) {
  return String(value).replace(/\//g, '\\').toLowerCase().replace(/\\+$/, '');
}

function protectedKeys() {
  const drive = String(process.env.SystemDrive || 'C:').replace(/[\\/]+$/, '');
  const home = os.homedir();
  const values = [
    `${drive}\\`,
    `${drive}\\Users`,
    `${drive}\\Windows`,
    `${drive}\\Program Files`,
    `${drive}\\Program Files (x86)`,
    `${drive}\\ProgramData`,
    `${drive}\\$Recycle.Bin`,
    `${drive}\\System Volume Information`,
    process.env.SystemRoot,
    process.env.ProgramData,
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    home,
    path.win32.join(home, 'Desktop'),
    path.win32.join(home, 'Documents'),
    path.win32.join(home, 'Downloads'),
    ROOT_DIR,
    path.win32.join(ROOT_DIR, 'server'),
    path.win32.join(ROOT_DIR, 'web'),
    path.win32.join(ROOT_DIR, 'node_modules'),
    path.win32.join(ROOT_DIR, 'tests'),
  ];
  return new Set(values.filter(Boolean).map(key));
}

const PROTECTED = protectedKeys();

// 系统目录整棵子树都不允许删除（桌面/文档等用户目录只禁止删目录本身，里面的文件仍可删）。
const PROTECTED_TREES = new Set([
  `${String(process.env.SystemDrive || 'C:').replace(/[\\/]+$/, '')}\\Windows`,
  `${String(process.env.SystemDrive || 'C:').replace(/[\\/]+$/, '')}\\Program Files`,
  `${String(process.env.SystemDrive || 'C:').replace(/[\\/]+$/, '')}\\Program Files (x86)`,
  `${String(process.env.SystemDrive || 'C:').replace(/[\\/]+$/, '')}\\ProgramData`,
  process.env.SystemRoot,
  process.env.ProgramData,
  process.env.APPDATA,
  process.env.LOCALAPPDATA,
].filter(Boolean).map(key));

export function isProtectedPath(abs) {
  const k = key(abs);
  return /^[a-z]:$/.test(k) || PROTECTED.has(k);
}

export function isInsideProtectedTree(abs) {
  const k = key(abs);
  for (const root of PROTECTED_TREES) {
    if (k === root || k.startsWith(`${root}\\`)) return true;
  }
  return false;
}

function assertDeletable(abs) {
  if (isProtectedPath(abs) || isInsideProtectedTree(abs)) {
    throw new HttpError(400, `此位置受保护，不允许删除：${abs}`);
  }
}

/**
 * 校验删除目标。三条硬约束：
 * 1. dir 必须是在本次会话里通过 /api/list 打开过的目录；
 * 2. 每个目标必须是 dir 的直接子项（不能靠 ../ 越权删别处）；
 * 3. 盘根、系统/用户特殊目录、程序自身关键目录、符号链接一律拒绝。
 */
export async function validateTrashTargets(dirInput, pathsInput) {
  if (!Array.isArray(pathsInput) || pathsInput.length === 0) {
    throw new HttpError(400, '没有选择要删除的项目');
  }
  if (pathsInput.length > MAX_TRASH_BATCH) {
    throw new HttpError(400, `一次最多删除 ${MAX_TRASH_BATCH} 项，请分批操作`);
  }
  const dir = normalizeLocalPath(dirInput);
  if (!isPathAllowed(dir)) throw new HttpError(403, '该目录未在当前会话中打开，拒绝删除');
  // 所有目标都是 dir 的直接子项，必然同盘；先确认这个卷确实有回收站。
  const letter = /^([A-Za-z]):/.exec(dir)?.[1];
  if (!letter) throw new HttpError(400, '无法识别磁盘盘符');
  await assertRecyclableVolume(letter);

  const dirKey = key(dir);
  const seen = new Set();
  const items = [];
  for (const raw of pathsInput) {
    const abs = normalizeLocalPath(raw);
    const targetKey = key(abs);
    if (targetKey === dirKey) throw new HttpError(400, '不能删除当前目录本身');
    if (key(path.win32.dirname(abs)) !== dirKey) {
      throw new HttpError(400, `只能删除当前目录下的直接子项：${abs}`);
    }
    assertDeletable(abs);
    if (seen.has(targetKey)) continue;

    let stat;
    try {
      stat = await fs.lstat(abs);
    } catch {
      throw new HttpError(404, `文件不存在：${abs}`);
    }
    if (stat.isSymbolicLink()) throw new HttpError(400, `不支持删除链接或重解析点：${abs}`);
    if (!stat.isDirectory() && !stat.isFile()) throw new HttpError(400, `不是普通文件或目录：${abs}`);
    if (stat.isFile() && stat.size > MAX_RECYCLE_FILE_BYTES) {
      throw new HttpError(400, `文件超过 1 GiB，回收站可能拒收并转为永久删除：${abs}`);
    }
    seen.add(targetKey);
    items.push({ i: items.length, p: abs, d: stat.isDirectory() });
  }
  if (!items.length) throw new HttpError(400, '没有可删除的项目');
  return { dir, items };
}

/**
 * 生成 PowerShell 脚本：路径以 base64(JSON) 内嵌，避免引号/中文/特殊字符注入命令行。
 * 只用 Windows 自带的 VisualBasic.FileIO + SendToRecycleBin，绝不 fs.rm / 永久删除。
 */
export function buildTrashScript(items) {
  const payload = Buffer.from(JSON.stringify(items), 'utf8').toString('base64');
  const deleteArgs = '[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin, [Microsoft.VisualBasic.FileIO.UICancelOption]::ThrowException';
  return [
    "$ErrorActionPreference = 'Stop'",
    // 独立 powershell.exe 进程默认不加载 Microsoft.VisualBasic，必须显式载入程序集。
    // -AssemblyName 只加载 GAC 里已有的程序集，不编译自定义代码。
    'Add-Type -AssemblyName Microsoft.VisualBasic',
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    `$items = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json`,
    'foreach ($item in @($items)) {',
    '  $result = @{ i = [int]$item.i; ok = $false; e = "" }',
    '  try {',
    '    if ($item.d) {',
    `      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($item.p, ${deleteArgs})`,
    '    } else {',
    `      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($item.p, ${deleteArgs})`,
    '    }',
    '    $result.ok = $true',
    '  } catch { $result.e = [string]$_.Exception.Message }',
    '  [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress))',
    '}',
  ].join('\n');
}

export function parseTrashOutput(stdout, items) {
  const byIndex = new Map();
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith('{')) continue;
    try {
      const row = JSON.parse(text);
      byIndex.set(Number(row.i), { ok: Boolean(row.ok), error: String(row.e || '') });
    } catch {
      // 忽略 PowerShell 的其它输出
    }
  }
  return items.map((item) => ({
    path: item.p,
    ok: byIndex.get(item.i)?.ok === true,
    error: byIndex.get(item.i)?.error || (byIndex.has(item.i) ? '' : '回收站未返回结果'),
  }));
}

async function runPowerShell(items) {
  const script = buildTrashScript(items);
  // -EncodedCommand 是 PowerShell 官方的 Unicode 安全传参方式（UTF-16LE + base64）。
  const encoded = encodedCommand(script);
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout: POWERSHELL_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    return parseTrashOutput(stdout, items);
  } catch (err) {
    // 可能已经删掉了其中一部分，所以不能抛 500 让前端误判为「全部失败」；
    // 返回逐项结果，前端随后重列目录即可看到真实状态。
    const detail = String(err?.stderr || '').trim().slice(0, 200);
    return items.map((item) => ({
      path: item.p,
      ok: false,
      error: `回收站调用失败：${err?.message || err}${detail ? ` · ${detail}` : ''}`,
    }));
  }
}

/** options.run 仅供测试注入，生产永远走真实 PowerShell。 */
export async function trashPaths(input, options = {}) {
  if (process.platform !== 'win32' && !options.run) {
    throw new HttpError(501, '删除到回收站目前仅支持 Windows');
  }
  const { items } = await validateTrashTargets(input?.dir, input?.paths);
  const results = await (options.run || runPowerShell)(items);
  const trashed = results.filter((row) => row.ok).length;
  return {
    ok: trashed === results.length,
    trashed,
    failed: results.length - trashed,
    results,
  };
}

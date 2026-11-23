// 用 esbuild 把 zen-fs-remotestoragejs 的 RemoteStorageFileSystem 打成一个浏览器可直接用的
// IIFE global：globalThis.ZenRSClient = { RemoteStorageFileSystem }。
//
// 背景：vendor/zen-fs-remotestoragejs.global.js 只把 @zenfs/core 挂到 __zenfs__，
// 不暴露 RemoteStorageFileSystem 类（它只服务配置器内部注册后端），故需单独打包。
// zip-browser 本体零构建，这里只在「新增/升级 RS 读取能力」时手动跑一次：
//   node scripts/build-rs-client.mjs
// esbuild 从项目 devDependencies 或工作区相邻项目里探测（本机 kids-point 已装）。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'scripts', '_rs-client-entry.js');
const OUT = path.join(ROOT, 'web', 'vendor', 'zen-rs-client.global.js');

function findEsbuild() {
  // execFileSync 需要真实可执行文件：Windows 用 @esbuild/<arch>/esbuild.exe，
  // 其它平台用 .bin/esbuild（原生二进制，不是 bash shim）。.cmd/bare shim 在 spawnSync 下不可直接执行。
  const archMap = { x64: 'x64', arm64: 'arm64', ia32: 'ia32' };
  const arch = archMap[process.arch] || process.arch;
  const pkgDirs = [
    path.join(ROOT, 'node_modules', '@esbuild'),
    path.resolve(ROOT, '..', 'kids-point', 'node_modules', '@esbuild'),
    path.resolve(ROOT, '..', 'puter', 'node_modules', '@esbuild'),
  ];
  for (const base of pkgDirs) {
    if (process.platform === 'win32') {
      const exe = path.join(base, `win32-${arch}`, 'esbuild.exe');
      if (fsSync.existsSync(exe)) return exe;
    } else {
      const bin = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
      if (fsSync.existsSync(bin)) return bin;
    }
  }
  // 最后尝试 PATH（which 返回的是 shim，交给 shell 执行）
  try { return execFileSync('which', ['esbuild'], { encoding: 'utf8' }).trim(); } catch { /* ignore */ }
  throw new Error('找不到 esbuild：请在 zip-browser 安装 esbuild 作为 devDependency 后再试');
}

await fs.writeFile(ENTRY,
  "import { RemoteStorageFileSystem } from 'zen-fs-remotestoragejs';\n" +
  'globalThis.ZenRSClient = { RemoteStorageFileSystem };\n', 'utf8');
try {
  const esbuild = findEsbuild();
  execFileSync(esbuild, [
    ENTRY, '--bundle', '--format=iife', '--platform=browser',
    '--target=es2020', `--outfile=${OUT}`,
  ], { cwd: ROOT, stdio: 'pipe' });
  const size = (await fs.stat(OUT)).size;
  console.log(`已生成 ${path.relative(ROOT, OUT)} (${(size / 1024).toFixed(0)} KB)`);
} finally {
  await fs.rm(ENTRY, { force: true });
}

// 打包宿主无关的 web 产物：build/zip-browser-web/ + zip-browser-web.tar.gz。
// - 把 node_modules/zen-fs-config/dist/zen-fs-config.js 补进 vendor，保证 /zb 下也能加载；
// - manifest.json 记录版本、commit、逐文件 sha256，供 OpenList 校验与排查；
// - 用系统 tar（Windows 10+ / Linux / macOS 均自带）生成 tar.gz，不引入第三方依赖。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'build');
const STAGE = path.join(OUT, 'zip-browser-web');
const TARBALL = path.join(OUT, 'zip-browser-web.tar.gz');

async function sha256(file) {
  const data = await fs.readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(STAGE, { recursive: true });
await fs.cp(WEB, STAGE, { recursive: true });

// zen-fs-config.js 在自带服务里是从 node_modules 按固定路由提供的；
// 发布产物必须自带一份，否则 /zb 下拿不到 createConfigRepo。
const zenConfig = path.join(ROOT, 'node_modules', 'zen-fs-config', 'dist', 'zen-fs-config.js');
try {
  await fs.copyFile(zenConfig, path.join(STAGE, 'vendor', 'zen-fs-config.js'));
} catch {
  console.warn('warn: node_modules/zen-fs-config/dist/zen-fs-config.js 不存在，产物将缺少该文件');
}

const files = await walk(STAGE);
const hashes = {};
for (const rel of files) hashes[rel] = await sha256(path.join(STAGE, rel));

const manifest = {
  name: 'zip-browser-web',
  version: pkg.version,
  commit: gitCommit(),
  generatedAt: new Date().toISOString(),
  files: hashes,
};
await fs.writeFile(path.join(STAGE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

// tar 保留顶层目录 zip-browser-web/，OpenList 解压后可直接映射到 public/zb。
// Windows 上 tar 在 System32，且不一定在 PATH 里，直接给绝对路径。
const TAR = process.platform === 'win32'
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
  : 'tar';
execFileSync(TAR, ['-czf', TARBALL, '-C', OUT, 'zip-browser-web'], { stdio: 'inherit' });

const size = (await fs.stat(TARBALL)).size;
console.log(`dist: ${path.relative(ROOT, TARBALL)} (${size} bytes, ${files.length} files)`);

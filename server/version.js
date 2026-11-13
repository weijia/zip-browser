import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = process.env.ZIP_BROWSER_VERSION_STATE
  ? path.resolve(process.env.ZIP_BROWSER_VERSION_STATE)
  : path.join(ROOT, 'version.json');

// 只有这些文件参与「版本指纹」。version.json 自身、samples / tests / node_modules
// 都不参与，否则写回状态文件会形成自引用循环，测试临时文件也会误报更新。
const SCAN_DIRS = ['web', 'web/vendor', 'server', 'scripts'];
const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json']);
const ROOT_FILES = ['package.json', 'start.bat', 'stop.bat'];
const IGNORED_NAMES = new Set(['version.json']);

const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));

function digestHex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function listSourceFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    let entries;
    try {
      entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (IGNORED_NAMES.has(entry.name)) continue;
      if (!SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      files.push(`${dir}/${entry.name}`);
    }
  }
  for (const name of ROOT_FILES) files.push(name);
  return files.sort();
}

/** 实时计算源码指纹：内容不变则 buildId 不变（重启服务不会误报更新）。 */
export async function computeFingerprint() {
  const files = await listSourceFiles();
  const all = crypto.createHash('sha256');
  const web = crypto.createHash('sha256');
  const server = crypto.createHash('sha256');
  let bytes = 0;
  let count = 0;
  for (const rel of files) {
    const data = await fs.readFile(path.join(ROOT, rel)).catch(() => null);
    if (!data) continue;
    const line = `${rel}\0${digestHex(data)}\0`;
    all.update(line);
    if (rel.startsWith('web/')) web.update(line);
    if (rel.startsWith('server/')) server.update(line);
    bytes += data.length;
    count += 1;
  }
  return {
    buildId: all.digest('hex').slice(0, 16),
    webBuildId: web.digest('hex').slice(0, 12),
    serverBuildId: server.digest('hex').slice(0, 12),
    fileCount: count,
    sourceBytes: bytes,
  };
}

function beijingTime() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function displayVersion(revision) {
  const [major = '0', minor = '0'] = String(pkg.version).split('.');
  return `${major}.${minor}.${revision}`;
}

async function readState() {
  const fallback = { revision: 0, buildId: '', buildTime: '' };
  try {
    const raw = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
    return {
      revision: Number.isFinite(raw.revision) ? Math.max(0, Math.floor(raw.revision)) : 0,
      buildId: typeof raw.buildId === 'string' ? raw.buildId : '',
      buildTime: typeof raw.buildTime === 'string' ? raw.buildTime : '',
    };
  } catch {
    return fallback;
  }
}

// 串行化状态写入，避免首页与轮询请求并发时 revision 相互覆盖。
let queue = Promise.resolve();

/**
 * 每次调用都重新计算源码指纹；只要内容变了就自动把修订号 +1，
 * 于是「每次改动都更新版本号」是自动的，不需要手工 bump。
 */
export async function getVersionInfo() {
  const fingerprint = await computeFingerprint();
  const run = queue.then(async () => {
    let state = await readState();
    if (state.buildId !== fingerprint.buildId) {
      state = {
        revision: state.revision + 1,
        buildId: fingerprint.buildId,
        buildTime: beijingTime(),
      };
      try {
        await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
        await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
      } catch {
        // 只读目录下也能正常显示版本，只是修订号不跨重启保留
      }
    }
    return {
      version: displayVersion(state.revision),
      baseVersion: pkg.version,
      revision: state.revision,
      buildId: fingerprint.buildId,
      buildTime: state.buildTime,
      sha: fingerprint.buildId.slice(0, 7),
      webBuildId: fingerprint.webBuildId,
      serverBuildId: fingerprint.serverBuildId,
      fileCount: fingerprint.fileCount,
      sourceBytes: fingerprint.sourceBytes,
    };
  });
  queue = run.catch(() => {});
  return run;
}

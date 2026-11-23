// 数据组 fs 的读取小工具：zen-fs 的 readFile 在不同后端可能返回
// string / Uint8Array / Buffer / Blob，直接交给 JSON.parse 会得到「解析失败」
// 而不是真正原因，这里统一解码。
// host-disks 文档与卷树浏览（struct / file-list）共用这一份实现。

export async function readText(fp, path) {
  const raw = await fp.readFile(path, 'utf8');
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw.text === 'function') return await raw.text();
  if (raw instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(raw));
  if (ArrayBuffer.isView(raw)) return new TextDecoder('utf-8').decode(raw);
  return String(raw ?? '');
}

export async function readJson(fp, path) {
  return JSON.parse(await readText(fp, path));
}

/** zen-fs / 后端抛出的「文件不存在」判定。 */
export function isMissing(err) {
  const msg = String(err?.message || err || '');
  return err?.code === 'ENOENT' || /no such file|not exist|ENOENT|不存在/i.test(msg);
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as zip from '@zip.js/zip.js';
import { generateThumbSamples } from './make-thumb-samples.js';

const OUT_DIR = fileURLToPath(new URL('../samples/', import.meta.url));
const PASSWORD = 'demo1234';

if (typeof zip.configure === 'function') zip.configure({ useWebWorkers: false });

const FILES = {
  'index.html': `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>相对引用测试</title><link rel="stylesheet" href="css/style.css"></head><body>
<h1>首页</h1>
<p id="js-proof">脚本尚未执行</p>
<img class="logo" src="img/logo.svg" alt="logo">
<p><a href="page/other.html">进入下一页</a> · <a href="guide.md">查看 Markdown 说明</a></p>
<script src="js/hello.js"></script>
</body></html>`,
  'css/style.css': `body{font:16px/1.7 sans-serif;padding:28px;color:#222;background:#f7f9fc url("../img/bg.svg") repeat} h1{color:#185fa5} img.logo{width:120px;height:120px} a{color:#185fa5}`,
  'img/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="16" fill="#e6f1fb"/><path d="M28 84L52 36l18 30 12-18 20 36z" fill="#185fa5"/><circle cx="42" cy="38" r="9" fill="#f5d38b"/></svg>`,
  'img/bg.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#ffffff"/><circle cx="4" cy="4" r="1" fill="#e6f1fb"/></svg>`,
  'js/hello.js': `document.getElementById('js-proof').textContent = '外链脚本已执行';`,
  'page/other.html': `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>下一页</title><link rel="stylesheet" href="../css/style.css"></head><body>
<h1>下一页</h1><img class="logo" src="../img/logo.svg" alt="logo">
<p><a href="../index.html">返回首页</a> · <a href="../guide.md">Markdown 说明</a></p>
</body></html>`,
  'guide.md': `# 使用说明

这是一个 **Markdown** 文档，图片与链接都指向包内相对路径。

![包内图片](img/logo.svg)

[返回首页](index.html) · [下一页](page/other.html)
`,
};

const CHINESE_FILES = {
  '说明.txt': '这是一个包含中文文件名的压缩包。\n',
  '文档/首页.html': `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>中文目录</title></head><body><h1>中文目录与文件名</h1><p><a href="../说明.txt">查看说明</a></p><img src="../图片/标志.svg" width="100"></body></html>`,
  '图片/标志.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="12" fill="#e1f5ee"/><text x="16" y="58" font-size="18" fill="#0f6e56">中文</text></svg>`,
};

async function build(filename, files, entryOptions = {}) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const writer = new zip.ZipWriter(new zip.BlobWriter('application/zip'), { useWebWorkers: false });
  for (const [name, content] of Object.entries(files)) {
    await writer.add(name, new zip.TextReader(content), entryOptions);
  }
  const blob = await writer.close();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const target = path.join(OUT_DIR, filename);
  await fs.writeFile(target, buffer);
  console.log(`${filename}  ${buffer.length} bytes  ${Object.keys(files).length} entries`);
}

export async function generate() {
  await build('basic.zip', FILES);
  await build('zipcrypto.zip', FILES, { password: PASSWORD, zipCrypto: true });
  await build('aes256.zip', FILES, { password: PASSWORD, encryptionStrength: 3 });
  await build('chinese.zip', CHINESE_FILES);
  await generateThumbSamples();
  console.log(`加密样本统一密码: ${PASSWORD}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generate();
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import * as zip from '@zip.js/zip.js';

const ROOT = fileURLToPath(new URL('../samples/', import.meta.url));
const IMG_DIR = path.join(ROOT, 'images');
const SUB_DIR = path.join(IMG_DIR, 'sub');

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">'
  + '<rect width="240" height="180" rx="14" fill="#e6f1fb"/>'
  + '<path d="M30 140L92 48l38 58 28-34 52 68z" fill="#185fa5"/>'
  + '<circle cx="62" cy="52" r="16" fill="#f5d38b"/>'
  + '</svg>';

if (typeof zip.configure === 'function') zip.configure({ useWebWorkers: false });

export async function generateThumbSamples() {
  await fs.mkdir(SUB_DIR, { recursive: true });
  const png = await sharp({ create: { width: 640, height: 420, channels: 3, background: '#4a90d9' } }).png().toBuffer();
  const jpg = await sharp({ create: { width: 480, height: 640, channels: 3, background: '#e8a33d' } }).jpeg({ quality: 88 }).toBuffer();
  const webp = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 40, g: 150, b: 100, alpha: 1 } } }).webp().toBuffer();
  const nested = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#a56ad9' } }).png().toBuffer();

  const files = {
    'blue.png': png,
    'green.jpg': jpg,
    'alpha.webp': webp,
    'logo.svg': Buffer.from(SVG),
    'readme.txt': Buffer.from('本地图片样本目录\n'),
  };
  for (const [name, buffer] of Object.entries(files)) {
    await fs.writeFile(path.join(IMG_DIR, name), buffer);
  }
  await fs.writeFile(path.join(SUB_DIR, 'nested.png'), nested);

  const writer = new zip.ZipWriter(new zip.BlobWriter('application/zip'), { useWebWorkers: false });
  for (const [name, buffer] of Object.entries(files)) {
    await writer.add(name, new zip.Uint8ArrayReader(new Uint8Array(buffer)));
  }
  await writer.add('sub/nested.png', new zip.Uint8ArrayReader(new Uint8Array(nested)));
  await writer.add('sub/note.txt', new zip.TextReader('子目录里的说明'));
  const blob = await writer.close();
  const zipBuffer = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(path.join(ROOT, 'images.zip'), zipBuffer);
  console.log(`images/ (${Object.keys(files).length} files + sub/)  images.zip  ${zipBuffer.length} bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateThumbSamples();
}

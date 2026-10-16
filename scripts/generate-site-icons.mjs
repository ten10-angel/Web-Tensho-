import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

// Use Astro's existing image dependency; only crop and resize, never retouch.
const require = createRequire(import.meta.resolve('astro'));
const sharp = require('sharp');
const source = new URL('../public/images/IMG_2179-photo.png', import.meta.url);
const output = new URL('../public/', import.meta.url);
const crop = { left: 650, top: 470, width: 360, height: 360 };
const portrait = () => sharp(source.pathname).extract(crop);

await mkdir(new URL('icons/', output), { recursive: true });
for (const [filename, size] of [
  ['icons/tensho-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icons/tensho-192.png', 192],
  ['icons/tensho-512.png', 512],
]) {
  await portrait().resize(size, size).png().toFile(new URL(filename, output).pathname);
}

// ICO embeds the same photograph at common browser-tab sizes.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => portrait().resize(size, size).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((buffer, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(buffer.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += buffer.length;
});
await writeFile(new URL('favicon.ico', output), Buffer.concat([header, ...images]));
console.log('Generated photo icons without modifying the original image.');

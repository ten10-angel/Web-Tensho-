import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root));
const dimensions = (png) => {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

test('photo icons have the declared square dimensions', async () => {
  for (const [name, size] of [
    ['icons/tensho-32.png', 32], ['apple-touch-icon.png', 180],
    ['icons/tensho-192.png', 192], ['icons/tensho-512.png', 512],
  ]) {
    assert.deepEqual(dimensions(await read(`public/${name}`)), [size, size]);
  }
});

test('favicon contains valid 16, 32 and 48 pixel PNG entries', async () => {
  const ico = await read('public/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [i, size] of [16, 32, 48].entries()) {
    const entry = 6 + i * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset + length <= ico.length);
    assert.deepEqual(dimensions(ico.subarray(offset, offset + length)), [size, size]);
  }
});

test('home, article layouts and admin all link to local photo icons', async () => {
  for (const page of ['src/pages/index.astro', 'src/layouts/ArticleLayout.astro']) {
    const source = String(await read(page));
    assert.match(source, /import SiteIcons from/);
    assert.match(source, /<SiteIcons\s*\/>/);
  }
  for (const page of ['src/components/SiteIcons.astro', 'public/admin/index.html']) {
    const source = String(await read(page));
    for (const path of ['/favicon.ico?v=photo-1', '/icons/tensho-32.png?v=photo-1', '/apple-touch-icon.png?v=photo-1']) {
      assert.ok(source.includes(`href="${path}"`));
      await read(`public${path.split('?')[0]}`);
    }
  }
});

test('home-screen manifest icons exist and match their size declarations', async () => {
  const manifest = JSON.parse(String(await read('public/site.webmanifest')));
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'browser');
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png');
    assert.equal(icon.purpose, 'any');
    assert.equal(dimensions(await read(`public${icon.src}`)).join('x'), icon.sizes);
  }
});

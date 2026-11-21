import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);

async function readCatalogue(path) {
  const source = await readFile(new URL(path, root), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import('data:text/javascript,' + encodeURIComponent(outputText));
}

async function checkAsset(path) {
  const asset = await stat(new URL('public' + path, root));
  assert.ok(asset.isFile() && asset.size > 0, path);
}

test('every gallery tile has a distinct, bundled photograph and an accessible description', async () => {
  const { gallery } = await readCatalogue('data/gallery.ts');
  assert.ok(gallery.length > 2);
  assert.equal(new Set(gallery.map(photo => photo.src)).size, gallery.length);
  for (const photo of gallery) {
    assert.ok(photo.alt.trim());
    await checkAsset(photo.src);
  }
});

test('every blog card leads to an article with local preview and article assets', async () => {
  const { posts } = await readCatalogue('data/posts.ts');
  assert.equal(new Set(posts.map(post => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.ok(post.cover.alt.trim());
    await checkAsset(post.cover.src);
    const article = await readFile(new URL('content/posts/' + post.slug + '.md', root), 'utf8');
    assert.match(article, /^## /m);
    for (const image of article.matchAll(/!\[[^\]]*\]\((\/[^)]+)\)/g)) await checkAsset(image[1]);
    for (const link of post.links.filter(link => link.href.startsWith('/'))) await checkAsset(link.href);
  }
});

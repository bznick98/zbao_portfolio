import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { prepareGallery } from '../scripts/prepare-gallery.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/unsplash-snapshot.json', import.meta.url), 'utf8'));
const sample = {
  id: 'test-photo', user: { username: 'zbao' }, width: 1200, height: 800,
  urls: { regular: 'https://images.unsplash.com/photo-fixture?w=1080' },
  description: 'Convict Lake', alt_description: 'Mountains at dusk', created_at: '2021-11-28T12:00:00Z',
};
const response = data => Response.json(data);

test('the offline selection contains distinct, dated photographs from the verified Unsplash snapshot', async () => {
  const gallery = await prepareGallery(snapshot, {}, () => assert.fail('unexpected network request'));
  assert.equal(new Set(gallery.map(p => p.id)).size, 10);
  for (const p of gallery) {
    assert.match(p.src, /^https:\/\/images\.unsplash\.com\//);
    assert.match(p.caption, /, 20\d{2}$/);
    assert.ok(p.width > 0 && p.height > 0 && p.alt);
  }
});

test('one text-only request titles the build selection by ID, keeping years attached to their own records', async () => {
  const calls = [];
  const fetchBuild = async (url, options) => {
    calls.push(url);
    if (url.includes('api.unsplash.com')) return response([
      sample, sample, { ...sample, id: 'other', user: { username: 'other' } },
      { ...sample, id: 'second', description: '', created_at: null },
    ]);
    const body = JSON.parse(options.body);
    const subjects = JSON.parse(body.messages[1].content);
    assert.deepEqual(subjects.slice(0, 2).map(p => p.id), ['test-photo', 'second']);
    assert.equal(subjects.length, 10);
    assert.ok(subjects.every(p => !('src' in p) && !('published' in p)));
    return response({ choices: [{ message: { content: JSON.stringify({ titles: [
      { id: 'second', title: 'False date, 1999' }, { id: 'test-photo', title: 'Blue Hour' },
    ] }) } }] });
  };
  const photos = await prepareGallery(snapshot, { UNSPLASH_ACCESS_KEY: 'test', OPENAI_API_KEY: 'test' }, fetchBuild);
  assert.equal(calls.length, 2);
  assert.equal(photos.length, 10);
  assert.deepEqual(photos.slice(0, 2).map(p => p.caption), ['Blue Hour, 2021', 'Mountains at dusk']);
});

test('unavailable Unsplash and malformed model output retain the same snapshot, source descriptions and years', async () => {
  const request = async url => url.includes('unsplash') ? new Response(null, { status: 401 }) : response({ choices: [{ message: { content: 'invalid JSON' } }] });
  const result = await prepareGallery(snapshot, { VITE_UNSPLASH_ACCESS_KEY: 'test', OPENAI_API_KEY: 'test' }, request);
  assert.deepEqual(result, await prepareGallery(snapshot));
});

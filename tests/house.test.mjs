import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { deriveHouseKey, ITERATIONS } from '../lib/house-crypto.mjs';

globalThis.crypto ??= webcrypto;
const directory = await mkdtemp(join(tmpdir(), 'house-test-'));
after(() => rm(directory, { recursive: true, force: true }));
await copyFile(new URL('../lib/house-crypto.mjs', import.meta.url), join(directory, 'house-crypto.mjs'));
await writeFile(join(directory, 'house-release.mjs'), ts.transpileModule(await readFile(new URL('../lib/house-release.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText);
const { unlockHouse, HousePasswordError } = await import(pathToFileURL(join(directory, 'house-release.mjs')));
const buildId = '0123456789abcdef';
const salt = randomBytes(16);
const password = 'test-fixture-password';
const key = await deriveHouseKey(password, salt, ['encrypt']);
const files = {};
const encrypted = {};
for (const name of ['scene', 'model']) {
  const iv = randomBytes(12);
  encrypted[name] = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${buildId}/${name}`) }, key, new TextEncoder().encode(`private ${name}`));
  files[name] = { file: `${buildId}/${name}.bin`, iv: [...iv], bytes: encrypted[name].byteLength };
}
const manifest = { schema: 1, buildId, iterations: ITERATIONS, salt: [...salt], files };
function network(t, override = {}) {
  const requests = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    options?.signal?.throwIfAborted();
    if (url.endsWith('release.json')) return Response.json(override.manifest || manifest);
    const name = url.endsWith('scene.bin') ? 'scene' : 'model';
    return new Response(override[name] || encrypted[name], { status: override.status || 200 });
  };
  t.after(() => { globalThis.fetch = original; });
  return requests;
}
test('correct password opens encrypted data; disposal revokes both model URLs', async t => {
  const requests = network(t);
  const assets = await unlockHouse(password, new AbortController().signal, () => {});
  assert.match(assets.scene, /^blob:/); assert.match(assets.model, /^blob:/);
  assert.equal(requests.length, 3);
  // resolveObjectURL exposes the same object URL registry used by Node's Web API.
  const { resolveObjectURL } = await import('node:buffer');
  assert.equal(await resolveObjectURL(assets.scene).text(), 'private scene');
  assert.equal(await resolveObjectURL(assets.model).text(), 'private model');
  assets.dispose();
  assert.equal(resolveObjectURL(assets.model), undefined);
  assert.equal(resolveObjectURL(assets.scene), undefined);
});
test('wrong password never downloads the model', async t => {
  const requests = network(t);
  await assert.rejects(unlockHouse('wrong', new AbortController().signal, () => {}), HousePasswordError);
  assert.ok(requests.every(url => !url.endsWith('model.bin')));
});
test('tampered model is rejected by authenticated decryption', async t => {
  const corrupted = new Uint8Array(encrypted.model.slice(0)); corrupted[0] ^= 1;
  network(t, { model: corrupted });
  await assert.rejects(unlockHouse(password, new AbortController().signal, () => {}), /files could not be verified/);
});
test('truncated download gets a retryable error', async t => {
  network(t, { model: new Uint8Array(3) });
  await assert.rejects(unlockHouse(password, new AbortController().signal, () => {}), /Download incomplete/);
});
test('HTTP failures do not masquerade as an incorrect password', async t => {
  network(t, { status: 503 });
  await assert.rejects(unlockHouse(password, new AbortController().signal, () => {}), /Download interrupted/);
});
test('navigation during unlock cancels subsequent downloads', async t => {
  const requests = network(t);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(unlockHouse(password, controller.signal, () => {}), { name: 'AbortError' });
  assert.equal(requests.length, 1);
});
test('release metadata cannot point to another origin', async t => {
  const requests = network(t, { manifest: { ...manifest, files: { ...files, model: { ...files.model, file: 'https://elsewhere.invalid/model.bin' } } } });
  await assert.rejects(unlockHouse(password, new AbortController().signal, () => {}), /release could not be read/);
  assert.equal(requests.length, 1);
});
test('published asset tree contains encrypted data and no raw house model', async () => {
  const { readdir } = await import('node:fs/promises');
  const base = new URL('../public/house-viewer/', import.meta.url);
  const entries = await readdir(base, { recursive: true });
  assert.ok(entries.some(name => name.endsWith('model.bin')));
  assert.ok(!entries.some(name => /\.(glb|blend|png|jpg|pdf)$/.test(name) || name.endsWith('scene.json')));
  const release = JSON.parse(await readFile(new URL('release.json', base), 'utf8'));
  for (const file of Object.values(release.files)) assert.equal((await readFile(new URL(file.file, base))).byteLength, file.bytes);
});

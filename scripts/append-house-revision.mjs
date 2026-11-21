import {createHash, randomBytes, webcrypto} from 'node:crypto';
import {readFile, writeFile, rename, cp, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHouseKey, decryptHouseFile} from '../lib/house-crypto.mjs';
import {writeHouseViewer} from './import-house.mjs';
import {loadDelivery, collectRevisionAssets} from './house-delivery.mjs';

globalThis.crypto ??= webcrypto;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'public/house-viewer');
const json = async (directory, name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJson = async (directory, name, value) => {
  const file = path.join(directory, name);
  await writeFile(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  await rename(file + '.tmp', file);
};

async function stage(directory, delivery, version, password) {
  const release = await json(directory, 'release.json');
  const provenance = await json(directory, 'provenance.json');
  if (release.schema !== 2 || !password) throw Error('An unlocked schema 2 release is required.');
  const key = await deriveHouseKey(password, release.salt, ['encrypt', 'decrypt']);
  const decrypt = (id, bytes, iv) => decryptHouseFile(key, bytes, iv, release.buildId, id);
  const old = release.files.catalog;
  const catalog = JSON.parse(new TextDecoder().decode(await decrypt('catalog', await readFile(path.join(directory, old.file)), old.iv)));
  const {catalog: source, manifest} = await loadDelivery(delivery);
  const revision = source.revisions.find(item => item.revisionId === version);
  if (!revision || catalog.projectId !== source.projectId) throw Error('Requested revision or project does not match.');
  const raw = new Map();
  await collectRevisionAssets(delivery, manifest, source, revision, raw);
  const existing = catalog.revisions.find(item => item.revisionId === version);
  if (existing && JSON.stringify(existing) !== JSON.stringify(revision)) throw Error('Published revision has a different build.');
  if (existing && catalog.defaultRevisionId === version) return false;
  if (!existing) catalog.revisions.push(revision);
  catalog.defaultRevisionId = version;
  raw.set('catalog', Buffer.from(JSON.stringify(catalog)));
  for (const [id, bytes] of raw) {
    const file = release.buildId + '/' + id + '.bin';
    const output = path.join(directory, file);
    if (id !== 'catalog' && release.files[id]) {
      const existingBytes = await decrypt(id, await readFile(output), release.files[id].iv);
      if (hash(Buffer.from(existingBytes)) !== hash(bytes)) throw Error('Existing asset differs from checked build.');
      continue;
    }
    const iv = randomBytes(12);
    const cipher = Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:Buffer.from(release.buildId + '/' + id)}, key, bytes));
    if (hash(Buffer.from(await decrypt(id, cipher, iv))) !== hash(bytes)) throw Error('Encrypted asset failed verification.');
    await writeFile(output + '.tmp', cipher);
    await rename(output + '.tmp', output);
    release.files[id] = {file, iv:[...iv], bytes:cipher.length};
  }
  provenance.runtime = await writeHouseViewer(delivery, manifest, directory);
  await writeJson(directory, 'release.json', release);
  provenance.selectedBuildIds = catalog.revisions.map(item => item.selectedBuildId);
  provenance.additionalDeliveries ??= {};
  provenance.additionalDeliveries[version] = {deliveryId:manifest.deliveryId, buildId:revision.selectedBuildId, manifestSha256:hash(await readFile(path.join(delivery, 'site-manifest.json')))};
  await writeJson(directory, 'provenance.json', provenance);
  console.log(JSON.stringify({defaultRevisionId:version, buildId:revision.selectedBuildId, versions:catalog.revisions.map(r=>r.revisionId)}));
  return true;
}

async function append(delivery, version, password) {
  const staging = await mkdtemp(path.join(root, '.house-import-'));
  const next = path.join(staging, 'next');
  const previous = path.join(staging, 'previous');
  let needsRecovery = false;
  try {
    await cp(destination, next, {recursive:true});
    if (!await stage(next, delivery, version, password)) return;
    await rename(destination, previous);
    needsRecovery = true;
    try {
      await rename(next, destination);
      needsRecovery = false;
    } catch (error) {
      await rename(previous, destination);
      needsRecovery = false;
      throw error;
    }
  } finally {
    if (!needsRecovery) await rm(staging, {recursive:true, force:true});
  }
}

if (!process.argv[2] || !process.argv[3]) throw Error('Usage: node scripts/append-house-revision.mjs <delivery directory> <version>, password on stdin.');
let password = '';
for await (const chunk of process.stdin) password += chunk;
await append(path.resolve(process.argv[2]), process.argv[3], password.replace(/\r?\n$/, ''));

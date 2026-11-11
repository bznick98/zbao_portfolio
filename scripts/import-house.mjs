import { createHash, randomBytes, webcrypto } from 'node:crypto';
import { readFile, writeFile, mkdir, cp, readdir, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITERATIONS, deriveHouseKey } from '../lib/house-crypto.mjs';

globalThis.crypto ??= webcrypto;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

// Import only a verified wf:release snapshot. Never copy a raw release into public/.
export async function importHouse(build, password, destination = path.join(root, 'public/house-viewer')) {
  if (!password || password.length > 128) throw new Error('Supply a nonempty password through stdin (maximum 128 characters).');
  const manifest = await readJson(path.join(build, 'release/manifest.json'));
  if (!/^[a-f0-9]{16}$/.test(manifest.buildId)) throw new Error('Invalid workflow build ID.');
  for (const name of ['camera-clearance', 'layout-sync', 'web-files', 'web-browser']) {
    if (!(await readJson(path.join(build, `checks/${name}.json`))).passed) throw new Error(`Workflow check failed: ${name}`);
  }
  const browser = await readJson(path.join(build, 'checks/web-browser.json'));
  if (!browser.interactiveArtifacts?.desktop?.exactPoseRoundTrip || !browser.interactiveArtifacts?.mobile?.touch || !browser.interactiveArtifacts?.singleModelDownload) throw new Error('Interactive Artifacts desktop/mobile gates are required.');
  const validation = await readJson(path.join(build, 'checks/gltf-validator.json'));
  if (validation.issues.numErrors || validation.issues.numWarnings) throw new Error('Resolve GLB validation findings before importing.');
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (name.includes('..') || name.includes('\\') || path.isAbsolute(name)) throw new Error('Invalid release path.');
    if (hash(await readFile(path.join(build, 'web', name))) !== expected) throw new Error(`Release checksum mismatch: ${name}`);
  }
  for (const required of ['index.html', 'style.css', 'main.js', 'assets/scene.json', 'assets/apartment.glb', 'artifact-modes.js', 'artifact-modes.css']) {
    if (!manifest.files[required]) throw new Error(`Missing release file: ${required}`);
  }
  const salt = randomBytes(16);
  const key = await deriveHouseKey(password, salt, ['encrypt']);
  const temporary = `${destination}.tmp`;
  await rm(temporary, { recursive: true, force: true });
  await mkdir(path.join(temporary, manifest.buildId), { recursive: true });
  const files = {};
  for (const [name, source] of [['scene', 'scene.json'], ['model', 'apartment.glb']]) {
    const iv = randomBytes(12);
    const bytes = await readFile(path.join(build, 'web/assets', source));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${manifest.buildId}/${name}`) }, key, bytes);
    const file = `${manifest.buildId}/${name}.bin`;
    await writeFile(path.join(temporary, file), Buffer.from(encrypted));
    files[name] = { file, iv: [...iv], bytes: encrypted.byteLength };
  }
  // Explicit allowlist: no source .blend, reference photos, raw model or layout.
  for (const name of ['vendor', 'licenses']) {
    const source = path.join(build, 'web', name);
    // All copied files must be covered by the verified workflow manifest.
    async function covered(dir, prefix) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const relative = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) await covered(path.join(dir, entry.name), relative);
        else if (!entry.isFile() || !manifest.files[relative]) throw new Error(`Unverified release file: ${relative}`);
      }
    }
    await covered(source, name);
    await cp(source, path.join(temporary, name), { recursive: true });
  }
  await cp(path.join(root, 'house-viewer/index.html'), path.join(temporary, 'index.html'));
  await cp(path.join(build, 'web/style.css'), path.join(temporary, 'style.css'));
  for (const name of ['artifact-modes.js', 'artifact-modes.css']) await cp(path.join(build, 'web', name), path.join(temporary, name));
  let main = await readFile(path.join(build, 'web/main.js'), 'utf8');
  main = "import {installHouseControls} from './controls.js';\nimport {applyHouseFinishes} from './finishes.js';\nlet houseControls,houseFinishes;\n" + main;
  const replacements = [
    ['onSceneReady(root);', 'onSceneReady(root);houseFinishes=applyHouseFinishes({root,scene,renderer});houseControls=installHouseControls({camera,renderer,root,scene,modes:artifactModes});'],
    ['window.__walkthrough={modes:artifactModes,ready:true,', 'window.__walkthrough={controls:houseControls,finishes:houseFinishes.counts,modes:artifactModes,ready:true,'],
    ["fetch('./assets/scene.json')", 'fetch(window.__HOUSE_ASSETS.scene)'],
    ["loadAsync('./assets/apartment.glb',", 'loadAsync(window.__HOUSE_ASSETS.model,'],
    ["$('loading').remove();", "$('loading').remove();parent.postMessage({type:'house:ready'},location.origin);"],
    ["console.error(error);", "parent.postMessage({type:'house:error'},location.origin);console.error(error);"],
    ["'#34473c'", "'#343638'"], ["'#77674a'", "'#686b68'"], ["'#d3dacb'", "'#dadbd6'"],
    ["'#d6bb87'", "'#bcbfb7'"], ["'#fff3cc'", "'#f3f4ef'"],
  ];
  for (const [from, to] of replacements) {
    if (!main.includes(from)) throw new Error(`Viewer changed; review integration for: ${from}`);
    main = main.replaceAll(from, to);
  }
  await writeFile(path.join(temporary, 'main.js'), main);
  for (const name of ['bridge.js', 'theme.css', 'controls.js', 'measurements.js', 'wall-annotations.js', 'finishes.js']) await cp(path.join(root, 'house-viewer', name), path.join(temporary, name));
  await writeFile(path.join(temporary, 'release.json'), JSON.stringify({ schema: 1, buildId: manifest.buildId, iterations: ITERATIONS, salt: [...salt], files }, null, 2) + '\n');
  await rm(destination, { recursive: true, force: true });
  await rename(temporary, destination);
  return { buildId: manifest.buildId, modelBytes: files.model.bytes, destination };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: npm run house:import -- /path/to/output/builds/<build-id> (password on stdin)');
  let password = '';
  for await (const chunk of process.stdin) password += chunk;
  const result = await importHouse(path.resolve(process.argv[2]), password.replace(/\r?\n$/, ''));
  password = '';
  console.log(`Imported verified workflow build ${result.buildId}; encrypted model ${(result.modelBytes / 1e6).toFixed(1)} MB.`);
}

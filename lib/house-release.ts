import { ITERATIONS, deriveHouseKey, decryptHouseFile } from './house-crypto.mjs';

type EncryptedFile = { file: string; iv: number[]; bytes: number };
type Manifest = {
  schema: number; buildId: string; iterations: number; salt: number[];
  files: Record<'scene' | 'model', EncryptedFile>;
};
export type HouseAssets = { scene: string; model: string; dispose: () => void };
export class HousePasswordError extends Error {}

const assetBase = '/house-viewer/';
function byteArray(value: unknown, size: number): value is number[] {
  return Array.isArray(value) && value.length === size && value.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
}
function validManifest(m: Manifest): boolean {
  return m?.schema === 1 && /^[a-f0-9]{16}$/.test(m.buildId) && m.iterations === ITERATIONS && byteArray(m.salt, 16)
    && ['scene', 'model'].every(name => {
      const file = m.files?.[name];
      return file && file.file === `${m.buildId}/${name}.bin` && byteArray(file.iv, 12)
        && Number.isSafeInteger(file.bytes) && file.bytes > 16 && file.bytes < 100_000_000;
    });
}

export async function unlockHouse(password: string, signal: AbortSignal, status: (text: string) => void): Promise<HouseAssets> {
  if (!crypto.subtle) throw new Error('Please use HTTPS and a current browser to open this page.');
  status('Checking password…');
  const response = await fetch(`${assetBase}release.json`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('The house is unavailable. Please try again.');
  const manifest: Manifest = await response.json();
  if (!validManifest(manifest)) throw new Error('The house release could not be read. Please refresh.');
  const key = await deriveHouseKey(password, manifest.salt);
  signal.throwIfAborted();

  async function read(name: 'scene' | 'model') {
    const file = manifest.files[name];
    const result = await fetch(assetBase + file.file, { signal });
    if (!result.ok) throw new Error('Download interrupted. Please try again.');
    const bytes = await result.arrayBuffer();
    if (bytes.byteLength !== file.bytes) throw new Error('Download incomplete. Please try again.');
    signal.throwIfAborted();
    return decryptHouseFile(key, bytes, file.iv, manifest.buildId, name);
  }

  let scene: ArrayBuffer;
  try { scene = await read('scene'); }
  catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') throw new HousePasswordError('That password didn’t open the door. Try again.');
    throw error;
  }
  status(`Opening the house · downloading ${(manifest.files.model.bytes / 1e6).toFixed(1)} MB…`);
  let model: ArrayBuffer;
  try { model = await read('model'); }
  catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') throw new Error('The house files could not be verified. Please refresh and try again.');
    throw error;
  }
  signal.throwIfAborted();
  const sceneUrl = URL.createObjectURL(new Blob([scene], { type: 'application/json' }));
  const modelUrl = URL.createObjectURL(new Blob([model], { type: 'model/gltf-binary' }));
  return { scene: sceneUrl, model: modelUrl, dispose() { URL.revokeObjectURL(sceneUrl); URL.revokeObjectURL(modelUrl); } };
}

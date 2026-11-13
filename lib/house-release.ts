import { ITERATIONS, deriveHouseKey, decryptHouseFile } from './house-crypto.mjs';

type EncryptedFile = { file: string; iv: number[]; bytes: number };
type Manifest = { schema: number; buildId: string; iterations: number; salt: number[]; files: Record<string, EncryptedFile> };
export type HouseAssets = {
  scene?: string; model?: string; catalog?: unknown;
  readAsset?: (id: string, signal: AbortSignal) => Promise<ArrayBuffer>;
  dispose: () => void;
};
export class HousePasswordError extends Error {}
const assetBase = '/house-viewer/';
function byteArray(value: unknown, size: number): value is number[] {
  return Array.isArray(value) && value.length === size && value.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
}
function validManifest(m: Manifest): boolean {
  if (![1,2].includes(m?.schema) || !/^[a-f0-9]{16}$/.test(m.buildId) || m.iterations !== ITERATIONS || !byteArray(m.salt,16)) return false;
  const names = Object.keys(m.files || {});
  if (m.schema === 1 ? !['scene','model'].every(n=>names.includes(n)) : !names.includes('catalog')) return false;
  return names.length <= 100 && names.every(name => {
    const file = m.files[name];
    return /^(scene|model|catalog|asset-[a-f0-9]{64})$/.test(name) && file.file === `${m.buildId}/${name}.bin`
      && byteArray(file.iv,12) && Number.isSafeInteger(file.bytes) && file.bytes > 16 && file.bytes < 100_000_000;
  });
}

export async function unlockHouse(password: string, signal: AbortSignal, status: (text: string) => void): Promise<HouseAssets> {
  if (!crypto.subtle) throw new Error('Please use HTTPS and a current browser to open this page.');
  status('Checking password…');
  const response = await fetch(`${assetBase}release.json`, {signal,cache:'no-cache'});
  if (!response.ok) throw new Error('The house is unavailable. Please try again.');
  const manifest: Manifest = await response.json();
  if (!validManifest(manifest)) throw new Error('The house release could not be read. Please refresh.');
  let key: CryptoKey | null = await deriveHouseKey(password,manifest.salt);
  password='';
  signal.throwIfAborted();
  let closed = false;
  const requests = new Set<AbortController>(), urls = new Set<string>();
  function dispose() {
    closed = true; key = null;
    for (const controller of requests) controller.abort(); requests.clear();
    for (const url of urls) URL.revokeObjectURL(url); urls.clear();
    signal.removeEventListener('abort',dispose);
  }
  signal.addEventListener('abort',dispose,{once:true});
  async function read(name: string, callerSignal: AbortSignal = signal) {
    if (closed) throw new DOMException('House is locked','AbortError');
    if (!Object.hasOwn(manifest.files,name)) throw new Error('Unknown house resource.');
    callerSignal.throwIfAborted();
    const controller = new AbortController(), cancel = () => controller.abort();
    callerSignal.addEventListener('abort',cancel,{once:true});requests.add(controller);
    try {
      const file = manifest.files[name], result = await fetch(assetBase+file.file,{signal:controller.signal});
      if (!result.ok) throw new Error('Download interrupted. Please try again.');
      const bytes = await result.arrayBuffer();
      if (bytes.byteLength !== file.bytes) throw new Error('Download incomplete. Please try again.');
      controller.signal.throwIfAborted();
      const decrypted = await decryptHouseFile(key,bytes,file.iv,manifest.buildId,name);
      controller.signal.throwIfAborted();
      if (closed) throw new DOMException('House is locked','AbortError');
      return decrypted;
    } finally {requests.delete(controller);callerSignal.removeEventListener('abort',cancel);}
  }
  try {
    let first: ArrayBuffer;
    try {first = await read(manifest.schema===2?'catalog':'scene');}
    catch (error) {
      if (error instanceof DOMException && error.name==='OperationError') throw new HousePasswordError('That password didn’t open the door. Try again.');
      throw error;
    }
    if (manifest.schema===2) {
      const catalog = JSON.parse(new TextDecoder().decode(first));
      if (catalog.schema!==1 || !Array.isArray(catalog.revisions) || !catalog.revisions.length) throw new Error('The house catalog could not be read.');
      return {catalog,readAsset:async(id,requestSignal)=>{
        if (!/^asset-[a-f0-9]{64}$/.test(id)) throw new Error('Unknown house resource.');
        try {return await read(id,requestSignal);}
        catch(error){if(error instanceof DOMException&&error.name==='OperationError')throw new Error('The house files could not be verified. Please refresh and try again.');throw error;}
      },dispose};
    }
    status(`Opening the house · downloading ${(manifest.files.model.bytes/1e6).toFixed(1)} MB…`);
    let model: ArrayBuffer;
    try {model = await read('model');}
    catch(error){if(error instanceof DOMException&&error.name==='OperationError')throw new Error('The house files could not be verified. Please refresh and try again.');throw error;}
    const sceneUrl=URL.createObjectURL(new Blob([first],{type:'application/json'}));urls.add(sceneUrl);
    const modelUrl=URL.createObjectURL(new Blob([model],{type:'model/gltf-binary'}));urls.add(modelUrl);
    return {scene:sceneUrl,model:modelUrl,dispose};
  }catch(error){dispose();throw error;}
}

import {decryptHouseFile} from './house-crypto.mjs';

const encoder = new TextEncoder();
const hexBytes = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));
const toBase64 = bytes => btoa(String.fromCharCode(...bytes));

// The release key stays in the parent. Only a submission capability and the
// workstation's sealed copy of the build password cross the iframe boundary.
export async function openSubmissionSession(releaseKey, buildId, password, grant) {
  if (grant.buildId !== buildId) return null;
  const plaintext = await decryptHouseFile(releaseKey, Uint8Array.from(atob(grant.cipher), c=>c.charCodeAt(0)), grant.iv, buildId, 'submit-access-v1');
  const {token, keyHex} = JSON.parse(new TextDecoder().decode(plaintext));
  if (![token,keyHex].every(s=>typeof s==='string' && /^[0-9a-f]{64}$/.test(s))) throw Error('Invalid submission access.');
  const key = await crypto.subtle.importKey('raw',hexBytes(keyHex),'AES-GCM',false,['encrypt','decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('zhijiang/build-access/v1')},key,encoder.encode(password));
  const packet = new Uint8Array(12+cipher.byteLength);
  packet.set(iv); packet.set(new Uint8Array(cipher),12);
  return {token,key,buildAccess:toBase64(packet)};
}

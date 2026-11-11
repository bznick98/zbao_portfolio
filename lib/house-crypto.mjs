// Shared by the release importer and browser. No password or reusable key is shipped.
export const ITERATIONS = 600_000;
export async function deriveHouseKey(password, salt, usages = ['decrypt']) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: ITERATIONS },
    material, { name: 'AES-GCM', length: 256 }, false, usages,
  );
}

export function decryptHouseFile(key, bytes, iv, buildId, name) {
  return crypto.subtle.decrypt({
    name: 'AES-GCM', iv: new Uint8Array(iv),
    additionalData: new TextEncoder().encode(`${buildId}/${name}`),
  }, key, bytes);
}

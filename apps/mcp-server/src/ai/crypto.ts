/**
 * AES-GCM for secrets the Worker stores in Firestore (the user's AI key). The key is
 * derived from a Worker secret, so a Firestore export alone does not reveal it.
 */

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('nook'), info: encoder.encode('nook-ai-key-v1') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Returns "v1.<iv>.<ciphertext>" in base64. */
export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), encoder.encode(plaintext)));
  return `v1.${toBase64(iv)}.${toBase64(ciphertext)}`;
}

export async function decryptSecret(value: string, secret: string): Promise<string> {
  const [version, iv, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('Unknown secret format');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await aesKey(secret), fromBase64(ciphertext));
  return new TextDecoder().decode(plaintext);
}

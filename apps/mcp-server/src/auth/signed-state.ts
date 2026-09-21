const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Serializes `payload` with an expiry and an HMAC so it can round-trip through a hidden form field. */
export async function signState(payload: unknown, secret: string, ttlSeconds: number): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify({ payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

/** Returns the payload, or null when the value was tampered with or has expired. */
export async function verifyState<T>(value: string, secret: string): Promise<T | null> {
  const [body, signature] = value.split('.');
  if (!body || !signature) return null;
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(signature), encoder.encode(body));
  } catch {
    return null;
  }
  if (!valid) return null;
  const { payload, exp } = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as { payload: T; exp: number };
  return exp >= Math.floor(Date.now() / 1000) ? payload : null;
}

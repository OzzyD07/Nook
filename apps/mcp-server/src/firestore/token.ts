import { importPKCS8, SignJWT } from 'jose';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cached: { token: string; expiresAt: number; account: string } | undefined;

/**
 * OAuth access token for the service account (JWT bearer grant). Cached per isolate;
 * never stored in KV, whose free tier allows only 1,000 writes a day.
 */
export async function serviceAccountToken(serviceAccountJson: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const account = JSON.parse(serviceAccountJson) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.account === account.client_email && cached.expiresAt - 300 > now) return cached.token;

  const key = await importPKCS8(account.private_key.replace(/\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(account.private_key_id ? { kid: account.private_key_id } : {}) })
    .setIssuer(account.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, expiresAt: now + body.expires_in, account: account.client_email };
  return body.access_token;
}

export function resetTokenCache(): void {
  cached = undefined;
}

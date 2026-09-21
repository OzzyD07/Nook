import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/** Verifies a Firebase ID token from the mobile app and returns its uid. */
export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<string> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });
  if (!payload.sub || typeof payload.auth_time !== 'number' || payload.auth_time > Date.now() / 1000 + 60) {
    throw new Error('Invalid Firebase ID token');
  }
  return payload.sub;
}

export class SignInError extends Error {}

/** Email/password sign-in through the Firebase Auth REST API. Returns the uid. */
export async function signInWithPassword(
  email: string,
  password: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ uid: string; email: string }> {
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { localId?: string; email?: string; error?: { message?: string } };
  if (!response.ok || !body.localId) {
    const code = body.error?.message ?? '';
    if (code.startsWith('TOO_MANY_ATTEMPTS')) throw new SignInError('Too many attempts. Try again later.');
    if (code.startsWith('USER_DISABLED')) throw new SignInError('This account is disabled.');
    throw new SignInError('Email or password is incorrect.');
  }
  return { uid: body.localId, email: body.email ?? email };
}

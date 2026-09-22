import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { signState, verifyState } from '../src/auth/signed-state';
import { decodeFields, encodeFields } from '../src/firestore/codec';
import { resetTokenCache, serviceAccountToken } from '../src/firestore/token';
import { canonicalJson } from '../src/repo/hash';

describe('Firestore codec', () => {
  it('round-trips nested values', () => {
    const data = {
      text: 'hi',
      count: 3,
      ratio: 0.5,
      flag: true,
      nothing: null,
      when: new Date('2026-09-22T09:00:00.000Z'),
      list: [1, 'two', { three: 3 }],
      map: { nested: { deep: 'yes' } },
    };
    expect(decodeFields(encodeFields(data))).toEqual(data);
  });

  it('stores integers as integerValue strings', () => {
    expect(encodeFields({ n: 7 })).toEqual({ n: { integerValue: '7' } });
  });
});

describe('canonicalJson', () => {
  it('ignores key order and undefined values', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: undefined }] })).toBe(canonicalJson({ a: [{ d: 2 }], b: 1 }));
  });
});

describe('signed state', () => {
  it('round-trips and rejects tampering', async () => {
    const state = await signState({ hello: 'world' }, 'secret', 60);
    expect(await verifyState(state, 'secret')).toEqual({ hello: 'world' });
    expect(await verifyState(state, 'other-secret')).toBeNull();
    expect(await verifyState(`${state.split('.')[0]}x.${state.split('.')[1]}`, 'secret')).toBeNull();
  });

  it('expires', async () => {
    const state = await signState({ a: 1 }, 'secret', -1);
    expect(await verifyState(state, 'secret')).toBeNull();
  });
});

describe('service account token', () => {
  it('signs an RS256 assertion and caches the access token', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const account = JSON.stringify({ client_email: 'nook@demo.iam.gserviceaccount.com', private_key: await exportPKCS8(privateKey) });
    let calls = 0;
    const fetchMock = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      const assertion = new URLSearchParams(String(init?.body)).get('assertion')!;
      const { payload } = await jwtVerify(assertion, publicKey, { audience: 'https://oauth2.googleapis.com/token' });
      expect(payload.iss).toBe('nook@demo.iam.gserviceaccount.com');
      expect(payload.scope).toBe('https://www.googleapis.com/auth/datastore');
      return new Response(JSON.stringify({ access_token: 'ya29.test', expires_in: 3600 }));
    }) as typeof fetch;

    resetTokenCache();
    expect(await serviceAccountToken(account, fetchMock)).toBe('ya29.test');
    expect(await serviceAccountToken(account, fetchMock)).toBe('ya29.test');
    expect(calls).toBe(1);
  });
});

describe('Firestore client', () => {
  it('calls the global fetch without rebinding `this` (Workers reject that as Illegal invocation)', async () => {
    const { Firestore } = await import('../src/firestore/client');
    const original = globalThis.fetch;
    globalThis.fetch = function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({ error: { status: 'NOT_FOUND', message: 'missing' } }, { status: 404 }));
    } as typeof fetch;
    try {
      const db = new Firestore({ projectId: 'demo', getToken: async () => 'token' });
      await expect(db.get('users/u1/cards/c1')).resolves.toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});

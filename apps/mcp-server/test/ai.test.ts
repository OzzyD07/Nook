import { AI_LIMITS, DEFAULT_AI_MODEL } from '@nook/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { decryptSecret, encryptSecret } from '../src/ai/crypto';
import { aiChat, AiError, deleteAiKey, getAiStatus, saveAiSettings, type AiContext } from '../src/ai/service';
import { Firestore } from '../src/firestore/client';
import { userPaths } from '../src/firestore/paths';
import { FakeFirestore } from './fake-firestore';

const SECRET = 'test-signing-secret';
const KEY = 'AIzaSyTestKey-abcdefghijklmnop';

class MemoryKv {
  values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('card AI', () => {
  let fake: FakeFirestore;
  let usage: MemoryKv;
  let calls: { url: string; init: RequestInit }[];
  let reply: () => Response;
  let ctx: AiContext;

  beforeEach(() => {
    fake = new FakeFirestore();
    usage = new MemoryKv();
    calls = [];
    reply = () => Response.json({ model: 'gemini-3.5-flash-lite', choices: [{ message: { content: 'e2e4' } }] });
    ctx = {
      uid: 'user1',
      db: new Firestore({ projectId: 'demo', getToken: async () => 'token', fetch: fake.fetch }),
      paths: userPaths('user1'),
      secret: SECRET,
      usage,
      fetch: async (input, init) => {
        calls.push({ url: String(input), init: init ?? {} });
        return reply();
      },
      now: () => new Date('2026-10-13T12:00:00Z'),
    };
  });

  const chat = (input: Partial<Parameters<typeof aiChat>[1]> = {}) => aiChat(ctx, { messages: [{ role: 'user', content: 'Your move' }], ...input });

  it('encrypts secrets with a fresh IV and decrypts them only with the same secret', async () => {
    const a = await encryptSecret(KEY, SECRET);
    const b = await encryptSecret(KEY, SECRET);
    expect(a).not.toBe(b);
    expect(a).not.toContain(KEY);
    expect(await decryptSecret(a, SECRET)).toBe(KEY);
    await expect(decryptSecret(a, 'other-secret')).rejects.toBeDefined();
  });

  it('stores the key encrypted and reports only a hint', async () => {
    expect(await getAiStatus(ctx)).toEqual({ configured: false, keyHint: null, model: DEFAULT_AI_MODEL, usedToday: 0, dailyLimit: AI_LIMITS.dailyRequests });
    const status = await saveAiSettings(ctx, { apiKey: KEY, model: 'gemini-3.8-flash' });
    expect(status).toMatchObject({ configured: true, keyHint: 'mnop', model: 'gemini-3.8-flash' });
    expect(JSON.stringify(await ctx.db.get(ctx.paths.aiSettings))).not.toContain(KEY);
    expect((await deleteAiKey(ctx)).configured).toBe(false);
  });

  it('ignores a key and model saved for another provider', async () => {
    await ctx.db.commit([ctx.db.set(ctx.paths.aiSettings, { encryptedKey: await encryptSecret('sk-or-v1-old', SECRET), keyHint: '-old', model: 'openrouter/auto' })]);
    expect(await getAiStatus(ctx)).toMatchObject({ configured: false, keyHint: null, model: DEFAULT_AI_MODEL });
  });

  it('calls Gemini with the stored key, leaves room for thinking and counts the call', async () => {
    await saveAiSettings(ctx, { apiKey: KEY });
    expect(await chat({ maxTokens: 50 })).toEqual({ content: 'e2e4', model: 'gemini-3.5-flash-lite', usedToday: 1 });
    expect(calls[0]!.url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.model).toBe(DEFAULT_AI_MODEL);
    expect(body.max_tokens).toBeGreaterThan(50);
    expect((await getAiStatus(ctx)).usedToday).toBe(1);
  });

  it('asks for JSON in the prompt and strips code fences from the answer', async () => {
    await saveAiSettings(ctx, { apiKey: KEY });
    reply = () => Response.json({ choices: [{ message: { content: '```json\n{"move":"e4"}\n```' } }] });
    expect((await chat({ json: true })).content).toBe('{"move":"e4"}');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.messages[0]).toMatchObject({ role: 'system' });
    expect(body.response_format).toBeUndefined();
  });

  it('refuses without a key, past the daily limit, and maps provider errors', async () => {
    await expect(chat()).rejects.toSatisfy((error) => error instanceof AiError && error.status === 400);
    await saveAiSettings(ctx, { apiKey: KEY });

    reply = () => Response.json([{ error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } }], { status: 400 });
    await expect(chat()).rejects.toThrow(/rejected the API key/);

    reply = () => Response.json({ error: { code: 429, message: 'Resource exhausted' } }, { status: 429 });
    await expect(chat()).rejects.toSatisfy((error) => error instanceof AiError && error.status === 429);

    usage.values.set('ai-usage:user1:2026-10-13', String(AI_LIMITS.dailyRequests));
    await expect(chat()).rejects.toThrow(/daily limit/);
  });
});

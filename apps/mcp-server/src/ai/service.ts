import { AI_LIMITS, AI_PROVIDER, AiModelSchema, DEFAULT_AI_MODEL, type AiChatRequest, type AiChatResponse, type AiSettingsInput, type AiStatus } from '@nook/shared';

import type { Firestore } from '../firestore/client';
import type { UserPaths } from '../firestore/paths';
import { decryptSecret, encryptSecret } from './crypto';

/** Gemini's OpenAI-compatible endpoint: same message shape as chat completions. */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const TIMEOUT_MS = 90_000;
/**
 * Gemini counts thinking tokens against max_tokens; this headroom keeps a short answer
 * from coming back empty because the model spent the budget thinking.
 */
const THINKING_HEADROOM = 2048;
const SETTINGS_HINT = 'Nook settings → Card AI';

type ErrorStatus = 400 | 404 | 429 | 502 | 504;

/** A failure the page should show to the user; the message is safe to display. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly status: ErrorStatus,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/** Daily call counters. Workers KV is eventually consistent, so the limit is approximate. */
export interface UsageStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface AiContext {
  uid: string;
  db: Firestore;
  paths: UserPaths;
  /** Secret the stored key is encrypted with. */
  secret: string;
  usage: UsageStore;
  fetch: typeof fetch;
  now: () => Date;
}

interface StoredSettings {
  model: string;
  encryptedKey: string | null;
  keyHint: string | null;
}

async function loadSettings(ctx: AiContext): Promise<StoredSettings> {
  const doc = await ctx.db.get(ctx.paths.aiSettings);
  const data = doc?.data ?? {};
  // A key or model saved for another provider is ignored rather than sent to Gemini.
  const current = data.provider === AI_PROVIDER;
  const model = AiModelSchema.safeParse(data.model);
  return {
    model: model.success ? model.data : DEFAULT_AI_MODEL,
    encryptedKey: current && typeof data.encryptedKey === 'string' ? data.encryptedKey : null,
    keyHint: current && typeof data.keyHint === 'string' ? data.keyHint : null,
  };
}

const usageKey = (ctx: AiContext) => `ai-usage:${ctx.uid}:${ctx.now().toISOString().slice(0, 10)}`;

async function usedToday(ctx: AiContext): Promise<number> {
  return Number((await ctx.usage.get(usageKey(ctx))) ?? 0) || 0;
}

function status(settings: StoredSettings, used: number): AiStatus {
  return {
    configured: settings.encryptedKey !== null,
    keyHint: settings.keyHint,
    model: settings.model,
    usedToday: used,
    dailyLimit: AI_LIMITS.dailyRequests,
  };
}

export async function getAiStatus(ctx: AiContext): Promise<AiStatus> {
  const [settings, used] = await Promise.all([loadSettings(ctx), usedToday(ctx)]);
  return status(settings, used);
}

export async function saveAiSettings(ctx: AiContext, input: AiSettingsInput): Promise<AiStatus> {
  const data: Record<string, unknown> = { updatedAt: ctx.now() };
  if (input.model !== undefined) data.model = input.model;
  if (input.apiKey !== undefined) {
    data.provider = AI_PROVIDER;
    data.encryptedKey = await encryptSecret(input.apiKey, ctx.secret);
    data.keyHint = input.apiKey.slice(-4);
  }
  await ctx.db.commit([ctx.db.patch(ctx.paths.aiSettings, data, Object.keys(data))]);
  return getAiStatus(ctx);
}

export async function deleteAiKey(ctx: AiContext): Promise<AiStatus> {
  await ctx.db.commit([
    ctx.db.patch(ctx.paths.aiSettings, { encryptedKey: null, keyHint: null, updatedAt: ctx.now() }, ['encryptedKey', 'keyHint', 'updatedAt']),
  ]);
  return getAiStatus(ctx);
}

function providerError(httpStatus: number, detail: string): AiError {
  // Gemini answers an invalid key with 400 "API key not valid".
  if (httpStatus === 401 || httpStatus === 403 || /api[ _-]?key/i.test(detail)) {
    return new AiError(`Gemini rejected the API key. Check it in ${SETTINGS_HINT}.`, 400);
  }
  switch (httpStatus) {
    case 400:
      return new AiError(`Gemini could not handle the request${detail ? `: ${detail.slice(0, 200)}` : ''}.`, 400);
    case 404:
      return new AiError(`The selected model is not available on Gemini. Pick another one in ${SETTINGS_HINT}.`, 400);
    case 408:
    case 504:
      return new AiError('The model took too long to answer. Try again.', 504);
    case 429:
      return new AiError('Gemini is rate limited or the quota of your key is used up. Try again later.', 429);
    default:
      return new AiError(`Gemini returned an error${detail ? `: ${detail.slice(0, 200)}` : ''}.`, 502);
  }
}

/** Models sometimes wrap JSON in a Markdown fence even when asked not to. */
function unfence(text: string): string {
  const match = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/i.exec(text);
  return match ? match[1]! : text;
}

const JSON_INSTRUCTION = 'Respond with a single JSON object only: no Markdown, no code fences, no text around it.';

/** Sends one chat completion on the user's key. */
export async function aiChat(ctx: AiContext, input: AiChatRequest): Promise<AiChatResponse> {
  const settings = await loadSettings(ctx);
  if (!settings.encryptedKey) throw new AiError(`No AI key is set. Add your Gemini API key in ${SETTINGS_HINT}.`, 400);
  const used = await usedToday(ctx);
  if (used >= AI_LIMITS.dailyRequests) {
    throw new AiError(`The daily limit of ${AI_LIMITS.dailyRequests} AI calls is reached. It resets at midnight UTC.`, 429);
  }
  const apiKey = await decryptSecret(settings.encryptedKey, ctx.secret).catch(() => null);
  if (!apiKey) throw new AiError(`The stored AI key could not be read. Enter it again in ${SETTINGS_HINT}.`, 400);

  // Count before calling, so parallel or failing calls cannot slip past the limit.
  await ctx.usage.put(usageKey(ctx), String(used + 1), { expirationTtl: 2 * 24 * 60 * 60 });

  const messages = input.json ? [{ role: 'system' as const, content: JSON_INSTRUCTION }, ...input.messages] : input.messages;
  let response: Response;
  try {
    response = await ctx.fetch(GEMINI_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        messages,
        max_tokens: (input.maxTokens ?? AI_LIMITS.defaultOutputTokens) + THINKING_HEADROOM,
        ...(input.temperature !== undefined && { temperature: input.temperature }),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiError('Could not reach Gemini. Try again.', 504);
  }

  const text = await response.text();
  // Gemini sometimes wraps an error in a one-element array.
  let body: { choices?: { message?: { content?: unknown } }[]; model?: unknown; error?: { message?: unknown; code?: unknown } } = {};
  try {
    const parsed = JSON.parse(text);
    body = Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed;
  } catch {
    // Not JSON; handled below.
  }
  if (!response.ok || body.error) {
    const code = typeof body.error?.code === 'number' ? body.error.code : response.status;
    throw providerError(response.ok ? code : response.status, typeof body.error?.message === 'string' ? body.error.message : '');
  }
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content === '') throw new AiError('The model returned an empty answer. Try again or raise maxTokens.', 502);
  return { content: input.json ? unfence(content) : content, model: typeof body.model === 'string' ? body.model : settings.model, usedToday: used + 1 };
}

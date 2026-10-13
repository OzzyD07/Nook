import { z } from 'zod';

import { CardIdSchema } from './card';

/**
 * Card AI: HTML detail pages may call a model through nook.ai.chat (a chess opponent, a
 * quiz master). The calls run on the user's own Gemini API key, which the Worker stores
 * encrypted in Firestore and never returns; pages and the app only ever see answers.
 */
export const AI_LIMITS = {
  /** Calls per user per UTC day, so a runaway page cannot drain the key. */
  dailyRequests: 300,
  defaultOutputTokens: 800,
  maxOutputTokens: 4000,
  maxMessages: 60,
  maxMessageChars: 12_000,
  maxTotalChars: 48_000,
  keyMaxLength: 400,
  modelMaxLength: 120,
} as const;

/** The AI provider the stored key belongs to. */
export const AI_PROVIDER = 'gemini';

/** Gemini's most cost-effective text model; it thinks minimally by default. The user can pick another. */
export const DEFAULT_AI_MODEL = 'gemini-3.5-flash-lite';

export const AiModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(AI_LIMITS.modelMaxLength)
  .regex(/^gemini-[a-z0-9.-]+$/, 'Use a Gemini model id such as "gemini-3.5-flash-lite" or "gemini-3.8-flash"');

export const AiSettingsInput = z
  .object({
    apiKey: z.string().trim().min(10, 'That key looks too short').max(AI_LIMITS.keyMaxLength).optional(),
    model: AiModelSchema.optional(),
  })
  .refine((value) => value.apiKey !== undefined || value.model !== undefined, 'Pass apiKey or model');
export type AiSettingsInput = z.infer<typeof AiSettingsInput>;

export interface AiStatus {
  configured: boolean;
  /** Last characters of the key, so the user can tell which one is stored. */
  keyHint: string | null;
  model: string;
  usedToday: number;
  dailyLimit: number;
}

export const AiMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(AI_LIMITS.maxMessageChars),
});
export type AiMessage = z.infer<typeof AiMessageSchema>;

export const AiChatRequestSchema = z
  .object({
    cardId: CardIdSchema.optional(),
    messages: z.array(AiMessageSchema).min(1).max(AI_LIMITS.maxMessages),
    maxTokens: z.number().int().min(1).max(AI_LIMITS.maxOutputTokens).optional(),
    temperature: z.number().min(0).max(2).optional(),
    /** Ask the model for a JSON object. */
    json: z.boolean().optional(),
  })
  .refine(
    (value) => value.messages.reduce((total, message) => total + message.content.length, 0) <= AI_LIMITS.maxTotalChars,
    `Messages may hold at most ${AI_LIMITS.maxTotalChars} characters in total`,
  );
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export interface AiChatResponse {
  content: string;
  model: string;
  usedToday: number;
}

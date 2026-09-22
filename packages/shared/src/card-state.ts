import { z } from 'zod';

import { CardIdSchema } from './card';
import { IdempotencyKeySchema } from './tools';

/**
 * User input on interactive components (checklists, notes, choices, ratings) is stored
 * separately from the AI-written UI in users/{uid}/cardState/{cardId}, keyed by the
 * component id, so regenerating a card never wipes what the user entered.
 */
export const STATE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const CARD_STATE_LIMITS = {
  maxFields: 100,
  textMaxLength: 2000,
  maxChoices: 50,
  choiceMaxLength: 200,
  maxChecklistItems: 50,
} as const;

export const StateIdSchema = z
  .string()
  .regex(STATE_ID_PATTERN, 'ids are 1-40 characters of a-z, 0-9, _ or -, starting with a letter or digit');

/** Checklist: { itemId: checked } · TextInput: string · Choice: string[] · Rating: number. */
export const FieldValueSchema = z.union([
  z.string().max(CARD_STATE_LIMITS.textMaxLength),
  z.number().finite(),
  z.array(z.string().max(CARD_STATE_LIMITS.choiceMaxLength)).max(CARD_STATE_LIMITS.maxChoices),
  z.record(StateIdSchema, z.boolean()),
]);
export type FieldValue = z.infer<typeof FieldValueSchema>;

export interface CardStateField {
  value: FieldValue;
  updatedAt: number;
}

export interface CardState {
  fields: Record<string, CardStateField>;
  /** Set by the app's "request refresh" buttons; cleared by the AI after refreshing. */
  refreshRequestedAt: number | null;
  updatedAt: number | null;
}

export const EMPTY_CARD_STATE: CardState = { fields: {}, refreshRequestedAt: null, updatedAt: null };

export const UpdateCardStateInput = z.object({
  cardId: CardIdSchema,
  set: z
    .record(StateIdSchema, FieldValueSchema)
    .optional()
    .describe('Field values to write, keyed by component id (e.g. reset a habit checklist for a new week)'),
  clear: z.array(StateIdSchema).max(CARD_STATE_LIMITS.maxFields).optional().describe('Field ids to remove'),
  clearRefreshRequest: z.boolean().optional().describe('true after you refreshed a card whose refresh was requested'),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpdateCardStateInput = z.infer<typeof UpdateCardStateInput>;

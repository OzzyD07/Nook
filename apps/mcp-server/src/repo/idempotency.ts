import { LIMITS, NookError } from '@nook/shared';

import { FirestoreError, type Write } from '../firestore/client';
import type { ToolContext } from './context';
import { canonicalJson, sha256Hex } from './hash';

export interface Idempotent<R> {
  /** Writes that make up the operation; committed atomically with the idempotency record. */
  writes: Write[];
  result: R;
}

/**
 * Runs a write tool at most once per (tool, idempotencyKey). A retry with the same
 * key and payload gets the original result back; the same key with a different
 * payload is rejected. The record is created in the same commit as the change, so a
 * crash can never leave the change applied without its record (or the reverse).
 */
export async function runIdempotent<R>(
  ctx: ToolContext,
  tool: string,
  input: { idempotencyKey: string },
  build: () => Promise<Idempotent<R>>,
  onConflict: () => NookError,
): Promise<R & { replayed?: true }> {
  const { idempotencyKey, ...payload } = input;
  const id = (await sha256Hex(`${tool}:${idempotencyKey}`)).slice(0, 40);
  const requestHash = await sha256Hex(canonicalJson(payload));
  const path = ctx.paths.idempotency(id);

  const replay = async (): Promise<(R & { replayed: true }) | null> => {
    const record = await ctx.db.get(path);
    if (!record) return null;
    if (record.data.requestHash !== requestHash) {
      throw new NookError(
        'IDEMPOTENCY_KEY_REUSED',
        `idempotencyKey "${idempotencyKey}" was already used for a different ${tool} request. Use a new key for a new change.`,
      );
    }
    return { ...(JSON.parse(String(record.data.result)) as R), replayed: true };
  };

  const previous = await replay();
  if (previous) return previous;

  const { writes, result } = await build();
  const now = ctx.now();
  try {
    await ctx.db.commit([
      ...writes,
      ctx.db.set(
        path,
        {
          tool,
          requestHash,
          result: JSON.stringify(result),
          createdAt: now,
          expireAt: new Date(now.getTime() + LIMITS.idempotencyTtlMs),
        },
        { exists: false },
      ),
    ]);
  } catch (error) {
    if (error instanceof FirestoreError && error.isConflict) {
      // Either the same request raced us (return its result) or the card changed underneath us.
      const raced = await replay();
      if (raced) return raced;
      throw onConflict();
    }
    throw error;
  }
  return result as R & { replayed?: true };
}

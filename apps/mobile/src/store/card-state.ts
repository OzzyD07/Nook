import { EMPTY_CARD_STATE, type CardState, type FieldValue } from '@nook/shared';
import { create } from 'zustand';

/** A local change that has not been confirmed by Firestore yet. */
export interface PendingChange {
  fields: Record<string, { value: FieldValue; updatedAt: number }>;
  refreshRequestedAt?: number;
}

interface CardStateStore {
  uid: string | null;
  /** Last state seen from Firestore (or the device cache), per card. */
  remote: Record<string, CardState>;
  /** Local edits waiting in the outbox, per card. */
  pending: Record<string, PendingChange>;
  setRemote: (uid: string, remote: Record<string, CardState>) => void;
  setPending: (pending: Record<string, PendingChange>) => void;
  reset: () => void;
}

export const useCardStateStore = create<CardStateStore>()((set) => ({
  uid: null,
  remote: {},
  pending: {},
  setRemote: (uid, remote) => set({ uid, remote }),
  setPending: (pending) => set({ pending }),
  reset: () => set({ uid: null, remote: {}, pending: {} }),
}));

/** Remote state with unconfirmed local edits on top; the newer write wins per field. */
export function effectiveState(remote: CardState | undefined, pending: PendingChange | undefined): CardState {
  const base = remote ?? EMPTY_CARD_STATE;
  if (!pending) return base;
  const fields = { ...base.fields };
  for (const [id, change] of Object.entries(pending.fields)) {
    const current = fields[id];
    if (!current || change.updatedAt >= current.updatedAt) fields[id] = change;
  }
  const refreshRequestedAt = Math.max(base.refreshRequestedAt ?? 0, pending.refreshRequestedAt ?? 0) || null;
  return { fields, refreshRequestedAt, updatedAt: base.updatedAt };
}

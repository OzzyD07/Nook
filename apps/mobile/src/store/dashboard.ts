import type { Card } from '@nook/shared';
import { create } from 'zustand';

export type SyncState = 'idle' | 'cache' | 'live' | 'offline' | 'error';

interface DashboardState {
  uid: string | null;
  /** All cards including soft-deleted ones; screens filter as needed. */
  cards: Record<string, Card>;
  /** True once the on-device cache has been read for the current user. */
  hydrated: boolean;
  syncState: SyncState;
  lastSyncAt: number | null;
  error: string | null;
  hydrate: (uid: string, cards: Card[], lastSyncAt: number | null) => void;
  applySnapshot: (cards: Card[], fromCache: boolean) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initial = {
  uid: null,
  cards: {},
  hydrated: false,
  syncState: 'idle' as SyncState,
  lastSyncAt: null,
  error: null,
};

export const useDashboard = create<DashboardState>()((set, get) => ({
  ...initial,
  hydrate: (uid, cards, lastSyncAt) => {
    const state = get();
    // A live snapshot may already have arrived; never let the cache overwrite it.
    if (state.uid === uid && state.syncState === 'live') {
      set({ hydrated: true });
      return;
    }
    set({
      uid,
      cards: Object.fromEntries(cards.map((card) => [card.id, card])),
      hydrated: true,
      syncState: cards.length ? 'cache' : state.syncState,
      lastSyncAt,
    });
  },
  applySnapshot: (cards, fromCache) =>
    set({
      cards: Object.fromEntries(cards.map((card) => [card.id, card])),
      syncState: fromCache ? 'offline' : 'live',
      lastSyncAt: fromCache ? get().lastSyncAt : Date.now(),
      error: null,
    }),
  setError: (error) => set({ syncState: 'error', error }),
  reset: () => set(initial),
}));

export function activeCards(cards: Record<string, Card>): Card[] {
  return Object.values(cards)
    .filter((card) => card.deletedAt === null)
    .sort((a, b) => a.layout.order - b.layout.order || a.id.localeCompare(b.id));
}

export function deletedCards(cards: Record<string, Card>): Card[] {
  return Object.values(cards)
    .filter((card) => card.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

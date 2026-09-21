import type { Card } from '@nook/shared';
import { collection, onSnapshot } from 'firebase/firestore';

import { loadCachedCards, saveCachedCards } from '@/lib/cache';
import { firebase } from '@/lib/firebase';
import { useDashboard } from '@/store/dashboard';
import { toCard } from '@/services/mapping';

/**
 * Hydrates the dashboard from the device cache, then keeps it in sync with
 * users/{uid}/cards in realtime. Every server snapshot is written back to the cache.
 */
export function syncCards(uid: string): () => void {
  const store = useDashboard.getState();
  if (store.uid !== uid) store.reset();
  useDashboard.setState({ uid });

  let active = true;
  loadCachedCards(uid).then(({ cards, lastSyncAt }) => {
    if (active) useDashboard.getState().hydrate(uid, cards, lastSyncAt);
  });

  const unsubscribe = onSnapshot(
    collection(firebase().db, 'users', uid, 'cards'),
    { includeMetadataChanges: true },
    (snapshot) => {
      const cards = snapshot.docs.flatMap((doc): Card[] => {
        const card = toCard(doc.id, doc.data({ serverTimestamps: 'estimate' }));
        return card ? [card] : [];
      });
      const fromCache = snapshot.metadata.fromCache;
      // The JS SDK has no persistent cache on React Native, so an empty snapshot from
      // its memory cache means "not loaded yet", not "no cards". Keep the device cache.
      if (fromCache && cards.length === 0) return;
      useDashboard.getState().applySnapshot(cards, fromCache);
      if (!fromCache) saveCachedCards(uid, cards, Date.now()).catch(() => undefined);
    },
    (error) => useDashboard.getState().setError(error.message),
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

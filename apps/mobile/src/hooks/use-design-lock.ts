import type { Card } from '@nook/shared';

import { strings } from '@/constants/strings';
import { confirmAsync, showError } from '@/lib/confirm';
import { setDesignLock } from '@/services/versions';
import { useSession } from '@/store/session';

/** Toggles a card's design lock. Locking is instant; unlocking hands the design back to the AI, so it asks first. */
export function useDesignLockToggle(card: Card | undefined) {
  const uid = useSession((state) => state.user?.uid);
  return async () => {
    if (!uid || !card) return;
    const locked = card.designLocked;
    if (locked && !(await confirmAsync(strings.card.unlockTitle, strings.card.unlockBody, strings.card.unlockDesign))) return;
    setDesignLock(uid, card.id, !locked).catch(showError);
  };
}

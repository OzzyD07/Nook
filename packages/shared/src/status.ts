import type { CadenceUnit, CardAutomation, CardStatus, StoredCardStatus } from './card';

const UNIT_MS: Record<CadenceUnit, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

/** A scheduled card is stale once it missed this many consecutive runs. */
export const STALE_AFTER_MISSED_RUNS = 3;

export function cadenceToMs(cadence: NonNullable<CardAutomation['cadence']>): number {
  return cadence.every * UNIT_MS[cadence.unit];
}

/**
 * Stale is derived, never stored: there is no backend scheduler that could flip it,
 * so the Worker and the app both compute it from `updatedAt` and the cadence.
 */
export function deriveStatus(
  card: { status: StoredCardStatus; updatedAt: number; automation: CardAutomation | null },
  now: number,
): CardStatus {
  if (card.status === 'error') return 'error';
  const cadence = card.automation?.cadence;
  if (cadence && now - card.updatedAt > STALE_AFTER_MISSED_RUNS * cadenceToMs(cadence)) {
    return 'stale';
  }
  return 'active';
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '@nook/shared';

/**
 * Offline snapshot of the dashboard. One key per card keeps each write small and
 * lets unchanged cards be skipped; the index key lists the ids and the last sync time.
 */
const PREFIX = 'nook:v1';
const indexKey = (uid: string) => `${PREFIX}:${uid}:index`;
const cardKey = (uid: string, id: string) => `${PREFIX}:${uid}:card:${id}`;

interface CacheIndex {
  ids: string[];
  /** id -> fingerprint of the cached copy. */
  fingerprints: Record<string, string>;
  lastSyncAt: number | null;
}

const fingerprint = (card: Card) =>
  `${card.version}:${card.updatedAt}:${card.deletedAt ?? ''}:${card.layout.columnSpan}x${card.layout.rowSpan}@${card.layout.order}:${card.status}:${card.title}:${JSON.stringify(card.automation)}`;

async function readIndex(uid: string): Promise<CacheIndex | null> {
  const raw = await AsyncStorage.getItem(indexKey(uid));
  return raw ? (JSON.parse(raw) as CacheIndex) : null;
}

export async function loadCachedCards(uid: string): Promise<{ cards: Card[]; lastSyncAt: number | null }> {
  try {
    const index = await readIndex(uid);
    if (!index) return { cards: [], lastSyncAt: null };
    const entries = await AsyncStorage.multiGet(index.ids.map((id) => cardKey(uid, id)));
    const cards = entries.flatMap(([, value]) => (value ? [JSON.parse(value) as Card] : []));
    return { cards, lastSyncAt: index.lastSyncAt };
  } catch {
    return { cards: [], lastSyncAt: null };
  }
}

export async function saveCachedCards(uid: string, cards: Card[], lastSyncAt: number | null): Promise<void> {
  const previous = (await readIndex(uid)) ?? { ids: [], fingerprints: {}, lastSyncAt: null };
  const fingerprints: Record<string, string> = {};
  const changed: [string, string][] = [];
  for (const card of cards) {
    const print = fingerprint(card);
    fingerprints[card.id] = print;
    if (previous.fingerprints[card.id] !== print) changed.push([cardKey(uid, card.id), JSON.stringify(card)]);
  }
  const removed = previous.ids.filter((id) => !(id in fingerprints)).map((id) => cardKey(uid, id));
  if (changed.length) await AsyncStorage.multiSet(changed);
  if (removed.length) await AsyncStorage.multiRemove(removed);
  const index: CacheIndex = { ids: Object.keys(fingerprints), fingerprints, lastSyncAt };
  await AsyncStorage.setItem(indexKey(uid), JSON.stringify(index));
}

export async function clearCache(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(`${PREFIX}:`));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

/** Approximate size of the cached snapshot in bytes. */
export async function cacheSize(): Promise<number> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(`${PREFIX}:`));
  const entries = await AsyncStorage.multiGet(keys);
  return entries.reduce((total, [key, value]) => total + key.length + (value?.length ?? 0), 0);
}

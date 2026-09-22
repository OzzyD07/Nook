import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldValueSchema, type CardState, type FieldValue } from '@nook/shared';
import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp, type DocumentData } from 'firebase/firestore';
import { AppState } from 'react-native';

import { firebase } from '@/lib/firebase';
import { millis } from '@/services/mapping';
import { useCardStateStore, type PendingChange } from '@/store/card-state';

/**
 * User input on interactive components. Edits apply locally at once, are kept in a
 * persisted outbox and written to users/{uid}/cardState/{cardId}; the outbox is retried
 * on start, when the app returns to the foreground and whenever the server is reachable.
 */
const remoteKey = (uid: string) => `nook:v1:${uid}:cardState`;
const outboxKey = (uid: string) => `nook:v1:${uid}:outbox`;

function toCardState(data: DocumentData): CardState {
  const fields: CardState['fields'] = {};
  const raw = (data.fields ?? {}) as Record<string, { value?: unknown; updatedAt?: unknown }>;
  for (const [id, field] of Object.entries(raw)) {
    const value = FieldValueSchema.safeParse(field?.value);
    if (value.success) fields[id] = { value: value.data, updatedAt: millis(field.updatedAt) ?? 0 };
  }
  return { fields, refreshRequestedAt: millis(data.refreshRequestedAt), updatedAt: millis(data.updatedAt) };
}

async function persistPending(uid: string, pending: Record<string, PendingChange>): Promise<void> {
  await AsyncStorage.setItem(outboxKey(uid), JSON.stringify(pending));
}

let flushing = false;

/** Sends every pending change; each one leaves the outbox only after Firestore accepted it. */
export async function flushOutbox(): Promise<void> {
  const { uid, pending } = useCardStateStore.getState();
  if (!uid || flushing || Object.keys(pending).length === 0) return;
  flushing = true;
  let sentAll = false;
  try {
    for (const [cardId, change] of Object.entries(pending)) {
      const fields = Object.fromEntries(
        Object.entries(change.fields).map(([id, field]) => [id, { value: field.value, updatedAt: Timestamp.fromMillis(field.updatedAt) }]),
      );
      await setDoc(
        doc(firebase().db, 'users', uid, 'cardState', cardId),
        {
          fields,
          ...(change.refreshRequestedAt ? { refreshRequestedAt: Timestamp.fromMillis(change.refreshRequestedAt) } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      // Drop only what was sent; edits made while this write was in flight stay queued.
      const latest = { ...useCardStateStore.getState().pending };
      const current = latest[cardId];
      if (current) {
        const fields = Object.fromEntries(
          Object.entries(current.fields).filter(([id, field]) => field.updatedAt !== change.fields[id]?.updatedAt),
        );
        const refreshRequestedAt =
          current.refreshRequestedAt !== change.refreshRequestedAt ? current.refreshRequestedAt : undefined;
        if (Object.keys(fields).length === 0 && refreshRequestedAt === undefined) delete latest[cardId];
        else latest[cardId] = { fields, ...(refreshRequestedAt !== undefined && { refreshRequestedAt }) };
      }
      useCardStateStore.getState().setPending(latest);
      await persistPending(uid, latest);
    }
    sentAll = true;
  } catch {
    // Offline or rejected: keep the outbox and retry on the next trigger.
  } finally {
    flushing = false;
  }
  if (sentAll && Object.keys(useCardStateStore.getState().pending).length > 0) await flushOutbox();
}

function enqueue(cardId: string, change: (current: PendingChange) => PendingChange): void {
  const { uid, pending } = useCardStateStore.getState();
  if (!uid) return;
  const next = { ...pending, [cardId]: change(pending[cardId] ?? { fields: {} }) };
  useCardStateStore.getState().setPending(next);
  persistPending(uid, next)
    .then(flushOutbox)
    .catch(() => undefined);
}

export function setField(cardId: string, id: string, value: FieldValue): void {
  enqueue(cardId, (current) => ({ ...current, fields: { ...current.fields, [id]: { value, updatedAt: Date.now() } } }));
}

export function requestRefresh(cardId: string): void {
  enqueue(cardId, (current) => ({ ...current, refreshRequestedAt: Date.now() }));
}

/** Loads cached state and the outbox, then mirrors users/{uid}/cardState in realtime. */
export function syncCardState(uid: string): () => void {
  const store = useCardStateStore.getState();
  if (store.uid !== uid) {
    store.reset();
    useCardStateStore.setState({ uid });
  }
  let active = true;
  let receivedSnapshot = false;

  Promise.all([AsyncStorage.getItem(remoteKey(uid)), AsyncStorage.getItem(outboxKey(uid))])
    .then(([remote, outbox]) => {
      if (!active) return;
      const state = useCardStateStore.getState();
      if (!receivedSnapshot && remote) state.setRemote(uid, JSON.parse(remote) as Record<string, CardState>);
      if (outbox) {
        // Edits made before the outbox finished loading are newer, so they win per field.
        const merged = { ...(JSON.parse(outbox) as Record<string, PendingChange>) };
        for (const [cardId, change] of Object.entries(state.pending)) {
          const saved = merged[cardId];
          merged[cardId] = saved
            ? { fields: { ...saved.fields, ...change.fields }, refreshRequestedAt: change.refreshRequestedAt ?? saved.refreshRequestedAt }
            : change;
        }
        state.setPending(merged);
      }
      flushOutbox();
    })
    .catch(() => undefined);

  const unsubscribe = onSnapshot(
    collection(firebase().db, 'users', uid, 'cardState'),
    (snapshot) => {
      if (snapshot.metadata.fromCache && snapshot.empty) return;
      receivedSnapshot = true;
      const remote = Object.fromEntries(snapshot.docs.map((snap) => [snap.id, toCardState(snap.data({ serverTimestamps: 'estimate' }))]));
      useCardStateStore.getState().setRemote(uid, remote);
      if (!snapshot.metadata.fromCache) {
        AsyncStorage.setItem(remoteKey(uid), JSON.stringify(remote)).catch(() => undefined);
        flushOutbox();
      }
    },
    () => undefined,
  );

  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') flushOutbox();
  });

  return () => {
    active = false;
    unsubscribe();
    appState.remove();
  };
}

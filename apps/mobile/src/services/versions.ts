import type { AuditLogEntry, Card, CardVersion } from '@nook/shared';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { firebase } from '@/lib/firebase';
import { millis, toCardVersion } from '@/services/mapping';

const APP_ACTOR = { clientId: 'app', clientName: 'Nook app' };

export async function listVersions(uid: string, cardId: string): Promise<CardVersion[]> {
  const snapshot = await getDocs(
    query(
      collection(firebase().db, 'users', uid, 'cardVersions'),
      where('cardId', '==', cardId),
      orderBy('version', 'desc'),
      limit(20),
    ),
  );
  return snapshot.docs.map((snap) => toCardVersion(snap.data()));
}

/**
 * Rolls a card back to an earlier version. This writes a new version (current + 1)
 * so AI writers holding the old version number get VERSION_CONFLICT and re-read.
 */
export async function restoreVersion(uid: string, cardId: string, target: CardVersion): Promise<void> {
  const { db } = firebase();
  const cardRef = doc(db, 'users', uid, 'cards', cardId);
  await runTransaction(db, async (tx) => {
    const current = await tx.get(cardRef);
    if (!current.exists()) throw new Error('Card no longer exists');
    const version = Number(current.data().version) + 1;
    tx.update(cardRef, {
      previewUi: target.previewUi,
      detailUi: target.detailUi,
      pages: target.pages,
      sources: target.sources,
      version,
      status: 'active',
      statusMessage: null,
      updatedAt: serverTimestamp(),
      lastUpdatedBy: APP_ACTOR,
    });
    tx.set(doc(db, 'users', uid, 'cardVersions', `${cardId}_v${version}`), {
      cardId,
      version,
      previewUi: target.previewUi,
      detailUi: target.detailUi,
      pages: target.pages,
      sources: target.sources,
      createdAt: serverTimestamp(),
      createdBy: APP_ACTOR,
      restoredFrom: target.version,
    });
    tx.set(doc(collection(db, 'users', uid, 'auditLogs')), audit('restore_version', cardId));
  });
}

/**
 * Locks or unlocks a card's design. While locked, the AI may only refresh its data; only
 * the app can unlock (see firestore.rules and the Worker's design check).
 */
export async function setDesignLock(uid: string, cardId: string, locked: boolean): Promise<void> {
  const { db } = firebase();
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, 'users', uid, 'cards', cardId), {
      designLocked: locked,
      designLockedAt: locked ? serverTimestamp() : null,
    });
    tx.set(doc(collection(db, 'users', uid, 'auditLogs')), audit(locked ? 'lock_card_design' : 'unlock_card_design', cardId));
  });
}

export async function restoreDeletedCard(uid: string, card: Card): Promise<void> {
  const { db } = firebase();
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, 'users', uid, 'cards', card.id), { deletedAt: null });
    tx.set(doc(collection(db, 'users', uid, 'auditLogs')), audit('restore_card', card.id));
  });
}

function audit(action: string, cardId: string) {
  return {
    provider: 'app',
    clientId: 'app',
    action,
    cardId,
    result: 'success',
    errorCode: null,
    requestId: `app-${Date.now().toString(36)}`,
    timestamp: serverTimestamp(),
  };
}

export async function listAuditLogs(uid: string): Promise<AuditLogEntry[]> {
  const snapshot = await getDocs(
    query(collection(firebase().db, 'users', uid, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50)),
  );
  return snapshot.docs.map((snap) => {
    const data = snap.data();
    return {
      provider: String(data.provider ?? ''),
      clientId: typeof data.clientId === 'string' ? data.clientId : null,
      action: String(data.action ?? ''),
      cardId: typeof data.cardId === 'string' ? data.cardId : null,
      result: data.result === 'success' || data.result === 'rejected' ? data.result : 'error',
      errorCode: typeof data.errorCode === 'string' ? data.errorCode : null,
      requestId: String(data.requestId ?? snap.id),
      timestamp: millis(data.timestamp) ?? 0,
    };
  });
}

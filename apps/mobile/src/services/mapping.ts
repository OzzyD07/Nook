import {
  CardAutomationSchema,
  CardLayoutSchema,
  CardPageSchema,
  CardSourceSchema,
  type Card,
  type CardActor,
  type CardVersion,
} from '@nook/shared';
import { Timestamp, type DocumentData } from 'firebase/firestore';

export function millis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'seconds' in value) {
    const { seconds, nanoseconds } = value as { seconds: number; nanoseconds?: number };
    return seconds * 1000 + Math.floor((nanoseconds ?? 0) / 1e6);
  }
  return null;
}

function actor(value: unknown): CardActor | null {
  if (!value || typeof value !== 'object') return null;
  const { clientId, clientName } = value as Record<string, unknown>;
  return typeof clientId === 'string' ? { clientId, clientName: String(clientName ?? clientId) } : null;
}

function sources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((source) => {
    const parsed = CardSourceSchema.safeParse(source);
    return parsed.success ? [parsed.data] : [];
  });
}

function pages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((page) => {
    const parsed = CardPageSchema.safeParse(page);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Tolerant conversion from a Firestore card document; returns null for unusable documents. */
export function toCard(id: string, data: DocumentData): Card | null {
  const layout = CardLayoutSchema.safeParse(data.layout);
  if (!layout.success || typeof data.previewUi !== 'string' || typeof data.detailUi !== 'string') return null;
  const automation = data.automation ? CardAutomationSchema.safeParse(data.automation) : null;
  // A pending serverTimestamp() reads as null locally; treat it as "now".
  const updatedAt = millis(data.updatedAt) ?? Date.now();
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    layout: layout.data,
    previewUi: data.previewUi,
    detailUi: data.detailUi,
    pages: pages(data.pages),
    sources: sources(data.sources),
    automation: automation?.success ? automation.data : null,
    status: data.status === 'error' ? 'error' : 'active',
    statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : null,
    version: typeof data.version === 'number' ? data.version : 1,
    createdAt: millis(data.createdAt) ?? updatedAt,
    updatedAt,
    deletedAt: millis(data.deletedAt),
    lastUpdatedBy: actor(data.lastUpdatedBy),
    designLocked: data.designLocked === true,
    designLockedAt: millis(data.designLockedAt),
  };
}

export function toCardVersion(data: DocumentData): CardVersion {
  return {
    cardId: String(data.cardId),
    version: Number(data.version),
    previewUi: String(data.previewUi ?? ''),
    detailUi: String(data.detailUi ?? ''),
    pages: pages(data.pages),
    sources: sources(data.sources),
    createdAt: millis(data.createdAt) ?? 0,
    createdBy: actor(data.createdBy),
    restoredFrom: typeof data.restoredFrom === 'number' ? data.restoredFrom : null,
  };
}

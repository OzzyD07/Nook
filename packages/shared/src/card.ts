import { z } from 'zod';

import { GRID, LIMITS } from './limits';
import { isHttpsUrl } from './url';

export const HttpsUrlSchema = z
  .string()
  .max(LIMITS.urlMaxLength)
  .refine(isHttpsUrl, { message: 'Must be an absolute https:// URL without credentials' });

export const CardIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Card ids are 1-64 characters of A-Z, a-z, 0-9, _ or -');

export const CardLayoutSchema = z.object({
  columnSpan: z
    .number()
    .int()
    .min(GRID.columnSpan.min)
    .max(GRID.columnSpan.max)
    .describe('Width in grid columns: 1 = half width, 2 = full width on phones'),
  rowSpan: z
    .number()
    .int()
    .min(GRID.rowSpan.min)
    .max(GRID.rowSpan.max)
    .describe('Height in grid rows (1-3). One row is roughly a square half-width tile'),
  order: z.number().int().min(0).describe('Position on the dashboard, ascending'),
});
export type CardLayout = z.infer<typeof CardLayoutSchema>;

export const CardSourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: HttpsUrlSchema,
  publisher: z.string().trim().max(100).optional(),
});
export type CardSource = z.infer<typeof CardSourceSchema>;

/** Ids of sub-pages, used in nook.openPage("id") and <a href="nook-page:id">. */
export const PAGE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * A sub-page of a card: a complete HTML page the detail page (or another sub-page)
 * opens on its own screen, e.g. one game of a "Games" card.
 */
export const CardPageSchema = z.object({
  id: z.string().regex(PAGE_ID_PATTERN, 'Page ids are 1-40 characters of a-z, 0-9, _ or -'),
  title: z.string().trim().min(1).max(LIMITS.titleMaxLength).describe('Shown in the header of the sub-page'),
  html: z.string().min(1).describe('A complete HTML page starting with <!doctype html>, same rules as an HTML detailUi'),
});
export type CardPage = z.infer<typeof CardPageSchema>;

export const CadenceUnitSchema = z.enum(['hour', 'day', 'week']);
export type CadenceUnit = z.infer<typeof CadenceUnitSchema>;

export const CardAutomationSchema = z.object({
  provider: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe('Which AI host runs the schedule, e.g. "claude", "chatgpt", "gemini"'),
  description: z.string().trim().max(500).optional().describe('What the scheduled task does'),
  scheduleText: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe('Human readable schedule, e.g. "Every day at 09:00"'),
  cadence: z
    .object({
      every: z.number().int().min(1).max(1000),
      unit: CadenceUnitSchema,
    })
    .optional()
    .describe('Machine readable interval; used to flag the card as stale when updates stop'),
});
export type CardAutomation = z.infer<typeof CardAutomationSchema>;

/** Status as stored. `stale` is never stored; see deriveStatus(). */
export const StoredCardStatusSchema = z.enum(['active', 'error']);
export type StoredCardStatus = z.infer<typeof StoredCardStatusSchema>;
export type CardStatus = StoredCardStatus | 'stale';

export interface CardActor {
  clientId: string;
  clientName: string;
}

/**
 * A dashboard card as exchanged between the MCP server and the app.
 * Timestamps are epoch milliseconds; Firestore stores them as Timestamps.
 */
export interface Card {
  id: string;
  title: string;
  layout: CardLayout;
  previewUi: string;
  detailUi: string;
  /** Sub-pages the HTML detail page opens; empty for most cards. */
  pages: CardPage[];
  sources: CardSource[];
  automation: CardAutomation | null;
  status: StoredCardStatus;
  statusMessage: string | null;
  /** Content version; increments on every previewUi/detailUi change. */
  version: number;
  createdAt: number;
  /** Time of the last content update. Layout and metadata changes do not touch it. */
  updatedAt: number;
  deletedAt: number | null;
  lastUpdatedBy: CardActor | null;
  /**
   * Set by the user. While locked, the AI may refresh the card's data but not change its
   * design, size or position, nor delete it. Only the app can unlock a card.
   */
  designLocked: boolean;
  designLockedAt: number | null;
}

export interface CardVersion {
  cardId: string;
  version: number;
  previewUi: string;
  detailUi: string;
  pages: CardPage[];
  sources: CardSource[];
  createdAt: number;
  createdBy: CardActor | null;
  restoredFrom: number | null;
}

export interface AuditLogEntry {
  provider: string;
  clientId: string | null;
  action: string;
  cardId: string | null;
  result: 'success' | 'rejected' | 'error';
  errorCode: string | null;
  requestId: string;
  timestamp: number;
}

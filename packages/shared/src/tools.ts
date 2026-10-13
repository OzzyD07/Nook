import { z } from 'zod';

import {
  CardAutomationSchema,
  CardIdSchema,
  CardLayoutSchema,
  CardPageSchema,
  CardSourceSchema,
  StoredCardStatusSchema,
  type CardAutomation,
  type CardLayout,
  type CardStatus,
} from './card';
import { GRID, LIMITS } from './limits';

export const IdempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Use 8-128 characters of A-Z, a-z, 0-9, ., _, : or -')
  .describe(
    'Unique key for this logical operation. Reuse the same key when retrying the same request; ' +
      'use a new key for every new change (e.g. "<card>-<date>-<run>").',
  );

const TitleSchema = z.string().trim().min(1).max(LIMITS.titleMaxLength);
const SourcesSchema = z.array(CardSourceSchema).max(LIMITS.maxSources);
const PreviewUiSchema = z
  .string()
  .min(1)
  .describe('OpenUI Lang document for the dashboard tile, using the Card component library');
const DetailUiSchema = z
  .string()
  .min(1)
  .describe(
    'Full-screen detail page: preferably a complete HTML page starting with <!doctype html> (see htmlDetail in ' +
      'get_ui_capabilities), or an OpenUI Lang document using the Detail component library',
  );
const PagesSchema = z
  .array(CardPageSchema)
  .max(LIMITS.maxPages)
  .describe(
    'Sub-pages of an HTML detail page, each opened on its own screen with nook.openPage("id") or <a href="nook-page:id"> ' +
      '(e.g. one page per game on a "Games" card). Omit to keep the current pages; pass [] to remove them',
  );

export const GetCardInput = z.object({ cardId: CardIdSchema });

export const ValidateUiInput = z.object({
  surface: z.enum(['card', 'detail']).describe('"card" for previewUi, "detail" for detailUi'),
  ui: z.string().describe('Document to check: OpenUI Lang, or an HTML page for the detail surface'),
});

export const CreateCardInput = z.object({
  title: TitleSchema,
  layout: CardLayoutSchema.omit({ order: true }).extend({
    order: CardLayoutSchema.shape.order.optional().describe('Omit to append at the end'),
  }),
  previewUi: PreviewUiSchema,
  detailUi: DetailUiSchema,
  pages: PagesSchema.optional(),
  sources: SourcesSchema.optional(),
  automation: CardAutomationSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});

export const UpdateCardInput = z.object({
  cardId: CardIdSchema,
  title: TitleSchema.optional(),
  status: StoredCardStatusSchema.optional().describe(
    'Set "error" when a scheduled refresh failed, "active" once it works again',
  ),
  statusMessage: z.string().trim().max(LIMITS.statusMessageMaxLength).nullable().optional(),
  idempotencyKey: IdempotencyKeySchema,
});

export const UpdateCardContentInput = z.object({
  cardId: CardIdSchema,
  expectedVersion: z
    .number()
    .int()
    .min(1)
    .describe('The card version you read with get_card. The update is rejected if it changed since'),
  previewUi: PreviewUiSchema,
  detailUi: DetailUiSchema,
  pages: PagesSchema.optional(),
  sources: SourcesSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});

export const DeleteCardInput = z.object({
  cardId: CardIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export const MoveCardInput = z.object({
  cardId: CardIdSchema,
  position: z.number().int().min(0).describe('New zero-based position among the dashboard cards'),
  idempotencyKey: IdempotencyKeySchema,
});

export const ResizeCardInput = z.object({
  cardId: CardIdSchema,
  columnSpan: CardLayoutSchema.shape.columnSpan,
  rowSpan: CardLayoutSchema.shape.rowSpan,
  idempotencyKey: IdempotencyKeySchema,
});

export const LockCardDesignInput = z.object({
  cardId: CardIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export const RegisterAutomationInput = z.object({
  cardId: CardIdSchema,
  automation: CardAutomationSchema.nullable().describe('Pass null to clear the automation info'),
  idempotencyKey: IdempotencyKeySchema,
});

export type GetCardInput = z.infer<typeof GetCardInput>;
export type ValidateUiInput = z.infer<typeof ValidateUiInput>;
export type CreateCardInput = z.infer<typeof CreateCardInput>;
export type UpdateCardInput = z.infer<typeof UpdateCardInput>;
export type UpdateCardContentInput = z.infer<typeof UpdateCardContentInput>;
export type DeleteCardInput = z.infer<typeof DeleteCardInput>;
export type MoveCardInput = z.infer<typeof MoveCardInput>;
export type ResizeCardInput = z.infer<typeof ResizeCardInput>;
export type RegisterAutomationInput = z.infer<typeof RegisterAutomationInput>;
export type LockCardDesignInput = z.infer<typeof LockCardDesignInput>;

export interface DashboardCardSummary {
  id: string;
  title: string;
  layout: CardLayout;
  status: CardStatus;
  version: number;
  automation: CardAutomation | null;
  updatedAt: string;
  /** The user locked the design: refresh the data only, keep everything else as it is. */
  designLocked: boolean;
  /** Set when the user tapped a "request refresh" button and you have not cleared it yet. */
  refreshRequestedAt?: string;
  /** Last time the user changed a checklist, note, choice or rating on this card. */
  userStateUpdatedAt?: string;
}

export interface DashboardResponse {
  cards: DashboardCardSummary[];
  grid: { phoneColumns: number; tabletColumns: number };
  limits: { maxCards: number; remaining: number };
}

export const DASHBOARD_GRID = {
  phoneColumns: GRID.phoneColumns,
  tabletColumns: GRID.tabletColumns,
} as const;

import { designChanges, validateUi, type DesignChange, type UiIssue } from '@nook/openui';
import {
  CardAutomationSchema,
  CardLayoutSchema,
  CardSourceSchema,
  deriveStatus,
  LIMITS,
  NookError,
  type Card,
  type CardActor,
  type CreateCardInput,
  type DeleteCardInput,
  type LockCardDesignInput,
  type MoveCardInput,
  type RegisterAutomationInput,
  type ResizeCardInput,
  type UiSurface,
  type UpdateCardContentInput,
  type UpdateCardInput,
} from '@nook/shared';

import type { StoredDocument, Write } from '../firestore/client';
import { auditWrite } from './audit';
import type { ToolContext } from './context';
import { randomId } from './hash';
import { runIdempotent } from './idempotency';

const millis = (value: unknown): number | null => (value instanceof Date ? value.getTime() : null);

function toCard(doc: StoredDocument): Card {
  const data = doc.data;
  const automation = CardAutomationSchema.safeParse(data.automation);
  const actor = data.lastUpdatedBy as CardActor | null | undefined;
  return {
    id: doc.path.split('/').pop()!,
    title: String(data.title ?? ''),
    layout: CardLayoutSchema.parse(data.layout),
    previewUi: String(data.previewUi ?? ''),
    detailUi: String(data.detailUi ?? ''),
    sources: Array.isArray(data.sources)
      ? data.sources.flatMap((source) => {
          const parsed = CardSourceSchema.safeParse(source);
          return parsed.success ? [parsed.data] : [];
        })
      : [],
    automation: data.automation && automation.success ? automation.data : null,
    status: data.status === 'error' ? 'error' : 'active',
    statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : null,
    version: Number(data.version ?? 1),
    createdAt: millis(data.createdAt) ?? 0,
    updatedAt: millis(data.updatedAt) ?? 0,
    deletedAt: millis(data.deletedAt),
    lastUpdatedBy: actor?.clientId ? { clientId: actor.clientId, clientName: actor.clientName } : null,
    designLocked: data.designLocked === true,
    designLockedAt: millis(data.designLockedAt),
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Card shape returned to the AI: timestamps as ISO strings, derived status. */
export function presentCard(card: Card, now: number) {
  return {
    id: card.id,
    title: card.title,
    layout: card.layout,
    status: deriveStatus(card, now),
    statusMessage: card.statusMessage,
    version: card.version,
    previewUi: card.previewUi,
    detailUi: card.detailUi,
    sources: card.sources,
    automation: card.automation,
    designLocked: card.designLocked,
    createdAt: iso(card.createdAt),
    updatedAt: iso(card.updatedAt),
  };
}

const UNLOCK_HINT = 'Only the user can unlock it, in the Nook app (card page, lock button); do not try to work around the lock.';

/** Rejects layout changes and deletion of a card whose design the user locked. */
function requireUnlocked(card: Card, action: string): void {
  if (card.designLocked) {
    throw new NookError('DESIGN_LOCKED', `The user locked the design of card "${card.id}", so you cannot ${action} it. ${UNLOCK_HINT}`);
  }
}

/** On a locked card, content updates may change data only; see designChanges(). */
function requireSameDesign(card: Card, previewUi: string, detailUi: string): void {
  if (!card.designLocked) return;
  const changes: Record<string, DesignChange[]> = {};
  const preview = designChanges('card', card.previewUi, previewUi);
  const detail = designChanges('detail', card.detailUi, detailUi);
  if (preview.length) changes.previewUi = preview;
  if (detail.length) changes.detailUi = detail;
  if (!preview.length && !detail.length) return;
  const listed = [...preview.map((c) => ['previewUi', c] as const), ...detail.map((c) => ['detailUi', c] as const)]
    .slice(0, 12)
    .map(([field, change]) => `- ${field} ${change.path}: ${change.message}`)
    .join('\n');
  throw new NookError(
    'DESIGN_LOCKED',
    `The user locked the design of card "${card.id}". You may update its data (text, numbers, value lists, links, images, ` +
      `icon names) but the design must stay exactly as it is. Design changes found:\n${listed}\n\n` +
      `Start from the current previewUi and detailUi in get_card and change only the data. ${UNLOCK_HINT}`,
    { changes },
  );
}

export async function listCards(ctx: ToolContext): Promise<Card[]> {
  const docs = await ctx.db.query(ctx.paths.root, { collection: 'cards', limit: 500 });
  return docs.map(toCard).sort((a, b) => a.layout.order - b.layout.order || a.id.localeCompare(b.id));
}

async function loadCard(ctx: ToolContext, cardId: string): Promise<{ card: Card; doc: StoredDocument }> {
  const doc = await ctx.db.get(ctx.paths.card(cardId));
  if (!doc) throw new NookError('CARD_NOT_FOUND', `No card with id "${cardId}". Call get_dashboard for current ids.`);
  const card = toCard(doc);
  if (card.deletedAt !== null) throw new NookError('CARD_NOT_FOUND', `Card "${cardId}" was deleted.`);
  return { card, doc };
}

export async function getCard(ctx: ToolContext, cardId: string): Promise<Card> {
  return (await loadCard(ctx, cardId)).card;
}

function formatIssues(issues: UiIssue[]): string {
  return issues
    .slice(0, 12)
    .map((issue) => `- ${issue.path ? `${issue.path}: ` : ''}${issue.message}`)
    .join('\n');
}

/** Server-side validation of both documents; mandatory regardless of validate_ui calls. */
function requireValidUi(previewUi: string, detailUi: string): void {
  const failures: { field: string; surface: UiSurface; issues: UiIssue[] }[] = [];
  for (const [field, surface, source] of [
    ['previewUi', 'card', previewUi],
    ['detailUi', 'detail', detailUi],
  ] as const) {
    const result = validateUi(surface, source);
    if (!result.ok) failures.push({ field, surface, issues: result.errors });
  }
  if (failures.length > 0) {
    throw new NookError(
      'UI_INVALID',
      failures.map((f) => `${f.field} is not a valid ${f.surface} document:\n${formatIssues(f.issues)}`).join('\n\n') +
        '\n\nCall get_ui_capabilities for the component reference.',
      { issues: Object.fromEntries(failures.map((f) => [f.field, f.issues])) },
    );
  }
}

function actor(ctx: ToolContext): CardActor {
  return { clientId: ctx.clientId, clientName: ctx.clientName };
}

function versionWrite(ctx: ToolContext, cardId: string, version: number, content: Pick<Card, 'previewUi' | 'detailUi' | 'sources'>): Write {
  return ctx.db.set(
    ctx.paths.cardVersion(cardId, version),
    {
      cardId,
      version,
      previewUi: content.previewUi,
      detailUi: content.detailUi,
      sources: content.sources,
      createdAt: ctx.now(),
      createdBy: actor(ctx),
      restoredFrom: null,
    },
    { exists: false },
  );
}

/** Deletes versions beyond the retention limit, after the response is sent. */
function pruneVersions(ctx: ToolContext, cardId: string): void {
  const task = ctx.db
    .query(ctx.paths.root, {
      collection: 'cardVersions',
      where: [{ field: 'cardId', op: 'EQUAL', value: cardId }],
      orderBy: [{ field: 'version', direction: 'DESCENDING' }],
      offset: LIMITS.versionsRetained,
      limit: 50,
    })
    .then((old) => (old.length ? ctx.db.commit(old.map((doc) => ctx.db.remove(doc.path))) : undefined))
    .catch(() => undefined);
  ctx.waitUntil(task);
}

const conflict = (cardId: string) => () =>
  new NookError('VERSION_CONFLICT', `Card "${cardId}" changed while this request was being applied. Call get_card and retry with the new version.`);

export async function createCard(ctx: ToolContext, input: CreateCardInput) {
  requireValidUi(input.previewUi, input.detailUi);
  return runIdempotent(
    ctx,
    'create_card',
    input,
    async () => {
      const cards = (await listCards(ctx)).filter((card) => card.deletedAt === null);
      if (cards.length >= LIMITS.maxCards) {
        throw new NookError('CARD_LIMIT_REACHED', `The dashboard already has ${LIMITS.maxCards} cards. Delete or reuse one first.`);
      }
      const id = randomId();
      const now = ctx.now();
      const order = input.layout.order ?? (cards.length ? Math.max(...cards.map((c) => c.layout.order)) + 1 : 0);
      const sources = input.sources ?? [];
      return {
        writes: [
          ctx.db.set(
            ctx.paths.card(id),
            {
              title: input.title,
              layout: { columnSpan: input.layout.columnSpan, rowSpan: input.layout.rowSpan, order },
              previewUi: input.previewUi,
              detailUi: input.detailUi,
              sources,
              automation: input.automation ?? null,
              status: 'active',
              statusMessage: null,
              version: 1,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              createdBy: actor(ctx),
              lastUpdatedBy: actor(ctx),
            },
            { exists: false },
          ),
          versionWrite(ctx, id, 1, { previewUi: input.previewUi, detailUi: input.detailUi, sources }),
          auditWrite(ctx, 'create_card', id, 'success'),
        ],
        result: { cardId: id, version: 1, layout: { columnSpan: input.layout.columnSpan, rowSpan: input.layout.rowSpan, order } },
      };
    },
    () => new NookError('INTERNAL', 'Card creation conflicted; retry with the same idempotencyKey.'),
  );
}

export async function updateCardContent(ctx: ToolContext, input: UpdateCardContentInput) {
  requireValidUi(input.previewUi, input.detailUi);
  const result = await runIdempotent(
    ctx,
    'update_card_content',
    input,
    async () => {
      const { card, doc } = await loadCard(ctx, input.cardId);
      requireSameDesign(card, input.previewUi, input.detailUi);
      if (card.version !== input.expectedVersion) {
        throw new NookError(
          'VERSION_CONFLICT',
          `Card "${card.id}" is at version ${card.version}, not ${input.expectedVersion}. Call get_card, rebuild the content from the latest state, and retry.`,
          { currentVersion: card.version },
        );
      }
      const version = card.version + 1;
      const now = ctx.now();
      const sources = input.sources ?? card.sources;
      return {
        // preview, detail and sources change together or not at all.
        writes: [
          ctx.db.patch(
            ctx.paths.card(card.id),
            {
              previewUi: input.previewUi,
              detailUi: input.detailUi,
              sources,
              version,
              updatedAt: now,
              status: 'active',
              statusMessage: null,
              lastUpdatedBy: actor(ctx),
            },
            ['previewUi', 'detailUi', 'sources', 'version', 'updatedAt', 'status', 'statusMessage', 'lastUpdatedBy'],
            { updateTime: doc.updateTime },
          ),
          versionWrite(ctx, card.id, version, { previewUi: input.previewUi, detailUi: input.detailUi, sources }),
          auditWrite(ctx, 'update_card_content', card.id, 'success'),
        ],
        result: { cardId: card.id, version, updatedAt: now.toISOString() },
      };
    },
    conflict(input.cardId),
  );
  if (!result.replayed) pruneVersions(ctx, input.cardId);
  return result;
}

/** Shared shape of the metadata/layout tools: patch some fields of one card, no version bump. */
async function patchCard(
  ctx: ToolContext,
  tool: string,
  input: { cardId: string; idempotencyKey: string },
  change: (card: Card) => { data: Record<string, unknown>; fieldPaths: string[] },
) {
  return runIdempotent(
    ctx,
    tool,
    input,
    async () => {
      const { card, doc } = await loadCard(ctx, input.cardId);
      const { data, fieldPaths } = change(card);
      return {
        writes: [
          ctx.db.patch(ctx.paths.card(card.id), data, fieldPaths, { updateTime: doc.updateTime }),
          auditWrite(ctx, tool, card.id, 'success'),
        ],
        result: { cardId: card.id, version: card.version, changed: fieldPaths },
      };
    },
    conflict(input.cardId),
  );
}

export function updateCard(ctx: ToolContext, input: UpdateCardInput) {
  return patchCard(ctx, 'update_card', input, () => {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.status !== undefined) data.status = input.status;
    if (input.statusMessage !== undefined) data.statusMessage = input.statusMessage;
    const fieldPaths = Object.keys(data);
    if (fieldPaths.length === 0) throw new NookError('VALIDATION_FAILED', 'Nothing to update: pass title, status or statusMessage.');
    return { data, fieldPaths };
  });
}

export function resizeCard(ctx: ToolContext, input: ResizeCardInput) {
  return patchCard(ctx, 'resize_card', input, (card) => {
    requireUnlocked(card, 'resize');
    return {
      data: { layout: { columnSpan: input.columnSpan, rowSpan: input.rowSpan } },
      fieldPaths: ['layout.columnSpan', 'layout.rowSpan'],
    };
  });
}

/** Locks only. Unlocking is deliberately not available to the AI. */
export function lockCardDesign(ctx: ToolContext, input: LockCardDesignInput) {
  return patchCard(ctx, 'lock_card_design', input, (card) =>
    card.designLocked
      ? { data: { designLocked: true }, fieldPaths: ['designLocked'] }
      : { data: { designLocked: true, designLockedAt: ctx.now() }, fieldPaths: ['designLocked', 'designLockedAt'] },
  );
}

export function registerAutomation(ctx: ToolContext, input: RegisterAutomationInput) {
  return patchCard(ctx, 'register_automation', input, () => ({
    data: { automation: input.automation },
    fieldPaths: ['automation'],
  }));
}

export function deleteCard(ctx: ToolContext, input: DeleteCardInput) {
  // Soft delete: the card disappears from the dashboard but can be restored in the app.
  return patchCard(ctx, 'delete_card', input, (card) => {
    requireUnlocked(card, 'delete');
    return { data: { deletedAt: ctx.now() }, fieldPaths: ['deletedAt'] };
  });
}

export async function moveCard(ctx: ToolContext, input: MoveCardInput) {
  return runIdempotent(
    ctx,
    'move_card',
    input,
    async () => {
      const active = (await listCards(ctx)).filter((card) => card.deletedAt === null);
      const index = active.findIndex((card) => card.id === input.cardId);
      if (index < 0) throw new NookError('CARD_NOT_FOUND', `No card with id "${input.cardId}".`);
      requireUnlocked(active[index]!, 'move');
      const [moved] = active.splice(index, 1);
      const position = Math.min(input.position, active.length);
      active.splice(position, 0, moved!);
      // Renumber everything so orders stay dense and unambiguous.
      const writes = active.flatMap((card, order) =>
        card.layout.order === order
          ? []
          : [ctx.db.patch(ctx.paths.card(card.id), { layout: { order } }, ['layout.order'], { exists: true })],
      );
      return {
        writes: [...writes, auditWrite(ctx, 'move_card', input.cardId, 'success')],
        result: { cardId: input.cardId, position, order: active.map((card) => card.id) },
      };
    },
    conflict(input.cardId),
  );
}

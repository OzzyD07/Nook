import { EXAMPLES } from '@nook/openui';
import { NookError } from '@nook/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { Firestore } from '../src/firestore/client';
import { userPaths } from '../src/firestore/paths';
import {
  createCard,
  deleteCard,
  getCard,
  listCards,
  moveCard,
  resizeCard,
  updateCardContent,
} from '../src/repo/cards';
import type { ToolContext } from '../src/repo/context';
import { FakeFirestore } from './fake-firestore';

const ROOT = 'projects/demo/databases/(default)/documents';

function context(fake: FakeFirestore, uid = 'user1'): ToolContext {
  const pending: Promise<unknown>[] = [];
  return {
    uid,
    scopes: ['cards:read', 'cards:write', 'cards:delete'],
    clientId: 'client-1',
    clientName: 'Test AI',
    requestId: 'req-1',
    db: new Firestore({ projectId: 'demo', getToken: async () => 'token', fetch: fake.fetch }),
    paths: userPaths(uid),
    now: () => new Date('2026-09-22T09:00:00Z'),
    waitUntil: (promise) => pending.push(promise),
  };
}

const newCard = (key = 'create-key-1') => ({
  title: 'Tech news',
  layout: { columnSpan: 2, rowSpan: 2 },
  previewUi: EXAMPLES.newsCard,
  detailUi: EXAMPLES.newsDetail,
  sources: [{ title: 'Reuters', url: 'https://www.reuters.com/technology/' }],
  idempotencyKey: key,
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof NookError && error.code === code);
}

describe('cards repository', () => {
  let fake: FakeFirestore;
  let ctx: ToolContext;

  beforeEach(() => {
    fake = new FakeFirestore();
    ctx = context(fake);
  });

  it('creates a card with its first version, idempotency record and audit entry atomically', async () => {
    const result = await createCard(ctx, newCard());
    expect(result.version).toBe(1);
    const card = fake.data(`${ROOT}/users/user1/cards/${result.cardId}`);
    expect(card).toMatchObject({ title: 'Tech news', version: 1, status: 'active', deletedAt: null });
    expect(fake.names(`${ROOT}/users/user1/cardVersions/`)).toEqual([`${ROOT}/users/user1/cardVersions/${result.cardId}_v1`]);
    expect(fake.names(`${ROOT}/users/user1/idempotency/`)).toHaveLength(1);
    expect(fake.names(`${ROOT}/users/user1/auditLogs/`)).toHaveLength(1);
  });

  it('returns the original result when a create is retried with the same key', async () => {
    const first = await createCard(ctx, newCard());
    const retry = await createCard(ctx, newCard());
    expect(retry.cardId).toBe(first.cardId);
    expect(retry.replayed).toBe(true);
    expect(await listCards(ctx)).toHaveLength(1);
  });

  it('rejects reusing a key for a different request', async () => {
    await createCard(ctx, newCard());
    await expectCode(createCard(ctx, { ...newCard(), title: 'Other' }), 'IDEMPOTENCY_KEY_REUSED');
  });

  it('rejects invalid OpenUI without writing anything', async () => {
    await expectCode(createCard(ctx, { ...newCard(), previewUi: 'root = CardContainer([Script("x")])' }), 'UI_INVALID');
    expect(fake.docs.size).toBe(0);
  });

  it('updates preview, detail and sources together and bumps the version', async () => {
    const { cardId } = await createCard(ctx, newCard());
    const result = await updateCardContent(ctx, {
      cardId,
      expectedVersion: 1,
      previewUi: EXAMPLES.quoteCard,
      detailUi: EXAMPLES.metricDetail,
      idempotencyKey: 'update-1',
    });
    expect(result.version).toBe(2);
    const card = await getCard(ctx, cardId);
    expect(card).toMatchObject({ version: 2, previewUi: EXAMPLES.quoteCard, detailUi: EXAMPLES.metricDetail });
    expect(card.sources).toHaveLength(1);
    expect(fake.names(`${ROOT}/users/user1/cardVersions/`)).toHaveLength(2);
  });

  it('rejects a stale expectedVersion', async () => {
    const { cardId } = await createCard(ctx, newCard());
    const update = { cardId, previewUi: EXAMPLES.quoteCard, detailUi: EXAMPLES.metricDetail };
    await updateCardContent(ctx, { ...update, expectedVersion: 1, idempotencyKey: 'run-a' });
    await expectCode(updateCardContent(ctx, { ...update, expectedVersion: 1, idempotencyKey: 'run-b' }), 'VERSION_CONFLICT');
    expect((await getCard(ctx, cardId)).version).toBe(2);
  });

  it('turns a concurrent write between read and commit into VERSION_CONFLICT', async () => {
    const { cardId } = await createCard(ctx, newCard());
    fake.beforeCommit = () => {
      fake.touch(`${ROOT}/users/user1/cards/${cardId}`);
      fake.beforeCommit = undefined;
    };
    await expectCode(
      updateCardContent(ctx, {
        cardId,
        expectedVersion: 1,
        previewUi: EXAMPLES.quoteCard,
        detailUi: EXAMPLES.metricDetail,
        idempotencyKey: 'race-1',
      }),
      'VERSION_CONFLICT',
    );
    expect((await getCard(ctx, cardId)).previewUi).toBe(EXAMPLES.newsCard);
  });

  it('soft-deletes cards and hides them afterwards', async () => {
    const { cardId } = await createCard(ctx, newCard());
    await deleteCard(ctx, { cardId, idempotencyKey: 'delete-1' });
    expect(fake.data(`${ROOT}/users/user1/cards/${cardId}`)?.deletedAt).toBeInstanceOf(Date);
    await expectCode(getCard(ctx, cardId), 'CARD_NOT_FOUND');
  });

  it('resizes without touching content version or updatedAt', async () => {
    const { cardId } = await createCard(ctx, newCard());
    const before = await getCard(ctx, cardId);
    await resizeCard(ctx, { cardId, columnSpan: 1, rowSpan: 1, idempotencyKey: 'resize-1' });
    const after = await getCard(ctx, cardId);
    expect(after.layout).toEqual({ columnSpan: 1, rowSpan: 1, order: before.layout.order });
    expect(after.version).toBe(before.version);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it('moves a card and renumbers the order densely', async () => {
    const a = await createCard(ctx, newCard('key-a'));
    const b = await createCard(ctx, { ...newCard('key-b'), title: 'B' });
    const c = await createCard(ctx, { ...newCard('key-c'), title: 'C' });
    const result = await moveCard(ctx, { cardId: c.cardId, position: 0, idempotencyKey: 'move-1' });
    expect(result.order).toEqual([c.cardId, a.cardId, b.cardId]);
    const orders = (await listCards(ctx)).map((card) => [card.id, card.layout.order]);
    expect(orders).toEqual([
      [c.cardId, 0],
      [a.cardId, 1],
      [b.cardId, 2],
    ]);
  });

  it('keeps users apart', async () => {
    await createCard(ctx, newCard());
    const other = context(fake, 'user2');
    expect(await listCards(other)).toEqual([]);
    expect(fake.names(`${ROOT}/users/user2/`)).toEqual([]);
  });

  it('refuses malformed uids and ids in paths', () => {
    expect(() => userPaths('../admin')).toThrow();
    expect(() => userPaths('user1').card('a/b')).toThrow();
  });
});

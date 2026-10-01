import { EXAMPLES } from '@nook/openui';
import { NookError } from '@nook/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { encodeFields } from '../src/firestore/codec';
import { Firestore, fieldPath } from '../src/firestore/client';
import { userPaths } from '../src/firestore/paths';
import { getCardState, presentUserState, updateCardState } from '../src/repo/card-state';
import { createCard, getCard, updateCardContent } from '../src/repo/cards';
import type { ToolContext } from '../src/repo/context';
import { FakeFirestore } from './fake-firestore';

const ROOT = 'projects/demo/databases/(default)/documents';

function context(fake: FakeFirestore): ToolContext {
  return {
    uid: 'user1',
    scopes: ['cards:read', 'cards:write'],
    clientId: 'client-1',
    clientName: 'Test AI',
    requestId: 'req-1',
    db: new Firestore({ projectId: 'demo', getToken: async () => 'token', fetch: fake.fetch }),
    paths: userPaths('user1'),
    now: () => new Date('2026-09-22T09:00:00Z'),
    waitUntil: () => undefined,
  };
}

/** Writes state the way the app does (setDoc merge), bypassing the Worker. */
function seedState(fake: FakeFirestore, cardId: string, data: Record<string, unknown>) {
  fake.docs.set(`${ROOT}/users/user1/cardState/${cardId}`, { fields: encodeFields(data), updateTime: '2026-01-01T00:00:00Z' });
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof NookError && error.code === code);
}

describe('card user state', () => {
  let fake: FakeFirestore;
  let ctx: ToolContext;
  let cardId: string;

  beforeEach(async () => {
    fake = new FakeFirestore();
    ctx = context(fake);
    ({ cardId } = await createCard(ctx, {
      title: 'Groceries',
      layout: { columnSpan: 1, rowSpan: 1 },
      previewUi: EXAMPLES.quoteCard,
      detailUi: EXAMPLES.groceryDetail,
      idempotencyKey: 'create-grocery',
    }));
  });

  it('presents saved input matched to the page, with orphaned ids and refresh requests', async () => {
    seedState(fake, cardId, {
      fields: {
        groceries: { value: { milk: true, eggs: false }, updatedAt: new Date('2026-09-21T10:00:00Z') },
        removed: { value: 'old note', updatedAt: new Date('2026-09-01T10:00:00Z') },
      },
      refreshRequestedAt: new Date('2026-09-21T11:00:00Z'),
      updatedAt: new Date('2026-09-21T11:00:00Z'),
    });
    const presented = presentUserState(await getCard(ctx, cardId), await getCardState(ctx, cardId));
    expect(presented.fields).toEqual([
      { id: 'groceries', component: 'Checklist', value: { milk: true, eggs: false }, updatedAt: '2026-09-21T10:00:00.000Z' },
      { id: 'requests', component: 'TextInput', value: null, updatedAt: null },
    ]);
    expect(presented.orphaned).toEqual([{ id: 'removed', value: 'old note' }]);
    expect(presented.refreshRequestedAt).toBe('2026-09-21T11:00:00.000Z');
  });

  it('presents input saved by an HTML page under its declared fields', async () => {
    await updateCardContent(ctx, {
      cardId,
      expectedVersion: 1,
      previewUi: EXAMPLES.quoteCard,
      detailUi: EXAMPLES.htmlDetail,
      idempotencyKey: 'to-html',
    });
    seedState(fake, cardId, { fields: { 'sleep-note': { value: 'Slept well', updatedAt: new Date('2026-09-21T10:00:00Z') } } });
    const presented = presentUserState(await getCard(ctx, cardId), await getCardState(ctx, cardId));
    expect(presented.fields).toEqual([
      { id: 'sleep-note', component: 'Html', value: 'Slept well', updatedAt: '2026-09-21T10:00:00.000Z' },
    ]);
  });

  it('keeps user input when the AI rewrites the card', async () => {
    seedState(fake, cardId, { fields: { groceries: { value: { milk: true }, updatedAt: new Date() } } });
    await updateCardContent(ctx, {
      cardId,
      expectedVersion: 1,
      previewUi: EXAMPLES.quoteCard,
      detailUi: EXAMPLES.groceryDetail,
      idempotencyKey: 'rewrite-1',
    });
    expect((await getCardState(ctx, cardId)).fields.groceries?.value).toEqual({ milk: true });
  });

  it('sets, clears and closes refresh requests in one write', async () => {
    seedState(fake, cardId, {
      fields: { requests: { value: 'coffee', updatedAt: new Date() } },
      refreshRequestedAt: new Date(),
    });
    await updateCardState(ctx, {
      cardId,
      set: { groceries: { milk: false, eggs: false }, 'week-rating': 4 },
      clear: ['requests'],
      clearRefreshRequest: true,
      idempotencyKey: 'weekly-reset-1',
    });
    const state = await getCardState(ctx, cardId);
    expect(Object.keys(state.fields).sort()).toEqual(['groceries', 'week-rating']);
    expect(state.fields['week-rating']?.value).toBe(4);
    expect(state.refreshRequestedAt).toBeNull();
  });

  it('is idempotent', async () => {
    const input = { cardId, set: { requests: 'tea' }, idempotencyKey: 'state-1' };
    await updateCardState(ctx, input);
    const retry = await updateCardState(ctx, input);
    expect(retry.replayed).toBe(true);
  });

  it('rejects empty updates, conflicting ids and unknown cards', async () => {
    await expectCode(updateCardState(ctx, { cardId, idempotencyKey: 'noop-1' }), 'VALIDATION_FAILED');
    await expectCode(
      updateCardState(ctx, { cardId, set: { a: 'x' }, clear: ['a'], idempotencyKey: 'both-1' }),
      'VALIDATION_FAILED',
    );
    await expectCode(updateCardState(ctx, { cardId: 'missing', set: { a: 'x' }, idempotencyKey: 'missing-1' }), 'CARD_NOT_FOUND');
  });

  it('quotes field path segments that are not identifiers', () => {
    expect(fieldPath('fields', 'groceries')).toBe('fields.groceries');
    expect(fieldPath('fields', 'week-rating')).toBe('fields.`week-rating`');
    expect(fieldPath('fields', '2026')).toBe('fields.`2026`');
  });
});

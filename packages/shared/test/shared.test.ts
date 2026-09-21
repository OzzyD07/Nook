import { describe, expect, it } from 'vitest';

import { CreateCardInput, deriveStatus, isHttpsUrl, packGrid } from '../src';

describe('isHttpsUrl', () => {
  it.each([
    ['https://example.com', true],
    ['https://news.example.co.uk/a/b?c=1#d', true],
    ['https://example.com:8443/x', true],
    ['http://example.com', false],
    ['javascript:alert(1)', false],
    ['https://user:pass@example.com', false],
    ['https://localhost', false],
    ['https://exa mple.com', false],
    ['//example.com', false],
  ])('%s -> %s', (url, expected) => {
    expect(isHttpsUrl(url)).toBe(expected);
  });
});

describe('packGrid', () => {
  it('packs half-width cards side by side and full-width cards on their own row', () => {
    const { placements, rows } = packGrid(
      [
        { id: 'a', columnSpan: 1, rowSpan: 1, order: 0 },
        { id: 'b', columnSpan: 2, rowSpan: 1, order: 1 },
        { id: 'c', columnSpan: 1, rowSpan: 1, order: 2 },
      ],
      2,
    );
    expect(placements).toEqual([
      { id: 'a', x: 0, y: 0, w: 1, h: 1 },
      { id: 'b', x: 0, y: 1, w: 2, h: 1 },
      { id: 'c', x: 1, y: 0, w: 1, h: 1 },
    ]);
    expect(rows).toBe(2);
  });

  it('fills the gap next to a tall card', () => {
    const { placements } = packGrid(
      [
        { id: 'tall', columnSpan: 1, rowSpan: 2, order: 0 },
        { id: 'x', columnSpan: 1, rowSpan: 1, order: 1 },
        { id: 'y', columnSpan: 1, rowSpan: 1, order: 2 },
      ],
      2,
    );
    expect(placements.find((p) => p.id === 'y')).toEqual({ id: 'y', x: 1, y: 1, w: 1, h: 1 });
  });

  it('clamps spans wider than the grid', () => {
    const { placements } = packGrid([{ id: 'a', columnSpan: 4, rowSpan: 1, order: 0 }], 2);
    expect(placements[0]!.w).toBe(2);
  });
});

describe('deriveStatus', () => {
  const day = 24 * 60 * 60 * 1000;
  const card = {
    status: 'active' as const,
    updatedAt: 0,
    automation: { cadence: { every: 1, unit: 'day' as const } },
  };

  it('is active within three missed runs', () => {
    expect(deriveStatus(card, 3 * day)).toBe('active');
  });
  it('is stale after three missed runs', () => {
    expect(deriveStatus(card, 3 * day + 1)).toBe('stale');
  });
  it('never goes stale without a cadence', () => {
    expect(deriveStatus({ ...card, automation: null }, 100 * day)).toBe('active');
  });
  it('keeps error over stale', () => {
    expect(deriveStatus({ ...card, status: 'error' }, 100 * day)).toBe('error');
  });
});

describe('CreateCardInput', () => {
  it('rejects http sources', () => {
    const result = CreateCardInput.safeParse({
      title: 'x',
      layout: { columnSpan: 1, rowSpan: 1 },
      previewUi: 'a',
      detailUi: 'b',
      sources: [{ title: 's', url: 'http://example.com' }],
      idempotencyKey: 'abcdefgh',
    });
    expect(result.success).toBe(false);
  });
});

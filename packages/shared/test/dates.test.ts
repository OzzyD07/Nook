import { describe, expect, it } from 'vitest';

import {
  addDays,
  countdownParts,
  daysBetween,
  groupByDate,
  isValidDate,
  isValidDateTime,
  monthGrid,
  UpdateCardStateInput,
  weekDates,
  weekdayIndex,
} from '../src';

describe('dates', () => {
  it('validates calendar dates', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('26-01-01')).toBe(false);
  });

  it('validates ISO date-times', () => {
    expect(isValidDateTime('2026-12-31T20:00:00+03:00')).toBe(true);
    expect(isValidDateTime('2026-12-31T20:00Z')).toBe(true);
    expect(isValidDateTime('2026-12-31 20:00')).toBe(false);
    expect(isValidDateTime('2026-02-30T10:00:00Z')).toBe(false);
  });

  it('does day arithmetic across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-09-22', '2026-10-01')).toBe(9);
  });

  it('uses Monday-first weeks', () => {
    expect(weekdayIndex('2026-09-21')).toBe(0); // Monday
    expect(weekdayIndex('2026-09-27')).toBe(6); // Sunday
    expect(weekDates('2026-09-24')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('builds a month grid padded to whole weeks', () => {
    const grid = monthGrid('2026-09'); // starts on a Tuesday, 30 days
    expect(grid[0]).toEqual([null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('groups events by date and time', () => {
    const groups = groupByDate([
      { date: '2026-09-23', time: '10:00', title: 'b' },
      { date: '2026-09-22', title: 'a' },
      { date: '2026-09-23', time: '09:00', title: 'c' },
    ]);
    expect(groups.map(([date, items]) => [date, items.map((i) => i.title)])).toEqual([
      ['2026-09-22', ['a']],
      ['2026-09-23', ['c', 'b']],
    ]);
  });

  it('splits a countdown into parts', () => {
    expect(countdownParts(90_061_000, 0)).toEqual({ done: false, days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(countdownParts(0, 5).done).toBe(true);
  });
});

describe('UpdateCardStateInput', () => {
  it('accepts every field value shape and rejects bad ids', () => {
    const base = { cardId: 'c1', idempotencyKey: 'state-key-1' };
    expect(
      UpdateCardStateInput.safeParse({ ...base, set: { groceries: { milk: true }, note: 'x', mood: 4, tags: ['a'] } }).success,
    ).toBe(true);
    expect(UpdateCardStateInput.safeParse({ ...base, set: { 'Bad Id': 'x' } }).success).toBe(false);
  });
});

import { z } from 'zod';

/**
 * Calendar dates are plain "YYYY-MM-DD" strings in the user's local calendar. All math
 * runs in UTC on those strings so results never shift with the device time zone.
 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isValidDateTime(value: string): boolean {
  return DATETIME.test(value) && isValidDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value));
}

export const DateSchema = z.string().refine(isValidDate, { message: 'Use a real date in YYYY-MM-DD format' });
export const MonthSchema = z.string().regex(MONTH, 'Use YYYY-MM');
export const DateTimeSchema = z
  .string()
  .refine(isValidDateTime, { message: 'Use an ISO date-time such as 2026-12-31T20:00:00+03:00' });

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Local calendar date of a timestamp, e.g. for "today". */
export function localDateKey(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: string): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

/** The seven dates (Monday first) of the week containing `date`. */
export function weekDates(date: string): string[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Month grid with Monday-first weeks; days outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: weekdayIndex(first) }, () => null);
  for (let day = 0; day < daysInMonth; day++) cells.push(addDays(first, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Groups items by their `date`, sorted by date, then by time. */
export function groupByDate<T extends { date: string; time?: string | null }>(items: readonly T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))) {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  }
  return [...groups.entries()];
}

export interface CountdownParts {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownParts(targetMs: number, nowMs: number): CountdownParts {
  const remaining = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    done: remaining === 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

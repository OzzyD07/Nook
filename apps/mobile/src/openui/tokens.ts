import type { ThemeColors } from '@/constants/theme';

export type Tone = 'neutral' | 'muted' | 'accent' | 'positive' | 'negative' | 'warning' | 'info';

export function toneColor(colors: ThemeColors, tone: Tone | null | undefined, fallback: Tone = 'neutral'): string {
  switch (tone ?? fallback) {
    case 'muted':
      return colors.textSecondary;
    case 'accent':
      return colors.accent;
    case 'positive':
      return colors.positive;
    case 'negative':
      return colors.negative;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    default:
      return colors.text;
  }
}

/** Default colors for chart series, in order. */
export function seriesColor(colors: ThemeColors, index: number, tone?: Tone | null): string {
  if (tone) return toneColor(colors, tone);
  const palette = [colors.accent, colors.positive, colors.warning, colors.info, colors.negative];
  return palette[index % palette.length]!;
}

export const GAP = { none: 0, xs: 4, sm: 8, md: 12, lg: 16 } as const;

export const TEXT_SIZE = {
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 15, lineHeight: 21 },
  lg: { fontSize: 18, lineHeight: 25 },
} as const;

export const HEADING_SIZE = {
  sm: { fontSize: 15, lineHeight: 20 },
  md: { fontSize: 18, lineHeight: 24 },
  lg: { fontSize: 23, lineHeight: 29 },
} as const;

export function pick<T extends Record<string, unknown>>(map: T, key: unknown, fallback: keyof T): T[keyof T] {
  return typeof key === 'string' && key in map ? map[key as keyof T] : map[fallback];
}

/** 1234567 -> "1.2M"; used for chart axes. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) return `${trim(value / size)}${suffix}`;
  }
  return trim(value);
}

function trim(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return Number(value.toFixed(digits)).toString();
}

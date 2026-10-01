/**
 * Design tokens shared by the app chrome and the OpenUI renderer, in light and dark variants.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B0B0F',
    background: '#F2F2F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6E7EC',
    textSecondary: '#60646C',
    border: '#E1E2E7',
    accent: '#2F6BFF',
    positive: '#16935A',
    negative: '#D93A3A',
    warning: '#C27A00',
    info: '#2B7CB8',
    neutral: '#3E4148',
    muted: '#8A8E96',
  },
  dark: {
    text: '#F5F5F7',
    background: '#000000',
    backgroundElement: '#17181B',
    backgroundSelected: '#2A2C31',
    textSecondary: '#A6AAB2',
    border: '#2A2C31',
    accent: '#6B97FF',
    positive: '#3CC983',
    negative: '#FF6B6B',
    warning: '#F2B544',
    info: '#5BB2EE',
    neutral: '#D4D6DB',
    muted: '#80848C',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  tile: 20,
  element: 10,
  pill: 999,
} as const;

export const MaxContentWidth = 1000;

/** Sets the alpha channel of a #RRGGBB or #RRGGBBAA color. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${value}`;
}

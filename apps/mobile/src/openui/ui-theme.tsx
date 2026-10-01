import { THEMES, type FontName, type ThemeName } from '@nook/openui';
import { createContext, useContext, type ReactNode } from 'react';

import type { ThemeColors } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import { toneColor, type Tone } from '@/openui/tokens';

/** What OpenUI components draw with: the app palette, or a card's preset theme. */
export interface UiTheme {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  /** Default font of headings, Display and Metric values. */
  font: FontName | null;
}

const PRESETS = Object.fromEntries(
  Object.entries(THEMES).map(([name, theme]) => [name, { colors: theme.colors, scheme: theme.scheme, font: theme.font }]),
) as Record<ThemeName, UiTheme>;

const UiThemeContext = createContext<UiTheme | null>(null);

export function presetTheme(name: unknown): UiTheme | null {
  return typeof name === 'string' && name in PRESETS ? PRESETS[name as ThemeName] : null;
}

export function useUiTheme(): UiTheme {
  const preset = useContext(UiThemeContext);
  const colors = useTheme();
  const scheme = useResolvedScheme();
  return preset ?? { colors, scheme, font: null };
}

export function useUiColors(): ThemeColors {
  return useUiTheme().colors;
}

/** Applies a preset theme to its children; without a known theme they keep the surrounding one. */
export function UiThemeProvider({ theme, children }: { theme: unknown; children: ReactNode }) {
  const preset = presetTheme(theme);
  if (!preset) return children;
  return <UiThemeContext.Provider value={preset}>{children}</UiThemeContext.Provider>;
}

/** Resolves a Color prop: a tone name, a hex string or a {light, dark} pair. */
export function resolveColor(value: unknown, theme: UiTheme): string | null {
  if (typeof value === 'string') return value.startsWith('#') ? value : toneColor(theme.colors, value as Tone);
  if (typeof value === 'object' && value !== null) {
    const pair = value as { light?: unknown; dark?: unknown };
    const picked = theme.scheme === 'dark' ? pair.dark : pair.light;
    return typeof picked === 'string' ? picked : null;
  }
  return null;
}

/** The `color` prop when set, otherwise the `tone` prop (or its fallback). */
export function colorOrTone(theme: UiTheme, color: unknown, tone: Tone | null | undefined, fallback: Tone = 'neutral'): string {
  return resolveColor(color, theme) ?? toneColor(theme.colors, tone, fallback);
}

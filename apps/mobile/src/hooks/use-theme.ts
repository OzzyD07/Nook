/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferences } from '@/store/preferences';

/** 'light' or 'dark', after applying the user's theme preference. */
export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const preference = usePreferences((state) => state.theme);
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}

import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular';
import { Caveat_500Medium } from '@expo-google-fonts/caveat/500Medium';
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import type { FontName } from '@nook/openui';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import type { TextStyle } from 'react-native';
import { create } from 'zustand';

import { Fonts } from '@/constants/theme';

export type FontWeight = 'regular' | 'medium' | 'bold';

/** Bundled font files, registered under these family names. */
const ASSETS = {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  Outfit_400Regular,
  Outfit_700Bold,
  BebasNeue_400Regular,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  DMSerifDisplay_400Regular,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
  Caveat_500Medium,
  Caveat_700Bold,
  PressStart2P_400Regular,
};

type Family = keyof typeof ASSETS;

/** Each bundled font has one file per weight; a missing bold uses the regular file. */
const BUNDLED: Partial<Record<FontName, { regular: Family; bold?: Family }>> = {
  'space-grotesk': { regular: 'SpaceGrotesk_500Medium', bold: 'SpaceGrotesk_700Bold' },
  outfit: { regular: 'Outfit_400Regular', bold: 'Outfit_700Bold' },
  'bebas-neue': { regular: 'BebasNeue_400Regular' },
  playfair: { regular: 'PlayfairDisplay_400Regular', bold: 'PlayfairDisplay_700Bold' },
  'dm-serif': { regular: 'DMSerifDisplay_400Regular' },
  'jetbrains-mono': { regular: 'JetBrainsMono_400Regular', bold: 'JetBrainsMono_700Bold' },
  caveat: { regular: 'Caveat_500Medium', bold: 'Caveat_700Bold' },
  'press-start': { regular: 'PressStart2P_400Regular' },
};

const SYSTEM: Partial<Record<FontName, string>> = {
  rounded: Fonts?.rounded,
  serif: Fonts?.serif,
  mono: Fonts?.mono,
};

const WEIGHT = { regular: '400', medium: '500', bold: '700' } as const;

const useFontStore = create<{ loaded: boolean }>(() => ({ loaded: false }));

/** Loads the bundled fonts once, at the app root. Rendering never waits for it. */
export function useLoadUiFonts() {
  const [loaded] = useFonts(ASSETS);
  useEffect(() => {
    if (loaded) useFontStore.setState({ loaded: true });
  }, [loaded]);
}

/**
 * Text style for a font and weight. Bundled fonts fall back to the system font until
 * they are loaded, so an unregistered family is never used.
 */
export function useFontStyle(font: FontName | null | undefined, weight: FontWeight): TextStyle {
  const loaded = useFontStore((state) => state.loaded);
  const bundled = font ? BUNDLED[font] : undefined;
  if (bundled && loaded) {
    // The weight lives in the file; a synthetic fontWeight would break Android lookups.
    return { fontFamily: weight === 'bold' ? (bundled.bold ?? bundled.regular) : bundled.regular, fontWeight: 'normal' };
  }
  const system = font ? SYSTEM[font] : undefined;
  return system ? { fontFamily: system, fontWeight: WEIGHT[weight] } : { fontWeight: WEIGHT[weight] };
}

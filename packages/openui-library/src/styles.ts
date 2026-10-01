import { z } from 'zod';

/** Semantic colors; each theme (and the app's light/dark palette) resolves them. */
export const Tone = z
  .enum(['neutral', 'muted', 'accent', 'positive', 'negative', 'warning', 'info'])
  .describe('Semantic color');

export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Use "#RRGGBB" or "#RRGGBBAA"');

const TONE_OR_HEX = new RegExp(`^(?:${Tone.options.join('|')}|#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)$`);

/**
 * A tone, a hex color, or a pair that follows the light/dark scheme of the surrounding theme.
 * Tones and hex share one string schema so the generated reference stays short.
 */
export const ColorSchema = z
  .union([
    z.string().regex(TONE_OR_HEX, 'Use a tone name, "#RRGGBB" or "#RRGGBBAA"'),
    z.object({ light: HexColorSchema, dark: HexColorSchema }),
  ])
  .describe('Tone name, "#RRGGBB", "#RRGGBBAA" or {light: "#…", dark: "#…"}');

/**
 * Fonts the app bundles. `system`, `rounded`, `serif` and `mono` are platform fonts;
 * the rest ship with the app, so they work offline.
 */
export const FONTS = {
  system: 'Platform UI font (default)',
  rounded: 'Rounded system font on iOS, system font elsewhere',
  serif: 'Platform serif',
  mono: 'Platform monospace',
  'space-grotesk': 'Space Grotesk: quirky modern grotesk, techy',
  outfit: 'Outfit: clean geometric sans, friendly',
  'bebas-neue': 'Bebas Neue: tall condensed all-caps display; big numbers and short titles only',
  playfair: 'Playfair Display: elegant high-contrast serif, editorial',
  'dm-serif': 'DM Serif Display: heavy display serif for headlines',
  'jetbrains-mono': 'JetBrains Mono: coding monospace with clear digits',
  caveat: 'Caveat: handwriting, casual notes',
  'press-start': 'Press Start 2P: 8-bit pixel font; a few words only',
} as const;

export type FontName = keyof typeof FONTS;
export const FONT_NAMES = Object.keys(FONTS) as [FontName, ...FontName[]];
export const FontSchema = z.enum(FONT_NAMES).describe('Font family, see fonts');

/** Same keys as the app palette, so a theme can stand in for it. */
export interface ThemePalette {
  text: string;
  textSecondary: string;
  /** Solid color that represents the backdrop, e.g. for the navigation bar. */
  background: string;
  /** Raised elements: tables, chart tracks. */
  backgroundElement: string;
  backgroundSelected: string;
  border: string;
  accent: string;
  positive: string;
  negative: string;
  warning: string;
  info: string;
  neutral: string;
  muted: string;
}

export type ThemeBackdrop =
  | { kind: 'gradient'; colors: readonly string[]; angle: number }
  | { kind: 'mesh'; colors: readonly string[] };

export interface ThemeDef {
  description: string;
  scheme: 'light' | 'dark';
  /** Default font of headings, Display and Metric values. */
  font: FontName | null;
  colors: ThemePalette;
  backdrop: ThemeBackdrop;
}

export const THEMES = {
  midnight: {
    description: 'Deep navy to violet gradient, soft blue accent',
    scheme: 'dark',
    font: null,
    colors: {
      text: '#F4F6FF',
      textSecondary: '#A9B1D6',
      background: '#0F1633',
      backgroundElement: '#FFFFFF14',
      backgroundSelected: '#FFFFFF24',
      border: '#FFFFFF26',
      accent: '#8FB0FF',
      positive: '#5BE3A1',
      negative: '#FF7A8A',
      warning: '#FFCB6B',
      info: '#7FD4FF',
      neutral: '#DDE2F5',
      muted: '#8A93B8',
    },
    backdrop: { kind: 'gradient', colors: ['#0B1026', '#1A2350', '#2B1F4D'], angle: 160 },
  },
  aurora: {
    description: 'Northern-lights mesh of teal, blue and purple',
    scheme: 'dark',
    font: 'outfit',
    colors: {
      text: '#F2FBFF',
      textSecondary: '#B4D0DA',
      background: '#0B2A3A',
      backgroundElement: '#FFFFFF14',
      backgroundSelected: '#FFFFFF24',
      border: '#FFFFFF2E',
      accent: '#6FFFE9',
      positive: '#7CFFB2',
      negative: '#FF7A9C',
      warning: '#FFD76F',
      info: '#8AD8FF',
      neutral: '#DDF3F7',
      muted: '#86A6B1',
    },
    backdrop: {
      kind: 'mesh',
      colors: ['#071A2B', '#0B3D4F', '#10213F', '#0E5E5A', '#1B3B6F', '#3B1F5C', '#12806A', '#2A5D8F', '#5B2A86'],
    },
  },
  sunset: {
    description: 'Warm coral to magenta to purple gradient, white text',
    scheme: 'dark',
    font: null,
    colors: {
      text: '#FFFFFF',
      textSecondary: '#FFE1EA',
      background: '#C23B6E',
      backgroundElement: '#FFFFFF2E',
      backgroundSelected: '#FFFFFF40',
      border: '#FFFFFF4D',
      accent: '#FFE66D',
      positive: '#C6FFDD',
      negative: '#FFD0D6',
      warning: '#FFE08A',
      info: '#D6F0FF',
      neutral: '#FFFFFF',
      muted: '#FFD6E0',
    },
    backdrop: { kind: 'gradient', colors: ['#FF7E5F', '#E0457B', '#6A2C91'], angle: 150 },
  },
  ocean: {
    description: 'Deep blue to teal gradient, sunny yellow accent',
    scheme: 'dark',
    font: null,
    colors: {
      text: '#F3FBFF',
      textSecondary: '#CFE8F5',
      background: '#0F4C75',
      backgroundElement: '#FFFFFF24',
      backgroundSelected: '#FFFFFF33',
      border: '#FFFFFF40',
      accent: '#FFD166',
      positive: '#9EF0C1',
      negative: '#FFB4A2',
      warning: '#FFE29A',
      info: '#BDE8FF',
      neutral: '#FFFFFF',
      muted: '#B5D6E6',
    },
    backdrop: { kind: 'gradient', colors: ['#0B3C5D', '#1D6FA3', '#3AAFA9'], angle: 160 },
  },
  forest: {
    description: 'Dark green gradient, lime accent',
    scheme: 'dark',
    font: null,
    colors: {
      text: '#F1F8F1',
      textSecondary: '#B9D3BF',
      background: '#16382A',
      backgroundElement: '#FFFFFF1F',
      backgroundSelected: '#FFFFFF2E',
      border: '#FFFFFF33',
      accent: '#C7F27A',
      positive: '#8EE59B',
      negative: '#FF9C8A',
      warning: '#FFD479',
      info: '#9BD8E8',
      neutral: '#EAF5EA',
      muted: '#94B39C',
    },
    backdrop: { kind: 'gradient', colors: ['#0E2A1F', '#1F4D36', '#3E7B4F'], angle: 165 },
  },
  neon: {
    description: 'Near-black with vivid cyan, pink and yellow; techy grotesk font',
    scheme: 'dark',
    font: 'space-grotesk',
    colors: {
      text: '#F5F5FF',
      textSecondary: '#9C9CC0',
      background: '#0A0914',
      backgroundElement: '#16162A',
      backgroundSelected: '#23233D',
      border: '#2C2C4A',
      accent: '#00F5D4',
      positive: '#39FF88',
      negative: '#FF2E88',
      warning: '#FFE600',
      info: '#00B3FF',
      neutral: '#E6E6FF',
      muted: '#7A7AA0',
    },
    backdrop: { kind: 'gradient', colors: ['#07070C', '#120A24'], angle: 180 },
  },
  paper: {
    description: 'Warm cream paper, ink text, terracotta accent; editorial serif headings',
    scheme: 'light',
    font: 'playfair',
    colors: {
      text: '#2B2622',
      textSecondary: '#7A6F63',
      background: '#F4EDE0',
      backgroundElement: '#FBF7EF',
      backgroundSelected: '#E8DDC8',
      border: '#DCCFB6',
      accent: '#B4532A',
      positive: '#3F7D4E',
      negative: '#B23A3A',
      warning: '#A86A10',
      info: '#2E6A8E',
      neutral: '#3A332D',
      muted: '#978A7B',
    },
    backdrop: { kind: 'gradient', colors: ['#F7F2E7', '#EFE5D2'], angle: 180 },
  },
  mono: {
    description: 'Stark black on white, minimal; grotesk font',
    scheme: 'light',
    font: 'space-grotesk',
    colors: {
      text: '#0A0A0A',
      textSecondary: '#6B6B6B',
      background: '#FFFFFF',
      backgroundElement: '#F2F2F2',
      backgroundSelected: '#E5E5E5',
      border: '#DADADA',
      accent: '#0A0A0A',
      positive: '#1F7A4D',
      negative: '#C0392B',
      warning: '#8A6D00',
      info: '#0A0A0A',
      neutral: '#0A0A0A',
      muted: '#9A9A9A',
    },
    backdrop: { kind: 'gradient', colors: ['#FFFFFF', '#F3F3F3'], angle: 180 },
  },
  noir: {
    description: 'Pure black, white text, minimal',
    scheme: 'dark',
    font: null,
    colors: {
      text: '#FFFFFF',
      textSecondary: '#9A9A9A',
      background: '#000000',
      backgroundElement: '#161616',
      backgroundSelected: '#262626',
      border: '#2A2A2A',
      accent: '#FFFFFF',
      positive: '#7CE38B',
      negative: '#FF6B6B',
      warning: '#F2C94C',
      info: '#FFFFFF',
      neutral: '#FFFFFF',
      muted: '#777777',
    },
    backdrop: { kind: 'gradient', colors: ['#000000', '#111111'], angle: 180 },
  },
  pastel: {
    description: 'Soft pink, lavender and mint mesh, violet accent',
    scheme: 'light',
    font: 'outfit',
    colors: {
      text: '#2E2A3A',
      textSecondary: '#6E6880',
      background: '#F5EFFF',
      backgroundElement: '#FFFFFFA6',
      backgroundSelected: '#FFFFFFCC',
      border: '#D9D1EA',
      accent: '#7B61FF',
      positive: '#2FA36B',
      negative: '#E0527A',
      warning: '#C98A1B',
      info: '#3F8CE0',
      neutral: '#2E2A3A',
      muted: '#9A94AA',
    },
    backdrop: {
      kind: 'mesh',
      colors: ['#FDE2F3', '#E5D9F2', '#D6F0FF', '#FFE8D6', '#F5EFFF', '#DDF7EA', '#FFF4C7', '#FCE1E4', '#E3E8FF'],
    },
  },
} as const satisfies Record<string, ThemeDef>;

export type ThemeName = keyof typeof THEMES;
export const THEME_NAMES = Object.keys(THEMES) as [ThemeName, ...ThemeName[]];
export const ThemeSchema = z.enum(THEME_NAMES).describe('Preset theme, see themes');

export function getTheme(name: unknown): ThemeDef | null {
  return typeof name === 'string' && name in THEMES ? THEMES[name as ThemeName] : null;
}

import { isHtmlDocument, validateHtml, validateOpenUI, type ElementNode } from '@nook/openui';
import { useMemo } from 'react';

import type { ThemeColors } from '@/constants/theme';
import { Backdrop } from '@/openui/components/backgrounds';
import { OpenUINode } from '@/openui/OpenUIView';
import { presetTheme, UiThemeProvider } from '@/openui/ui-theme';

export interface PageAppearance {
  theme: unknown;
  background: ElementNode | null;
  /** The preset theme's palette, for screen chrome around the page; null without a theme. */
  colors: ThemeColors | null;
  /** True when the page paints its own backdrop. */
  painted: boolean;
}

/** Reads the theme and background a detail page asks for, so the screen can paint them edge to edge. */
export function usePageAppearance(source: string): PageAppearance {
  return useMemo(() => {
    if (isHtmlDocument(source)) {
      // HTML pages can only ask for a preset theme; everything else they paint themselves.
      const theme = validateHtml(source).stats?.theme ?? null;
      const colors = presetTheme(theme)?.colors ?? null;
      return { theme, background: null, colors, painted: colors !== null };
    }
    const result = validateOpenUI('detail', source);
    const props = result.ok ? result.tree.props : {};
    const background = (props.background ?? null) as ElementNode | null;
    const colors = presetTheme(props.theme)?.colors ?? null;
    return { theme: props.theme, background, colors, painted: background !== null || colors !== null };
  }, [source]);
}

/** Fills its parent with the page background; render it behind the scroll view. */
export function PageBackdrop({ appearance }: { appearance: PageAppearance }) {
  if (!appearance.painted) return null;
  return (
    <UiThemeProvider theme={appearance.theme}>
      <Backdrop
        background={appearance.background ? <OpenUINode node={appearance.background} /> : undefined}
        theme={appearance.theme}
      />
    </UiThemeProvider>
  );
}

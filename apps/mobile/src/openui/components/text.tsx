import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text as RNText, View, type TextStyle } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { useFontStyle } from '@/openui/fonts';
import { openUrl } from '@/openui/open-url';
import { HEADING_SIZE, pick, TEXT_SIZE } from '@/openui/tokens';
import type { NodeProps, UiProps } from '@/openui/types';
import { colorOrTone, resolveColor, useUiColors, useUiTheme } from '@/openui/ui-theme';

const TEXT_ALIGN = { start: 'left', center: 'center', end: 'right' } as const;

/** Alignment and case shared by the text components. */
function textLayout(props: UiProps): TextStyle {
  return {
    textAlign: pick(TEXT_ALIGN, props.align, 'start'),
    textTransform: props.uppercase ? 'uppercase' : undefined,
    letterSpacing: props.uppercase ? 0.8 : undefined,
  };
}

export function Heading({ props }: NodeProps) {
  const theme = useUiTheme();
  const font = useFontStyle(props.font ?? theme.font, 'bold');
  return (
    <RNText
      style={[
        pick(HEADING_SIZE, props.size, 'md'),
        font,
        textLayout(props),
        { color: resolveColor(props.color, theme) ?? theme.colors.text },
      ]}
      numberOfLines={3}>
      {String(props.text)}
    </RNText>
  );
}

export function Text({ props }: NodeProps) {
  const theme = useUiTheme();
  const font = useFontStyle(props.font, props.weight ?? 'regular');
  return (
    <RNText
      style={[pick(TEXT_SIZE, props.size, 'md'), font, textLayout(props), { color: colorOrTone(theme, props.color, props.tone) }]}
      numberOfLines={props.maxLines ?? undefined}>
      {String(props.text)}
    </RNText>
  );
}

export function Caption({ props }: NodeProps) {
  const theme = useUiTheme();
  const font = useFontStyle(props.font, 'regular');
  return (
    <RNText
      style={[styles.caption, font, textLayout(props), { color: colorOrTone(theme, props.color, props.tone, 'muted') }]}
      numberOfLines={2}>
      {String(props.text)}
    </RNText>
  );
}

const DISPLAY_SIZE = { md: 32, lg: 44, xl: 60, xxl: 84 } as const;

/** Rough width of one glyph relative to the font size, for fitting text on web. */
const GLYPH_WIDTH = 0.62;

export function Display({ props }: NodeProps) {
  const theme = useUiTheme();
  const [width, setWidth] = useState(0);
  const text = String(props.text);
  const font = useFontStyle(props.font ?? theme.font, props.weight ?? 'bold');
  // Native shrinks the text with adjustsFontSizeToFit; web has no equivalent, so it estimates.
  const max = pick(DISPLAY_SIZE, props.size, 'lg');
  const size = Platform.OS === 'web' && width > 0 ? Math.min(max, width / (Math.max(1, text.length) * GLYPH_WIDTH)) : max;
  return (
    <View onLayout={Platform.OS === 'web' ? (event) => setWidth(event.nativeEvent.layout.width) : undefined}>
      <RNText
        style={[
          font,
          textLayout(props),
          {
            fontSize: size,
            lineHeight: Math.round(size * 1.18),
            letterSpacing: -size / 40,
            fontVariant: ['tabular-nums'],
            color: resolveColor(props.color, theme) ?? theme.colors.text,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {text}
      </RNText>
    </View>
  );
}

export function Quote({ props }: NodeProps) {
  const colors = useUiColors();
  return (
    <View style={[styles.quote, { borderLeftColor: colors.accent }]}>
      <RNText style={[TEXT_SIZE.lg, styles.quoteText, { color: colors.text }]}>{String(props.text)}</RNText>
      {props.attribution ? (
        <RNText style={[styles.caption, { color: colors.textSecondary }]}>— {String(props.attribution)}</RNText>
      ) : null}
    </View>
  );
}

export function Callout({ props }: NodeProps) {
  const theme = useUiTheme();
  const color = colorOrTone(theme, null, props.tone, 'info');
  return (
    <View style={[styles.callout, { backgroundColor: withAlpha(color, 0.1), borderLeftColor: color }]}>
      {props.title ? <RNText style={[styles.calloutTitle, { color }]}>{String(props.title)}</RNText> : null}
      <RNText style={[TEXT_SIZE.md, { color: theme.colors.text }]}>{String(props.text)}</RNText>
    </View>
  );
}

export function Badge({ props }: NodeProps) {
  const theme = useUiTheme();
  const custom = resolveColor(props.color, theme);
  const neutral = !custom && (!props.tone || props.tone === 'neutral');
  const color = custom ?? (neutral ? theme.colors.textSecondary : colorOrTone(theme, null, props.tone));
  return (
    <View
      style={[styles.badge, { backgroundColor: neutral ? theme.colors.backgroundSelected : withAlpha(color, 0.16) }]}>
      <RNText style={[styles.badgeText, { color }]} numberOfLines={1}>
        {String(props.label)}
      </RNText>
    </View>
  );
}

export function Link({ props }: NodeProps) {
  const colors = useUiColors();
  return (
    <Pressable onPress={() => openUrl(props.url)} hitSlop={6} accessibilityRole="link">
      <RNText style={[TEXT_SIZE.md, styles.link, { color: colors.accent }]} numberOfLines={2}>
        {String(props.label)}
      </RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12, lineHeight: 16 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, gap: 6 },
  quoteText: { fontStyle: 'italic' },
  callout: { borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  link: { fontWeight: '600' },
});

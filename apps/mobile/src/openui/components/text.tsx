import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openUrl } from '@/openui/open-url';
import { HEADING_SIZE, pick, TEXT_SIZE, toneColor } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';

const WEIGHT = { regular: '400', medium: '500', bold: '700' } as const;

export function Heading({ props }: NodeProps) {
  const colors = useTheme();
  return (
    <RNText style={[pick(HEADING_SIZE, props.size, 'md'), styles.heading, { color: colors.text }]} numberOfLines={3}>
      {String(props.text)}
    </RNText>
  );
}

export function Text({ props }: NodeProps) {
  const colors = useTheme();
  return (
    <RNText
      style={[
        pick(TEXT_SIZE, props.size, 'md'),
        { color: toneColor(colors, props.tone), fontWeight: pick(WEIGHT, props.weight, 'regular') },
      ]}
      numberOfLines={props.maxLines ?? undefined}>
      {String(props.text)}
    </RNText>
  );
}

export function Caption({ props }: NodeProps) {
  const colors = useTheme();
  return (
    <RNText style={[styles.caption, { color: toneColor(colors, props.tone, 'muted') }]} numberOfLines={2}>
      {String(props.text)}
    </RNText>
  );
}

export function Quote({ props }: NodeProps) {
  const colors = useTheme();
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
  const colors = useTheme();
  const color = toneColor(colors, props.tone, 'info');
  return (
    <View style={[styles.callout, { backgroundColor: withAlpha(color, 0.1), borderLeftColor: color }]}>
      {props.title ? <RNText style={[styles.calloutTitle, { color }]}>{String(props.title)}</RNText> : null}
      <RNText style={[TEXT_SIZE.md, { color: colors.text }]}>{String(props.text)}</RNText>
    </View>
  );
}

export function Badge({ props }: NodeProps) {
  const colors = useTheme();
  const neutral = !props.tone || props.tone === 'neutral';
  const color = neutral ? colors.textSecondary : toneColor(colors, props.tone);
  return (
    <View
      style={[styles.badge, { backgroundColor: neutral ? colors.backgroundSelected : withAlpha(color, 0.14) }]}>
      <RNText style={[styles.badgeText, { color }]} numberOfLines={1}>
        {String(props.label)}
      </RNText>
    </View>
  );
}

export function Link({ props }: NodeProps) {
  const colors = useTheme();
  return (
    <Pressable onPress={() => openUrl(props.url)} hitSlop={6} accessibilityRole="link">
      <RNText style={[TEXT_SIZE.md, styles.link, { color: colors.accent }]} numberOfLines={2}>
        {String(props.label)}
      </RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 16 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, gap: 6 },
  quoteText: { fontStyle: 'italic' },
  callout: { borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  link: { fontWeight: '600' },
});

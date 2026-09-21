import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GAP, HEADING_SIZE, pick, toneColor } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';

const CARD_PADDING = { none: 0, sm: 10, md: 14 } as const;

export function CardContainer({ props, slot }: NodeProps) {
  const colors = useTheme();
  const tint = props.tone && props.tone !== 'neutral' ? withAlpha(toneColor(colors, props.tone), 0.1) : undefined;
  return (
    <View style={[styles.card, { padding: pick(CARD_PADDING, props.padding, 'md'), backgroundColor: tint }]}>
      {slot('children').map((child) => child.element)}
    </View>
  );
}

export function Page({ slot }: NodeProps) {
  return <View style={styles.page}>{slot('children').map((child) => child.element)}</View>;
}

export function Section({ props, slot }: NodeProps) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[HEADING_SIZE.sm, styles.sectionTitle, { color: colors.textSecondary }]}>
        {String(props.title).toUpperCase()}
      </Text>
      {slot('children').map((child) => child.element)}
    </View>
  );
}

export function Stack({ props, slot }: NodeProps) {
  const align: ViewStyle['alignItems'] =
    props.align === 'start' ? 'flex-start' : props.align === 'end' ? 'flex-end' : props.align === 'center' ? 'center' : 'stretch';
  return (
    <View style={{ gap: pick(GAP, props.gap, 'sm'), alignItems: align }}>
      {slot('children').map((child) => child.element)}
    </View>
  );
}

/** Components that take their natural width inside a Row; everything else shares the space. */
const FIXED_WIDTH_IN_ROW = new Set(['Icon', 'Badge', 'Link', 'Caption']);

export function Row({ props, slot }: NodeProps) {
  const align: ViewStyle['alignItems'] =
    props.align === 'start' ? 'flex-start' : props.align === 'end' ? 'flex-end' : 'center';
  const justify: ViewStyle['justifyContent'] =
    props.justify === 'center'
      ? 'center'
      : props.justify === 'end'
        ? 'flex-end'
        : props.justify === 'between'
          ? 'space-between'
          : 'flex-start';
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: pick(GAP, props.gap, 'sm'),
        alignItems: align,
        justifyContent: justify,
        flexWrap: props.wrap ? 'wrap' : 'nowrap',
      }}>
      {slot('children').map((child, index) => (
        <View
          key={index}
          style={FIXED_WIDTH_IN_ROW.has(child.type) || props.justify === 'between' ? styles.fixed : styles.grow}>
          {child.element}
        </View>
      ))}
    </View>
  );
}

export function Divider() {
  const colors = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 8, overflow: 'hidden' },
  page: { gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontWeight: '600', letterSpacing: 0.6, fontSize: 12 },
  fixed: { flexShrink: 0 },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});

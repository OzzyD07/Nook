import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { useFontStyle } from '@/openui/fonts';
import { openUrl } from '@/openui/open-url';
import { pick, TEXT_SIZE, toneColor } from '@/openui/tokens';
import type { NodeProps } from '@/openui/types';
import { colorOrTone, resolveColor, useUiColors, useUiTheme } from '@/openui/ui-theme';

const ICON_SIZE = { sm: 16, md: 22, lg: 32, xl: 48 } as const;

export function Icon({ props }: NodeProps) {
  const theme = useUiTheme();
  return <AppIcon name={props.name} size={pick(ICON_SIZE, props.size, 'md')} color={colorOrTone(theme, props.color, props.tone)} />;
}

export function Image({ props }: NodeProps) {
  const colors = useUiColors();
  return (
    <ExpoImage
      source={{ uri: String(props.url) }}
      accessibilityLabel={props.alt ?? undefined}
      contentFit={props.fit === 'contain' ? 'contain' : 'cover'}
      transition={150}
      style={[styles.image, { aspectRatio: props.aspectRatio ?? 16 / 9, backgroundColor: colors.backgroundSelected }]}
    />
  );
}

const METRIC_SIZE = { sm: 20, md: 26, lg: 34 } as const;

export function Metric({ props }: NodeProps) {
  const theme = useUiTheme();
  const colors = theme.colors;
  const font = useFontStyle(props.font ?? theme.font, 'bold');
  const good = props.trend === 'up' ? !props.invertTrend : props.trend === 'down' ? !!props.invertTrend : null;
  const deltaColor = good === null ? colors.textSecondary : good ? colors.positive : colors.negative;
  const arrow = props.trend === 'up' ? '▲ ' : props.trend === 'down' ? '▼ ' : '';
  const size = pick(METRIC_SIZE, props.size, 'md');
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {String(props.label)}
      </Text>
      <Text
        style={[styles.metricValue, font, { color: resolveColor(props.color, theme) ?? colors.text, fontSize: size, lineHeight: size * 1.2 }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {String(props.value)}
      </Text>
      {props.delta ? (
        <Text style={[styles.metricDelta, { color: deltaColor }]} numberOfLines={1}>
          {arrow}
          {String(props.delta)}
        </Text>
      ) : null}
    </View>
  );
}

export function Progress({ props }: NodeProps) {
  const theme = useUiTheme();
  const colors = theme.colors;
  const value = Math.min(100, Math.max(0, Number(props.value) || 0));
  return (
    <View style={styles.progress}>
      {props.label ? (
        <View style={styles.progressHeader}>
          <Text style={[TEXT_SIZE.sm, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {String(props.label)}
          </Text>
          <Text style={[TEXT_SIZE.sm, { color: colors.textSecondary }]}>{Math.round(value)}%</Text>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: colorOrTone(theme, props.color, props.tone, 'accent') }]} />
      </View>
    </View>
  );
}

export function List({ props, slot }: NodeProps) {
  const colors = useUiColors();
  const items = slot('items');
  return (
    <View>
      {items.map((item, index) => (
        <View
          key={index}
          style={[
            styles.listRow,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
          ]}>
          {props.ordered ? (
            <Text style={[TEXT_SIZE.sm, styles.ordinal, { color: colors.textSecondary }]}>{index + 1}.</Text>
          ) : null}
          <View style={styles.grow}>{item.element}</View>
        </View>
      ))}
    </View>
  );
}

export function ListItem({ props }: NodeProps) {
  const colors = useUiColors();
  const content = (
    <View style={styles.listItem}>
      {props.icon ? <AppIcon name={props.icon} size={18} color={colors.textSecondary} /> : null}
      <View style={styles.grow}>
        <Text style={[TEXT_SIZE.sm, styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
          {String(props.title)}
        </Text>
        {props.subtitle ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {String(props.subtitle)}
          </Text>
        ) : null}
      </View>
      {props.trailing ? (
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {String(props.trailing)}
        </Text>
      ) : null}
    </View>
  );
  if (!props.url) return content;
  return (
    <Pressable onPress={() => openUrl(props.url)} accessibilityRole="link">
      {content}
    </Pressable>
  );
}

export function Timeline({ slot }: NodeProps) {
  return <View>{slot('items').map((item) => item.element)}</View>;
}

export function TimelineItem({ props }: NodeProps) {
  const colors = useUiColors();
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: toneColor(colors, props.tone, 'accent') }]} />
        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
      </View>
      <View style={[styles.grow, styles.timelineBody]}>
        {props.time ? <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{String(props.time)}</Text> : null}
        <Text style={[TEXT_SIZE.md, styles.itemTitle, { color: colors.text }]}>{String(props.title)}</Text>
        {props.description ? (
          <Text style={[TEXT_SIZE.sm, { color: colors.textSecondary }]}>{String(props.description)}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function KeyValue({ props }: NodeProps) {
  const colors = useUiColors();
  const items = Array.isArray(props.items) ? (props.items as { label: string; value: string }[]) : [];
  return (
    <View style={[styles.keyValue, { borderColor: colors.border }]}>
      {items.map((item, index) => (
        <View
          key={index}
          style={[styles.kvRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Text style={[TEXT_SIZE.sm, styles.kvLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          <Text style={[TEXT_SIZE.sm, styles.kvValue, { color: colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Source({ props }: NodeProps) {
  const colors = useUiColors();
  const host = String(props.url).replace(/^https:\/\//, '').split(/[/?#]/)[0];
  return (
    <Pressable onPress={() => openUrl(props.url)} accessibilityRole="link" style={styles.source}>
      <AppIcon name="link" size={16} color={colors.accent} />
      <View style={styles.grow}>
        <Text style={[TEXT_SIZE.sm, styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
          {String(props.title)}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {props.publisher ? `${props.publisher} · ${host}` : host}
        </Text>
      </View>
    </Pressable>
  );
}

export function SourceList({ props, slot }: NodeProps) {
  const colors = useUiColors();
  return (
    <View style={styles.sourceList}>
      {props.title ? (
        <Text style={[TEXT_SIZE.sm, styles.itemTitle, { color: colors.textSecondary }]}>{String(props.title)}</Text>
      ) : null}
      {slot('items').map((item) => item.element)}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  image: { width: '100%', borderRadius: 10 },
  metric: { gap: 2 },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  metricValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricDelta: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  progress: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  listRow: { flexDirection: 'row', gap: 6, paddingVertical: 7 },
  ordinal: { minWidth: 18, fontVariant: ['tabular-nums'] },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontWeight: '600' },
  itemSubtitle: { fontSize: 12, lineHeight: 16 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 12, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineBody: { paddingBottom: 16, gap: 2 },
  keyValue: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 },
  kvLabel: { flexShrink: 1 },
  kvValue: { fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  source: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 },
  sourceList: { gap: 2 },
});

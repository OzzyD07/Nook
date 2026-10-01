import { EXAMPLES } from '@nook/openui';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DetailView } from '@/openui/DetailView';
import { OpenUIView } from '@/openui/OpenUIView';
import { PageBackdrop, usePageAppearance } from '@/openui/page-appearance';

/** Card examples with the tile span they are designed for. */
const TILES: { name: keyof typeof EXAMPLES; columns: 1 | 2; rows: 1 | 2 }[] = [
  { name: 'weatherCard', columns: 1, rows: 1 },
  { name: 'gaugeCard', columns: 1, rows: 1 },
  { name: 'photoCard', columns: 2, rows: 1 },
  { name: 'ringCard', columns: 1, rows: 1 },
  { name: 'focusCard', columns: 1, rows: 1 },
  { name: 'metricCard', columns: 1, rows: 1 },
  { name: 'quoteCard', columns: 1, rows: 1 },
  { name: 'newsCard', columns: 2, rows: 1 },
  { name: 'weekCard', columns: 2, rows: 1 },
];

const DETAILS: (keyof typeof EXAMPLES)[] = ['habitDetail', 'eventDetail', 'htmlDetail', 'htmlChartDetail', 'metricDetail'];

const PADDING = 16;
const GAP = 12;
/** Same proportions as the dashboard grid. */
const ROW_RATIO = 0.9;

/** Development-only preview of every reference card, for checking the renderer without a backend. */
export default function GalleryScreen() {
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 720) - PADDING * 2;
  const cell = (inner - GAP) / 2;
  return (
    <>
      <Stack.Screen options={{ title: 'Style gallery' }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <View style={[styles.tiles, { width: inner }]}>
          {TILES.map(({ name, columns, rows }) => (
            <View
              key={name}
              testID={`tile-${name}`}
              style={[
                styles.tile,
                {
                  width: columns * cell + (columns - 1) * GAP,
                  height: rows * cell * ROW_RATIO + (rows - 1) * GAP,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                },
              ]}>
              <OpenUIView surface="card" source={EXAMPLES[name]} />
            </View>
          ))}
        </View>
        {DETAILS.map((name) => (
          <DetailPreview key={name} name={name} width={inner} />
        ))}
      </ScrollView>
    </>
  );
}

function DetailPreview({ name, width }: { name: keyof typeof EXAMPLES; width: number }) {
  const colors = useTheme();
  const appearance = usePageAppearance(EXAMPLES[name]);
  return (
    <View testID={`detail-${name}`} style={[styles.detail, { width, borderColor: colors.border, backgroundColor: colors.background }]}>
      <PageBackdrop appearance={appearance} />
      <Text style={[styles.label, { color: (appearance.colors ?? colors).textSecondary }]}>{name}</Text>
      <DetailView source={EXAMPLES[name]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, paddingBottom: 48, gap: 24, alignItems: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderRadius: Radius.tile, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  detail: { borderRadius: Radius.tile, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: 16, gap: 12 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
});

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NodeProps } from '@/openui/types';
import { useUiColors } from '@/openui/ui-theme';

const MIN_COLUMN_WIDTH = 110;

export function Table({ props }: NodeProps) {
  const colors = useUiColors();
  const columns: string[] = Array.isArray(props.columns) ? props.columns.map(String) : [];
  const rows: string[][] = Array.isArray(props.rows) ? props.rows.map((row: unknown[]) => row.map(String)) : [];
  // Narrow tables fill the width; wide ones scroll sideways.
  const cell = { minWidth: MIN_COLUMN_WIDTH, flex: 1 };
  return (
    <View style={styles.block}>
      {props.title ? <Text style={[styles.title, { color: colors.text }]}>{String(props.title)}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.row, { backgroundColor: colors.backgroundSelected }]}>
            {columns.map((column, i) => (
              <Text key={i} style={[styles.cell, styles.head, cell, { color: colors.text }]}>
                {column}
              </Text>
            ))}
          </View>
          {rows.map((row, r) => (
            <View key={r} style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              {row.map((value, c) => (
                <Text key={c} style={[styles.cell, cell, { color: c === 0 ? colors.text : colors.textSecondary }]}>
                  {value}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  scroll: { flexGrow: 1 },
  table: { flexGrow: 1, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, lineHeight: 18 },
  head: { fontWeight: '700' },
});

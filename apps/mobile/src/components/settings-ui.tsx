import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';

export function SettingsSection({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
      <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: colors.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  detail,
  onPress,
  destructive,
  loading,
  chevron,
  right,
  first,
}: {
  label: string;
  value?: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
  chevron?: boolean;
  right?: ReactNode;
  /** Hides the separator above the first row of a group. */
  first?: boolean;
}) {
  const colors = useTheme();
  const content = (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: destructive ? colors.negative : onPress ? colors.accent : colors.text }]}>
          {label}
        </Text>
        {detail ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={3}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {loading ? <ActivityIndicator size="small" /> : null}
      {right}
      {chevron ? <AppIcon name="arrow-right" size={14} color={colors.textSecondary} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  );
}

export function SettingsText({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text style={[styles.text, { color: colors.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 16 },
  group: { borderRadius: 14, overflow: 'hidden' },
  footer: { fontSize: 12, lineHeight: 17, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, minHeight: 46 },
  rowText: { flex: 1, gap: 2 },
  label: { fontSize: 15 },
  detail: { fontSize: 12, lineHeight: 17 },
  value: { fontSize: 15, maxWidth: '55%' },
  text: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 12 },
});

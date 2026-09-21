import { deriveStatus } from '@nook/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { strings } from '@/constants/strings';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatRelative } from '@/lib/time';
import { OpenUIView } from '@/openui/OpenUIView';
import { openUrl } from '@/openui/open-url';
import { useDashboard } from '@/store/dashboard';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const now = useNow();
  // Rendered straight from the synced (or cached) detailUi; no AI call happens here.
  const card = useDashboard((state) => state.cards[id]);

  if (!card || card.deletedAt !== null) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{strings.card.notFound}</Text>
      </View>
    );
  }

  const status = deriveStatus(card, now);
  // The app lists structured sources unless the page already cites them inline.
  const showSources = card.sources.length > 0 && !/\bSourceList\s*\(/.test(card.detailUi);
  const automation = card.automation;

  return (
    <>
      <Stack.Screen options={{ title: card.title }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          <OpenUIView surface="detail" source={card.detailUi} />

          {showSources ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>{strings.card.sources.toUpperCase()}</Text>
              {card.sources.map((source, index) => (
                <Pressable key={index} onPress={() => openUrl(source.url)} style={styles.source} accessibilityRole="link">
                  <AppIcon name="link" size={16} color={colors.accent} />
                  <View style={styles.grow}>
                    <Text style={[styles.sourceTitle, { color: colors.text }]} numberOfLines={2}>
                      {source.title}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {source.publisher ? `${source.publisher} · ` : ''}
                      {source.url.replace(/^https:\/\//, '').split(/[/?#]/)[0]}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {strings.card.updated} {formatRelative(card.updatedAt, now)} · {formatDateTime(card.updatedAt)} · v{card.version}
            </Text>
            {automation?.scheduleText || automation?.description ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {strings.card.automation}: {[automation.scheduleText, automation.provider].filter(Boolean).join(' · ')}
                {automation.description ? `\n${automation.description}` : ''}
              </Text>
            ) : null}
            {status !== 'active' ? (
              <Text style={[styles.meta, { color: status === 'stale' ? colors.warning : colors.negative }]}>
                {status === 'stale' ? strings.card.stale : strings.card.error}
                {card.statusMessage ? ` — ${card.statusMessage}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 720, gap: 24 },
  block: { gap: 4 },
  blockTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 4 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  grow: { flex: 1, minWidth: 0 },
  sourceTitle: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, lineHeight: 17 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
});

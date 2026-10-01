import { deriveStatus } from '@nook/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { strings } from '@/constants/strings';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirmAsync, showError } from '@/lib/confirm';
import { formatDateTime, formatRelative } from '@/lib/time';
import { DetailView } from '@/openui/DetailView';
import { openUrl } from '@/openui/open-url';
import { PageBackdrop, usePageAppearance } from '@/openui/page-appearance';
import { useCardStateStore } from '@/store/card-state';
import { setDesignLock } from '@/services/versions';
import { useDashboard } from '@/store/dashboard';
import { useSession } from '@/store/session';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const now = useNow();
  // Rendered straight from the synced (or cached) detailUi; no AI call happens here.
  const card = useDashboard((state) => state.cards[id]);
  const remoteRefresh = useCardStateStore((store) => store.remote[id]?.refreshRequestedAt ?? null);
  const pendingRefresh = useCardStateStore((store) => store.pending[id]?.refreshRequestedAt ?? null);
  const appearance = usePageAppearance(card?.detailUi ?? '');
  const uid = useSession((state) => state.user?.uid);

  if (!card || card.deletedAt !== null) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{strings.card.notFound}</Text>
      </View>
    );
  }

  const status = deriveStatus(card, now);
  const refreshRequested = (remoteRefresh ?? pendingRefresh) !== null;
  // The app lists structured sources unless the page already cites them inline.
  const showSources = card.sources.length > 0 && !/\bSourceList\s*\(/.test(card.detailUi);
  const automation = card.automation;
  // A themed page also colors the chrome around it: header, sources and footer.
  const chrome = appearance.colors ?? colors;
  const locked = card.designLocked;

  // Locking is instant; unlocking hands the design back to the AI, so it asks first.
  const toggleLock = async () => {
    if (!uid) return;
    if (locked && !(await confirmAsync(strings.card.unlockTitle, strings.card.unlockBody, strings.card.unlockDesign))) return;
    setDesignLock(uid, card.id, !locked).catch(showError);
  };

  return (
    <View style={[styles.screen, { backgroundColor: chrome.background }]}>
      <Stack.Screen
        options={{
          title: card.title,
          headerRight: () => (
            <Pressable
              onPress={toggleLock}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={locked ? strings.card.unlockDesign : strings.card.lockDesign}
              accessibilityState={{ selected: locked }}>
              <AppIcon name={locked ? 'lock' : 'unlock'} size={20} color={locked ? chrome.accent : chrome.textSecondary} />
            </Pressable>
          ),
          ...(appearance.colors
            ? { headerStyle: { backgroundColor: chrome.background }, headerTintColor: chrome.text, headerTitleStyle: { color: chrome.text } }
            : null),
        }}
      />
      <PageBackdrop appearance={appearance} />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          {refreshRequested ? (
            <Text style={[styles.meta, styles.requested, { color: chrome.accent, borderColor: chrome.accent }]}>
              {strings.card.refreshRequested}
            </Text>
          ) : null}
          <DetailView source={card.detailUi} cardId={card.id} />

          {showSources ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: chrome.textSecondary }]}>{strings.card.sources.toUpperCase()}</Text>
              {card.sources.map((source, index) => (
                <Pressable key={index} onPress={() => openUrl(source.url)} style={styles.source} accessibilityRole="link">
                  <AppIcon name="link" size={16} color={chrome.accent} />
                  <View style={styles.grow}>
                    <Text style={[styles.sourceTitle, { color: chrome.text }]} numberOfLines={2}>
                      {source.title}
                    </Text>
                    <Text style={[styles.meta, { color: chrome.textSecondary }]} numberOfLines={1}>
                      {source.publisher ? `${source.publisher} · ` : ''}
                      {source.url.replace(/^https:\/\//, '').split(/[/?#]/)[0]}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: chrome.border }]}>
            {locked ? (
              <View style={styles.lockRow}>
                <AppIcon name="lock" size={13} color={chrome.accent} />
                <Text style={[styles.meta, { color: chrome.accent }]}>{strings.card.designLocked}</Text>
              </View>
            ) : null}
            <Text style={[styles.meta, { color: chrome.textSecondary }]}>
              {strings.card.updated} {formatRelative(card.updatedAt, now)} · {formatDateTime(card.updatedAt)} · v{card.version}
            </Text>
            {automation?.scheduleText || automation?.description ? (
              <Text style={[styles.meta, { color: chrome.textSecondary }]}>
                {strings.card.automation}: {[automation.scheduleText, automation.provider].filter(Boolean).join(' · ')}
                {automation.description ? `\n${automation.description}` : ''}
              </Text>
            ) : null}
            {status !== 'active' ? (
              <Text style={[styles.meta, { color: status === 'stale' ? chrome.warning : chrome.negative }]}>
                {status === 'stale' ? strings.card.stale : strings.card.error}
                {card.statusMessage ? ` — ${card.statusMessage}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requested: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center' },
});

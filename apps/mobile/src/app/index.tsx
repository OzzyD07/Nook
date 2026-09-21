import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { DashboardGrid } from '@/components/dashboard-grid';
import { strings } from '@/constants/strings';
import { MaxContentWidth } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { activeCards, useDashboard } from '@/store/dashboard';

const PADDING = 16;

function SettingsButton() {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={strings.dashboard.settings}
      style={({ pressed }) => pressed && { opacity: 0.5 }}>
      <AppIcon name="gear" size={22} color={colors.text} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useTheme();
  const allCards = useDashboard((state) => state.cards);
  const hydrated = useDashboard((state) => state.hydrated);
  const syncState = useDashboard((state) => state.syncState);
  const cards = useMemo(() => activeCards(allCards), [allCards]);
  const [width, setWidth] = useState(0);
  const now = useNow();

  const loaded = hydrated && syncState !== 'idle';
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <SettingsButton /> }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {syncState === 'offline' || syncState === 'error' ? (
            <Text style={[styles.banner, { color: colors.textSecondary }]}>
              {syncState === 'offline' ? strings.dashboard.offline : strings.dashboard.syncError}
            </Text>
          ) : null}
          {loaded && cards.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{strings.dashboard.emptyTitle}</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{strings.dashboard.emptyBody}</Text>
            </View>
          ) : (
            <DashboardGrid cards={cards} width={width} now={now} />
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, paddingBottom: 48, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: 12 },
  banner: { fontSize: 12, textAlign: 'center' },
  empty: { paddingTop: 120, paddingHorizontal: 24, gap: 10, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});

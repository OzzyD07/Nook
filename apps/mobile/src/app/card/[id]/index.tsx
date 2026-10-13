import { isHtmlDocument } from '@nook/openui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardInfo } from '@/components/card-info';
import { HeaderButton, HtmlScreen } from '@/components/html-screen';
import { strings } from '@/constants/strings';
import { useDesignLockToggle } from '@/hooks/use-design-lock';
import { useTheme } from '@/hooks/use-theme';
import { DetailView } from '@/openui/DetailView';
import { PageBackdrop, usePageAppearance } from '@/openui/page-appearance';
import { useCardStateStore } from '@/store/card-state';
import { useDashboard } from '@/store/dashboard';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  // Rendered straight from the synced (or cached) detailUi; no AI call happens here.
  const card = useDashboard((state) => state.cards[id]);
  const remoteRefresh = useCardStateStore((store) => store.remote[id]?.refreshRequestedAt ?? null);
  const pendingRefresh = useCardStateStore((store) => store.pending[id]?.refreshRequestedAt ?? null);
  const appearance = usePageAppearance(card?.detailUi ?? '');
  const toggleLock = useDesignLockToggle(card);

  if (!card || card.deletedAt !== null) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{strings.card.notFound}</Text>
      </View>
    );
  }

  // A themed page also colors the chrome around it: header, sources and footer.
  const chrome = appearance.colors ?? colors;
  const locked = card.designLocked;
  const lockButton = (
    <HeaderButton
      icon={locked ? 'lock' : 'unlock'}
      label={locked ? strings.card.unlockDesign : strings.card.lockDesign}
      color={locked ? chrome.accent : chrome.textSecondary}
      selected={locked}
      onPress={toggleLock}
    />
  );

  // HTML pages own the whole screen; sources and update details move to the info sheet.
  if (isHtmlDocument(card.detailUi)) {
    return (
      <HtmlScreen
        card={card}
        source={card.detailUi}
        title={card.title}
        headerActions={
          <>
            <HeaderButton
              icon="info"
              label={strings.card.info}
              color={chrome.textSecondary}
              onPress={() => router.push({ pathname: '/card/[id]/info', params: { id: card.id } })}
            />
            {lockButton}
          </>
        }
      />
    );
  }

  const refreshRequested = (remoteRefresh ?? pendingRefresh) !== null;
  // The app lists structured sources unless the page already cites them inline.
  const showSources = !/\bSourceList\s*\(/.test(card.detailUi);

  return (
    <View style={[styles.screen, { backgroundColor: chrome.background }]}>
      <Stack.Screen
        options={{
          title: card.title,
          headerRight: () => lockButton,
          ...(appearance.colors
            ? { headerStyle: { backgroundColor: chrome.background }, headerTintColor: chrome.text, headerTitleStyle: { color: chrome.text } }
            : null),
        }}
      />
      <PageBackdrop appearance={appearance} />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          {refreshRequested ? (
            <Text style={[styles.requested, { color: chrome.accent, borderColor: chrome.accent }]}>{strings.card.refreshRequested}</Text>
          ) : null}
          <DetailView source={card.detailUi} cardId={card.id} />
          <CardInfo card={card} colors={chrome} showSources={showSources} />
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
  requested: {
    fontSize: 12,
    lineHeight: 17,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
});

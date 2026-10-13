import type { Card } from '@nook/shared';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { FullHtmlPage } from '@/openui/DetailView';
import { PageBackdrop, usePageAppearance } from '@/openui/page-appearance';

/**
 * An HTML page of a card (its detail page or one of its sub-pages) covering the whole
 * screen. Only a slim header with the back button stays; full screen hides it too and
 * leaves a small button to come back.
 */
export function HtmlScreen({
  card,
  source,
  title,
  headerActions,
}: {
  card: Card;
  source: string;
  title: string;
  /** Extra header buttons, shown before the full-screen toggle. */
  headerActions?: ReactNode;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const appearance = usePageAppearance(source);
  const chrome = appearance.colors ?? colors;
  const [fullscreen, setFullscreen] = useState(false);

  // The hardware back button leaves full screen before it leaves the page.
  useEffect(() => {
    if (!fullscreen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setFullscreen(false);
      return true;
    });
    return () => subscription.remove();
  }, [fullscreen]);

  const openPage = (page: string) => router.push({ pathname: '/card/[id]/page/[page]', params: { id: card.id, page } });

  return (
    <View style={[styles.screen, { backgroundColor: chrome.background }]}>
      <Stack.Screen
        options={{
          title,
          headerShown: !fullscreen,
          // Edge swipes belong to the page (games, drawing) while it is full screen.
          gestureEnabled: !fullscreen,
          headerStyle: { backgroundColor: chrome.background },
          headerTintColor: chrome.text,
          headerTitleStyle: { color: chrome.text },
          headerRight: () => (
            <View style={styles.actions}>
              {headerActions}
              <HeaderButton icon="expand" label={strings.card.fullscreen} color={chrome.textSecondary} onPress={() => setFullscreen(true)} />
            </View>
          ),
        }}
      />
      <StatusBar hidden={fullscreen} animated />
      <PageBackdrop appearance={appearance} />
      <FullHtmlPage
        source={source}
        cardId={card.id}
        pageIds={card.pages.map((page) => page.id)}
        onOpenPage={openPage}
        onFullscreen={setFullscreen}
      />
      {fullscreen ? (
        <Pressable
          onPress={() => setFullscreen(false)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={strings.card.exitFullscreen}
          style={[styles.exit, { top: insets.top + 8, right: insets.right + 12 }]}>
          <AppIcon name="collapse" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function HeaderButton({
  icon,
  label,
  color,
  onPress,
  selected,
}: {
  icon: 'expand' | 'info' | 'lock' | 'unlock';
  label: string;
  color: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}>
      <AppIcon name={icon} size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  exit: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

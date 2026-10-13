import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import { isFirebaseConfigured } from '@/lib/env';
import { useLoadUiFonts } from '@/openui/fonts';
import { watchAuth } from '@/services/auth';
import { syncCardState } from '@/services/card-state';
import { syncCards } from '@/services/cards';
import { syncSettings } from '@/services/settings';
import { useSession } from '@/store/session';

SplashScreen.preventAutoHideAsync();

function SetupRequired() {
  const colors = useTheme();
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={[styles.setup, { backgroundColor: colors.background }]}>
      <Text style={[styles.setupTitle, { color: colors.text }]}>{strings.setup.title}</Text>
      <Text style={[styles.setupBody, { color: colors.textSecondary }]}>{strings.setup.body}</Text>
    </View>
  );
}

function AppStack() {
  const status = useSession((state) => state.status);
  const uid = useSession((state) => state.user?.uid);

  useEffect(() => watchAuth(), []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    if (!uid) return;
    const stopCards = syncCards(uid);
    const stopCardState = syncCardState(uid);
    const stopSettings = syncSettings(uid);
    return () => {
      stopCards();
      stopCardState();
      stopSettings();
    };
  }, [uid]);

  // Keep the splash screen up until the persisted session has been restored.
  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: strings.appName }} />
        <Stack.Screen name="card/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="card/[id]/page/[page]" options={{ title: '' }} />
        <Stack.Screen
          name="card/[id]/info"
          options={{ title: strings.card.info, presentation: 'formSheet', sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true, headerShown: false }}
        />
        <Stack.Screen name="settings/index" options={{ title: strings.settings.title }} />
        <Stack.Screen name="settings/ai" options={{ title: strings.ai.title }} />
        <Stack.Screen name="settings/advanced" options={{ title: strings.advanced.title }} />
        <Stack.Screen name="settings/card-versions/[id]" options={{ title: strings.versions.title }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="gallery" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useLoadUiFonts();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text, primary: colors.accent },
  };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {isFirebaseConfigured ? <AppStack /> : <SetupRequired />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  setup: { flex: 1, justifyContent: 'center', padding: 32, gap: 12 },
  setupTitle: { fontSize: 22, fontWeight: '700' },
  setupBody: { fontSize: 15, lineHeight: 22 },
});

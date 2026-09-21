import { deriveStatus } from '@nook/shared';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { SettingsRow, SettingsSection, SettingsText } from '@/components/settings-ui';
import { strings } from '@/constants/strings';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { cacheSize, clearCache } from '@/lib/cache';
import { confirmAsync, showError } from '@/lib/confirm';
import { formatBytes, formatDateTime, formatRelative } from '@/lib/time';
import { listConnections, mcpEndpoint, revokeAllConnections, revokeConnection, type AiConnection } from '@/services/api';
import { signOut } from '@/services/auth';
import { saveTheme } from '@/services/settings';
import { activeCards, useDashboard } from '@/store/dashboard';
import { usePreferences, type ThemePreference } from '@/store/preferences';
import { useSession } from '@/store/session';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function useConnections() {
  const [state, setState] = useState<{ connections: AiConnection[] | null; error: string | null }>({
    connections: null,
    error: null,
  });
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!mcpEndpoint()) return;
    let active = true;
    listConnections()
      .then((connections) => active && setState({ connections, error: null }))
      .catch((reason: unknown) => {
        const error = reason instanceof Error ? reason.message : String(reason);
        if (active) setState((previous) => ({ ...previous, error }));
      });
    return () => {
      active = false;
    };
  }, [generation]);
  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  return { ...state, reload };
}

export default function SettingsScreen() {
  const colors = useTheme();
  const now = useNow();
  const user = useSession((state) => state.user);
  const theme = usePreferences((state) => state.theme);
  const allCards = useDashboard((state) => state.cards);
  const lastSyncAt = useDashboard((state) => state.lastSyncAt);
  const syncState = useDashboard((state) => state.syncState);
  const cards = useMemo(() => activeCards(allCards), [allCards]);
  const automated = cards.filter((card) => card.automation);
  const { connections, error: connectionsError, reload } = useConnections();
  const [copied, setCopied] = useState(false);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const endpoint = mcpEndpoint();

  useEffect(() => {
    cacheSize().then(setCacheBytes).catch(() => setCacheBytes(null));
  }, [lastSyncAt]);

  const copyEndpoint = async () => {
    await Clipboard.setStringAsync(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const disconnect = async (connection: AiConnection) => {
    if (!(await confirmAsync(`${strings.settings.revoke} ${connection.clientName}?`, strings.settings.revokeConfirm))) return;
    try {
      await revokeConnection(connection.id);
      reload();
    } catch (error) {
      showError(error);
    }
  };

  const disconnectAll = async () => {
    if (!(await confirmAsync(strings.settings.revokeAll, strings.settings.revokeConfirm))) return;
    try {
      await revokeAllConnections();
      reload();
    } catch (error) {
      showError(error);
    }
  };

  const clearSaved = async () => {
    await clearCache();
    setCacheBytes(0);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <SettingsSection title={strings.settings.account}>
        <SettingsRow first label={user?.email ?? '—'} />
        <SettingsRow label={strings.settings.signOut} destructive onPress={() => signOut().catch(showError)} />
      </SettingsSection>

      <SettingsSection title={strings.settings.aiConnections} footer={connectionsError ?? undefined}>
        {!endpoint ? (
          <SettingsText>{strings.settings.mcpNotConfigured}</SettingsText>
        ) : connections === null && !connectionsError ? (
          <SettingsRow first label="…" loading />
        ) : connections?.length ? (
          connections.map((connection, index) => (
            <SettingsRow
              key={connection.id}
              first={index === 0}
              label={connection.clientName}
              detail={`${connection.scopes.join(', ')} · ${formatDateTime(connection.createdAt)}`}
              right={
                <Text style={{ color: colors.negative }} onPress={() => disconnect(connection)}>
                  {strings.settings.revoke}
                </Text>
              }
            />
          ))
        ) : (
          <SettingsText>{strings.settings.noConnections}</SettingsText>
        )}
      </SettingsSection>

      <SettingsSection title={strings.settings.mcp} footer={strings.settings.connectSteps.join('\n')}>
        {endpoint ? (
          <SettingsRow
            first
            label={strings.settings.mcpEndpoint}
            detail={endpoint}
            right={
              <Text style={{ color: colors.accent }} onPress={copyEndpoint}>
                {copied ? strings.settings.copied : strings.settings.copy}
              </Text>
            }
          />
        ) : (
          <SettingsText>{strings.settings.mcpNotConfigured}</SettingsText>
        )}
      </SettingsSection>

      <SettingsSection title={strings.settings.dashboard}>
        {THEMES.map((option, index) => (
          <SettingsRow
            key={option}
            first={index === 0}
            label={strings.settings.themes[option]}
            value={theme === option ? '✓' : undefined}
            onPress={() => user && saveTheme(user.uid, option).catch(showError)}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={strings.settings.automation}>
        {automated.length ? (
          automated.map((card, index) => {
            const status = deriveStatus(card, now);
            return (
              <SettingsRow
                key={card.id}
                first={index === 0}
                label={card.title}
                detail={[
                  card.automation?.scheduleText,
                  card.automation?.provider,
                  `${strings.card.updated.toLowerCase()} ${formatRelative(card.updatedAt)}`,
                  status === 'stale' ? strings.card.stale : status === 'error' ? strings.card.error : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            );
          })
        ) : (
          <SettingsText>{strings.settings.noAutomation}</SettingsText>
        )}
      </SettingsSection>

      <SettingsSection title={strings.settings.data}>
        <SettingsRow
          first
          label={strings.settings.lastSync}
          value={lastSyncAt ? formatRelative(lastSyncAt) : strings.settings.never}
          detail={syncState === 'offline' ? strings.dashboard.offline : undefined}
        />
        <SettingsRow label={strings.settings.cacheSize} value={cacheBytes === null ? '—' : formatBytes(cacheBytes)} />
        <SettingsRow label={strings.settings.clearCache} destructive onPress={clearSaved} />
      </SettingsSection>

      <SettingsSection title={strings.settings.security}>
        <SettingsText>{strings.settings.securityBody}</SettingsText>
        {endpoint ? <SettingsRow label={strings.settings.revokeAll} destructive onPress={disconnectAll} /> : null}
      </SettingsSection>

      <SettingsSection title={strings.settings.advanced}>
        <SettingsRow first label={strings.settings.advanced} chevron onPress={() => router.push('/settings/advanced')} />
      </SettingsSection>

      <SettingsSection title={strings.settings.about}>
        <SettingsRow first label={strings.settings.version} value={Constants.expoConfig?.version ?? '—'} />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
});

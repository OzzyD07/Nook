import { OPENUI_LANG_CORE_VERSION, RENDERER_VERSION } from '@nook/openui';
import type { AuditLogEntry } from '@nook/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsRow, SettingsSection, SettingsText } from '@/components/settings-ui';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { showError } from '@/lib/confirm';
import { formatDateTime, formatRelative } from '@/lib/time';
import { checkHealth, mcpEndpoint, type WorkerHealth } from '@/services/api';
import { listAuditLogs, restoreDeletedCard } from '@/services/versions';
import { activeCards, deletedCards, useDashboard } from '@/store/dashboard';
import { useSession } from '@/store/session';

export default function AdvancedScreen() {
  const colors = useTheme();
  const uid = useSession((state) => state.user?.uid);
  const allCards = useDashboard((state) => state.cards);
  const lastSyncAt = useDashboard((state) => state.lastSyncAt);
  const cards = useMemo(() => activeCards(allCards), [allCards]);
  const deleted = useMemo(() => deletedCards(allCards), [allCards]);
  const [health, setHealth] = useState<WorkerHealth | 'checking' | 'down'>('checking');
  const [audit, setAudit] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    if (!mcpEndpoint()) return;
    checkHealth()
      .then(setHealth)
      .catch(() => setHealth('down'));
  }, []);

  const loadAudit = useCallback(() => {
    if (uid) listAuditLogs(uid).then(setAudit).catch(showError);
  }, [uid]);
  useEffect(loadAudit, [loadAudit]);

  const titleOf = (cardId: string | null) => (cardId ? (allCards[cardId]?.title ?? cardId) : '');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <SettingsSection title={strings.advanced.title}>
        <SettingsRow first label={strings.advanced.renderer} value={RENDERER_VERSION} />
        <SettingsRow label={strings.advanced.langCore} value={OPENUI_LANG_CORE_VERSION} />
        <SettingsRow
          label={strings.advanced.mcpStatus}
          value={
            !mcpEndpoint()
              ? '—'
              : health === 'checking'
                ? strings.advanced.checking
                : health === 'down' || !health.ok
                  ? strings.advanced.offline
                  : `${strings.advanced.online} · ${health.latencyMs} ms`
          }
        />
        <SettingsRow label={strings.settings.lastSync} value={lastSyncAt ? formatRelative(lastSyncAt) : strings.settings.never} />
      </SettingsSection>

      <SettingsSection title={strings.advanced.cardVersions}>
        {cards.map((card, index) => (
          <SettingsRow
            key={card.id}
            first={index === 0}
            label={card.title}
            value={`v${card.version}`}
            chevron
            onPress={() => router.push({ pathname: '/settings/card-versions/[id]', params: { id: card.id } })}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={strings.advanced.deletedCards}>
        {deleted.length ? (
          deleted.map((card, index) => (
            <SettingsRow
              key={card.id}
              first={index === 0}
              label={card.title}
              detail={card.deletedAt ? formatDateTime(card.deletedAt) : undefined}
              onPress={() => uid && restoreDeletedCard(uid, card).then(loadAudit).catch(showError)}
              value={strings.advanced.restore}
            />
          ))
        ) : (
          <SettingsText>{strings.advanced.noDeleted}</SettingsText>
        )}
      </SettingsSection>

      <SettingsSection title={strings.advanced.audit}>
        {audit?.length ? (
          audit.map((entry, index) => (
            <SettingsRow
              key={`${entry.requestId}-${index}`}
              first={index === 0}
              label={`${entry.action}${entry.cardId ? ` · ${titleOf(entry.cardId)}` : ''}`}
              detail={`${entry.provider} · ${entry.result}${entry.errorCode ? ` (${entry.errorCode})` : ''} · ${formatDateTime(entry.timestamp)}`}
            />
          ))
        ) : (
          <SettingsText>{audit === null ? '…' : strings.advanced.noAudit}</SettingsText>
        )}
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
});

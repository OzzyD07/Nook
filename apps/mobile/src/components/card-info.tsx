import { deriveStatus, type Card } from '@nook/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { strings } from '@/constants/strings';
import type { ThemeColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { formatDateTime, formatRelative } from '@/lib/time';
import { openUrl } from '@/openui/open-url';

/** Sources, update time, automation and status of a card: below OpenUI pages, in the info sheet of HTML pages. */
export function CardInfo({ card, colors, showSources }: { card: Card; colors: ThemeColors; showSources: boolean }) {
  const now = useNow();
  const status = deriveStatus(card, now);
  const automation = card.automation;
  return (
    <>
      {showSources && card.sources.length > 0 ? (
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
        {card.designLocked ? (
          <View style={styles.lockRow}>
            <AppIcon name="lock" size={13} color={colors.accent} />
            <Text style={[styles.meta, { color: colors.accent }]}>{strings.card.designLocked}</Text>
          </View>
        ) : null}
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
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  blockTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 4 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  grow: { flex: 1, minWidth: 0 },
  sourceTitle: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, lineHeight: 17 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

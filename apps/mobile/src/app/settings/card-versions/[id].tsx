import type { CardVersion } from '@nook/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAsync, showError } from '@/lib/confirm';
import { formatDateTime } from '@/lib/time';
import { OpenUIView } from '@/openui/OpenUIView';
import { listVersions, restoreVersion } from '@/services/versions';
import { useDashboard } from '@/store/dashboard';
import { useSession } from '@/store/session';

export default function CardVersionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const uid = useSession((state) => state.user?.uid);
  const card = useDashboard((state) => state.cards[id]);
  const [versions, setVersions] = useState<CardVersion[] | null>(null);

  const load = useCallback(() => {
    if (uid) listVersions(uid, id).then(setVersions).catch(showError);
  }, [uid, id]);
  useEffect(load, [load, card?.version]);

  const restore = async (version: CardVersion) => {
    if (!uid || !(await confirmAsync(`${strings.versions.restore} (v${version.version})`, strings.versions.restoreConfirm))) return;
    try {
      await restoreVersion(uid, id, version);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: card?.title ?? strings.versions.title }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {versions?.length === 0 ? <Text style={{ color: colors.textSecondary }}>{strings.versions.empty}</Text> : null}
        {versions?.map((version) => {
          const current = version.version === card?.version;
          return (
            <View key={version.version} style={styles.version}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  v{version.version}
                  {current ? ` · ${strings.versions.current}` : ''}
                </Text>
                {!current ? (
                  <Pressable onPress={() => restore(version)} hitSlop={8}>
                    <Text style={{ color: colors.accent, fontWeight: '600' }}>{strings.versions.restore}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {formatDateTime(version.createdAt)}
                {version.createdBy ? ` · ${version.createdBy.clientName}` : ''}
                {version.restoredFrom ? ` · ${strings.versions.restoredFrom}${version.restoredFrom}` : ''}
              </Text>
              <View
                style={[
                  styles.preview,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.border, height: 150 * (card?.layout.rowSpan ?? 1) },
                ]}>
                <OpenUIView surface="card" source={version.previewUi} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  version: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12 },
  preview: { borderRadius: Radius.tile, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});

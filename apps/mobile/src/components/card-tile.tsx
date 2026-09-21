import { deriveStatus, type Card } from '@nook/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { OpenUIView } from '@/openui/OpenUIView';

export function CardTile({ card, now }: { card: Card; now: number }) {
  const colors = useTheme();
  const status = deriveStatus(card, now);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
      accessibilityRole="button"
      accessibilityLabel={card.title}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <OpenUIView surface="card" source={card.previewUi} />
      {status !== 'active' ? (
        <View
          accessibilityLabel={status === 'stale' ? strings.card.stale : strings.card.error}
          style={[styles.dot, { backgroundColor: status === 'stale' ? colors.warning : colors.negative }]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: Radius.tile,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  dot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
});

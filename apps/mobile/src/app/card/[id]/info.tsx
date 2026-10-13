import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { CardInfo } from '@/components/card-info';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/store/dashboard';

/** Sheet with a card's sources and update details, for HTML pages that fill the screen. */
export default function CardInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const card = useDashboard((state) => state.cards[id]);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {card ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>{card.title}</Text>
          <CardInfo card={card} colors={colors} showSources />
        </>
      ) : (
        <Text style={{ color: colors.textSecondary }}>{strings.card.notFound}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  title: { fontSize: 20, fontWeight: '700' },
});

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HtmlScreen } from '@/components/html-screen';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/store/dashboard';

/** A sub-page of a card, opened by its detail page with nook.openPage("id"). */
export default function CardSubPageScreen() {
  const { id, page: pageId } = useLocalSearchParams<{ id: string; page: string }>();
  const colors = useTheme();
  const card = useDashboard((state) => state.cards[id]);
  const page = card?.pages.find((candidate) => candidate.id === pageId);

  if (!card || card.deletedAt !== null || !page) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{strings.card.pageNotFound}</Text>
      </View>
    );
  }
  return <HtmlScreen card={card} source={page.html} title={page.title} />;
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

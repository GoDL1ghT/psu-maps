import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerSummary } from '@/types';
import { formatCoordinate } from '@/utils/format';

type MarkerListProps = {
  markers: MarkerSummary[];
  onSelect: (marker: MarkerSummary) => void;
  onDelete: (marker: MarkerSummary) => void;
};

export function MarkerList({ markers, onSelect, onDelete }: MarkerListProps) {
  const theme = useTheme();

  if (markers.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="smallBold">Меток пока нет</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          Задержите палец на карте, чтобы поставить первую.
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={markers}
      keyExtractor={(marker) => String(marker.id)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}>
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              {item.id}
            </ThemedText>
          </View>

          <View style={styles.rowText}>
            <ThemedText type="smallBold">{formatCoordinate(item.latitude, item.longitude)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.imageCount} фото
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Удалить метку №${item.id}`}
            hitSlop={Spacing.two}
            onPress={() => onDelete(item)}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              Удалить
            </ThemedText>
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three - 4,
    borderRadius: Radius.medium,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  emptyText: {
    maxWidth: 320,
  },
});

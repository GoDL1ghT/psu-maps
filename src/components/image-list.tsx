import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerImage } from '@/types';

type ImageListProps = {
  images: MarkerImage[];
  onDelete: (image: MarkerImage) => void;
  onPreview?: (image: MarkerImage) => void;
};

export function ImageList({ images, onDelete, onPreview }: ImageListProps) {
  const theme = useTheme();

  if (images.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Фотографий нет</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          Добавьте снимок, чтобы запомнить это место.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {images.map((image) => (
        <View key={image.id} style={styles.cell}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Открыть фото"
            onPress={() => onPreview?.(image)}>
            <Image
              source={{ uri: image.uri }}
              style={[styles.image, { backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
              transition={150}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Удалить фото"
            hitSlop={Spacing.two}
            onPress={() => onDelete(image)}
            style={[styles.remove, { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              ✕
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.medium,
  },
  remove: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.four,
    gap: Spacing.half,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

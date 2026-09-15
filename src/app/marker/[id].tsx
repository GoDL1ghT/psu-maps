import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ImageList } from '@/components/image-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useMarkers } from '@/contexts/markers-context';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerDetailsParams, MarkerImage } from '@/types';
import { formatCoordinate, formatDate } from '@/utils/format';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function MarkerDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<MarkerDetailsParams>();
  const { getMarker, getMarkerImages, addImage, deleteImage } = useMarkers();
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isPicking, setIsPicking] = useState(false);
  const [preview, setPreview] = useState<MarkerImage | null>(null);

  const markerId = Number(id);
  const marker = Number.isInteger(markerId) ? getMarker(markerId) : undefined;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const ensurePermission = useCallback(async () => {
    if (permission?.granted) {
      return true;
    }
    const next = await requestPermission();
    if (next.granted) {
      return true;
    }
    Alert.alert(
      'Нет доступа к галерее',
      next.canAskAgain
        ? 'Разрешите доступ к фотографиям, чтобы добавить снимок.'
        : 'Разрешение отключено. Откройте настройки приложения и включите доступ к фотографиям.',
      next.canAskAgain
        ? [{ text: 'Понятно' }]
        : [{ text: 'Отмена', style: 'cancel' }, { text: 'Настройки', onPress: () => Linking.openSettings() }],
    );
    return false;
  }, [permission, requestPermission]);

  const handleAddImage = useCallback(async () => {
    if (!marker) {
      return;
    }
    setIsPicking(true);
    try {
      if (!(await ensurePermission())) {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled) {
        return;
      }
      for (const asset of result.assets) {
        await addImage(marker.id, asset.uri);
      }
    } catch (error) {
      Alert.alert('Не удалось добавить фото', (error as Error).message);
    } finally {
      setIsPicking(false);
    }
  }, [marker, ensurePermission, addImage]);

  const handleDeleteImage = useCallback(
    (image: MarkerImage) => {
      Alert.alert('Удалить фото?', 'Снимок исчезнет из этой метки.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteImage(image.id);
            } catch (error) {
              Alert.alert('Фото не удалено', (error as Error).message);
            }
          },
        },
      ]);
    },
    [deleteImage],
  );

  if (!marker) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Метка не найдена' }} />
        <View style={styles.missing}>
          <ThemedText type="subtitle">Метка не найдена</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.missingText}>
            Возможно, её удалили. Вернитесь к карте и выберите другую.
          </ThemedText>
          <ActionButton label="К карте" onPress={goBack} />
        </View>
      </ThemedView>
    );
  }

  const images = getMarkerImages(marker.id);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Метка №${marker.id}` }} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}
        showsVerticalScrollIndicator={false}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="small" themeColor="textSecondary">
            Координаты
          </ThemedText>
          <ThemedText type="subtitle" style={styles.coordinates}>
            {formatCoordinate(marker.latitude, marker.longitude)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Добавлена {formatDate(marker.createdAt)} · {images.length} фото
          </ThemedText>
        </ThemedView>

        <ImageList images={images} onDelete={handleDeleteImage} onPreview={setPreview} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ActionButton
          label={isPicking ? 'Открываем галерею…' : 'Добавить изображение'}
          onPress={handleAddImage}
          busy={isPicking}
        />
      </View>

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPreview(null)}>
          {preview && (
            <Image source={{ uri: preview.uri }} style={styles.previewImage} contentFit="contain" />
          )}
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.half,
  },
  coordinates: {
    fontSize: 24,
    lineHeight: 32,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  missingText: {
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});

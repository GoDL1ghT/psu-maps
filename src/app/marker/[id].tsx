import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ImageList } from '@/components/image-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useDatabase } from '@/contexts/database-context';
import { useMarkerDetails } from '@/hooks/use-marker-details';
import { useTheme } from '@/hooks/use-theme';
import type { MarkerDetailsParams, MarkerImage } from '@/types';
import { formatCoordinate, formatDate } from '@/utils/format';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function MarkerDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<MarkerDetailsParams>();
  const { addImages, deleteImage } = useDatabase();
  const markerId = Number(id);
  const { marker, images, isLoading, error, reload } = useMarkerDetails(markerId);
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isPicking, setIsPicking] = useState(false);
  const [preview, setPreview] = useState<MarkerImage | null>(null);

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
      await addImages(
        marker.id,
        result.assets.map((asset) => asset.uri),
      );
      await reload();
    } catch (cause) {
      Alert.alert('Не удалось добавить фото', (cause as Error).message);
    } finally {
      setIsPicking(false);
    }
  }, [marker, ensurePermission, addImages, reload]);

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
              await reload();
            } catch (cause) {
              Alert.alert('Фото не удалено', (cause as Error).message);
            }
          },
        },
      ]);
    },
    [deleteImage, reload],
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Метка' }} />
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">Загружаем метку…</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Ошибка' }} />
        <ThemedText type="subtitle">Не удалось прочитать метку</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          {error.message}
        </ThemedText>
        <ActionButton label="Повторить" onPress={reload} />
        <ActionButton label="К карте" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  if (!marker) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Метка не найдена' }} />
        <ThemedText type="subtitle">Метка не найдена</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          Возможно, её удалили. Вернитесь к карте и выберите другую.
        </ThemedText>
        <ActionButton label="К карте" onPress={goBack} />
      </ThemedView>
    );
  }

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centeredText: {
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

import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarkerList } from '@/components/marker-list';
import { MarkersMap } from '@/components/markers-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useMarkers } from '@/contexts/markers-context';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, Marker } from '@/types';
import { formatCount } from '@/utils/format';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markers, addMarker, deleteMarker, getMarkerImages } = useMarkers();

  const handleAddMarker = useCallback(
    async ({ latitude, longitude }: Coordinate) => {
      try {
        await addMarker(latitude, longitude);
      } catch (error) {
        Alert.alert('Метка не добавлена', (error as Error).message);
      }
    },
    [addMarker],
  );

  const handleSelectMarker = useCallback(
    (marker: Marker) => {
      try {
        router.push({ pathname: '/marker/[id]', params: { id: String(marker.id) } });
      } catch {
        Alert.alert('Не удалось открыть метку', 'Попробуйте ещё раз.');
      }
    },
    [router],
  );

  const handleDeleteMarker = useCallback(
    (marker: Marker) => {
      Alert.alert('Удалить метку?', 'Вместе с ней удалятся все её фотографии.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarker(marker.id);
            } catch (error) {
              Alert.alert('Метка не удалена', (error as Error).message);
            }
          },
        },
      ]);
    },
    [deleteMarker],
  );

  return (
    <ThemedView style={styles.container}>
      <MarkersMap
        markers={markers}
        onAddMarker={handleAddMarker}
        onSelectMarker={handleSelectMarker}
      />

      <ThemedView
        style={[
          styles.panel,
          { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.panelHeader}>
          <ThemedText type="smallBold">
            {markers.length === 0 ? 'Метки' : formatCount(markers.length, ['метка', 'метки', 'меток'])}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Долгое нажатие на карте — новая метка
          </ThemedText>
        </View>

        <MarkerList
          markers={markers}
          imageCount={(markerId) => getMarkerImages(markerId).length}
          onSelect={handleSelectMarker}
          onDelete={handleDeleteMarker}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panel: {
    maxHeight: '42%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  panelHeader: {
    gap: Spacing.half,
  },
});

import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { MarkerList } from '@/components/marker-list';
import { MarkersMap } from '@/components/markers-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useDatabase } from '@/contexts/database-context';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useProximityNotifications } from '@/hooks/use-proximity-notifications';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, Marker } from '@/types';
import { formatCount } from '@/utils/format';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markers, addMarker, deleteMarker, isLoading, error, retry } = useDatabase();
  const {
    location,
    errorMsg: locationError,
    isTracking,
    retry: retryLocation,
  } = useLocationTracking();
  const { nearbyMarkerIds, errorMsg: notificationsError } = useProximityNotifications(
    markers,
    location,
  );
  const warning = locationError ?? notificationsError;

  const handleAddMarker = useCallback(
    async ({ latitude, longitude }: Coordinate) => {
      try {
        await addMarker(latitude, longitude);
      } catch (cause) {
        Alert.alert('Метка не добавлена', (cause as Error).message);
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
            } catch (cause) {
              Alert.alert('Метка не удалена', (cause as Error).message);
            }
          },
        },
      ]);
    },
    [deleteMarker],
  );

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">База данных недоступна</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          {error.message}
        </ThemedText>
        <ActionButton label="Повторить" onPress={retry} />
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">Открываем базу меток…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MarkersMap
        markers={markers}
        onAddMarker={handleAddMarker}
        onSelectMarker={handleSelectMarker}
        showUserLocation={isTracking}
        nearbyMarkerIds={nearbyMarkerIds}
        userLocation={location?.coords ?? null}
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

        {warning && (
          <View style={[styles.warning, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" style={styles.warningText}>
              {warning}
            </ThemedText>
            {locationError && (
              <Pressable accessibilityRole="button" onPress={retryLocation} hitSlop={Spacing.two}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Повторить
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        <MarkerList
          markers={markers}
          onSelect={handleSelectMarker}
          onDelete={handleDeleteMarker}
          userLocation={location?.coords ?? null}
          nearbyMarkerIds={nearbyMarkerIds}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  warningText: {
    flex: 1,
  },
});

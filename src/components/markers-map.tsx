import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker as MarkerPin, type LongPressEvent } from 'react-native-maps';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, InitialRegion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, Marker } from '@/types';

const MAP_LOAD_TIMEOUT = 12_000;

type MarkersMapProps = {
  markers: Marker[];
  onAddMarker: (coordinate: Coordinate) => void;
  onSelectMarker: (marker: Marker) => void;
};

export function MarkersMap({ markers, onAddMarker, onSelectMarker }: MarkersMapProps) {
  const theme = useTheme();
  const [attempt, setAttempt] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isReady) {
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), MAP_LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [isReady, attempt]);

  const retry = () => {
    setTimedOut(false);
    setIsReady(false);
    setAttempt((current) => current + 1);
  };

  const handleLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onAddMarker({ latitude, longitude });
  };

  if (timedOut) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="subtitle">Карта не загрузилась</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.fallbackText}>
          Проверьте подключение к сети и попробуйте ещё раз.
        </ThemedText>
        <ActionButton label="Повторить" onPress={retry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        key={attempt}
        style={StyleSheet.absoluteFill}
        initialRegion={InitialRegion}
        onLongPress={handleLongPress}
        onMapReady={() => setIsReady(true)}
        onMapLoaded={() => setIsReady(true)}
        toolbarEnabled={false}>
        {markers.map((marker) => (
          <MarkerPin
            key={marker.id}
            identifier={String(marker.id)}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            pinColor={Colors.light.accent}
            title={`Метка №${marker.id}`}
            description="Нажмите, чтобы открыть"
            onCalloutPress={() => onSelectMarker(marker)}
            onPress={() => onSelectMarker(marker)}
          />
        ))}
      </MapView>

      {!isReady && (
        <View style={[styles.loader, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.accent} />
          <ThemedText themeColor="textSecondary">Загружаем карту…</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  fallbackText: {
    textAlign: 'center',
  },
});

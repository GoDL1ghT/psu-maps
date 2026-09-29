import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { PROXIMITY_THRESHOLD } from '@/constants/proximity';
import { createLogger } from '@/logger';
import { InitialRegion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, Marker } from '@/types';

const logMap = createLogger('map');

const MAP_LOAD_TIMEOUT = 12_000;
const LEAFLET_VERSION = '1.9.4';
const INITIAL_ZOOM = 15;

const MAP_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #e9e5de; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var send = function (payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  };

  window.onerror = function (message, source, line) {
    send({ type: 'log', text: 'ошибка: ' + message + ' (строка ' + line + ')' });
    return false;
  };

  if (!window.L) {
    send({ type: 'log', text: 'Leaflet не загрузился с CDN' });
  }

  var map = L.map('map').setView([${InitialRegion.latitude}, ${InitialRegion.longitude}], ${INITIAL_ZOOM});

  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  });

  tiles.on('tileerror', function (event) {
    send({ type: 'log', text: 'тайл не загрузился: ' + (event.tile ? event.tile.src : '?') });
  });
  tiles.on('load', function () {
    send({ type: 'log', text: 'тайлы отрисованы' });
  });
  tiles.addTo(map);

  map.whenReady(function () { send({ type: 'ready' }); });
  map.on('contextmenu', function (event) {
    send({ type: 'add', latitude: event.latlng.lat, longitude: event.latlng.lng });
  });

  var layer = L.layerGroup().addTo(map);
  var userLayer = L.layerGroup().addTo(map);

  var lastUser = null;
  var centeredOnUser = false;

  window.setUser = function (latitude, longitude) {
    userLayer.clearLayers();
    if (latitude === null) { lastUser = null; return; }
    lastUser = [latitude, longitude];
    L.circleMarker(lastUser, {
      radius: 7, color: '#ffffff', weight: 3,
      fillColor: '#1a73e8', fillOpacity: 1,
    }).addTo(userLayer);
    // первую позицию показываем сразу, дальше карту двигает только пользователь
    if (!centeredOnUser) {
      centeredOnUser = true;
      map.setView(lastUser, map.getZoom());
    }
  };

  window.focusUser = function () {
    if (lastUser) { map.setView(lastUser, map.getZoom()); }
  };

  window.setMarkers = function (markers, showCircles) {
    layer.clearLayers();
    markers.forEach(function (item) {
      if (showCircles) {
        L.circle([item.latitude, item.longitude], {
          radius: ${PROXIMITY_THRESHOLD},
          color: item.isNearby ? 'rgba(91, 69, 224, 0.9)' : 'rgba(91, 69, 224, 0.35)',
          fillColor: 'rgba(91, 69, 224, 0.15)',
          weight: 1,
        }).addTo(layer);
      }
      L.marker([item.latitude, item.longitude])
        .addTo(layer)
        .bindTooltip('Метка №' + item.id)
        .on('click', function () { send({ type: 'select', id: item.id }); });
    });
  };
</script>
</body>
</html>`;

type MarkersMapProps = {
  markers: Marker[];
  onAddMarker: (coordinate: Coordinate) => void;
  onSelectMarker: (marker: Marker) => void;
  showUserLocation?: boolean;
  nearbyMarkerIds?: number[];
  userLocation?: Coordinate | null;
};

export function MarkersMap({
  markers,
  onAddMarker,
  onSelectMarker,
  showUserLocation = false,
  nearbyMarkerIds = [],
  userLocation = null,
}: MarkersMapProps) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [attempt, setAttempt] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const payload = useMemo(
    () =>
      JSON.stringify(
        markers.map((marker) => ({
          id: marker.id,
          latitude: marker.latitude,
          longitude: marker.longitude,
          isNearby: nearbyMarkerIds.includes(marker.id),
        })),
      ),
    [markers, nearbyMarkerIds],
  );

  useEffect(() => {
    if (isReady) {
      return;
    }
    const timer = setTimeout(() => {
      logMap('таймаут загрузки', `${MAP_LOAD_TIMEOUT} мс`);
      setTimedOut(true);
    }, MAP_LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [isReady, attempt]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    logMap('меток отправлено в карту', markers.length);
    webViewRef.current?.injectJavaScript(
      `window.setMarkers(${payload}, ${showUserLocation}); true;`,
    );
  }, [isReady, payload, showUserLocation, markers.length]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    const latitude = userLocation?.latitude ?? null;
    const longitude = userLocation?.longitude ?? null;
    webViewRef.current?.injectJavaScript(`window.setUser(${latitude}, ${longitude}); true;`);
  }, [isReady, userLocation]);

  const focusUser = () => {
    webViewRef.current?.injectJavaScript('window.focusUser(); true;');
  };

  const retry = () => {
    logMap('повторная загрузка');
    setTimedOut(false);
    setIsReady(false);
    setAttempt((current) => current + 1);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === 'log') {
      logMap('webview', message.text);
      return;
    }
    if (message.type === 'ready') {
      logMap('карта готова');
      setIsReady(true);
      return;
    }
    if (message.type === 'add') {
      logMap('долгое нажатие', `${message.latitude.toFixed(5)}, ${message.longitude.toFixed(5)}`);
      onAddMarker({ latitude: message.latitude, longitude: message.longitude });
      return;
    }
    if (message.type === 'select') {
      logMap('нажата метка', `№${message.id}`);
      const selected = markers.find((marker) => marker.id === message.id);
      if (selected) {
        onSelectMarker(selected);
      }
    }
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
      <WebView
        key={attempt}
        ref={webViewRef}
        style={styles.map}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      {isReady && userLocation && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Показать моё местоположение"
          onPress={focusUser}
          style={[styles.focusButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            Я здесь
          </ThemedText>
        </Pressable>
      )}

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
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  focusButton: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
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

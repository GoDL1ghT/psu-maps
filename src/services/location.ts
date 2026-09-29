import * as Location from 'expo-location';

import { createLogger } from '@/logger';

const logGeo = createLogger('geo');

export interface LocationConfig {
  accuracy: Location.Accuracy;
  /** Как часто обновлять местоположение, мс (только Android). */
  timeInterval: number;
  /** Минимальное расстояние между обновлениями, м. */
  distanceInterval: number;
}

export const LOCATION_CONFIG: LocationConfig = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000,
  distanceInterval: 5,
};

/** Расстояние между двумя точками в метрах (формула гаверсинуса). */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function requestLocationPermissions(): Promise<void> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  logGeo('службы геолокации', servicesEnabled ? 'включены' : 'выключены');
  if (!servicesEnabled) {
    throw new Error('Службы геолокации выключены. Включите их в настройках устройства.');
  }

  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    logGeo('разрешение уже выдано');
    return;
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  logGeo('разрешение запрошено', status, `повторный запрос возможен: ${canAskAgain}`);
  if (status !== 'granted') {
    throw new Error(
      canAskAgain
        ? 'Доступ к местоположению не разрешён.'
        : 'Доступ к местоположению запрещён. Разрешите его в настройках приложения.',
    );
  }
}

export async function startLocationUpdates(
  onLocation: (location: Location.LocationObject) => void,
  onError?: (message: string) => void,
): Promise<Location.LocationSubscription> {
  logGeo('старт слежения', LOCATION_CONFIG);

  return Location.watchPositionAsync(
    LOCATION_CONFIG,
    (location) => {
      const { latitude, longitude, accuracy } = location.coords;
      logGeo('позиция', `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, `±${accuracy ?? '?'} м`);
      onLocation(location);
    },
    (reason) => {
      logGeo('ошибка слежения', reason);
      onError?.(reason);
    },
  );
}

export async function getInitialLocation(): Promise<Location.LocationObject | null> {
  const lastKnown = await Location.getLastKnownPositionAsync();
  logGeo('последняя известная позиция', lastKnown ? lastKnown.coords : 'отсутствует');
  return lastKnown;
}

import * as Location from 'expo-location';

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
  if (!servicesEnabled) {
    throw new Error('Службы геолокации выключены. Включите их в настройках устройства.');
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
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
  return Location.watchPositionAsync(LOCATION_CONFIG, onLocation, onError);
}

export async function getInitialLocation(): Promise<Location.LocationObject | null> {
  return Location.getLastKnownPositionAsync();
}

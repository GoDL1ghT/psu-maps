import type * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';

import { calculateDistance } from '@/services/location';
import {
  NotificationManager,
  PROXIMITY_EXIT_THRESHOLD,
  PROXIMITY_THRESHOLD,
  requestNotificationPermissions,
} from '@/services/notifications';
import type { Marker } from '@/types';

/** Шлёт уведомление, когда пользователь входит в радиус метки, и снимает его при выходе. */
export function useProximityNotifications(
  markers: Marker[],
  location: Location.LocationObject | null,
) {
  const manager = useMemo(() => new NotificationManager(), []);
  const [isAllowed, setIsAllowed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nearbyMarkerIds, setNearbyMarkerIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    requestNotificationPermissions()
      .then(() => !cancelled && setIsAllowed(true))
      .catch((cause: Error) => !cancelled && setErrorMsg(cause.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAllowed || !location) {
      return;
    }

    let cancelled = false;

    const check = async () => {
      await manager.syncWithMarkers(new Set(markers.map((marker) => marker.id)));

      for (const marker of markers) {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          marker.latitude,
          marker.longitude,
        );

        if (distance <= PROXIMITY_THRESHOLD) {
          await manager.showNotification(marker, distance);
        } else if (distance > PROXIMITY_EXIT_THRESHOLD) {
          await manager.removeNotification(marker.id);
        }
      }

      if (!cancelled) {
        setNearbyMarkerIds(manager.getActiveMarkerIds());
      }
    };

    check().catch((cause: Error) => {
      if (!cancelled) {
        setErrorMsg(cause.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [manager, markers, location, isAllowed]);

  useEffect(() => {
    return () => {
      manager.reset().catch(() => undefined);
    };
  }, [manager]);

  return { nearbyMarkerIds, errorMsg };
}

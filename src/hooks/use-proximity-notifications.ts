import type * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PROXIMITY_EXIT_THRESHOLD, PROXIMITY_THRESHOLD } from '@/constants/proximity';
import { createLogger } from '@/logger';
import { calculateDistance } from '@/services/location';
import { NotificationManager, requestNotificationPermissions } from '@/services/notifications';
import type { Marker } from '@/types';
import { formatDistance } from '@/utils/format';

const logProximity = createLogger('proximity');

/** Шлёт уведомление, когда пользователь входит в радиус метки, и снимает его при выходе. */
export function useProximityNotifications(
  markers: Marker[],
  location: Location.LocationObject | null,
) {
  const manager = useMemo(() => new NotificationManager(), []);
  const [isAllowed, setIsAllowed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nearbyMarkerIds, setNearbyMarkerIds] = useState<number[]>([]);
  const lastNearbyKey = useRef('');

  useEffect(() => {
    let cancelled = false;
    requestNotificationPermissions()
      .then(() => {
        if (!cancelled) {
          logProximity('проверка близости включена');
          setIsAllowed(true);
        }
      })
      .catch((cause: Error) => {
        if (!cancelled) {
          logProximity('проверка близости отключена', cause.message);
          setErrorMsg(cause.message);
        }
      });
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

      let closest: { id: number; distance: number } | null = null;

      for (const marker of markers) {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          marker.latitude,
          marker.longitude,
        );

        if (!closest || distance < closest.distance) {
          closest = { id: marker.id, distance };
        }

        if (distance <= PROXIMITY_THRESHOLD) {
          await manager.showNotification(marker, distance);
        } else if (distance > PROXIMITY_EXIT_THRESHOLD) {
          await manager.removeNotification(marker.id);
        }
      }

      if (closest) {
        logProximity('ближайшая метка', `№${closest.id}`, formatDistance(closest.distance));
      }

      if (!cancelled) {
        const active = manager.getActiveMarkerIds();
        const key = active.join(',');
        if (key !== lastNearbyKey.current) {
          lastNearbyKey.current = key;
          logProximity('в радиусе', active.length ? active : 'никого');
        }
        setNearbyMarkerIds(active);
      }
    };

    check().catch((cause: Error) => {
      if (!cancelled) {
        logProximity('ошибка проверки', cause.message);
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

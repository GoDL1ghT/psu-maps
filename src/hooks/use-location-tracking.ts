import type * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getInitialLocation, requestLocationPermissions, startLocationUpdates } from '@/services/location';

export interface LocationState {
  location: Location.LocationObject | null;
  errorMsg: string | null;
}

/** Следит за местоположением, пока приложение на переднем плане. */
export function useLocationTracking() {
  const [state, setState] = useState<LocationState>({ location: null, errorMsg: null });
  const [isTracking, setIsTracking] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (appState !== 'active') {
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    const setup = async () => {
      try {
        await requestLocationPermissions();

        const lastKnown = await getInitialLocation();
        if (!cancelled && lastKnown) {
          setState({ location: lastKnown, errorMsg: null });
        }

        subscription = await startLocationUpdates(
          (location) => {
            if (!cancelled) {
              setState({ location, errorMsg: null });
            }
          },
          (message) => {
            if (!cancelled) {
              setState((current) => ({ ...current, errorMsg: message }));
            }
          },
        );

        if (cancelled) {
          subscription.remove();
          return;
        }
        setIsTracking(true);
      } catch (cause) {
        if (!cancelled) {
          setIsTracking(false);
          setState((current) => ({
            ...current,
            errorMsg: cause instanceof Error ? cause.message : String(cause),
          }));
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [appState, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { ...state, isTracking, retry };
}

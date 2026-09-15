import { useCallback, useEffect, useRef, useState } from 'react';

import { useDatabase } from '@/contexts/database-context';
import type { Marker, MarkerImage } from '@/types';

/** Загружает метку и её изображения, пока экран деталей открыт. */
export function useMarkerDetails(markerId: number) {
  const { getMarker, getMarkerImages, isLoading: isDatabaseLoading, error: databaseError } = useDatabase();
  const [marker, setMarker] = useState<Marker | null>(null);
  const [images, setImages] = useState<MarkerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!Number.isInteger(markerId)) {
      setMarker(null);
      setImages([]);
      setIsLoading(false);
      return;
    }
    try {
      const found = await getMarker(markerId);
      const markerImages = found ? await getMarkerImages(markerId) : [];
      if (!isMounted.current) {
        return;
      }
      setMarker(found);
      setImages(markerImages);
      setError(null);
    } catch (cause) {
      if (isMounted.current) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [markerId, getMarker, getMarkerImages]);

  useEffect(() => {
    if (isDatabaseLoading) {
      return;
    }
    if (databaseError) {
      setIsLoading(false);
      setError(databaseError);
      return;
    }
    reload();
  }, [isDatabaseLoading, databaseError, reload]);

  return { marker, images, isLoading, error, reload };
}

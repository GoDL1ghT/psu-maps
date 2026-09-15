import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type { Marker, MarkerImage } from '@/types';

export interface MarkersContextValue {
  markers: Marker[];
  images: MarkerImage[];
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarker: (id: number) => Marker | undefined;
  getMarkerImages: (markerId: number) => MarkerImage[];
  addImage: (markerId: number, uri: string) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [images, setImages] = useState<MarkerImage[]>([]);
  const nextId = useRef(1);

  const addMarker = useCallback(async (latitude: number, longitude: number) => {
    const marker: Marker = {
      id: nextId.current++,
      latitude,
      longitude,
      createdAt: new Date().toISOString(),
    };
    setMarkers((current) => [...current, marker]);
    return marker.id;
  }, []);

  const deleteMarker = useCallback(async (id: number) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
    setImages((current) => current.filter((image) => image.markerId !== id));
  }, []);

  const getMarker = useCallback(
    (id: number) => markers.find((marker) => marker.id === id),
    [markers],
  );

  const getMarkerImages = useCallback(
    (markerId: number) => images.filter((image) => image.markerId === markerId),
    [images],
  );

  const addImage = useCallback(async (markerId: number, uri: string) => {
    setImages((current) => [
      ...current,
      { id: nextId.current++, markerId, uri, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const deleteImage = useCallback(async (id: number) => {
    setImages((current) => current.filter((image) => image.id !== id));
  }, []);

  const value = useMemo<MarkersContextValue>(
    () => ({
      markers,
      images,
      addMarker,
      deleteMarker,
      getMarker,
      getMarkerImages,
      addImage,
      deleteImage,
    }),
    [markers, images, addMarker, deleteMarker, getMarker, getMarkerImages, addImage, deleteImage],
  );

  return <MarkersContext.Provider value={value}>{children}</MarkersContext.Provider>;
}

export function useMarkers() {
  const context = useContext(MarkersContext);
  if (!context) {
    throw new Error('useMarkers должен вызываться внутри MarkersProvider');
  }
  return context;
}

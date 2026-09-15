import * as SQLite from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { logDatabase } from '@/database/logger';
import * as operations from '@/database/operations';
import { configureConnection, DATABASE_NAME, migrateDatabase } from '@/database/schema';
import type { Marker, MarkerImage, MarkerSummary } from '@/types';

export interface DatabaseContextValue {
  /** Метки с числом фотографий; обновляются после каждой операции записи. */
  markers: MarkerSummary[];
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<MarkerSummary[]>;
  getMarker: (id: number) => Promise<Marker | null>;
  addImage: (markerId: number, uri: string) => Promise<void>;
  addImages: (markerId: number, uris: string[]) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;
  isLoading: boolean;
  /** Ошибка инициализации: база недоступна, работать с ней нельзя. */
  error: Error | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const database = useRef<SQLite.SQLiteDatabase | null>(null);
  const [markers, setMarkers] = useState<MarkerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let connection: SQLite.SQLiteDatabase | null = null;

    const open = async () => {
      setIsLoading(true);
      setError(null);
      try {
        connection = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await configureConnection(connection);
        await migrateDatabase(connection);
        const initial = await operations.selectMarkers(connection);
        if (cancelled) {
          return;
        }
        database.current = connection;
        setMarkers(initial);
        logDatabase('соединение открыто', DATABASE_NAME);
      } catch (cause) {
        logDatabase('ошибка инициализации', cause);
        if (!cancelled) {
          setError(
            new Error(
              `Не удалось открыть базу данных: ${cause instanceof Error ? cause.message : cause}`,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    open();

    return () => {
      cancelled = true;
      database.current = null;
      connection?.closeAsync().catch((cause) => logDatabase('ошибка закрытия', cause));
    };
  }, [attempt]);

  const withDatabase = useCallback(
    async <T,>(task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> => {
      const db = database.current;
      if (!db) {
        throw new Error('База данных ещё не готова');
      }
      return task(db);
    },
    [],
  );

  const refreshMarkers = useCallback(async () => {
    const next = await withDatabase(operations.selectMarkers);
    setMarkers(next);
    return next;
  }, [withDatabase]);

  const addMarker = useCallback(
    async (latitude: number, longitude: number) => {
      const id = await withDatabase((db) => operations.insertMarker(db, latitude, longitude));
      await refreshMarkers();
      return id;
    },
    [withDatabase, refreshMarkers],
  );

  const deleteMarker = useCallback(
    async (id: number) => {
      await withDatabase((db) => operations.deleteMarker(db, id));
      await refreshMarkers();
    },
    [withDatabase, refreshMarkers],
  );

  const getMarker = useCallback(
    (id: number) => withDatabase((db) => operations.selectMarker(db, id)),
    [withDatabase],
  );

  const getMarkerImages = useCallback(
    (markerId: number) => withDatabase((db) => operations.selectMarkerImages(db, markerId)),
    [withDatabase],
  );

  const addImage = useCallback(
    async (markerId: number, uri: string) => {
      await withDatabase((db) => operations.insertImage(db, markerId, uri));
      await refreshMarkers();
    },
    [withDatabase, refreshMarkers],
  );

  const addImages = useCallback(
    async (markerId: number, uris: string[]) => {
      await withDatabase((db) => operations.insertImages(db, markerId, uris));
      await refreshMarkers();
    },
    [withDatabase, refreshMarkers],
  );

  const deleteImage = useCallback(
    async (id: number) => {
      await withDatabase((db) => operations.deleteImage(db, id));
      await refreshMarkers();
    },
    [withDatabase, refreshMarkers],
  );

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const value = useMemo<DatabaseContextValue>(
    () => ({
      markers,
      addMarker,
      deleteMarker,
      getMarkers: refreshMarkers,
      getMarker,
      addImage,
      addImages,
      deleteImage,
      getMarkerImages,
      isLoading,
      error,
      retry,
    }),
    [
      markers,
      addMarker,
      deleteMarker,
      refreshMarkers,
      getMarker,
      addImage,
      addImages,
      deleteImage,
      getMarkerImages,
      isLoading,
      error,
      retry,
    ],
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase должен вызываться внутри DatabaseProvider');
  }
  return context;
}

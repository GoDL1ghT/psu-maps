import type { SQLiteDatabase } from 'expo-sqlite';

import { logDatabase } from '@/database/logger';
import type { Marker, MarkerImage, MarkerSummary } from '@/types';

type MarkerRow = {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
};

type MarkerSummaryRow = MarkerRow & { image_count: number };

type MarkerImageRow = {
  id: number;
  marker_id: number;
  uri: string;
  created_at: string;
};

/** SQLite отдаёт `CURRENT_TIMESTAMP` как «YYYY-MM-DD HH:MM:SS» в UTC. */
const toIsoDate = (value: string) => value.replace(' ', 'T') + 'Z';

const toMarker = (row: MarkerRow): Marker => ({
  id: row.id,
  latitude: row.latitude,
  longitude: row.longitude,
  createdAt: toIsoDate(row.created_at),
});

const toMarkerSummary = (row: MarkerSummaryRow): MarkerSummary => ({
  ...toMarker(row),
  imageCount: row.image_count,
});

const toMarkerImage = (row: MarkerImageRow): MarkerImage => ({
  id: row.id,
  markerId: row.marker_id,
  uri: row.uri,
  createdAt: toIsoDate(row.created_at),
});

export async function selectMarkers(db: SQLiteDatabase): Promise<MarkerSummary[]> {
  const rows = await db.getAllAsync<MarkerSummaryRow>(
    `SELECT m.id, m.latitude, m.longitude, m.created_at, COUNT(i.id) AS image_count
       FROM markers m
       LEFT JOIN marker_images i ON i.marker_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC, m.id DESC`,
  );
  logDatabase('selectMarkers', `${rows.length} шт.`);
  return rows.map(toMarkerSummary);
}

export async function selectMarker(db: SQLiteDatabase, id: number): Promise<Marker | null> {
  const row = await db.getFirstAsync<MarkerRow>(
    'SELECT id, latitude, longitude, created_at FROM markers WHERE id = ?',
    id,
  );
  logDatabase('selectMarker', id, row ? 'найдена' : 'нет');
  return row ? toMarker(row) : null;
}

export async function insertMarker(
  db: SQLiteDatabase,
  latitude: number,
  longitude: number,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
    latitude,
    longitude,
  );
  logDatabase('insertMarker', result.lastInsertRowId);
  return result.lastInsertRowId;
}

/** Удаляет метку и её изображения одной транзакцией. */
export async function deleteMarker(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM marker_images WHERE marker_id = ?', id);
    const result = await tx.runAsync('DELETE FROM markers WHERE id = ?', id);
    if (result.changes === 0) {
      throw new Error(`Метка №${id} не найдена`);
    }
  });
  logDatabase('deleteMarker', id);
}

export async function selectMarkerImages(
  db: SQLiteDatabase,
  markerId: number,
): Promise<MarkerImage[]> {
  const rows = await db.getAllAsync<MarkerImageRow>(
    `SELECT id, marker_id, uri, created_at
       FROM marker_images
      WHERE marker_id = ?
      ORDER BY created_at DESC, id DESC`,
    markerId,
  );
  logDatabase('selectMarkerImages', markerId, `${rows.length} шт.`);
  return rows.map(toMarkerImage);
}

export async function insertImage(
  db: SQLiteDatabase,
  markerId: number,
  uri: string,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
    markerId,
    uri,
  );
  logDatabase('insertImage', result.lastInsertRowId, `метка ${markerId}`);
  return result.lastInsertRowId;
}

export async function insertImages(
  db: SQLiteDatabase,
  markerId: number,
  uris: string[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const uri of uris) {
      await tx.runAsync('INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)', markerId, uri);
    }
  });
  logDatabase('insertImages', markerId, `${uris.length} шт.`);
}

export async function deleteImage(db: SQLiteDatabase, id: number): Promise<void> {
  const result = await db.runAsync('DELETE FROM marker_images WHERE id = ?', id);
  if (result.changes === 0) {
    throw new Error(`Изображение №${id} не найдено`);
  }
  logDatabase('deleteImage', id);
}

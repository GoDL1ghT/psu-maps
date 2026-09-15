import type { SQLiteDatabase } from 'expo-sqlite';

import { logDatabase } from '@/database/logger';

export const DATABASE_NAME = 'markers.db';
export const DATABASE_VERSION = 1;

type Migration = (db: SQLiteDatabase) => Promise<void>;

const migrations: Migration[] = [
  // v1: метки и привязанные к ним изображения
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marker_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marker_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_marker_images_marker_id ON marker_images (marker_id);
    `);
  },
];

export async function migrateDatabase(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    logDatabase('схема актуальна, версия', currentVersion);
    return;
  }

  for (let version = currentVersion; version < DATABASE_VERSION; version++) {
    logDatabase('миграция', `${version} → ${version + 1}`);
    await migrations[version](db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export async function configureConnection(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
}

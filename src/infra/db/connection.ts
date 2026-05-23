import { app } from 'electron';
import { join } from 'path';
const Database = require('better-sqlite3');
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { DbStatus } from '../../shared/types';
import { SETTINGS_KEYS } from '../../shared/constants';

let sqliteDb: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;
let dbPath = '';

/**
 * Initializes and establishes SQLite connection in userData directory.
 * Why: Creates DB tables programmatically on load to ensure zero-setup execution.
 */
export function initDatabase(): { db: BetterSQLite3Database<typeof schema>; path: string } {
  if (drizzleDb && sqliteDb) {
    return { db: drizzleDb, path: dbPath };
  }

  try {
    // Dynamically calculate userData folder path to prevent source path pollution.
    const userDataPath = app.getPath('userData');
    dbPath = join(userDataPath, 'snaplingo.db');

    sqliteDb = new Database(dbPath);

    // Run programmatic migrations to initialize structures reliably on target computers.
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS translation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        source_language TEXT,
        target_language TEXT NOT NULL,
        source_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS glossary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_term TEXT NOT NULL,
        target_term TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS translation_cache (
        hash TEXT PRIMARY KEY,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        target_language TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    drizzleDb = drizzle(sqliteDb, { schema });

    // Seed default settings if tables are newly created
    const existingCountResult = sqliteDb.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (existingCountResult.count === 0) {
      const now = new Date().toISOString();
      const insertStmt = sqliteDb.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
      
      const defaults = [
        [SETTINGS_KEYS.TARGET_LANGUAGE, 'vi'],
        [SETTINGS_KEYS.SOURCE_LANGUAGE, 'auto'],
        [SETTINGS_KEYS.TRANSLATION_PROVIDER, 'google'],
        [SETTINGS_KEYS.OCR_PROVIDER, 'tesseract'],
        [SETTINGS_KEYS.HISTORY_ENABLED, 'true'],
        [SETTINGS_KEYS.PRIVACY_MODE, 'false'],
        [SETTINGS_KEYS.RESTORE_CLIPBOARD, 'true'],
        [SETTINGS_KEYS.AUTO_CHECK_UPDATES, 'true'],
        [SETTINGS_KEYS.WINDOW_MODE, 'expanded'],
        [SETTINGS_KEYS.DEVELOPER_MODE, 'false'],
        [SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK, 'true']
      ];

      for (const [key, value] of defaults) {
        insertStmt.run(key, value, now);
      }
    }

    return { db: drizzleDb, path: dbPath };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Returns active database connection status.
 */
export function getDatabaseStatus(): DbStatus {
  try {
    if (!sqliteDb || !drizzleDb) {
      const userDataPath = app.getPath('userData');
      const tempPath = join(userDataPath, 'snaplingo.db');
      return { connected: false, path: tempPath, error: 'Database not initialized yet' };
    }
    // Perform simple query to prove connection works
    sqliteDb.prepare('SELECT 1').run();
    return { connected: true, path: dbPath };
  } catch (error: unknown) {
    return {
      connected: false,
      path: dbPath || 'unknown',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

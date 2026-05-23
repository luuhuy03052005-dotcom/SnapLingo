import { eq } from 'drizzle-orm';
import { SettingRepository } from '../../core/ports/SettingRepository';
import { initDatabase } from './connection';
import { settings } from './schema';
import { AppSettings } from '../../shared/types';

/**
 * Settings Repository SQLite implementation.
 * Why: Interacts with Drizzle to read/save key-value records from settings table.
 */
export class SqliteSettingRepository implements SettingRepository {
  private getDb() {
    return initDatabase().db;
  }

  async get(key: string): Promise<string | null> {
    const db = this.getDb();
    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (result.length === 0) {
      return null;
    }
    return result[0].value;
  }

  async set(key: string, value: string): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db
      .insert(settings)
      .values({
        key,
        value,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: now
        }
      });
  }

  async getAll(): Promise<AppSettings> {
    const db = this.getDb();
    const allRecords = await db.select().from(settings);
    
    const settingsMap: AppSettings = {};
    for (const record of allRecords) {
      settingsMap[record.key] = record.value;
    }
    return settingsMap;
  }
}

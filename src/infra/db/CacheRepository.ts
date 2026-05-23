import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { initDatabase } from './connection';
import { translationCache } from './schema';

export interface CacheEntry {
  hash: string;
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  provider: string;
  createdAt: string;
}

/**
 * Translation Cache Repository.
 * Why: Avoids redundant network calls for identical text+lang+provider combos.
 */
export class CacheRepository {
  private getDb() {
    return initDatabase().db;
  }

  static generateHash(text: string, targetLang: string, provider: string): string {
    return createHash('sha256').update(`${text}|${targetLang}|${provider}`).digest('hex');
  }

  async get(hash: string): Promise<CacheEntry | undefined> {
    const db = this.getDb();
    const rows = await db.select().from(translationCache).where(eq(translationCache.hash, hash)).limit(1);
    return rows[0];
  }

  async set(entry: CacheEntry): Promise<void> {
    const db = this.getDb();
    await db.insert(translationCache).values(entry).onConflictDoUpdate({
      target: translationCache.hash,
      set: { translatedText: entry.translatedText, createdAt: entry.createdAt }
    });
  }

  async clear(): Promise<void> {
    const db = this.getDb();
    await db.delete(translationCache);
  }

  async getStats(): Promise<{ count: number }> {
    const db = this.getDb();
    const rows = await db.select().from(translationCache).all();
    return { count: rows.length };
  }
}

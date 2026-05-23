import { eq, desc, like, or } from 'drizzle-orm';
import { TranslationHistoryRepository } from '../../core/ports/TranslationHistoryRepository';
import { initDatabase } from './connection';
import { translationHistory } from './schema';
import { HistoryRecord } from '../../shared/types';

/**
 * SQLite Translation History Drizzle repository.
 * Why: Performs Drizzle SQL queries to load recent entries, search keywords, or prune rows.
 */
export class SqliteHistoryRepository implements TranslationHistoryRepository {
  private getDb() {
    return initDatabase().db;
  }

  async save(record: Omit<HistoryRecord, 'id'>): Promise<void> {
    const db = this.getDb();
    await db.insert(translationHistory).values({
      sourceText: record.sourceText,
      translatedText: record.translatedText,
      sourceLanguage: record.sourceLanguage,
      targetLanguage: record.targetLanguage,
      sourceType: record.sourceType,
      provider: record.provider,
      createdAt: record.createdAt
    });
  }

  async findRecent(limit: number): Promise<HistoryRecord[]> {
    const db = this.getDb();
    const results = await db
      .select()
      .from(translationHistory)
      .orderBy(desc(translationHistory.createdAt))
      .limit(limit);
    
    return results;
  }

  async search(query: string): Promise<HistoryRecord[]> {
    const db = this.getDb();
    const results = await db
      .select()
      .from(translationHistory)
      .where(
        or(
          like(translationHistory.sourceText, `%${query}%`),
          like(translationHistory.translatedText, `%${query}%`)
        )
      )
      .orderBy(desc(translationHistory.createdAt));

    return results;
  }

  async deleteById(id: number): Promise<void> {
    const db = this.getDb();
    await db.delete(translationHistory).where(eq(translationHistory.id, id));
  }

  async clearAll(): Promise<void> {
    const db = this.getDb();
    await db.delete(translationHistory);
  }
}

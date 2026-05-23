import { HistoryRecord } from '../../shared/types';

/**
 * Interface contract for translation history database operations.
 * Why: Pure port interface shielding core translation use-cases from Drizzle SQL details.
 */
export interface TranslationHistoryRepository {
  save(record: Omit<HistoryRecord, 'id'>): Promise<void>;
  findRecent(limit: number): Promise<HistoryRecord[]>;
  search(query: string): Promise<HistoryRecord[]>;
  deleteById(id: number): Promise<void>;
  clearAll(): Promise<void>;
}

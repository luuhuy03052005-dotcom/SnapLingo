import { AppSettings } from '../../shared/types';

/**
 * Interface contract for Settings repository.
 * Why: Pure port mapping to prevent core logic from directly referencing SQLite/Drizzle.
 */
export interface SettingRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getAll(): Promise<AppSettings>;
}

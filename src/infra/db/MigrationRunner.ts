import { LoggingService } from '../logging/LoggingService';

interface Migration {
  version: number;
  name: string;
  sql: string[];
  critical: boolean;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    critical: true,
    sql: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS translation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        source_language TEXT,
        target_language TEXT NOT NULL,
        source_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS glossary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_term TEXT NOT NULL,
        target_term TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS translation_cache (
        hash TEXT PRIMARY KEY,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        target_language TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`
    ]
  },
  {
    version: 2,
    name: 'add_vocabulary_definitions',
    critical: false,
    sql: [
      `CREATE TABLE IF NOT EXISTS vocabulary_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        normalized_word TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        pos TEXT,
        phonetic TEXT,
        english_definition TEXT,
        vietnamese_definition TEXT,
        examples_json TEXT,
        synonyms_json TEXT,
        antonyms_json TEXT,
        source_provider TEXT,
        raw_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(normalized_word, language, pos)
      );`
    ]
  }
];

/**
 * Executes database migrations sequentially inside transactions.
 * Why: Ensures that schema updates are rolled back on failure and tracked properly.
 */
export class MigrationRunner {
  static runMigrations(db: any): void {
    LoggingService.info('Starting SQLite database migrations...');

    try {
      // 1. Ensure migration tracking table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT NOT NULL
        );
      `);

      // 2. Run sequential migrations
      for (const migration of MIGRATIONS) {
        const isExecuted = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(migration.version);

        if (isExecuted) {
          LoggingService.debug(`Migration version ${migration.version} (${migration.name}) already applied.`);
          continue;
        }

        LoggingService.info(`Applying migration version ${migration.version}: ${migration.name}...`);

        try {
          // Wrap in a SQLite transaction for atomic safety
          const transaction = db.transaction(() => {
            for (const query of migration.sql) {
              db.exec(query);
            }
            db.prepare('INSERT INTO schema_migrations (version, name, executed_at) VALUES (?, ?, ?)')
              .run(migration.version, migration.name, new Date().toISOString());
          });

          transaction();
          LoggingService.info(`Migration version ${migration.version} applied successfully.`);
        } catch (migrationError: any) {
          LoggingService.error(`Failed to apply migration ${migration.version} (${migration.name}): ${migrationError.message}`);
          
          if (migration.critical) {
            throw new Error(`CRITICAL MIGRATION FAILED: version ${migration.version} (${migration.name}). Error: ${migrationError.message}`);
          } else {
            LoggingService.warn(`Non-critical migration ${migration.version} failed, continuing in degraded state.`);
          }
        }
      }

      LoggingService.info('All database migrations completed successfully.');
    } catch (error: any) {
      LoggingService.error(`Database migration run encountered a fatal error: ${error.message}`);
      throw error;
    }
  }
}

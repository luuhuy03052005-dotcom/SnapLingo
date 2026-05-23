import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * SQLite table schema for settings.
 * Why: Saves persistent config properties (languages, provider selections, shortcuts).
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
});

/**
 * SQLite table schema for translation history records.
 * Why: Records history entries local-first with target types and provider sources.
 */
export const translationHistory = sqliteTable('translation_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceText: text('source_text').notNull(),
  translatedText: text('translated_text').notNull(),
  sourceLanguage: text('source_language'),
  targetLanguage: text('target_language').notNull(),
  sourceType: text('source_type').notNull(), // 'text' | 'ocr' | 'image'
  provider: text('provider').notNull(),
  createdAt: text('created_at').notNull()
});

/**
 * Glossary table for custom term enforcement.
 * Why: Prevents provider from mistranslating domain-specific terms.
 */
export const glossary = sqliteTable('glossary', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceTerm: text('source_term').notNull(),
  targetTerm: text('target_term').notNull(),
  createdAt: text('created_at').notNull()
});

/**
 * Translation cache for avoiding redundant provider calls.
 * Why: Same text+lang+provider combo returns cached result instantly.
 */
export const translationCache = sqliteTable('translation_cache', {
  hash: text('hash').primaryKey(),
  sourceText: text('source_text').notNull(),
  translatedText: text('translated_text').notNull(),
  targetLanguage: text('target_language').notNull(),
  provider: text('provider').notNull(),
  createdAt: text('created_at').notNull()
});

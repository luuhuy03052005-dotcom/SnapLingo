import { z } from 'zod';

/**
 * Strict schema for setting update requests.
 * Why: Enforces that setting values match their specific type expectations (boolean, number, enum)
 * and prevents corrupted data or string-cast issues inside the database.
 */
export const UpdateSettingSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('targetLanguage'), value: z.string() }),
  z.object({ key: z.literal('sourceLanguage'), value: z.string() }),
  z.object({ key: z.literal('translationProvider'), value: z.string() }),
  z.object({ key: z.literal('ocrProvider'), value: z.string() }),
  z.object({ key: z.literal('historyEnabled'), value: z.boolean() }),
  z.object({ key: z.literal('privacyMode'), value: z.boolean() }),
  z.object({ key: z.literal('restoreClipboard'), value: z.boolean() }),
  z.object({ key: z.literal('autoCheckUpdates'), value: z.boolean() }),
  z.object({ key: z.literal('windowMode'), value: z.enum(['compact', 'expanded']) }),
  z.object({ key: z.literal('developerMode'), value: z.boolean() }),
  z.object({ key: z.literal('allowProviderFallback'), value: z.boolean() }),
  z.object({ key: z.literal('scanMode'), value: z.enum(['document', 'code']) }),
  z.object({ key: z.literal('performanceMode'), value: z.enum(['fast', 'balanced', 'quality']) }),
  z.object({ key: z.literal('allowCloudTranslation'), value: z.boolean() }),
  z.object({ key: z.literal('allowCloudOCR'), value: z.boolean() }),
  z.object({ key: z.literal('saveTranslationHistory'), value: z.boolean() }),
  z.object({ key: z.literal('ocrDefaultLanguages'), value: z.string() }),
  z.object({ key: z.literal('ocrMaxRetry'), value: z.number().int().min(0).max(2) }),
  z.object({ key: z.literal('ocrWorkerIdleTimeoutMs'), value: z.number().int().positive() }),
  z.object({ key: z.literal('posMaxTextLength'), value: z.number().int().positive() }),
  z.object({ key: z.literal('translationMaxTextLength'), value: z.number().int().positive() }),
  z.object({ key: z.literal('translationCacheEnabled'), value: z.boolean() })
]);

/**
 * Schema for standard settings lookup query.
 */
export const GetSettingSchema = z.string();

/**
 * Schema for window mode changes.
 */
export const SetWindowModeSchema = z.enum(['compact', 'expanded']);

/**
 * Schema for crop/screen OCR coordinate rectangles.
 */
export const SelectionRectSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

/**
 * Schema for text translation queries.
 */
export const TranslationInputSchema = z.object({
  text: z.string(),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string(),
  sourceType: z.enum(['text', 'ocr', 'image']).optional()
});

/**
 * Schema for vocabulary POS analysis text.
 */
export const AnalyzeVocabularySchema = z.string().max(2000);

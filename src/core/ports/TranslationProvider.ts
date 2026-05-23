import { TranslationInput, TranslationResult } from '../../shared/types';

/**
 * Interface contract for a translation provider engine.
 * Why: Pure port enabling loose coupling for pluggable engines (Google Free, LibreTranslate, DeepL).
 */
export interface TranslationProvider {
  translate(input: TranslationInput): Promise<TranslationResult>;
  detectLanguage?(text: string): Promise<string>;
}

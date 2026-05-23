import { TranslationProvider } from '../../core/ports/TranslationProvider';
import { TranslationInput, TranslationResult } from '../../shared/types';
import { TranslationError, TranslationErrorCode } from '../../shared/errors';
import { SqliteSettingRepository } from '../db/SettingRepository';

/**
 * LibreTranslate Self-Hosted Translation Engine.
 * Why: Connects to a local-first or customized LibreTranslate instance via setting urls.
 */
export class LibreProvider implements TranslationProvider {
  private settingRepo = new SqliteSettingRepository();

  async translate(input: TranslationInput): Promise<TranslationResult> {
    if (!input.text || input.text.trim() === '') {
      return { translatedText: '', provider: 'libretranslate' };
    }

    try {
      // Pull customized server url from DB or fallback to default self-host address
      const customUrl = await this.settingRepo.get('libreTranslateUrl');
      const baseUrl = customUrl || 'http://localhost:5000';
      const url = `${baseUrl}/translate`;

      const source = input.sourceLanguage && input.sourceLanguage !== 'auto' ? input.sourceLanguage : 'en';
      const target = input.targetLanguage;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: input.text,
          source: source,
          target: target,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`LibreTranslate responded with error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      
      return {
        translatedText: data.translatedText || '',
        provider: 'libretranslate'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch') || msg.includes('network')) {
        throw new TranslationError(TranslationErrorCode.NETWORK_ERROR, msg, 'libretranslate');
      }
      if (msg.includes('429')) {
        throw new TranslationError(TranslationErrorCode.RATE_LIMITED, msg, 'libretranslate');
      }
      throw new TranslationError(TranslationErrorCode.PROVIDER_UNAVAILABLE, msg, 'libretranslate');
    }
  }
}

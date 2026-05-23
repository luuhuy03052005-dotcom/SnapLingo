import { TranslationProvider } from '../../core/ports/TranslationProvider';
import { TranslationInput, TranslationResult } from '../../shared/types';
import { TranslationError, TranslationErrorCode } from '../../shared/errors';

/**
 * Google Free Translation Engine.
 * Why: Plugs into Google's public client API to provide zero-key translations.
 */
export class GoogleFreeProvider implements TranslationProvider {
  async translate(input: TranslationInput): Promise<TranslationResult> {
    if (!input.text || input.text.trim() === '') {
      return { translatedText: '', provider: 'google-free' };
    }

    try {
      const source = input.sourceLanguage || 'auto';
      const target = input.targetLanguage;
      
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(input.text)}`;

      // Execute network fetch natively using global fetch available in Node.js/Electron
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Free translation failed: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      
      // Parse nested response arrays which split multiline fragments
      let translatedText = '';
      if (data && Array.isArray(data[0])) {
        for (const part of data[0]) {
          if (part && typeof part[0] === 'string') {
            translatedText += part[0];
          }
        }
      }

      const detectedLanguage = typeof data[2] === 'string' ? data[2] : undefined;

      return {
        translatedText,
        detectedLanguage,
        provider: 'google-free'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('fetch') || msg.includes('ENOTFOUND') || msg.includes('network')) {
        throw new TranslationError(TranslationErrorCode.NETWORK_ERROR, msg, 'google-free');
      }
      if (msg.includes('429')) {
        throw new TranslationError(TranslationErrorCode.RATE_LIMITED, msg, 'google-free');
      }
      throw new TranslationError(TranslationErrorCode.PROVIDER_UNAVAILABLE, msg, 'google-free');
    }
  }
}

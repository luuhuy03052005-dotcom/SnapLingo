import * as https from 'https';
import { TranslationProvider } from '../../core/ports/TranslationProvider';
import { TranslationInput, TranslationResult } from '../../shared/types';
import { TranslationError, TranslationErrorCode } from '../../shared/errors';

/**
 * Robust helper using Node.js native https module.
 * Bypasses undici global fetch DNS and proxy issues on Windows.
 */
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
      },
      timeout: 10000 // 10 seconds timeout
    };

    const req = https.get(url, options, (res) => {
      const { statusCode } = res;
      if (statusCode && statusCode >= 400) {
        res.resume(); // Consume data to free memory
        if (statusCode === 429) {
          reject(new Error('Google Free rate limit (429) exceeded.'));
        } else {
          reject(new Error(`Google Free translation failed: HTTP ${statusCode}`));
        }
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        resolve(rawData);
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}

/**
 * Google Free Translation Engine.
 * Why: Plugs into Google's public client API to provide zero-key translations.
 * Bypasses Electron global fetch issues by utilizing native Node https.
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

      // Execute network request reliably via standard https module
      const rawData = await httpsGet(url);
      const data = JSON.parse(rawData);
      
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
      if (msg.includes('fetch') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('getaddrinfo') || msg.includes('timed out')) {
        throw new TranslationError(TranslationErrorCode.NETWORK_ERROR, msg, 'google-free');
      }
      if (msg.includes('429')) {
        throw new TranslationError(TranslationErrorCode.RATE_LIMITED, msg, 'google-free');
      }
      throw new TranslationError(TranslationErrorCode.PROVIDER_UNAVAILABLE, msg, 'google-free');
    }
  }
}

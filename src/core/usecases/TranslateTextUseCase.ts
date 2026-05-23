import { SettingRepository } from '../ports/SettingRepository';
import { TranslationHistoryRepository } from '../ports/TranslationHistoryRepository';
import { TranslationProvider } from '../ports/TranslationProvider';
import { TranslationInput, TranslationResult } from '../../shared/types';
import { SETTINGS_KEYS } from '../../shared/constants';
import { GlossaryRepository, GlossaryTerm } from '../../infra/db/GlossaryRepository';
import { CacheRepository } from '../../infra/db/CacheRepository';
import { DEV_MODE_TERMS } from '../../shared/devTerms';
import { LoggingService } from '../../infra/logging/LoggingService';

/**
 * Translate Text UseCase — Phase 4 upgraded.
 * Why: Adds glossary term protection, translation cache, Developer Mode,
 *      and safe provider fallback while preserving privacy enforcement.
 */
export class TranslateTextUseCase {
  constructor(
    private settingRepo: SettingRepository,
    private historyRepo: TranslationHistoryRepository,
    private googleFreeProvider: TranslationProvider,
    private libreProvider: TranslationProvider,
    private glossaryRepo: GlossaryRepository,
    private cacheRepo: CacheRepository
  ) {}

  async execute(input: TranslationInput): Promise<TranslationResult> {
    if (!input.text || input.text.trim() === '') {
      return { translatedText: '', provider: 'none' };
    }

    // 1. Load settings
    const [configuredProvider, privacyMode, historyEnabled, devMode, allowFallback] = await Promise.all([
      this.settingRepo.get(SETTINGS_KEYS.TRANSLATION_PROVIDER),
      this.settingRepo.get(SETTINGS_KEYS.PRIVACY_MODE),
      this.settingRepo.get(SETTINGS_KEYS.HISTORY_ENABLED),
      this.settingRepo.get(SETTINGS_KEYS.DEVELOPER_MODE),
      this.settingRepo.get(SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK)
    ]);
    const isPrivacy = privacyMode === 'true';

    // 2. Choose primary provider
    let primaryProvider: TranslationProvider = this.googleFreeProvider;
    let providerName = 'google';
    if (configuredProvider === 'libretranslate') {
      primaryProvider = this.libreProvider;
      providerName = 'libretranslate';
    }

    // 3. Check cache (skip if Privacy Mode is on)
    if (!isPrivacy) {
      const hash = CacheRepository.generateHash(input.text, input.targetLanguage, providerName);
      try {
        const cached = await this.cacheRepo.get(hash);
        if (cached) {
          LoggingService.debug(`[Translate] Cache hit: ${hash.substring(0, 8)}...`);
          return { translatedText: cached.translatedText, provider: `${cached.provider} (cached)` };
        }
      } catch (e) { LoggingService.warn(`[Translate] Cache lookup failed: ${e}`); }
    }

    // 4. Build glossary terms (user glossary + developer mode preset)
    let allTerms: GlossaryTerm[] = [];
    try {
      allTerms = await this.glossaryRepo.getAll();
    } catch (e) { LoggingService.warn(`[Translate] Glossary load failed: ${e}`); }

    if (devMode === 'true') {
      // Merge dev preset terms (avoid duplicates by sourceTerm)
      const existingSources = new Set(allTerms.map(t => t.sourceTerm.toLowerCase()));
      for (const dt of DEV_MODE_TERMS) {
        if (!existingSources.has(dt.sourceTerm.toLowerCase())) {
          allTerms.push({ sourceTerm: dt.sourceTerm, targetTerm: dt.targetTerm, createdAt: '' });
        }
      }
    }

    // 5. Apply glossary: replace source terms with markers
    let processedText = input.text;
    const appliedTerms: Array<{ marker: string; targetTerm: string }> = [];
    for (let i = 0; i < allTerms.length; i++) {
      const term = allTerms[i];
      const regex = new RegExp(`\\b${escapeRegex(term.sourceTerm)}\\b`, 'gi');
      if (regex.test(processedText)) {
        const marker = `__GL_${i}__`;
        processedText = processedText.replace(regex, marker);
        appliedTerms.push({ marker, targetTerm: term.targetTerm });
      }
    }

    // 6. Translate with fallback
    let result: TranslationResult;
    try {
      result = await primaryProvider.translate({ ...input, text: processedText });
    } catch (primaryError) {
      LoggingService.error(`[Translate] Primary provider failed: ${primaryError}`);
      // Fallback only if user allows it
      if (allowFallback === 'true') {
        const fallbackProvider = configuredProvider === 'libretranslate' ? this.googleFreeProvider : this.libreProvider;
        const fallbackName = configuredProvider === 'libretranslate' ? 'google-free' : 'libretranslate';
        LoggingService.info(`[Translate] Falling back to ${fallbackName}`);
        try {
          result = await fallbackProvider.translate({ ...input, text: processedText });
          result.provider = `${result.provider} (fallback)`;
        } catch (fallbackError) {
          LoggingService.error(`[Translate] Fallback also failed: ${fallbackError}`);
          throw primaryError; // Throw original error
        }
      } else {
        throw primaryError;
      }
    }

    // 7. Restore glossary markers → target terms
    let finalText = result.translatedText;
    for (const { marker, targetTerm } of appliedTerms) {
      finalText = finalText.replace(new RegExp(escapeRegex(marker), 'g'), targetTerm);
    }
    result.translatedText = finalText;

    // 8. Save to cache (skip if Privacy Mode)
    if (!isPrivacy) {
      try {
        const hash = CacheRepository.generateHash(input.text, input.targetLanguage, result.provider.replace(' (fallback)', ''));
        await this.cacheRepo.set({
          hash, sourceText: input.text, translatedText: result.translatedText,
          targetLanguage: input.targetLanguage, provider: result.provider,
          createdAt: new Date().toISOString()
        });
      } catch (e) { LoggingService.warn(`[Translate] Cache save failed: ${e}`); }
    }

    // 9. Save to history (skip if disabled or Privacy Mode)
    if (historyEnabled === 'true' && !isPrivacy) {
      try {
        await this.historyRepo.save({
          sourceText: input.text, translatedText: result.translatedText,
          sourceLanguage: input.sourceLanguage || result.detectedLanguage || 'auto',
          targetLanguage: input.targetLanguage, sourceType: input.sourceType || 'text',
          provider: result.provider, createdAt: new Date().toISOString()
        });
      } catch (e) { console.error('Failed to log translation history:', e); }
    }

    return result;
  }
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

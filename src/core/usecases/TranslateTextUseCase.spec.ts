import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslateTextUseCase } from './TranslateTextUseCase';
import { SettingRepository } from '../ports/SettingRepository';
import { TranslationHistoryRepository } from '../ports/TranslationHistoryRepository';
import { TranslationProvider } from '../ports/TranslationProvider';
import { GlossaryRepository } from '../../infra/db/GlossaryRepository';
import { CacheRepository } from '../../infra/db/CacheRepository';
import { SETTINGS_KEYS } from '../../shared/constants';

describe('TranslateTextUseCase Unit Tests', () => {
  let settingRepoMock: SettingRepository;
  let historyRepoMock: TranslationHistoryRepository;
  let googleProviderMock: TranslationProvider;
  let libreProviderMock: TranslationProvider;
  let glossaryRepoMock: GlossaryRepository;
  let cacheRepoMock: CacheRepository;
  let useCase: TranslateTextUseCase;

  beforeEach(() => {
    // 1. Mock Settings Repository
    const settingsState: Record<string, string> = {
      [SETTINGS_KEYS.TRANSLATION_PROVIDER]: 'google',
      [SETTINGS_KEYS.PRIVACY_MODE]: 'false',
      [SETTINGS_KEYS.HISTORY_ENABLED]: 'true',
      [SETTINGS_KEYS.DEVELOPER_MODE]: 'false',
      [SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK]: 'false',
    };

    settingRepoMock = {
      get: vi.fn().mockImplementation(async (key: string) => settingsState[key]),
      set: vi.fn().mockImplementation(async (key: string, value: string) => {
        settingsState[key] = value;
      }),
      getAll: vi.fn().mockResolvedValue(settingsState),
    };

    // 2. Mock History Repository
    historyRepoMock = {
      save: vi.fn().mockResolvedValue(undefined),
      getRecent: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    // 3. Mock Translation Providers
    googleProviderMock = {
      translate: vi.fn().mockResolvedValue({
        translatedText: 'Xin chào thế giới',
        detectedLanguage: 'en',
        provider: 'google',
      }),
    };

    libreProviderMock = {
      translate: vi.fn().mockResolvedValue({
        translatedText: 'Xin chào thế giới (Libre)',
        detectedLanguage: 'en',
        provider: 'libretranslate',
      }),
    };

    // 4. Mock Glossary Repository
    glossaryRepoMock = {
      getAll: vi.fn().mockResolvedValue([
        { id: 1, sourceTerm: 'React', targetTerm: 'Thư viện ReactJS', createdAt: '' },
      ]),
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    } as unknown as GlossaryRepository;

    // 5. Mock Cache Repository
    const cacheMap = new Map<string, any>();
    cacheRepoMock = {
      get: vi.fn().mockImplementation(async (hash: string) => cacheMap.get(hash)),
      set: vi.fn().mockImplementation(async (record: any) => {
        cacheMap.set(record.hash, record);
      }),
      clear: vi.fn().mockImplementation(async () => cacheMap.clear()),
      getStats: vi.fn().mockImplementation(async () => ({ count: cacheMap.size })),
    } as unknown as CacheRepository;

    useCase = new TranslateTextUseCase(
      settingRepoMock,
      historyRepoMock,
      googleProviderMock,
      libreProviderMock,
      glossaryRepoMock,
      cacheRepoMock
    );
  });

  it('should return empty result immediately when text is empty', async () => {
    const res = await useCase.execute({ text: '', targetLanguage: 'vi', sourceType: 'text' });
    expect(res).toEqual({ translatedText: '', provider: 'none' });
    expect(googleProviderMock.translate).not.toHaveBeenCalled();
    expect(historyRepoMock.save).not.toHaveBeenCalled();
  });

  it('should run standard translation flow successfully', async () => {
    const res = await useCase.execute({ text: 'Hello world', targetLanguage: 'vi', sourceType: 'text' });
    expect(res.translatedText).toBe('Xin chào thế giới');
    expect(res.provider).toBe('google');
    expect(googleProviderMock.translate).toHaveBeenCalledWith({
      text: 'Hello world',
      targetLanguage: 'vi',
      sourceType: 'text',
    });
    expect(cacheRepoMock.set).toHaveBeenCalled();
    expect(historyRepoMock.save).toHaveBeenCalled();
  });

  it('should replace glossary source terms before translating and restore target terms after translating', async () => {
    // Override google mock to echo back input so we can test replacement
    googleProviderMock.translate = vi.fn().mockImplementation(async (input) => ({
      translatedText: `Translated: ${input.text}`,
      detectedLanguage: 'en',
      provider: 'google',
    }));

    const res = await useCase.execute({ text: 'I love React framework', targetLanguage: 'vi', sourceType: 'text' });
    // "React" in "I love React framework" should be matched and replaced with "Thư viện ReactJS"
    expect(res.translatedText).toBe('Translated: I love Thư viện ReactJS framework');
  });

  it('should hit the cache and return immediately without calling translation providers', async () => {
    // Prime cache manually
    const text = 'Cached query';
    const hash = CacheRepository.generateHash(text, 'vi', 'google');
    await cacheRepoMock.set({
      hash,
      sourceText: text,
      translatedText: 'Bản dịch lưu đệm',
      targetLanguage: 'vi',
      provider: 'google',
      createdAt: new Date().toISOString(),
    });

    const res = await useCase.execute({ text, targetLanguage: 'vi', sourceType: 'text' });
    expect(res.translatedText).toBe('Bản dịch lưu đệm');
    expect(res.provider).toBe('google (cached)');
    expect(googleProviderMock.translate).not.toHaveBeenCalled();
  });

  it('should respect Privacy Mode and bypass cache lookup, cache saving, and history logs', async () => {
    // Enable Privacy Mode
    await settingRepoMock.set(SETTINGS_KEYS.PRIVACY_MODE, 'true');

    const text = 'Secret message';
    const res = await useCase.execute({ text, targetLanguage: 'vi', sourceType: 'text' });

    expect(res.translatedText).toBe('Xin chào thế giới');
    // Verify cache was not accessed or written to
    expect(cacheRepoMock.get).not.toHaveBeenCalled();
    expect(cacheRepoMock.set).not.toHaveBeenCalled();
    // Verify history was not saved
    expect(historyRepoMock.save).not.toHaveBeenCalled();
  });

  it('should safely fall back to another provider if primary provider fails and fallback setting is enabled', async () => {
    // Make Google (primary) throw network error
    googleProviderMock.translate = vi.fn().mockRejectedValue(new Error('Network disconnected'));
    // Enable fallback setting
    await settingRepoMock.set(SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK, 'true');

    const res = await useCase.execute({ text: 'Hello', targetLanguage: 'vi', sourceType: 'text' });
    expect(res.translatedText).toBe('Xin chào thế giới (Libre)');
    expect(res.provider).toBe('libretranslate (fallback)');
    expect(libreProviderMock.translate).toHaveBeenCalled();
  });

  it('should not fall back and instead rethrow error if primary provider fails and fallback is disabled', async () => {
    // Make Google throw network error
    googleProviderMock.translate = vi.fn().mockRejectedValue(new Error('Network disconnected'));
    // Disable fallback setting
    await settingRepoMock.set(SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK, 'false');

    await expect(useCase.execute({ text: 'Hello', targetLanguage: 'vi', sourceType: 'text' })).rejects.toThrow('Network disconnected');
    expect(libreProviderMock.translate).not.toHaveBeenCalled();
  });
});

export type PerformanceMode = 'fast' | 'balanced' | 'quality';

export interface AppSettings {
  targetLanguage: string;
  sourceLanguage: string;
  translationProvider: string;
  ocrProvider: string;
  historyEnabled: boolean;
  privacyMode: boolean;
  restoreClipboard: boolean;
  autoCheckUpdates: boolean;
  windowMode: 'compact' | 'expanded';
  developerMode: boolean;
  allowProviderFallback: boolean;
  scanMode: 'document' | 'code';
  performanceMode: PerformanceMode;
  allowCloudTranslation: boolean;
  allowCloudOCR: boolean;
  saveTranslationHistory: boolean;
  ocrDefaultLanguages: string;
  ocrMaxRetry: number;
  ocrWorkerIdleTimeoutMs: number;
  posMaxTextLength: number;
  translationMaxTextLength: number;
  translationCacheEnabled: boolean;
}

export type AppSettingKey = keyof AppSettings;

export const DEFAULT_SETTINGS: AppSettings = {
  targetLanguage: 'vi',
  sourceLanguage: 'auto',
  translationProvider: 'google',
  ocrProvider: 'tesseract',
  historyEnabled: true,
  privacyMode: false,
  restoreClipboard: true,
  autoCheckUpdates: true,
  windowMode: 'expanded',
  developerMode: false,
  allowProviderFallback: true,
  scanMode: 'document',
  performanceMode: 'balanced',
  allowCloudTranslation: false,
  allowCloudOCR: false,
  saveTranslationHistory: true,
  ocrDefaultLanguages: 'eng',
  ocrMaxRetry: 1,
  ocrWorkerIdleTimeoutMs: 900000, // 15 minutes
  posMaxTextLength: 2000,
  translationMaxTextLength: 5000,
  translationCacheEnabled: true
};

export function castRawToSettings(raw: Record<string, string>): AppSettings {
  const getBool = (key: string, defaultValue: boolean): boolean => {
    if (raw[key] === undefined) return defaultValue;
    return raw[key] === 'true';
  };
  const getNum = (key: string, defaultValue: number): number => {
    if (raw[key] === undefined) return defaultValue;
    const parsed = Number(raw[key]);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  const getStr = (key: string, defaultValue: string): string => {
    return raw[key] === undefined ? defaultValue : raw[key];
  };

  return {
    targetLanguage: getStr('targetLanguage', DEFAULT_SETTINGS.targetLanguage),
    sourceLanguage: getStr('sourceLanguage', DEFAULT_SETTINGS.sourceLanguage),
    translationProvider: getStr('translationProvider', DEFAULT_SETTINGS.translationProvider),
    ocrProvider: getStr('ocrProvider', DEFAULT_SETTINGS.ocrProvider),
    historyEnabled: getBool('historyEnabled', DEFAULT_SETTINGS.historyEnabled),
    privacyMode: getBool('privacyMode', DEFAULT_SETTINGS.privacyMode),
    restoreClipboard: getBool('restoreClipboard', DEFAULT_SETTINGS.restoreClipboard),
    autoCheckUpdates: getBool('autoCheckUpdates', DEFAULT_SETTINGS.autoCheckUpdates),
    windowMode: getStr('windowMode', DEFAULT_SETTINGS.windowMode) as 'compact' | 'expanded',
    developerMode: getBool('developerMode', DEFAULT_SETTINGS.developerMode),
    allowProviderFallback: getBool('allowProviderFallback', DEFAULT_SETTINGS.allowProviderFallback),
    scanMode: getStr('scanMode', DEFAULT_SETTINGS.scanMode) as 'document' | 'code',
    performanceMode: getStr('performanceMode', DEFAULT_SETTINGS.performanceMode) as PerformanceMode,
    allowCloudTranslation: getBool('allowCloudTranslation', DEFAULT_SETTINGS.allowCloudTranslation),
    allowCloudOCR: getBool('allowCloudOCR', DEFAULT_SETTINGS.allowCloudOCR),
    saveTranslationHistory: getBool('saveTranslationHistory', DEFAULT_SETTINGS.saveTranslationHistory),
    ocrDefaultLanguages: getStr('ocrDefaultLanguages', DEFAULT_SETTINGS.ocrDefaultLanguages),
    ocrMaxRetry: getNum('ocrMaxRetry', DEFAULT_SETTINGS.ocrMaxRetry),
    ocrWorkerIdleTimeoutMs: getNum('ocrWorkerIdleTimeoutMs', DEFAULT_SETTINGS.ocrWorkerIdleTimeoutMs),
    posMaxTextLength: getNum('posMaxTextLength', DEFAULT_SETTINGS.posMaxTextLength),
    translationMaxTextLength: getNum('translationMaxTextLength', DEFAULT_SETTINGS.translationMaxTextLength),
    translationCacheEnabled: getBool('translationCacheEnabled', DEFAULT_SETTINGS.translationCacheEnabled)
  };
}

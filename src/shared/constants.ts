/**
 * IPC channel identifiers.
 * Why: Keeps IPC channels strictly aligned between Main, Preload, and Renderer.
 */
export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'app:getVersion'
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:getAll'
  },
  DB: {
    GET_STATUS: 'db:getStatus'
  },
  UPDATE: {
    CHECK: 'update:check'
  },
  WINDOW: {
    SET_MODE: 'window:setMode',
    GET_MODE: 'window:getMode'
  },
  TRANSLATION: {
    TRANSLATE: 'translation:translate'
  },
  HISTORY: {
    GET_RECENT: 'history:getRecent',
    SEARCH: 'history:search',
    DELETE: 'history:delete',
    CLEAR: 'history:clear'
  },
  OCR: {
    START_SCREEN_SELECTION: 'ocr:startScreenSelection',
    CANCEL_SCREEN_SELECTION: 'ocr:cancelScreenSelection',
    SUBMIT_SELECTION: 'ocr:submitSelection',
    IMPORT_IMAGE: 'ocr:importImage',
    RECOGNIZE_IMAGE: 'ocr:recognizeImage',
    SEND_TEXT_TO_MAIN: 'ocr:sendTextToMain',
    TEXT_RECEIVED: 'ocr:textReceived'
  },
  GLOSSARY: {
    GET_ALL: 'glossary:getAll',
    ADD: 'glossary:add',
    DELETE: 'glossary:delete',
    CLEAR: 'glossary:clear'
  },
  CACHE: {
    CLEAR: 'cache:clear',
    GET_STATS: 'cache:getStats'
  },
  VOCABULARY: {
    ANALYZE: 'vocabulary:analyze'
  }
} as const;

/**
 * Standard settings keys.
 */
export const SETTINGS_KEYS = {
  TARGET_LANGUAGE: 'targetLanguage',
  SOURCE_LANGUAGE: 'sourceLanguage',
  TRANSLATION_PROVIDER: 'translationProvider',
  OCR_PROVIDER: 'ocrProvider',
  HISTORY_ENABLED: 'historyEnabled',
  PRIVACY_MODE: 'privacyMode',
  RESTORE_CLIPBOARD: 'restoreClipboard',
  AUTO_CHECK_UPDATES: 'autoCheckUpdates',
  WINDOW_MODE: 'windowMode', // 'compact' | 'expanded'
  OCR_LANGUAGE: 'ocrLanguage', // 'eng' | 'vie' etc.
  ALLOW_CDN_OCR: 'allowCdnOcr', // 'true' | 'false'
  DEVELOPER_MODE: 'developerMode', // 'true' | 'false'
  ALLOW_PROVIDER_FALLBACK: 'allowProviderFallback', // 'true' | 'false'
  SCAN_MODE: 'scanMode' // 'document' | 'code'
} as const;

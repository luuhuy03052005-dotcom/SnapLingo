/**
 * Database connection status.
 */
export interface DbStatus {
  connected: boolean;
  path: string;
  error?: string;
}

/**
 * Update check status result.
 */
export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'error' | 'disabled';
  version?: string;
  message?: string;
}

/**
 * Settings key-value dictionary.
 */
export type AppSettings = Record<string, string>;

/**
 * Input parameters for executing translations.
 */
export interface TranslationInput {
  text: string;
  sourceLanguage?: string; // e.g. 'auto'
  targetLanguage: string;
  sourceType?: 'text' | 'ocr' | 'image';
}

/**
 * Result returned from a translation provider.
 */
export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  provider: string;
}

/**
 * SQLite record representation for translation history.
 */
export interface HistoryRecord {
  id: number;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string | null;
  targetLanguage: string;
  sourceType: string;
  provider: string;
  createdAt: string;
}

/**
 * Scan mode discriminator — determines OCR post-processing pipeline.
 * Why: Code scanning needs indentation preservation and symbol fix,
 * while document scanning needs paragraph joining and whitespace normalization.
 */
export type ScanMode = 'document' | 'code';

/**
 * Screen selection rectangle (CSS pixel coordinates).
 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Input parameters for OCR recognition.
 */
export interface OCRInput {
  imagePath: string;
  language?: string;
  scanMode?: ScanMode;
}

/**
 * Result returned from an OCR provider.
 */
export interface OCRResult {
  text: string;
  confidence: number;
  lines?: OCRLine[];
}

/**
 * Individual OCR line with optional bounding box (per blueprint 06_OCR_SPEC).
 */
export interface OCRLine {
  text: string;
  confidence?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

/**
 * Combined OCR + Translation result for image import flow.
 */
export interface ImageOCRResult {
  ocrText: string;
  confidence: number;
  translatedText: string;
  provider: string;
  scanMode?: ScanMode;
}

/**
 * Exposed API structure in Preload window.snaplingo.
 */
export interface SnapLingoAPI {
  app: {
    getVersion: () => Promise<string>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<AppSettings>;
  };
  database: {
    getStatus: () => Promise<DbStatus>;
  };
  update: {
    check: () => Promise<UpdateStatus>;
  };
  window: {
    setMode: (mode: 'compact' | 'expanded') => Promise<void>;
    getMode: () => Promise<'compact' | 'expanded'>;
  };
  translation: {
    translate: (input: TranslationInput) => Promise<TranslationResult>;
  };
  history: {
    getRecent: (limit: number) => Promise<HistoryRecord[]>;
    search: (query: string) => Promise<HistoryRecord[]>;
    delete: (id: number) => Promise<void>;
    clear: () => Promise<void>;
  };
  ocr: {
    startScreenSelection: () => Promise<void>;
    cancelScreenSelection: () => Promise<void>;
    submitSelection: (rect: SelectionRect) => Promise<void>;
    importImage: () => Promise<ImageOCRResult | null>;
    recognizeImage: (filePath: string) => Promise<ImageOCRResult | null>;
  };
  glossary: {
    getAll: () => Promise<Array<{ id: number; sourceTerm: string; targetTerm: string; createdAt: string }>>;
    add: (source: string, target: string) => Promise<void>;
    delete: (id: number) => Promise<void>;
    clear: () => Promise<void>;
  };
  cache: {
    clear: () => Promise<void>;
    getStats: () => Promise<{ count: number }>;
  };
}

declare global {
  interface Window {
    snaplingo: SnapLingoAPI;
  }
}

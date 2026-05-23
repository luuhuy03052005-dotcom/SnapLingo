import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { app } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { OCRProvider } from '../../core/ports/OCRProvider';
import { OCRInput, OCRResult } from '../../shared/types';
import { LoggingService } from '../logging/LoggingService';

/**
 * Tesseract.js OCR Provider — local-first, offline-capable.
 *
 * Why: Resolves traineddata path differently for dev vs packaged builds.
 * Dev:      <projectRoot>/resources/ocr/
 * Packaged: <process.resourcesPath>/ocr/
 *
 * Never auto-downloads from CDN. If the requested language traineddata
 * file is missing locally, returns a clear error instead of silently fetching.
 */
export class TesseractProvider implements OCRProvider {
  private worker: Worker | null = null;
  private currentLang: string | null = null;

  /**
   * Resolves the absolute directory containing .traineddata.gz files.
   */
  private getLocalLangPath(): string {
    if (app.isPackaged) {
      // electron-builder extraResources copies resources/ocr/* → <resourcesPath>/ocr/
      return join(process.resourcesPath, 'ocr');
    }
    // Development: read from project root
    return join(app.getAppPath(), 'resources', 'ocr');
  }

  /**
   * Validates that the requested language traineddata file exists locally.
   * Checks both .traineddata.gz (preferred) and .traineddata fallback.
   */
  private validateLanguageFile(lang: string): boolean {
    const langPath = this.getLocalLangPath();
    const gzPath = join(langPath, `${lang}.traineddata.gz`);
    const rawPath = join(langPath, `${lang}.traineddata`);

    if (existsSync(gzPath) || existsSync(rawPath)) {
      return true;
    }

    LoggingService.error(
      `[TesseractProvider] Language file not found locally: ${lang}. ` +
      `Checked: ${gzPath}, ${rawPath}`
    );
    return false;
  }

  /**
   * Initializes or reinitializes the Tesseract worker for the given language.
   * Worker is reused across calls if the language hasn't changed.
   */
  private async ensureWorker(lang: string): Promise<Worker> {
    if (this.worker && this.currentLang === lang) {
      return this.worker;
    }

    // Terminate previous worker if switching languages
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.currentLang = null;
    }

    const langPath = this.getLocalLangPath();
    LoggingService.info(`[TesseractProvider] Initializing worker: lang=${lang}, langPath=${langPath}`);

    // Dynamically resolve node_modules paths to prevent Vite bundler relative path relocation failures in Electron
    const workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js');
    const corePath = require.resolve('tesseract.js-core/tesseract-core.wasm.js');

    this.worker = await createWorker(lang, 1, {
      workerPath,
      corePath,
      langPath,
      cachePath: join(app.getPath('userData'), 'ocr-cache'),
      cacheMethod: 'readOnly',
      gzip: true,
      logger: (m) => {
        LoggingService.debug(`[OCR] status=${m.status} progress=${m.progress}`);
      }
    });

    this.currentLang = lang;
    return this.worker;
  }

  async recognize(input: OCRInput): Promise<OCRResult> {
    const lang = input.language || 'eng';

    // Guard: validate traineddata exists before attempting OCR
    if (!this.validateLanguageFile(lang)) {
      throw new Error(
        `OCR language pack '${lang}' is not installed locally. ` +
        `Please place ${lang}.traineddata.gz in the resources/ocr/ directory.`
      );
    }

    LoggingService.info(`[TesseractProvider] Starting OCR: lang=${lang}, image=${input.imagePath}`);

    const worker = await this.ensureWorker(lang);
    const { data } = await worker.recognize(input.imagePath);

    const text = (data.text || '').trim();
    const confidence = data.confidence ?? 0;

    LoggingService.info(
      `[TesseractProvider] OCR complete: ${text.length} chars, confidence=${confidence.toFixed(1)}%`
    );

    return { text, confidence };
  }

  /**
   * Cleans up the worker thread. Call on app shutdown.
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.currentLang = null;
      LoggingService.info('[TesseractProvider] Worker terminated.');
    }
  }
}

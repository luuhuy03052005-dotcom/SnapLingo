import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { app } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { OCRProvider } from '../../core/ports/OCRProvider';
import { OCRInput, OCRResult } from '../../shared/types';
import { LoggingService } from '../logging/LoggingService';
import { CodeTextNormalizer } from './CodeTextNormalizer';
import { DocumentTextNormalizer } from './DocumentTextNormalizer';
import { SqliteSettingRepository } from '../db/SettingRepository';
import { OCRQueue } from './OCRQueue';

const settingRepo = new SqliteSettingRepository();

/**
 * Tesseract.js OCR Provider — local-first, offline-capable, production-hardened.
 * Why: Resolves traineddata path dev/packaged builds, enforces lazy load, worker timeouts,
 * execution timeouts, a safety circuit breaker, and strict memory safety.
 */
export class TesseractProvider implements OCRProvider {
  private worker: Worker | null = null;
  private currentLang: string | null = null;
  private queue = new OCRQueue();

  // Idle Termination Timer
  private idleTimer: NodeJS.Timeout | null = null;

  // Circuit Breaker Variables
  private consecutiveFailures = 0;
  private circuitBreakerActiveUntil = 0;

  /**
   * Resolves the absolute directory containing .traineddata.gz files.
   */
  private getLocalLangPath(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, 'ocr');
    }
    return join(app.getAppPath(), 'resources', 'ocr');
  }

  /**
   * Validates that the requested language traineddata file exists locally.
   */
  private validateLanguageFile(lang: string): boolean {
    const langPath = this.getLocalLangPath();
    const gzPath = join(langPath, `${lang}.traineddata.gz`);
    const rawPath = join(langPath, `${lang}.traineddata`);

    if (existsSync(gzPath) || existsSync(rawPath)) {
      return true;
    }

    LoggingService.error(
      `[TesseractProvider] Language file not found locally: ${lang}. Checked: ${gzPath}, ${rawPath}`
    );
    return false;
  }

  /**
   * Initializes or reinitializes the Tesseract worker for the given language.
   * Resets the idle termination timer.
   */
  private async ensureWorker(lang: string): Promise<Worker> {
    // Clear any pending idle timers since the worker is active
    this.clearIdleTimer();

    if (this.worker && this.currentLang === lang) {
      return this.worker;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.currentLang = null;
    }

    const langPath = this.getLocalLangPath();
    LoggingService.info(`[TesseractProvider] Initializing worker: lang=${lang}, langPath=${langPath}`);

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

  /**
   * Enqueues and executes the OCR task safely inside the single-flight queue.
   */
  async recognize(input: OCRInput): Promise<OCRResult> {
    return this.queue.enqueue(() => this.executeRecognize(input));
  }

  /**
   * Performs the OCR extraction with timeout bounds, memory safety, and circuit breaker.
   */
  private async executeRecognize(input: OCRInput): Promise<OCRResult> {
    // 1. Check Circuit Breaker Status
    if (Date.now() < this.circuitBreakerActiveUntil) {
      const waitSeconds = Math.ceil((this.circuitBreakerActiveUntil - Date.now()) / 1000);
      throw new Error(`OCR service is temporarily cooling down. Please try again in ${waitSeconds}s.`);
    }

    const lang = input.language || 'eng';
    const scanMode = input.scanMode || 'document';

    // 2. Validate traineddata files exist offline
    if (!this.validateLanguageFile(lang)) {
      throw new Error(
        `OCR language pack '${lang}' is not installed locally. ` +
        `Please place ${lang}.traineddata.gz in the resources/ocr/ directory.`
      );
    }

    let worker: Worker | null = null;
    try {
      worker = await this.ensureWorker(lang);

      const psm = '3';
      const preserveSpaces = scanMode === 'code' ? '1' : '0';

      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        preserve_interword_spaces: preserveSpaces
      });

      // 3. Execution Timeout (30 seconds limit)
      const ocrTimeoutMs = 30000;
      const recognizePromise = worker.recognize(input.imagePath);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR recognition timed out after 30 seconds.')), ocrTimeoutMs)
      );

      LoggingService.info(`[TesseractProvider] Starting OCR task: lang=${lang}, mode=${scanMode}`);
      const { data } = await Promise.race([recognizePromise, timeoutPromise]);

      const rawText = (data.text || '').trim();
      const confidence = data.confidence ?? 0;

      const text = scanMode === 'code'
        ? CodeTextNormalizer.normalize(rawText)
        : DocumentTextNormalizer.normalize(rawText);

      // Reset circuit breaker on success
      this.consecutiveFailures = 0;

      LoggingService.info(
        `[TesseractProvider] OCR complete: ${text.length} chars, confidence=${confidence.toFixed(1)}%`
      );

      return { text, confidence };
    } catch (error: any) {
      this.consecutiveFailures++;
      LoggingService.error(`[TesseractProvider] OCR error (Failures: ${this.consecutiveFailures}): ${error.message}`);

      // If timed out or crashed, terminate the worker thread to release blocked resources
      if (error.message.includes('timed out') || error.message.includes('worker') || this.consecutiveFailures >= 3) {
        await this.terminate();
      }

      // Trigger Circuit Breaker after 3 failures
      if (this.consecutiveFailures >= 3) {
        this.circuitBreakerActiveUntil = Date.now() + 60000; // Disable for 60 seconds
        LoggingService.warn('[TesseractProvider] Circuit breaker tripped. OCR disabled for 60s.');
      }

      throw error;
    } finally {
      // Force nullify memory-hungry structures
      input.imagePath = '';
      
      // Start/reset idle worker shutdown timer
      await this.resetIdleTimer();
    }
  }

  /**
   * Resets the idle timer using balanced duration loaded dynamically from settings.
   */
  private async resetIdleTimer(): Promise<void> {
    this.clearIdleTimer();

    try {
      const timeoutStr = await settingRepo.get('ocrWorkerIdleTimeoutMs');
      const timeoutMs = timeoutStr ? Number(timeoutStr) : 900000; // Default: 15 minutes

      this.idleTimer = setTimeout(() => {
        LoggingService.info(`[TesseractProvider] Idle worker timeout reached (${timeoutMs}ms). Terminating worker.`);
        this.terminate();
      }, timeoutMs);
    } catch (e: any) {
      // Fallback if settings load fails during shutdown
      this.idleTimer = setTimeout(() => {
        this.terminate();
      }, 900000);
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Cleans up the worker thread.
   */
  async terminate(): Promise<void> {
    this.clearIdleTimer();
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (e) {
        // Silently ignore termination warnings
      }
      this.worker = null;
      this.currentLang = null;
      LoggingService.info('[TesseractProvider] Worker terminated.');
    }
  }
}

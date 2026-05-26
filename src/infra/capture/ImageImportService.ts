import { dialog, app } from 'electron';
import { join, extname } from 'path';
import { existsSync, statSync, copyFileSync, unlinkSync } from 'fs';
import { TesseractProvider } from '../ocr/TesseractProvider';
import { TranslateTextUseCase } from '../../core/usecases/TranslateTextUseCase';
import { SqliteSettingRepository } from '../db/SettingRepository';
import { LoggingService } from '../logging/LoggingService';
import { ImageOCRResult } from '../../shared/types';
import { SETTINGS_KEYS } from '../../shared/constants';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const settingRepo = new SqliteSettingRepository();

/**
 * Image Import + OCR + Translation Orchestration Service.
 *
 * Why: Separated from ScreenCaptureService because this flow has no
 * desktopCapturer, DPI scaling, or overlay window logic. Single Responsibility.
 *
 * Flow: validate file → copy to temp → OCR → translate → cleanup temp → return result.
 */
export class ImageImportService {
  constructor(
    private ocrProvider: TesseractProvider,
    private translateUseCase: TranslateTextUseCase
  ) {}

  /**
   * Opens a native file dialog and runs OCR + translation on the selected image.
   * Returns null if the user cancels the dialog.
   */
  async importAndRecognize(): Promise<ImageOCRResult | null> {
    const result = await dialog.showOpenDialog({
      title: 'Select an image for OCR translation',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      LoggingService.info('[ImageImport] User cancelled file dialog.');
      return null;
    }

    const filePath = result.filePaths[0];
    LoggingService.info(`[ImageImport] User selected: ${filePath}`);

    return this.recognizeFromPath(filePath);
  }

  /**
   * Runs OCR + translation on a given image file path.
   * Used by both file dialog and drag-drop flows.
   */
  async recognizeFromPath(filePath: string): Promise<ImageOCRResult | null> {
    // Validate before processing
    this.validateFile(filePath);

    const tempPath = join(app.getPath('temp'), `snaplingo-img-${Date.now()}${extname(filePath)}`);

    try {
      // Copy to temp to avoid locking the user's original file
      copyFileSync(filePath, tempPath);
      LoggingService.info(`[ImageImport] Temp copy created: ${tempPath}`);

      // Run OCR with scan mode awareness
      const ocrLang = await settingRepo.get(SETTINGS_KEYS.OCR_LANGUAGE) || 'eng';
      const scanMode = (await settingRepo.get(SETTINGS_KEYS.SCAN_MODE) || 'document') as 'document' | 'code';
      LoggingService.info(`[ImageImport] Starting OCR: lang=${ocrLang}, scanMode=${scanMode}`);

      const ocrResult = await this.ocrProvider.recognize({
        imagePath: tempPath,
        language: ocrLang,
        scanMode
      });

      // Check for empty OCR result
      if (!ocrResult.text || ocrResult.text.trim() === '') {
        LoggingService.warn('[ImageImport] OCR returned empty text.');
        return {
          ocrText: '',
          confidence: 0,
          translatedText: '',
          provider: 'none',
          scanMode
        };
      }

      LoggingService.info(
        `[ImageImport] OCR complete: ${ocrResult.text.length} chars, ` +
        `confidence=${ocrResult.confidence.toFixed(1)}%`
      );

      // Code mode: skip translation entirely — code doesn't need translating
      // Why: Translating source code would corrupt syntax, variable names, and logic
      if (scanMode === 'code') {
        LoggingService.info('[ImageImport] Code mode — skipping translation step.');
        return {
          ocrText: ocrResult.text,
          confidence: ocrResult.confidence,
          translatedText: '',
          provider: 'none (code scan)',
          scanMode: 'code'
        };
      }

      // Document mode: translate as usual
      const targetLang = await settingRepo.get(SETTINGS_KEYS.TARGET_LANGUAGE) || 'vi';
      const translateResult = await this.translateUseCase.execute({
        text: ocrResult.text,
        targetLanguage: targetLang,
        sourceType: 'image'
      });

      return {
        ocrText: ocrResult.text,
        confidence: ocrResult.confidence,
        translatedText: translateResult.translatedText,
        provider: translateResult.provider,
        scanMode: 'document'
      };

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      LoggingService.error(`[ImageImport] Flow failed: ${msg}`);
      throw error;
    } finally {
      // ALWAYS delete temp copy
      if (existsSync(tempPath)) {
        try {
          unlinkSync(tempPath);
          LoggingService.info(`[ImageImport] Temp file deleted: ${tempPath}`);
        } catch (cleanupErr) {
          LoggingService.error(`[ImageImport] Failed to delete temp file: ${tempPath}`);
        }
      }
    }
  }

  /**
   * Validates file existence, extension, and size before processing.
   * Throws descriptive errors for each failure case.
   */
  private validateFile(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = extname(filePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Unsupported file type: ${ext}. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    const stats = statSync(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `File too large: ${sizeMB}MB. Maximum allowed size is 10MB.`
      );
    }

    if (stats.size === 0) {
      throw new Error('File is empty (0 bytes).');
    }
  }
}

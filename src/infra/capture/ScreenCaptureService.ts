import { desktopCapturer, screen, nativeImage } from 'electron';
import { app } from 'electron';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { SelectionRect } from '../../shared/types';
import { TesseractProvider } from '../ocr/TesseractProvider';
import { LoggingService } from '../logging/LoggingService';
import { SqliteSettingRepository } from '../db/SettingRepository';
import { TranslateTextUseCase } from '../../core/usecases/TranslateTextUseCase';
import { WindowService } from '../../main/windows/WindowService';
import { SETTINGS_KEYS } from '../../shared/constants';

const settingRepo = new SqliteSettingRepository();

/**
 * Screen Capture + OCR Orchestration Service.
 *
 * Why: Centralizes the full flow: close overlay → delay → capture primary
 * display → apply DPI scale → crop → save temp → OCR → cleanup → translate → popup.
 * Renderer never touches desktopCapturer, fs, or OCR directly.
 */
export class ScreenCaptureService {
  constructor(
    private ocrProvider: TesseractProvider,
    private translateUseCase: TranslateTextUseCase
  ) {}

  /**
   * Main orchestration entry point. Called from IPC handler after
   * overlay renderer sends the selection rectangle.
   */
  async captureAndRecognize(rect: SelectionRect): Promise<void> {
    const tempPath = join(app.getPath('temp'), `snaplingo-ocr-${Date.now()}.png`);

    try {
      // 0. Validate region size — reject selections smaller than 20x20 pixels
      if (rect.width < 20 || rect.height < 20) {
        LoggingService.warn(`[ScreenCapture] Selected region too small: ${rect.width}x${rect.height}. Minimum is 20x20.`);
        WindowService.createFloatingPopup('__OCR_ERROR__:Selected region is too small. Please drag a larger area containing readable text.');
        return;
      }

      // 1. Close the overlay BEFORE capturing to prevent it appearing in the screenshot
      WindowService.closeOverlayWindow();

      // Small delay for the OS to fully remove the overlay from the screen buffer
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2. Capture primary display
      LoggingService.info('[ScreenCapture] Capturing primary display...');
      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor;
      LoggingService.info(`[ScreenCapture] DPI scale factor: ${scaleFactor}`);

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          // Request full physical resolution of primary display
          width: primaryDisplay.size.width * scaleFactor,
          height: primaryDisplay.size.height * scaleFactor
        }
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen source found for capture.');
      }

      // Use the first source (primary display for MVP)
      const screenshot = sources[0].thumbnail;

      // 3. Apply DPI scale factor to convert CSS pixels → physical pixels
      const scaledRect = {
        x: Math.round(rect.x * scaleFactor),
        y: Math.round(rect.y * scaleFactor),
        width: Math.round(rect.width * scaleFactor),
        height: Math.round(rect.height * scaleFactor)
      };

      LoggingService.info(
        `[ScreenCapture] Selection CSS: {x:${rect.x}, y:${rect.y}, w:${rect.width}, h:${rect.height}} → ` +
        `Physical: {x:${scaledRect.x}, y:${scaledRect.y}, w:${scaledRect.width}, h:${scaledRect.height}}`
      );

      // Guard: ensure crop region is valid
      const imgSize = screenshot.getSize();
      if (
        scaledRect.x < 0 || scaledRect.y < 0 ||
        scaledRect.width <= 0 || scaledRect.height <= 0 ||
        scaledRect.x + scaledRect.width > imgSize.width ||
        scaledRect.y + scaledRect.height > imgSize.height
      ) {
        throw new Error(
          `Crop region out of bounds. Image: ${imgSize.width}x${imgSize.height}, ` +
          `Region: ${scaledRect.x},${scaledRect.y} ${scaledRect.width}x${scaledRect.height}`
        );
      }

      // 4. Crop and save to temp file
      const cropped = screenshot.crop(scaledRect);
      writeFileSync(tempPath, cropped.toPNG());
      LoggingService.info(`[ScreenCapture] Temp crop saved: ${tempPath}`);

      // 5. Run OCR
      const ocrLang = await settingRepo.get(SETTINGS_KEYS.OCR_LANGUAGE) || 'eng';
      const ocrResult = await this.ocrProvider.recognize({
        imagePath: tempPath,
        language: ocrLang
      });

      // 6. Check for empty OCR result — do NOT call translation
      if (!ocrResult.text || ocrResult.text.trim() === '') {
        LoggingService.warn('[ScreenCapture] OCR returned empty text. Showing error popup.');
        WindowService.createFloatingPopup('__OCR_EMPTY__');
        return;
      }

      LoggingService.info(`[ScreenCapture] OCR text (${ocrResult.text.length} chars): "${ocrResult.text.substring(0, 50)}..."`);

      // 7. Translate the OCR text using existing Phase 1 use case
      const targetLang = await settingRepo.get(SETTINGS_KEYS.TARGET_LANGUAGE) || 'vi';
      await this.translateUseCase.execute({
        text: ocrResult.text,
        targetLanguage: targetLang,
        sourceType: 'ocr'
      });

      // 8. Show floating popup with OCR text — popup auto-translates via its own useEffect
      WindowService.createFloatingPopup(ocrResult.text);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      LoggingService.error(`[ScreenCapture] Flow failed: ${msg}`);
      // Show error in popup so user gets feedback
      WindowService.createFloatingPopup(`__OCR_ERROR__:${msg}`);
    } finally {
      // ALWAYS delete temp file, even if OCR or translation throws
      if (existsSync(tempPath)) {
        try {
          unlinkSync(tempPath);
          LoggingService.info(`[ScreenCapture] Temp file deleted: ${tempPath}`);
        } catch (cleanupErr) {
          LoggingService.error(`[ScreenCapture] Failed to delete temp file: ${tempPath}`);
        }
      }
    }
  }
}

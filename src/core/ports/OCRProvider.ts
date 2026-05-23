import { OCRInput, OCRResult } from '../../shared/types';

/**
 * Interface contract for OCR recognition engines.
 * Why: Pure port enabling pluggable OCR providers (Tesseract.js MVP, PaddleOCR future).
 */
export interface OCRProvider {
  recognize(input: OCRInput): Promise<OCRResult>;
}

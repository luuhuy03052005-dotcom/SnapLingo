import { LoggingService } from '../logging/LoggingService';

/**
 * Post-processing normalizer for OCR'd document text (prose, paragraphs).
 *
 * Why: Tesseract often splits single paragraphs across multiple lines due to
 * image layout boundaries. This normalizer joins broken lines back into
 * coherent paragraphs and cleans up whitespace artifacts.
 *
 * Data Flow:
 *   Raw OCR text → normalize line endings → join split paragraphs
 *   → clean whitespace → trim artifacts → return clean text
 */
export class DocumentTextNormalizer {
  /**
   * Main entry point — normalizes raw OCR text assuming it is a document.
   */
  static normalize(rawText: string): string {
    if (!rawText || rawText.trim() === '') return '';

    let text = rawText;

    // Step 1: Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 2: Join lines that were broken mid-sentence by OCR
    // A line that ends with a lowercase letter or comma followed by
    // a line starting with a lowercase letter is likely a split paragraph.
    text = text.replace(/([a-zA-Z,;])\n([a-z])/g, '$1 $2');

    // Step 3: Collapse multiple spaces into single space
    text = text.replace(/[ \t]{2,}/g, ' ');

    // Step 4: Remove common OCR artifacts (isolated special chars)
    text = text.replace(/^[|~`]{1,2}$/gm, '');

    // Step 5: Remove excessive blank lines (3+ → 2)
    text = text.replace(/\n{3,}/g, '\n\n');

    // Step 6: Trim each line individually
    text = text
      .split('\n')
      .map(line => line.trim())
      .join('\n');

    // Step 7: Final trim
    text = text.trim();

    LoggingService.info(
      `[DocumentTextNormalizer] Processed ${rawText.length} chars → ${text.length} chars`
    );

    return text;
  }
}

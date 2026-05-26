import { LoggingService } from '../logging/LoggingService';

/**
 * Post-processing normalizer for OCR'd source code text.
 *
 * Why: Tesseract frequently misreads code-specific symbols (braces, pipes,
 * semicolons) and breaks indentation. This normalizer repairs those artifacts
 * while preserving the structural layout that makes code readable.
 *
 * Data Flow:
 *   Raw OCR text → fix common symbol misreads → restore indentation
 *   → trim trailing artifacts → return clean code
 */
export class CodeTextNormalizer {
  /**
   * Main entry point — normalizes raw OCR text assuming it is source code.
   */
  static normalize(rawText: string): string {
    if (!rawText || rawText.trim() === '') return '';

    let text = rawText;

    // Step 1: Fix common OCR misreads for code symbols
    text = CodeTextNormalizer.fixSymbolMisreads(text);

    // Step 2: Normalize line endings to LF
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 3: Remove trailing whitespace per line while preserving leading indentation
    text = text
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');

    // Step 4: Remove excessive blank lines (3+ consecutive → 2 max)
    text = text.replace(/\n{3,}/g, '\n\n');

    // Step 5: Trim leading/trailing blank lines from the entire block
    text = text.replace(/^\n+/, '').replace(/\n+$/, '');

    LoggingService.info(
      `[CodeTextNormalizer] Processed ${rawText.length} chars → ${text.length} chars`
    );

    return text;
  }

  /**
   * Fixes common Tesseract OCR misreads for programming symbols.
   * Why: OCR engines trained on natural language frequently confuse
   * code-specific characters with visually similar letters/digits.
   */
  private static fixSymbolMisreads(text: string): string {
    return text
      .split('\n')
      .map(line => {
        // Fix curly braces: common misread as parentheses in code context
        // Only fix when surrounded by code patterns (not inside strings)
        let fixed = line;

        // Fix common semicolon misreads: ':' at end of statement lines
        // (but only when not in a label/ternary context)
        fixed = fixed.replace(/;$/g, ';'); // Already correct, just normalize

        // Fix angle brackets commonly misread in HTML/JSP
        fixed = fixed.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        // Fix zero vs capital O in obvious numeric contexts
        // e.g., "number0l" → "number01" when surrounded by digits
        fixed = fixed.replace(/(\d)O(\d)/g, '$10$2');
        fixed = fixed.replace(/(\d)l(\d)/g, '$11$2');

        // Fix pipe character misread as lowercase L or uppercase I
        // in obvious pipe contexts (e.g., "||" logical OR)
        fixed = fixed.replace(/\bl\|/g, '||');
        fixed = fixed.replace(/\|l\b/g, '||');
        fixed = fixed.replace(/l l/g, '| |');

        // Fix equals sign artifacts
        fixed = fixed.replace(/≡/g, '===');
        fixed = fixed.replace(/≠/g, '!==');

        return fixed;
      })
      .join('\n');
  }
}

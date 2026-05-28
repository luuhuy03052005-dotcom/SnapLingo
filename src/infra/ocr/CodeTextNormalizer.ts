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
        let fixed = line;

        // Fix angle brackets and XML/HTML entities
        fixed = fixed.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        fixed = fixed.replace(/&amp;/g, '&');

        // Fix JSP/HTML tag spacing misreads
        // e.g. "< % @" -> "<%@", "% >" -> "%>"
        fixed = fixed.replace(/<\s*%\s*@/g, '<%@');
        fixed = fixed.replace(/<\s*%/g, '<%');
        fixed = fixed.replace(/%\s*>/g, '%>');
        fixed = fixed.replace(/<\s*\/\s*/g, '</');
        fixed = fixed.replace(/\/\s*>/g, '/>');

        // Fix zero vs capital O and lowercase L vs 1 in numeric/code contexts
        fixed = fixed.replace(/(\d)O(\d)/g, '$10$2');
        fixed = fixed.replace(/(\d)l(\d)/g, '$11$2');

        // Fix logical OR operators (||) misreads
        // Matches visual combinations of I, l, 1, | where at least one is a pipe |
        fixed = fixed.replace(/[Il1\|]{2}/g, (match) => {
          if (match.includes('|')) return '||';
          return match;
        });

        // Fix visual logical AND (&&) misreads
        // e.g. "8&", "&8", "aamp;"
        fixed = fixed.replace(/&amp;/g, '&');
        fixed = fixed.replace(/8&/g, '&&').replace(/&8/g, '&&');

        // Fix visual curly braces misreads
        // e.g. "){" -> ") {", "closs" -> "class"
        fixed = fixed.replace(/closs\b/g, 'class');
        fixed = fixed.replace(/\bimport\s+[^;]+1\s*$/g, (m) => m.slice(0, -1) + ';'); // fix import line trailing 1 to ;

        // Fix assignment operator visual misreads
        fixed = fixed.replace(/≡/g, '===');
        fixed = fixed.replace(/≠/g, '!==');

        return fixed;
      })
      .join('\n');
  }
}

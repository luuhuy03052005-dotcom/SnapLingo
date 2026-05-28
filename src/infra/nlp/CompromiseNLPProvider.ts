import { NLPProvider } from '../ports/NLPProvider';
import { POSToken } from '../../shared/vocabularyTypes';
import nlp from 'compromise';

/**
 * Pure offline NLP Provider using compromise.js.
 * Why: Runs entirely locally without network calls, provides high-performance
 * rule-based tagging, and guarantees that 100% of formatting, newlines,
 * spaces, and punctuations are perfectly preserved.
 */
export class CompromiseNLPProvider implements NLPProvider {
  async analyze(text: string): Promise<POSToken[]> {
    if (!text || text.trim() === '') {
      return [];
    }

    // Split text into words and non-words to preserve spacing and punctuation exactly
    const parts = text.split(/([a-zA-Z0-9]+)/);
    const tokens: POSToken[] = [];

    // Parse the entire document once for performance optimization
    const doc = nlp(text);

    for (const part of parts) {
      if (!part) continue;

      const isWord = /[a-zA-Z0-9]/.test(part);
      if (!isWord) {
        // Segregate spacing vs punctuation
        const category = /^\s+$/.test(part) ? 'whitespace' : 'punctuation';
        tokens.push({
          text: part,
          category
        });
      } else {
        // Look up tags for this specific term using standard JSON terms output
        const wordDoc = doc.match(part);
        const wordJson = wordDoc.json();
        const tags: string[] = wordJson[0]?.terms[0]?.tags || [];
        const tagSet = new Set(tags);

        let category: POSToken['category'] = 'other';
        if (tagSet.has('Noun')) {
          category = 'noun';
        } else if (tagSet.has('Verb')) {
          category = 'verb';
        } else if (tagSet.has('Adjective')) {
          category = 'adjective';
        } else if (tagSet.has('Adverb')) {
          category = 'adverb';
        }

        tokens.push({
          text: part,
          category,
          posDetails: tags.slice(0, 3).join(', ')
        });
      }
    }

    return tokens;
  }
}

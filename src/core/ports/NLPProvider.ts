import { POSToken } from '../../shared/vocabularyTypes';

/**
 * Port contract for Part-of-Speech and NLP analyzers.
 * Why: Pluggable port matching Clean Architecture principles,
 * keeping core logic decoupled from the specific compromise.js library.
 */
export interface NLPProvider {
  analyze(text: string): Promise<POSToken[]>;
}

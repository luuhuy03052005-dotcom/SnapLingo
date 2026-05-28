export type POSCategory = 'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | 'punctuation' | 'whitespace';

export interface POSToken {
  text: string;
  category: POSCategory;
  posDetails?: string;
}

export interface VocabularyAnalysisResult {
  tokens: POSToken[];
  language: string;
}

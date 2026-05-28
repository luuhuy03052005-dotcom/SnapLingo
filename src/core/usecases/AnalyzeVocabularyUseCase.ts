import { NLPProvider } from '../ports/NLPProvider';
import { POSToken } from '../../shared/vocabularyTypes';
import { SettingRepository } from '../ports/SettingRepository';

/**
 * Usecase to coordinate offline English POS analysis.
 * Why: Enforces validation rules (length limit) before invoking the POS tagger.
 */
export class AnalyzeVocabularyUseCase {
  constructor(
    private nlpProvider: NLPProvider,
    private settingRepo: SettingRepository
  ) {}

  async execute(text: string): Promise<POSToken[]> {
    if (!text || text.trim() === '') {
      return [];
    }

    // Load max text bounds
    const maxBoundStr = await this.settingRepo.get('posMaxTextLength');
    const maxBound = maxBoundStr ? Number(maxBoundStr) : 2000;

    if (text.length > maxBound) {
      throw new Error(`Input text exceeds maximum POS highlight limit of ${maxBound} characters.`);
    }

    return await this.nlpProvider.analyze(text);
  }
}

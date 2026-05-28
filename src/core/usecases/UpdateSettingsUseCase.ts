import { SettingRepository } from '../ports/SettingRepository';
import { AppSettingKey } from '../../shared/settingsTypes';

/**
 * Use case to update a typed setting value.
 * Why: Converts typed values to storage-safe strings before handing them off to the repository.
 */
export class UpdateSettingsUseCase {
  constructor(private settingRepository: SettingRepository) {}

  async execute(key: AppSettingKey, value: unknown): Promise<void> {
    // Standardize representation: booleans are stored as 'true'/'false', others as standard string conversion
    const stringifiedValue = typeof value === 'boolean' ? String(value) : String(value);
    await this.settingRepository.set(key, stringifiedValue);
  }
}

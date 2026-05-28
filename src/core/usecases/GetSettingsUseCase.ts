import { SettingRepository } from '../ports/SettingRepository';
import { AppSettings, castRawToSettings } from '../../shared/settingsTypes';

/**
 * Use case to retrieve strongly typed settings object.
 * Why: Centralizes settings mapping and default fallback logic inside the Core layer.
 */
export class GetSettingsUseCase {
  constructor(private settingRepository: SettingRepository) {}

  async execute(): Promise<AppSettings> {
    const rawSettings = await this.settingRepository.getAll();
    return castRawToSettings(rawSettings);
  }
}

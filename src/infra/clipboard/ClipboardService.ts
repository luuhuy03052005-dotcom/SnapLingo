import { clipboard } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LoggingService } from '../logging/LoggingService';
import { SqliteSettingRepository } from '../db/SettingRepository';
import { SETTINGS_KEYS } from '../../shared/constants';

const execAsync = promisify(exec);
const settingRepo = new SqliteSettingRepository();

/**
 * Clipboard & simulated Copy Integration Service.
 * Why: Backs up user clipboards, issues simulated Ctrl+C commands natively, and restores values safely.
 */
export const ClipboardService = {
  /**
   * Triggers native simulated copy keys to read highlighted text.
   */
  async captureSelectedText(): Promise<string> {
    LoggingService.info('[ClipboardService] Starting selected text capture flow.');

    // 1. Read and backup active clipboard text
    const originalText = clipboard.readText();
    LoggingService.info(`[ClipboardService] Clipboard backed up. Original length: ${originalText.length}`);

    try {
      // 2. Trigger native Ctrl+C simulation on Windows using lightweight WScript.Shell
      // Why: 0 native compiler requirements; guarantees Windows 10/11 system compatibility.
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^(c)')"`;
      
      await execAsync(cmd);
      
      // Wait briefly (200ms) for target application thread to capture focus and copy selection
      await new Promise((resolve) => setTimeout(resolve, 200));

      const capturedText = clipboard.readText();
      LoggingService.info(`[ClipboardService] Simulated copy resolved. Captured length: ${capturedText.length}`);

      // 3. Restore original clipboard content if configured in settings
      const restoreEnabled = await settingRepo.get(SETTINGS_KEYS.RESTORE_CLIPBOARD);
      if (restoreEnabled === 'true') {
        clipboard.writeText(originalText);
        LoggingService.info('[ClipboardService] Clipboard restored to original value.');
      }

      return capturedText.trim();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      LoggingService.error(`[ClipboardService] Simulated copy failed: ${errorMsg}`);
      
      // Fallback: restore original clipboard just in case
      clipboard.writeText(originalText);
      throw new Error(`Failed to simulate copy: ${errorMsg}`);
    }
  }
};

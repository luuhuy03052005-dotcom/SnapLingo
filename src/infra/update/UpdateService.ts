import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { LoggingService } from '../logging/LoggingService';
import { UpdateStatus } from '../../shared/types';

/**
 * Software Update Service using electron-updater.
 * Why: Implements check logic, logging progress while preventing live downloads in development mode.
 */
export class UpdateService {
  constructor() {
    // Pipe electron-updater events into our LoggingService
    autoUpdater.logger = {
      info: (msg: string) => LoggingService.info(`[Updater] ${msg}`),
      warn: (msg: string) => LoggingService.warn(`[Updater] ${msg}`),
      error: (msg: string) => LoggingService.error(`[Updater] ${msg}`)
    };
    
    autoUpdater.autoDownload = false; // Do not download silently, give control to user
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    LoggingService.info('Update check triggered.');

    // Rule: Auto-update must be disabled gracefully in development mode.
    if (!app.isPackaged) {
      LoggingService.info('App is running in development mode. Bypassing update check.');
      return {
        status: 'disabled',
        message: 'Update check is disabled in development mode.'
      };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      
      if (result && result.updateInfo) {
        return {
          status: 'available',
          version: result.updateInfo.version,
          message: `Version ${result.updateInfo.version} is available for download.`
        };
      }

      return {
        status: 'not-available',
        message: 'You are already running the latest version.'
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      LoggingService.error(`Update check failed: ${errorMsg}`);
      return {
        status: 'error',
        message: `Failed to check for updates: ${errorMsg}`
      };
    }
  }
}

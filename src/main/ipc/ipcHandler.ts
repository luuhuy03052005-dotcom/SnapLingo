import { ipcMain, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { SqliteSettingRepository } from '../../infra/db/SettingRepository';
import { getDatabaseStatus } from '../../infra/db/connection';
import { UpdateService } from '../../infra/update/UpdateService';
import { WindowService } from '../windows/WindowService';
import { LoggingService } from '../../infra/logging/LoggingService';
import { GoogleFreeProvider } from '../../infra/translation/GoogleFreeProvider';
import { LibreProvider } from '../../infra/translation/LibreProvider';
import { SqliteHistoryRepository } from '../../infra/db/HistoryRepository';
import { TranslateTextUseCase } from '../../core/usecases/TranslateTextUseCase';
import { TesseractProvider } from '../../infra/ocr/TesseractProvider';
import { ScreenCaptureService } from '../../infra/capture/ScreenCaptureService';
import { ImageImportService } from '../../infra/capture/ImageImportService';
import { GlossaryRepository } from '../../infra/db/GlossaryRepository';
import { CacheRepository } from '../../infra/db/CacheRepository';
import { SelectionRect } from '../../shared/types';

const settingRepo = new SqliteSettingRepository();
const updateService = new UpdateService();
const googleFreeProvider = new GoogleFreeProvider();
const libreProvider = new LibreProvider();
const historyRepo = new SqliteHistoryRepository();
const glossaryRepo = new GlossaryRepository();
const cacheRepo = new CacheRepository();

const translateTextUseCase = new TranslateTextUseCase(
  settingRepo,
  historyRepo,
  googleFreeProvider,
  libreProvider,
  glossaryRepo,
  cacheRepo
);

const tesseractProvider = new TesseractProvider();
const screenCaptureService = new ScreenCaptureService(tesseractProvider, translateTextUseCase);
const imageImportService = new ImageImportService(tesseractProvider, translateTextUseCase);

/**
 * Registers all application IPC listeners.
 * Why: Dispatches actions from Preload bridge to local services securely.
 */
export function registerIpcHandlers(): void {
  LoggingService.info('Registering IPC handlers.');

  // App channels
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return app.getVersion();
  });

  // Settings channels
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (_, key: string) => {
    return await settingRepo.get(key);
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, async (_, key: string, value: string) => {
    await settingRepo.set(key, value);
    // If the setting changed was the window mode, dynamically adjust the size
    if (key === 'windowMode' && (value === 'compact' || value === 'expanded')) {
      WindowService.setWindowMode(value);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, async () => {
    return await settingRepo.getAll();
  });

  // Database channels
  ipcMain.handle(IPC_CHANNELS.DB.GET_STATUS, () => {
    return getDatabaseStatus();
  });

  // Update channels
  ipcMain.handle(IPC_CHANNELS.UPDATE.CHECK, async () => {
    return await updateService.checkForUpdates();
  });

  // Window channels
  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_MODE, (_, mode: 'compact' | 'expanded') => {
    WindowService.setWindowMode(mode);
    // Sync the change into SQLite settings so it is persistent
    settingRepo.set('windowMode', mode);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MODE, () => {
    return WindowService.getWindowMode();
  });

  // Translation channels — with error normalization
  ipcMain.handle(IPC_CHANNELS.TRANSLATION.TRANSLATE, async (_, input) => {
    try {
      return await translateTextUseCase.execute(input);
    } catch (error: unknown) {
      // Return normalized user-friendly error via TranslationError.userMessage
      if (error && typeof error === 'object' && 'userMessage' in error) {
        throw new Error((error as { userMessage: string }).userMessage);
      }
      throw error;
    }
  });

  // History channels
  ipcMain.handle(IPC_CHANNELS.HISTORY.GET_RECENT, async (_, limit: number) => {
    return await historyRepo.findRecent(limit);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.SEARCH, async (_, query: string) => {
    return await historyRepo.search(query);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.DELETE, async (_, id: number) => {
    return await historyRepo.deleteById(id);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.CLEAR, async () => {
    return await historyRepo.clearAll();
  });

  // OCR channels — Screen selection
  ipcMain.handle(IPC_CHANNELS.OCR.START_SCREEN_SELECTION, () => {
    WindowService.createOverlayWindow();
  });

  ipcMain.handle(IPC_CHANNELS.OCR.CANCEL_SCREEN_SELECTION, () => {
    WindowService.closeOverlayWindow();
  });

  ipcMain.handle(IPC_CHANNELS.OCR.SUBMIT_SELECTION, async (_, rect: SelectionRect) => {
    await screenCaptureService.captureAndRecognize(rect);
  });

  // OCR channels — Image import
  ipcMain.handle(IPC_CHANNELS.OCR.IMPORT_IMAGE, async () => {
    return await imageImportService.importAndRecognize();
  });

  ipcMain.handle(IPC_CHANNELS.OCR.RECOGNIZE_IMAGE, async (_, filePath: string) => {
    return await imageImportService.recognizeFromPath(filePath);
  });

  // Glossary channels
  ipcMain.handle(IPC_CHANNELS.GLOSSARY.GET_ALL, async () => {
    return await glossaryRepo.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.ADD, async (_, source: string, target: string) => {
    await glossaryRepo.add(source, target);
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.DELETE, async (_, id: number) => {
    await glossaryRepo.deleteById(id);
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.CLEAR, async () => {
    await glossaryRepo.clear();
  });

  // Cache channels
  ipcMain.handle(IPC_CHANNELS.CACHE.CLEAR, async () => {
    await cacheRepo.clear();
  });

  ipcMain.handle(IPC_CHANNELS.CACHE.GET_STATS, async () => {
    return await cacheRepo.getStats();
  });
}

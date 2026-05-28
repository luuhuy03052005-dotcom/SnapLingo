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
import { GetSettingsUseCase } from '../../core/usecases/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../../core/usecases/UpdateSettingsUseCase';
import { CompromiseNLPProvider } from '../../infra/nlp/CompromiseNLPProvider';
import { AnalyzeVocabularyUseCase } from '../../core/usecases/AnalyzeVocabularyUseCase';
import { successResult, errorResult } from '../../shared/result';
import { validateIpcPayload } from './validateIpcPayload';
import {
  GetSettingSchema,
  UpdateSettingSchema,
  SetWindowModeSchema,
  SelectionRectSchema,
  TranslationInputSchema,
  AnalyzeVocabularySchema
} from '../../shared/ipcSchemas';
import { z } from 'zod';

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

const getSettingsUseCase = new GetSettingsUseCase(settingRepo);
const updateSettingsUseCase = new UpdateSettingsUseCase(settingRepo);

const compromiseNlpProvider = new CompromiseNLPProvider();
const analyzeVocabularyUseCase = new AnalyzeVocabularyUseCase(compromiseNlpProvider, settingRepo);

/**
 * Registers all application IPC listeners.
 * Why: Dispatches actions from Preload bridge to local services securely using typed validations.
 */
export function registerIpcHandlers(): void {
  LoggingService.info('Registering IPC handlers.');

  // App channels
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return successResult(app.getVersion());
  });

  // Settings channels
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (_, key: unknown) => {
    try {
      const validation = validateIpcPayload(GetSettingSchema, key, IPC_CHANNELS.SETTINGS.GET);
      if (!validation.success) return validation.result;
      const all = await getSettingsUseCase.execute();
      return successResult(all[validation.data as keyof typeof all]);
    } catch (e: any) {
      LoggingService.error(`Error in settings:get: ${e.message}`, e);
      return errorResult('SETTINGS_ERROR', 'Failed to retrieve setting');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, async (_, payload: unknown) => {
    try {
      const validation = validateIpcPayload(UpdateSettingSchema, payload, IPC_CHANNELS.SETTINGS.SET);
      if (!validation.success) return validation.result;
      const { key, value } = validation.data;
      await updateSettingsUseCase.execute(key as any, value);

      // If the setting changed was the window mode, dynamically adjust the size
      if (key === 'windowMode') {
        WindowService.setWindowMode(value as 'compact' | 'expanded');
      }
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in settings:set: ${e.message}`, e);
      return errorResult('SETTINGS_ERROR', 'Failed to update setting');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, async () => {
    try {
      const all = await getSettingsUseCase.execute();
      return successResult(all);
    } catch (e: any) {
      LoggingService.error(`Error in settings:getAll: ${e.message}`, e);
      return errorResult('SETTINGS_ERROR', 'Failed to retrieve settings');
    }
  });

  // Database channels
  ipcMain.handle(IPC_CHANNELS.DB.GET_STATUS, () => {
    try {
      return successResult(getDatabaseStatus());
    } catch (e: any) {
      LoggingService.error(`Error in db:getStatus: ${e.message}`, e);
      return errorResult('DB_ERROR', 'Failed to retrieve database status');
    }
  });

  // Update channels
  ipcMain.handle(IPC_CHANNELS.UPDATE.CHECK, async () => {
    try {
      const result = await updateService.checkForUpdates();
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in update:check: ${e.message}`, e);
      return errorResult('UPDATE_ERROR', 'Failed to check for updates');
    }
  });

  // Window channels
  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_MODE, async (_, mode: unknown) => {
    try {
      const validation = validateIpcPayload(SetWindowModeSchema, mode, IPC_CHANNELS.WINDOW.SET_MODE);
      if (!validation.success) return validation.result;
      WindowService.setWindowMode(validation.data);
      await updateSettingsUseCase.execute('windowMode', validation.data);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in window:setMode: ${e.message}`, e);
      return errorResult('WINDOW_ERROR', 'Failed to set window mode');
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MODE, () => {
    try {
      return successResult(WindowService.getWindowMode());
    } catch (e: any) {
      LoggingService.error(`Error in window:getMode: ${e.message}`, e);
      return errorResult('WINDOW_ERROR', 'Failed to get window mode');
    }
  });

  // Translation channels — with error normalization
  ipcMain.handle(IPC_CHANNELS.TRANSLATION.TRANSLATE, async (_, input: unknown) => {
    try {
      const validation = validateIpcPayload(TranslationInputSchema, input, IPC_CHANNELS.TRANSLATION.TRANSLATE);
      if (!validation.success) return validation.result;
      const res = await translateTextUseCase.execute(validation.data);
      return successResult(res);
    } catch (error: unknown) {
      LoggingService.error(`Error in translation:translate:`, error);
      if (error && typeof error === 'object' && 'userMessage' in error) {
        return errorResult('TRANSLATION_ERROR', (error as { userMessage: string }).userMessage);
      }
      return errorResult('TRANSLATION_ERROR', 'Translation failed');
    }
  });

  // History channels
  ipcMain.handle(IPC_CHANNELS.HISTORY.GET_RECENT, async (_, limit: unknown) => {
    try {
      const parsedLimit = z.number().int().positive().safeParse(limit);
      const safeLimit = parsedLimit.success ? parsedLimit.data : 50;
      const result = await historyRepo.findRecent(safeLimit);
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in history:getRecent: ${e.message}`, e);
      return errorResult('HISTORY_ERROR', 'Failed to retrieve history');
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.SEARCH, async (_, query: unknown) => {
    try {
      const parsedQuery = z.string().safeParse(query);
      const safeQuery = parsedQuery.success ? parsedQuery.data : '';
      const result = await historyRepo.search(safeQuery);
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in history:search: ${e.message}`, e);
      return errorResult('HISTORY_ERROR', 'Failed to search history');
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.DELETE, async (_, id: unknown) => {
    try {
      const parsedId = z.number().int().safeParse(id);
      if (!parsedId.success) return errorResult('INVALID_PAYLOAD', 'History ID must be an integer');
      await historyRepo.deleteById(parsedId.data);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in history:delete: ${e.message}`, e);
      return errorResult('HISTORY_ERROR', 'Failed to delete history item');
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY.CLEAR, async () => {
    try {
      await historyRepo.clearAll();
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in history:clear: ${e.message}`, e);
      return errorResult('HISTORY_ERROR', 'Failed to clear history');
    }
  });

  // OCR channels — Screen selection
  ipcMain.handle(IPC_CHANNELS.OCR.START_SCREEN_SELECTION, () => {
    try {
      WindowService.createOverlayWindow();
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:startScreenSelection: ${e.message}`, e);
      return errorResult('OCR_ERROR', 'Failed to start screen selection');
    }
  });

  ipcMain.handle(IPC_CHANNELS.OCR.CANCEL_SCREEN_SELECTION, () => {
    try {
      WindowService.closeOverlayWindow();
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:cancelScreenSelection: ${e.message}`, e);
      return errorResult('OCR_ERROR', 'Failed to cancel screen selection');
    }
  });

  ipcMain.handle(IPC_CHANNELS.OCR.SUBMIT_SELECTION, async (_, rect: unknown) => {
    try {
      const validation = validateIpcPayload(SelectionRectSchema, rect, IPC_CHANNELS.OCR.SUBMIT_SELECTION);
      if (!validation.success) return validation.result;
      await screenCaptureService.captureAndRecognize(validation.data);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:submitSelection: ${e.message}`, e);
      return errorResult('OCR_ERROR', 'Failed to complete screen capture OCR');
    }
  });

  // OCR channels — Image import
  ipcMain.handle(IPC_CHANNELS.OCR.IMPORT_IMAGE, async () => {
    try {
      const result = await imageImportService.importAndRecognize();
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:importImage: ${e.message}`, e);
      return errorResult('OCR_ERROR', 'Failed to import and scan image');
    }
  });

  ipcMain.handle(IPC_CHANNELS.OCR.RECOGNIZE_IMAGE, async (_, filePath: unknown) => {
    try {
      const parsedPath = z.string().safeParse(filePath);
      if (!parsedPath.success) return errorResult('INVALID_PAYLOAD', 'File path must be a string');
      const result = await imageImportService.recognizeFromPath(parsedPath.data);
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:recognizeImage: ${e.message}`, e);
      return errorResult('OCR_ERROR', 'Failed to recognize text from path');
    }
  });

  // Glossary channels
  ipcMain.handle(IPC_CHANNELS.GLOSSARY.GET_ALL, async () => {
    try {
      const result = await glossaryRepo.getAll();
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in glossary:getAll: ${e.message}`, e);
      return errorResult('GLOSSARY_ERROR', 'Failed to retrieve glossary items');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.ADD, async (_, payload: unknown) => {
    try {
      const schema = z.object({ source: z.string(), target: z.string() });
      const parsed = schema.safeParse(payload);
      if (!parsed.success) return errorResult('INVALID_PAYLOAD', 'Invalid glossary term formats');
      await glossaryRepo.add(parsed.data.source, parsed.data.target);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in glossary:add: ${e.message}`, e);
      return errorResult('GLOSSARY_ERROR', 'Failed to add glossary term');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.DELETE, async (_, id: unknown) => {
    try {
      const parsedId = z.number().int().safeParse(id);
      if (!parsedId.success) return errorResult('INVALID_PAYLOAD', 'Glossary ID must be an integer');
      await glossaryRepo.deleteById(parsedId.data);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in glossary:delete: ${e.message}`, e);
      return errorResult('GLOSSARY_ERROR', 'Failed to delete glossary term');
    }
  });

  ipcMain.handle(IPC_CHANNELS.GLOSSARY.CLEAR, async () => {
    try {
      await glossaryRepo.clear();
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in glossary:clear: ${e.message}`, e);
      return errorResult('GLOSSARY_ERROR', 'Failed to clear glossary');
    }
  });

  // Cache channels
  ipcMain.handle(IPC_CHANNELS.CACHE.CLEAR, async () => {
    try {
      await cacheRepo.clear();
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in cache:clear: ${e.message}`, e);
      return errorResult('CACHE_ERROR', 'Failed to clear translation cache');
    }
  });

  ipcMain.handle(IPC_CHANNELS.CACHE.GET_STATS, async () => {
    try {
      const result = await cacheRepo.getStats();
      return successResult(result);
    } catch (e: any) {
      LoggingService.error(`Error in cache:getStats: ${e.message}`, e);
      return errorResult('CACHE_ERROR', 'Failed to retrieve cache stats');
    }
  });

  // Vocabulary channels
  ipcMain.handle(IPC_CHANNELS.VOCABULARY.ANALYZE, async (_, text: unknown) => {
    try {
      const validation = validateIpcPayload(AnalyzeVocabularySchema, text, IPC_CHANNELS.VOCABULARY.ANALYZE);
      if (!validation.success) return validation.result;
      const res = await analyzeVocabularyUseCase.execute(validation.data);
      return successResult(res);
    } catch (e: any) {
      LoggingService.error(`Error in vocabulary:analyze: ${e.message}`, e);
      return errorResult('VOCABULARY_ERROR', e.message || 'Failed to analyze text vocabulary');
    }
  });

  // OCR text transfer: popup → main window
  // Why: Allows the floating popup to push OCR text back into the main translator panel
  ipcMain.handle(IPC_CHANNELS.OCR.SEND_TEXT_TO_MAIN, async (_, payload: unknown) => {
    try {
      const mainWindow = WindowService.getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        return errorResult('WINDOW_ERROR', 'Main window is not available');
      }
      // Forward the typed payload to the main window renderer
      mainWindow.webContents.send(IPC_CHANNELS.OCR.TEXT_RECEIVED, payload);
      // Bring main window to front so user sees the result
      mainWindow.show();
      mainWindow.focus();
      LoggingService.info(`[IPC] Forwarded OCR text to main window (${typeof payload === 'object' && payload !== null && 'text' in payload ? (payload as any).text.length : 0} chars)`);
      return successResult(undefined);
    } catch (e: any) {
      LoggingService.error(`Error in ocr:sendTextToMain: ${e.message}`, e);
      return errorResult('IPC_ERROR', e.message || 'Failed to send text to main window');
    }
  });
}

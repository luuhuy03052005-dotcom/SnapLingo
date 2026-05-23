import { globalShortcut } from 'electron';
import { ClipboardService } from '../../infra/clipboard/ClipboardService';
import { WindowService } from '../windows/WindowService';
import { LoggingService } from '../../infra/logging/LoggingService';

/**
 * Global Shortcut Service.
 * Why: Captures system-wide hotkeys (like Ctrl+Shift+D) to execute translation workflows on external active apps.
 */
export const ShortcutService = {
  registerGlobalShortcuts(): void {
    LoggingService.info('Registering global hotkeys.');

    // Default hotkey: Ctrl+Shift+D for translating selected text
    const shortcut = 'Ctrl+Shift+D';

    const isRegistered = globalShortcut.register(shortcut, async () => {
      LoggingService.info(`Global hotkey [${shortcut}] triggered.`);
      
      try {
        // 1. Execute safe simulated copy
        const text = await ClipboardService.captureSelectedText();
        
        // 2. Rule: Empty clipboard → suggest Screen OCR fallback
        if (!text || text.trim() === '') {
          LoggingService.warn('[ShortcutService] Simulated copy captured empty text. Suggesting OCR.');
          WindowService.createFloatingPopup('__OCR_ERROR__:No text selected. Try using Screen Snip (Ctrl+Shift+S) to OCR the area instead.');
          return;
        }

        LoggingService.info(`[ShortcutService] Captured text: "${text.substring(0, 30)}..."`);

        // 3. Open cursor-adjacent floating popup
        WindowService.createFloatingPopup(text);
      } catch (err: unknown) {
        LoggingService.error(`[ShortcutService] Flow failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    if (isRegistered) {
      LoggingService.info(`Successfully bound hotkey: ${shortcut}`);
    } else {
      LoggingService.error(`Failed to register global hotkey: ${shortcut}`);
    }

    // Screen OCR hotkey: Ctrl+Shift+S opens the fullscreen selection overlay
    const ocrShortcut = 'Ctrl+Shift+S';

    const isOcrRegistered = globalShortcut.register(ocrShortcut, () => {
      LoggingService.info(`Global hotkey [${ocrShortcut}] triggered. Opening screen selection overlay.`);
      WindowService.createOverlayWindow();
    });

    if (isOcrRegistered) {
      LoggingService.info(`Successfully bound hotkey: ${ocrShortcut}`);
    } else {
      LoggingService.error(`Failed to register global hotkey: ${ocrShortcut}`);
    }

    // Show/Hide main window: Ctrl+Shift+Space
    const toggleShortcut = 'Ctrl+Shift+Space';
    const isToggleRegistered = globalShortcut.register(toggleShortcut, () => {
      LoggingService.info(`Global hotkey [${toggleShortcut}] triggered. Toggling main window.`);
      WindowService.toggleMainWindow();
    });

    if (isToggleRegistered) {
      LoggingService.info(`Successfully bound hotkey: ${toggleShortcut}`);
    } else {
      LoggingService.error(`Failed to register global hotkey: ${toggleShortcut}`);
    }
  },

  unregisterGlobalShortcuts(): void {
    LoggingService.info('Unregistering all global hotkeys.');
    globalShortcut.unregisterAll();
  }
};

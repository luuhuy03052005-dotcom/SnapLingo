import { app, BrowserWindow } from 'electron';
import { initDatabase } from '../infra/db/connection';
import { registerIpcHandlers } from './ipc/ipcHandler';
import { WindowService } from './windows/WindowService';
import { LoggingService } from '../infra/logging/LoggingService';
import { ShortcutService } from './shortcut/ShortcutService';
import { TrayService } from './tray/TrayService';

/**
 * Main Application Bootstrapper.
 * Why: Plugs database initializations, IPC bindings, and window managers into Electron hooks.
 */
function bootstrap() {
  LoggingService.info('SnapLingo is booting up.');

  // Initialize SQLite database and check schema tables
  initDatabase();

  // Bind IPC event listeners
  registerIpcHandlers();

  // Register system global hotkeys
  ShortcutService.registerGlobalShortcuts();

  // Create UI window
  WindowService.createMainWindow();

  // Create system tray icon with context menu
  TrayService.create();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowService.createMainWindow();
    }
  });
}

// Ensure single instance lock (optional but standard desktop behavior)
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // Set developer tooling shortcuts natively if needed
    app.setAppUserModelId('com.antigravity.snaplingo');

    bootstrap();
  });
}

// Handle shutdown
app.on('will-quit', () => {
  LoggingService.info('App is shutting down. Unbinding hotkeys.');
  ShortcutService.unregisterGlobalShortcuts();
  TrayService.destroy();
});

app.on('window-all-closed', () => {
  // Don't quit on Windows/Linux — the main window might just be temporarily hidden
  // during OCR flow (overlay closes → OCR runs → popup opens).
  // App will quit explicitly via tray/menu actions.
  if (process.platform === 'darwin') {
    // macOS standard: app stays in dock even with all windows closed
    return;
  }
  // Only quit if there are truly no windows left AND no OCR is in-flight
  // Re-check after a small delay to allow popup window to open
  setTimeout(() => {
    if (BrowserWindow.getAllWindows().length === 0) {
      LoggingService.info('All windows closed. Quitting application.');
      app.quit();
    }
  }, 500);
});

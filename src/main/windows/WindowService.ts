import { BrowserWindow, shell, app, screen } from 'electron';
import { join } from 'path';
import { LoggingService } from '../../infra/logging/LoggingService';

let mainWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let currentMode: 'compact' | 'expanded' = 'expanded';
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

/**
 * Window Management Service.
 * Why: Encapsulates Electron window life-cycle, sizes, and dynamic size switches.
 */
export const WindowService = {
  createMainWindow(): BrowserWindow {
    if (mainWindow) {
      return mainWindow;
    }

    LoggingService.info('Creating main application window.');

    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 350,
      minHeight: 140,
      show: false,
      autoHideMenuBar: true,
      title: 'SnapLingo',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show();
    });

    // Handle external links safely
    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // Load Dev URL or local compiled HTML file
    if (process.env.ELECTRON_RENDERER_URL) {
      mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return mainWindow;
  },

  getMainWindow(): BrowserWindow | null {
    return mainWindow;
  },

  showMainWindow(): void {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  },

  toggleMainWindow(): void {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      this.showMainWindow();
    }
  },

  setWindowMode(mode: 'compact' | 'expanded'): void {
    if (!mainWindow) return;

    LoggingService.info(`Changing window mode to: ${mode}`);
    currentMode = mode;

    // GUI shrink and expand toggles to avoid occupying screen space.
    if (mode === 'compact') {
      mainWindow.setSize(380, 340, true);
      mainWindow.setResizable(false);
      mainWindow.setMaximizable(false);
    } else {
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);
      mainWindow.setSize(800, 600, true);
    }
  },

  getWindowMode(): 'compact' | 'expanded' {
    return currentMode;
  },

  /**
   * Spawns borderless, always-on-top floating popup near current mouse coordinates.
   * Why: Displays translated snippets directly at reading positions.
   */
  createFloatingPopup(text: string): BrowserWindow {
    if (popupWindow) {
      LoggingService.info('Pruning previous active translation popup window.');
      popupWindow.destroy();
      popupWindow = null;
    }

    LoggingService.info('Creating floating translation popup.');

    // 1. Locate current active display and cursor coordinate
    const { x, y } = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint({ x, y });

    const width = 380;
    const height = 240;
    let popupX = x + 15;
    let popupY = y + 15;

    // 2. Adjust coordinates to prevent popup boundary from leaking offscreen
    const displayBounds = activeDisplay.bounds;
    if (popupX + width > displayBounds.x + displayBounds.width) {
      popupX = x - width - 15;
    }
    if (popupY + height > displayBounds.y + displayBounds.height) {
      popupY = y - height - 15;
    }

    popupWindow = new BrowserWindow({
      width,
      height,
      x: popupX,
      y: popupY,
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      minWidth: 300,
      minHeight: 180,
      maxWidth: 800,
      maxHeight: 600,
      skipTaskbar: true,
      show: false,
      transparent: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // 3. Mount UI with window=popup and text search params
    const query = `?window=popup&text=${encodeURIComponent(text)}`;
    if (process.env.ELECTRON_RENDERER_URL) {
      popupWindow.loadURL(process.env.ELECTRON_RENDERER_URL + query);
    } else {
      popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { window: 'popup', text: text }
      });
    }

    popupWindow.on('ready-to-show', () => {
      popupWindow?.show();
      popupWindow?.focus();
    });

    popupWindow.on('closed', () => {
      popupWindow = null;
    });

    return popupWindow;
  },

  closeFloatingPopup(): void {
    if (popupWindow) {
      LoggingService.info('Closing translation popup via API signal.');
      popupWindow.close();
      popupWindow = null;
    }
  },

  /**
   * Spawns a fullscreen transparent overlay on the primary display for region selection.
   * Why: Overlay captures mouse drag coordinates to define OCR crop region.
   * MVP: Primary display only. Multi-monitor support is a known limitation.
   */
  createOverlayWindow(): BrowserWindow {
    if (overlayWindow) {
      overlayWindow.destroy();
      overlayWindow = null;
    }

    LoggingService.info('Creating fullscreen selection overlay on primary display.');

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    overlayWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const query = '?window=overlay';
    if (process.env.ELECTRON_RENDERER_URL) {
      overlayWindow.loadURL(process.env.ELECTRON_RENDERER_URL + query);
    } else {
      overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { window: 'overlay' }
      });
    }

    overlayWindow.on('ready-to-show', () => {
      overlayWindow?.show();
      overlayWindow?.focus();
      // Set fullscreen after show to ensure the overlay covers taskbar
      overlayWindow?.setFullScreen(true);
    });

    overlayWindow.on('closed', () => {
      overlayWindow = null;
    });

    return overlayWindow;
  },

  closeOverlayWindow(): void {
    if (overlayWindow) {
      LoggingService.info('Closing selection overlay window.');
      overlayWindow.destroy();
      overlayWindow = null;
    }
  }
};

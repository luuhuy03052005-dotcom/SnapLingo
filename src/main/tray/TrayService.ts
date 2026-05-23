import { Tray, Menu, app, nativeImage } from 'electron';
import { WindowService } from '../windows/WindowService';
import { LoggingService } from '../../infra/logging/LoggingService';
import { join } from 'path';

let tray: Tray | null = null;

/**
 * System Tray Service.
 * Why: Keeps app accessible from taskbar tray when minimized, per Desktop Integration Spec §2.
 */
export const TrayService = {
  create(): void {
    if (tray) return;
    LoggingService.info('Creating system tray icon.');

    // Use a simple 16x16 icon — fallback to empty if not found
    let icon: nativeImage;
    try {
      const iconPath = join(__dirname, '../../resources/icon.png');
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) icon = nativeImage.createEmpty();
    } catch {
      icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('SnapLingo — Desktop Translator');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show SnapLingo', click: () => WindowService.showMainWindow() },
      { type: 'separator' },
      { label: 'Screen Snip (OCR)', click: () => WindowService.createOverlayWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => { tray?.destroy(); app.quit(); } }
    ]);

    tray.setContextMenu(contextMenu);

    // Single click on tray icon toggles main window
    tray.on('click', () => {
      WindowService.showMainWindow();
    });
  },

  destroy(): void {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  }
};

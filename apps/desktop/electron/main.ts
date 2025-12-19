import { app, BrowserWindow, ipcMain, dialog, screen, nativeImage } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { startServer } from './server/index.js';
import { getDbPath, setDbPath } from './server/db.js';
import { setErrorNotifier } from './server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let server: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Set app name early (before whenReady) - this affects the dock name on macOS
// Note: In dev mode on macOS, the dock may still show "Electron" because Electron
// runs from its own bundle. The icon should work though.
app.setName('NextJS Sniffer');

// For macOS, also try to set the about panel which can help with the name
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'NextJS Sniffer',
    applicationVersion: app.getVersion(),
  });
  
  // Force dock icon refresh by setting it early
  app.whenReady().then(() => {
    // This will be set again in createWindow, but setting it early can help
  });
}

function getDbPathForApp(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = process.platform === 'darwin'
    ? path.join(process.env.HOME || '', 'Library', 'Application Support', 'Server Network Monitor')
    : userDataPath;

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'monitor.db');
}

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  displayBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

function getWindowStatePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'window-state.json');
}

function loadWindowState(): WindowState | null {
  const statePath = getWindowStatePath();
  try {
    if (existsSync(statePath)) {
      const data = readFileSync(statePath, 'utf-8');
      const state = JSON.parse(data) as WindowState;
      
      // Validate that the saved display still exists
      const displays = screen.getAllDisplays();
      const displayExists = displays.some(display => 
        display.bounds.x === state.displayBounds.x &&
        display.bounds.y === state.displayBounds.y &&
        display.bounds.width === state.displayBounds.width &&
        display.bounds.height === state.displayBounds.height
      );
      
      if (displayExists) {
        return state;
      }
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  return null;
}

function saveWindowState(window: BrowserWindow) {
  try {
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      displayBounds: display.bounds,
    };
    
    const statePath = getWindowStatePath();
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

interface AppSettings {
  errorNotifications: boolean;
}

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  try {
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data) as AppSettings;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  // Default settings
  return {
    errorNotifications: true, // Default to enabled
  };
}

function saveSettings(settings: AppSettings) {
  try {
    const settingsPath = getSettingsPath();
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

let appSettings = loadSettings();
let errorCount = 0;

function isErrorEvent(event: any): boolean {
  // Check if event is an error
  if (event.phase === 'error') {
    return true;
  }
  // Check if status code indicates error (4xx or 5xx)
  if (event.status && (event.status >= 400)) {
    return true;
  }
  // Check if there's an error message
  if (event.error_message) {
    return true;
  }
  return false;
}

export function notifyErrorEvent(event: any) {
  if (!isErrorEvent(event)) {
    return;
  }

  if (!appSettings.errorNotifications) {
    return;
  }

  errorCount++;
  
  // Update badge
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(errorCount > 0 ? errorCount.toString() : '');
  }

  // Bounce dock icon (macOS only)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.bounce('critical');
  }
}

export function clearErrorCount() {
  errorCount = 0;
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge('');
  }
}

function createWindow() {
  // Get icon path - in dev mode, __dirname is dist-electron, so go up to project root
  let iconPath: string = '';
  let icnsPath: string = '';
  
  if (isDev) {
    // In dev: __dirname is dist-electron/electron, so:
    // - Try dist-electron/assets/icons (if copied by build script)
    // - Fallback to project root (apps/desktop/assets/icons)
    const distAssetsPath = path.resolve(__dirname, '../assets/icons/icon.icns');
    const projectRootPath = path.resolve(__dirname, '../../assets/icons/icon.icns');
    
    if (existsSync(distAssetsPath)) {
      icnsPath = distAssetsPath;
      iconPath = path.resolve(__dirname, '../assets/icons/icon.png');
      console.log('✓ Using icon from dist-electron/assets:', icnsPath);
    } else if (existsSync(projectRootPath)) {
      icnsPath = projectRootPath;
      iconPath = path.resolve(__dirname, '../../assets/icons/icon.png');
      console.log('✓ Using icon from project root:', icnsPath);
    } else {
      console.error('✗ Icon not found in either location:');
      console.error('  - Tried:', distAssetsPath);
      console.error('  - Tried:', projectRootPath);
      console.error('  - __dirname:', __dirname);
      // Set fallback empty paths to avoid TypeScript errors
      iconPath = '';
      icnsPath = '';
    }
  } else {
    iconPath = path.join(process.resourcesPath, 'assets/icons/icon.png');
    icnsPath = path.join(process.resourcesPath, 'assets/icons/icon.icns');
  }

  // Set dock icon for macOS (must be .icns file)
  if (process.platform === 'darwin' && app.dock) {
    const trySetIcon = (iconPath: string, silent = false) => {
      if (!iconPath || !existsSync(iconPath)) {
        return false;
      }
      try {
        // Try using nativeImage first, which is more reliable
        const image = nativeImage.createFromPath(iconPath);
        if (!image.isEmpty()) {
          app.dock.setIcon(image);
          if (!silent) {
            console.log('✓ Dock icon set successfully from:', iconPath);
          }
          return true;
        }
        // Fallback to direct path
        app.dock.setIcon(iconPath);
        if (!silent) {
          console.log('✓ Dock icon set successfully from:', iconPath);
        }
        return true;
      } catch (error) {
        // Only log error if not silent (to avoid spam)
        if (!silent) {
          console.warn('⚠ Could not set dock icon from:', iconPath);
        }
        return false;
      }
    };

    // Try primary .icns path
    let iconSet = trySetIcon(icnsPath);
    
    // If .icns fails, try PNG as fallback
    if (!iconSet && iconPath && existsSync(iconPath)) {
      iconSet = trySetIcon(iconPath, true);
    }
    
    // Try alternative paths (silently to avoid spam)
    if (!iconSet) {
      const altPaths = [
        path.resolve(process.cwd(), 'assets/icons/icon.icns'),
        path.resolve(__dirname, '../../assets/icons/icon.icns'),
        path.resolve(__dirname, '../assets/icons/icon.icns'),
        path.resolve(process.cwd(), 'assets/icons/icon_512.png'),
        path.resolve(__dirname, '../../assets/icons/icon_512.png'),
      ];
      for (const altPath of altPaths) {
        if (trySetIcon(altPath, true)) {
          iconSet = true;
          break;
        }
      }
    }
    
    // If all attempts fail, just continue without custom icon (not critical)
    if (!iconSet && isDev) {
      console.log('ℹ Using default Electron icon (custom icon not available)');
    }
  }

  // Load saved window state
  const savedState = loadWindowState();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Default window bounds
  const defaultWidth = 1400;
  const defaultHeight = 900;
  const defaultX = Math.floor((screenWidth - defaultWidth) / 2);
  const defaultY = Math.floor((screenHeight - defaultHeight) / 2);
  
  // Use saved state if available and valid, otherwise use defaults
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: savedState?.width || defaultWidth,
    height: savedState?.height || defaultHeight,
    x: savedState?.x ?? defaultX,
    y: savedState?.y ?? defaultY,
    ...(iconPath ? { icon: iconPath } : {}),
    title: 'NextJS Sniffer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  mainWindow = new BrowserWindow(windowOptions);
  
  // Ensure window is visible on a screen
  if (savedState) {
    const displays = screen.getAllDisplays();
    const isVisible = displays.some(display => {
      const { x, y, width, height } = display.bounds;
      return (
        savedState.x >= x &&
        savedState.y >= y &&
        savedState.x + savedState.width <= x + width &&
        savedState.y + savedState.height <= y + height
      );
    });
    
    if (!isVisible) {
      // Window would be off-screen, center it on primary display
      mainWindow.setPosition(defaultX, defaultY);
    }
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools closed by default - use Console button to open
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Save window state on move/resize
  let saveStateTimeout: NodeJS.Timeout | null = null;
  const debouncedSaveState = () => {
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
    }
    saveStateTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        saveWindowState(mainWindow);
      }
    }, 500); // Debounce to avoid excessive writes
  };

  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('resize', debouncedSaveState);
  
  // Save state when window is closed
  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


app.whenReady().then(async () => {
  // Set database path before starting server
  const dbPath = getDbPathForApp();
  setDbPath(dbPath);

  // Set up error notification callback
  setErrorNotifier(notifyErrorEvent);

  // Set up auto-updater event handlers
  setupAutoUpdater();

  try {
    server = await startServer();
    console.log('Server started successfully on port 9432');
  } catch (error: any) {
    console.error('Failed to start server:', error);
    createWindow();
    // Wait a bit for window to be ready
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('server-error', {
          message: error.message || 'Failed to start server',
          port: 9432,
        });
      }
    }, 500);
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server && server.close) {
    server.close();
  }
});

// IPC handlers
ipcMain.handle('export-event', async (_, data: any) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export Event',
    defaultPath: 'event.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!canceled && filePath) {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return { success: true, filePath };
  }

  return { success: false };
});

ipcMain.handle('get-db-path', () => {
  return getDbPath();
});

ipcMain.handle('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-settings', () => {
  return appSettings;
});

ipcMain.handle('update-settings', (_, newSettings: Partial<AppSettings>) => {
  appSettings = { ...appSettings, ...newSettings };
  saveSettings(appSettings);
  
  // Clear badge if notifications are disabled
  if (!appSettings.errorNotifications) {
    clearErrorCount();
  }
  
  return appSettings;
});

ipcMain.handle('clear-error-badge', () => {
  clearErrorCount();
  return { success: true };
});

// Auto-updater functions
function setupAutoUpdater() {
  if (isDev) {
    // Disable auto-updater in dev mode
    return;
  }

  autoUpdater.autoDownload = false; // Don't auto-download, let user choose
  autoUpdater.autoInstallOnAppQuit = true; // Install on app quit if update is ready

  // Check for updates on startup (after a short delay to let UI load)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 5000);

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info: { version: string; releaseDate?: string }) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'not-available' });
    }
  });

  autoUpdater.on('error', (error: Error) => {
    console.error('Update error:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'error',
        message: error.message,
      });
    }
  });

  autoUpdater.on('download-progress', (progress: { percent: number }) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'downloading',
        progress: Math.round(progress.percent),
      });
    }
  });

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'downloaded',
        version: info.version,
      });
    }
  });
}

ipcMain.handle('check-for-updates', () => {
  if (isDev) {
    return { success: false, message: 'Updates disabled in development mode' };
  }
  autoUpdater.checkForUpdates();
  return { success: true };
});

ipcMain.handle('download-update', () => {
  if (isDev) {
    return { success: false, message: 'Updates disabled in development mode' };
  }
  autoUpdater.downloadUpdate();
  return { success: true };
});

ipcMain.handle('install-update', () => {
  if (isDev) {
    return { success: false, message: 'Updates disabled in development mode' };
  }
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});


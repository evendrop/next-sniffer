import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { startServer } from './server/index.js';
import { getDbPath, setDbPath } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let server: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icons/icon.png')
    : path.join(process.resourcesPath, 'assets/icons/icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Set app name for dock/menu bar
  app.setName('Network Sniffer');
  
  // Set database path before starting server
  const dbPath = getDbPathForApp();
  setDbPath(dbPath);

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


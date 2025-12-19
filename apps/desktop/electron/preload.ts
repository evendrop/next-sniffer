import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  exportEvent: (data: any) => ipcRenderer.invoke('export-event', data),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  onServerError: (callback: (error: any) => void) => {
    ipcRenderer.on('server-error', (_, error) => callback(error));
  },
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  clearErrorBadge: () => ipcRenderer.invoke('clear-error-badge'),
});


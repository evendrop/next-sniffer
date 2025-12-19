import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  exportEvent: (data: any) => ipcRenderer.invoke('export-event', data),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  onServerError: (callback: (error: any) => void) => {
    ipcRenderer.on('server-error', (_, error) => callback(error));
  },
});


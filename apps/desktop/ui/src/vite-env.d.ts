/// <reference types="vite/client" />

interface ElectronAPI {
  exportEvent: (data: any) => Promise<{ success: boolean; filePath?: string }>;
  getDbPath: () => Promise<string>;
  onServerError: (callback: (error: any) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}


/// <reference types="vite/client" />

interface AppSettings {
  errorNotifications: boolean;
}

interface ElectronAPI {
  exportEvent: (data: any) => Promise<{ success: boolean; filePath?: string }>;
  getDbPath: () => Promise<string>;
  onServerError: (callback: (error: any) => void) => void;
  toggleDevTools: () => Promise<{ success: boolean }>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  clearErrorBadge: () => Promise<{ success: boolean }>;
  checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
  installUpdate: () => Promise<{ success: boolean; message?: string }>;
  getAppVersion: () => Promise<string>;
  onUpdateStatus: (callback: (status: any) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}


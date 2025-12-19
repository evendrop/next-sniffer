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
}

interface Window {
  electronAPI?: ElectronAPI;
}


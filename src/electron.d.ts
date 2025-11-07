export interface IElectronAPI {
  getApiKey: () => Promise<string | null>;
  setApiKey: (key: string) => Promise<void>;
  fetchFlights: (
    flightCode: string,
    date: string,
    bypassCache?: boolean
  ) => Promise<any>;
  generateIcs: (flight: any) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// Vite entry points (provided by Electron Forge Vite plugin)
declare const MAIN_WINDOW_VITE_NAME: string;
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_PRELOAD: string;

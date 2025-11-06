import { contextBridge, ipcRenderer } from 'electron';

console.log('[PRELOAD] Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    getApiKey: (): Promise<string | null> => ipcRenderer.invoke('get-api-key'),
    setApiKey: (key: string): Promise<void> => ipcRenderer.invoke('set-api-key', key),
    fetchFlights: (flightCode: string, date: string): Promise<any> =>
      ipcRenderer.invoke('fetch-flights', flightCode, date),
    generateIcs: (flight: any): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('generate-ics', flight),
  });
  console.log('[PRELOAD] electronAPI exposed successfully');
} catch (error) {
  console.error('[PRELOAD] Error exposing electronAPI:', error);
}


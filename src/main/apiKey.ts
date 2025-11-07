import { safeStorage, ipcMain } from "electron";
import store from "./store";

/**
 * API Key management handlers
 */

/**
 * Get API key (decrypts from safeStorage)
 */
export function setupGetApiKeyHandler(): void {
  ipcMain.handle("get-api-key", async () => {
    try {
      const encryptedKey = store.get("rapidApiKey") as string | undefined;
      if (!encryptedKey) {
        return null;
      }

      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedKey, "base64");
        const decrypted = safeStorage.decryptString(buffer);
        return decrypted;
      } else {
        // Fallback: return as plain text if encryption is not available
        return encryptedKey;
      }
    } catch (error) {
      console.error("[API_KEY] Error getting API key:", error);
      return null;
    }
  });
}

/**
 * Set API key (encrypts with safeStorage, saves to electron-store)
 */
export function setupSetApiKeyHandler(): void {
  ipcMain.handle("set-api-key", async (_event, key: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(key);
        const encryptedBase64 = encrypted.toString("base64");
        store.set("rapidApiKey", encryptedBase64);
      } else {
        // Fallback: store as plain text if encryption is not available
        store.set("rapidApiKey", key);
      }
    } catch (error) {
      console.error("[API_KEY] Error setting API key:", error);
      throw error;
    }
  });
}

/**
 * Get decrypted API key for internal use
 */
export function getApiKey(): string | null {
  try {
    const encryptedKey = store.get("rapidApiKey") as string | undefined;
    if (!encryptedKey) {
      return null;
    }

    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encryptedKey, "base64");
      return safeStorage.decryptString(buffer);
    } else {
      return encryptedKey;
    }
  } catch (error) {
    console.error("[API_KEY] Error getting API key:", error);
    return null;
  }
}

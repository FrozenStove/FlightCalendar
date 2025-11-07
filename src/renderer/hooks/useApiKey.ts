import { useState, useEffect } from "react";

/**
 * Custom hook for managing API key
 */
export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        console.log(
          "[HOOK] Checking if electronAPI is available:",
          typeof window.electronAPI !== "undefined"
        );
        if (typeof window.electronAPI === "undefined") {
          console.error("[HOOK] window.electronAPI is not available!");
          setError(
            "Electron API not available. Please restart the application."
          );
          setLoading(false);
          return;
        }
        const key = await window.electronAPI.getApiKey();
        console.log(
          "[HOOK] API key loaded:",
          key ? "Key found" : "No key found"
        );
        if (key) {
          setApiKey(key);
        }
      } catch (err) {
        console.error("[HOOK] Error loading API key:", err);
        setError(`Error loading API key: ${err}`);
      } finally {
        setLoading(false);
      }
    };
    loadApiKey();
  }, []);

  // Save API key
  const saveApiKey = async (key: string): Promise<void> => {
    try {
      await window.electronAPI.setApiKey(key);
      setApiKey(key);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to save API key");
      throw err;
    }
  };

  return {
    apiKey,
    setApiKey,
    saveApiKey,
    loading,
    error,
  };
}

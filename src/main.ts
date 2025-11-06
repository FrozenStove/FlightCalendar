import { app, BrowserWindow, ipcMain, safeStorage, dialog } from "electron";
import Store from "electron-store";
import axios from "axios";
import { createEvent } from "ics";
import * as path from "path";
import {
  MAIN_WINDOW_VITE_NAME,
  MAIN_WINDOW_VITE_DEV_SERVER_URL,
  MAIN_WINDOW_VITE_PRELOAD,
} from "./vite-constants";

console.log("[MAIN] Starting main process...");
console.log(
  "[MAIN] MAIN_WINDOW_VITE_DEV_SERVER_URL:",
  MAIN_WINDOW_VITE_DEV_SERVER_URL
);
console.log("[MAIN] MAIN_WINDOW_VITE_PRELOAD:", MAIN_WINDOW_VITE_PRELOAD);

// Initialize electron-store
console.log("[MAIN] Initializing electron-store...");
const store = new Store();
console.log("[MAIN] electron-store initialized");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  console.log("[MAIN] electron-squirrel-startup detected, quitting...");
  app.quit();
}

const createWindow = (): void => {
  console.log("[MAIN] Creating browser window...");
  try {
    // Create the browser window
    const mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      webPreferences: {
        preload: MAIN_WINDOW_VITE_PRELOAD,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    console.log(
      "[MAIN] Browser window created with preload:",
      MAIN_WINDOW_VITE_PRELOAD
    );

    // Load the index.html of the app
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // Load from dev server if available
      console.log(
        "[MAIN] Loading URL from dev server:",
        MAIN_WINDOW_VITE_DEV_SERVER_URL
      );
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((error) => {
        console.error("[MAIN] Error loading URL:", error);
      });
    } else {
      // Load from file in production
      // __dirname is .vite/build, so we need to go up one level then into renderer
      const indexPath = path.join(
        __dirname,
        "..",
        "renderer",
        "main_window",
        "index.html"
      );
      console.log("[MAIN] Loading from file:", indexPath);
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error("[MAIN] Error loading file:", error);
      });
    }

    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
      console.log("[MAIN] Opening DevTools (development mode)");
      mainWindow.webContents.openDevTools();
    }

    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {
        console.error(
          "[MAIN] Failed to load page:",
          errorCode,
          errorDescription
        );
      }
    );

    mainWindow.webContents.on("did-finish-load", () => {
      console.log("[MAIN] Page finished loading");
    });

    mainWindow.webContents.on("dom-ready", () => {
      console.log("[MAIN] DOM ready");
    });
  } catch (error) {
    console.error("[MAIN] Error creating window:", error);
  }
};

// This method will be called when Electron has finished initialization
app.on("ready", () => {
  console.log("[MAIN] App ready event fired");
  createWindow();
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  console.log("[MAIN] All windows closed");
  if (process.platform !== "darwin") {
    console.log("[MAIN] Quitting application");
    app.quit();
  }
});

app.on("activate", () => {
  console.log("[MAIN] App activated");
  // On macOS, re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log("[MAIN] No windows open, creating new window");
    createWindow();
  }
});

app.on("will-quit", () => {
  console.log("[MAIN] App will quit");
});

app.on("before-quit", () => {
  console.log("[MAIN] App before quit");
});

// IPC Handlers

// Get API key (decrypts from safeStorage)
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
    console.error("Error getting API key:", error);
    return null;
  }
});

// Set API key (encrypts with safeStorage, saves to electron-store)
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
    console.error("Error setting API key:", error);
    throw error;
  }
});

// Fetch flights (gets key, calls axios to Aerodatabox URL, returns JSON)
ipcMain.handle(
  "fetch-flights",
  async (_event, flightCode: string, date: string) => {
    try {
      console.log("[MAIN] fetch-flights called with:", { flightCode, date });

      // Format date for API (YYYY-MM-DD)
      const formattedDate = date.split("T")[0];
      const cacheKey = `flight_${flightCode}_${formattedDate}`;

      // Check cache first
      const cached = store.get(cacheKey) as any;
      if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
        console.log("[MAIN] ✅ Cache HIT for:", cacheKey);
        console.log(
          "[MAIN] Cached data retrieved:",
          JSON.stringify(cached.data, null, 2)
        );
        console.log(
          "[MAIN] Cache age:",
          Math.round((Date.now() - cached.cachedAt) / 1000 / 60),
          "minutes"
        );
        console.log(
          "[MAIN] Cache expires in:",
          Math.round((cached.expiresAt - Date.now()) / 1000 / 60),
          "minutes"
        );
        return cached.data;
      }
      if (cached) {
        console.log("[MAIN] ⚠️ Cache expired for:", cacheKey);
        console.log(
          "[MAIN] Expired at:",
          new Date(cached.expiresAt).toISOString()
        );
      } else {
        console.log(
          "[MAIN] ❌ Cache MISS - no cached data found for:",
          cacheKey
        );
      }
      console.log("[MAIN] Fetching fresh data from API...");

      // Get API key
      const encryptedKey = store.get("rapidApiKey") as string | undefined;
      if (!encryptedKey) {
        console.error("[MAIN] API key not set");
        return { error: "API key not set. Please configure it in Settings." };
      }

      let apiKey: string;
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedKey, "base64");
        apiKey = safeStorage.decryptString(buffer);
      } else {
        apiKey = encryptedKey;
      }

      console.log("[MAIN] Calling Aerodatabox API...");
      // Call Aerodatabox API
      const response = await axios.get(
        `https://aerodatabox.p.rapidapi.com/flights/number/${flightCode}/${formattedDate}`,
        {
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
          },
        }
      );

      console.log("[MAIN] ✅ API response received:", {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });

      // Log the full API response data
      console.log(
        "[MAIN] 📦 Full API response data:",
        JSON.stringify(response.data, null, 2)
      );

      // Log response structure details
      if (response.data) {
        if (Array.isArray(response.data)) {
          console.log(
            "[MAIN] Response is an array with",
            response.data.length,
            "items"
          );
          if (response.data.length > 0) {
            console.log(
              "[MAIN] First item structure:",
              JSON.stringify(response.data[0], null, 2)
            );
          }
        } else if (typeof response.data === "object") {
          console.log(
            "[MAIN] Response is an object with keys:",
            Object.keys(response.data)
          );
          // Log each top-level property
          Object.keys(response.data).forEach((key) => {
            const value = response.data[key];
            if (Array.isArray(value)) {
              console.log(
                `[MAIN]   - ${key}: array with ${value.length} items`
              );
            } else if (typeof value === "object" && value !== null) {
              console.log(
                `[MAIN]   - ${key}: object with keys:`,
                Object.keys(value)
              );
            } else {
              console.log(`[MAIN]   - ${key}:`, typeof value, value);
            }
          });
        }
      }

      // Cache the response for 24 hours
      const cacheData = {
        data: response.data,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        cachedAt: Date.now(),
      };
      store.set(cacheKey, cacheData);
      console.log("[MAIN] 💾 Response cached successfully");
      console.log("[MAIN] Cache key:", cacheKey);
      console.log(
        "[MAIN] Cache expires at:",
        new Date(cacheData.expiresAt).toISOString()
      );
      console.log("[MAIN] Cache will be valid for 24 hours");

      return response.data;
    } catch (error: any) {
      console.error("[MAIN] Error fetching flights:", error);
      if (error.response) {
        console.error("[MAIN] API Error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        return {
          error: `API Error: ${error.response.status} - ${error.response.data?.message || "Unknown error"}`,
        };
      } else if (error.request) {
        console.error("[MAIN] Network error - no response received");
        return { error: "Network error: Could not reach the API server." };
      } else {
        console.error("[MAIN] Request setup error:", error.message);
        return { error: `Error: ${error.message}` };
      }
    }
  }
);

// Generate ICS file (receives a flight object, parses dates, uses ics lib, shows dialog, saves file)
ipcMain.handle("generate-ics", async (_event, flight: any) => {
  try {
    console.log(
      "[MAIN] generate-ics called with flight:",
      JSON.stringify(flight, null, 2)
    );

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      console.error("[MAIN] No window available for ICS generation");
      return { success: false, error: "No window available" };
    }

    // Parse flight data
    const flightNumber = flight.number || "Unknown";
    console.log("[MAIN] Flight number:", flightNumber);

    const departure = flight.departure;
    const arrival = flight.arrival;

    console.log("[MAIN] Departure data:", JSON.stringify(departure, null, 2));
    console.log("[MAIN] Arrival data:", JSON.stringify(arrival, null, 2));

    if (!departure || !arrival) {
      console.error("[MAIN] Missing departure or arrival data");
      return {
        success: false,
        error: "Invalid flight data: missing departure or arrival information",
      };
    }

    // Parse dates - check for scheduledTime object structure (API uses scheduledTime, not time)
    console.log(
      "[MAIN] Departure scheduledTime object:",
      departure.scheduledTime
    );
    console.log("[MAIN] Arrival scheduledTime object:", arrival.scheduledTime);
    console.log("[MAIN] Departure time object (legacy):", departure.time);
    console.log("[MAIN] Arrival time object (legacy):", arrival.time);

    // Try scheduledTime first (current API format), then fall back to time (legacy format)
    const departureTime =
      departure.scheduledTime?.utc ||
      departure.scheduledTime?.local ||
      departure.time?.utc ||
      departure.time?.local ||
      departure.time;
    const arrivalTime =
      arrival.scheduledTime?.utc ||
      arrival.scheduledTime?.local ||
      arrival.time?.utc ||
      arrival.time?.local ||
      arrival.time;

    console.log("[MAIN] Parsed departure time:", departureTime);
    console.log("[MAIN] Parsed arrival time:", arrivalTime);

    if (!departureTime || !arrivalTime) {
      console.error("[MAIN] Missing time data in departure or arrival");
      console.error(
        "[MAIN] Departure object keys:",
        departure ? Object.keys(departure) : "null"
      );
      console.error(
        "[MAIN] Arrival object keys:",
        arrival ? Object.keys(arrival) : "null"
      );
      return {
        success: false,
        error: `Invalid flight data: missing time information. Departure time: ${departureTime ? "found" : "missing"}, Arrival time: ${arrivalTime ? "found" : "missing"}`,
      };
    }

    const departureDate = new Date(departureTime);
    const arrivalDate = new Date(arrivalTime);

    console.log("[MAIN] Parsed departure date:", departureDate);
    console.log("[MAIN] Parsed arrival date:", arrivalDate);

    if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
      console.error("[MAIN] Invalid date parsing");
      return {
        success: false,
        error: "Invalid flight data: could not parse dates",
      };
    }

    // Format dates for ics library (YYYYMMDDTHHmmss)
    const formatDateForICS = (
      date: Date
    ): [number, number, number, number, number] => {
      return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
      ];
    };

    const start = formatDateForICS(departureDate);
    const end = formatDateForICS(arrivalDate);

    // Create event
    const event = {
      title: `Flight ${flightNumber}`,
      description: `Flight from ${departure.airport?.iata || departure.airport?.name || "Unknown"} to ${arrival.airport?.iata || arrival.airport?.name || "Unknown"}`,
      location: `${departure.airport?.iata || ""} → ${arrival.airport?.iata || ""}`,
      start: start,
      end: end,
      startInputType: "utc" as const,
      endInputType: "utc" as const,
      startOutputType: "utc" as const,
      endOutputType: "utc" as const,
    };

    const { error, value } = createEvent(event);

    if (error) {
      return {
        success: false,
        error: `Failed to create calendar event: ${error.message}`,
      };
    }

    if (!value) {
      return { success: false, error: "Failed to generate calendar file" };
    }

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save Calendar File",
      defaultPath: `flight-${flightNumber}-${departureDate.toISOString().split("T")[0]}.ics`,
      filters: [
        { name: "iCalendar Files", extensions: ["ics"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: "Save cancelled" };
    }

    // Write file using Node.js fs (main process has access)
    const fs = require("fs");
    fs.writeFileSync(result.filePath, value);

    return { success: true };
  } catch (error: any) {
    console.error("Error generating ICS:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
});

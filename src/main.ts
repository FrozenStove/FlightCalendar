import { app, BrowserWindow, ipcMain, safeStorage, shell } from "electron";
import Store from "electron-store";
import axios from "axios";
import { createEvent } from "ics";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { pathToFileURL } from "url";
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
    // Get icon path - works in both dev and production
    let iconPath: string | undefined;
    try {
      // Try to find icon in assets directory (relative to project root)
      const iconPathDev = path.join(__dirname, "..", "assets", "icon.png");
      const iconPathProd = path.join(
        process.resourcesPath,
        "assets",
        "icon.png"
      );

      // Check if icon exists in dev location
      if (fs.existsSync(iconPathDev)) {
        iconPath = iconPathDev;
        console.log("[MAIN] Using icon from assets directory:", iconPath);
      } else if (fs.existsSync(iconPathProd)) {
        iconPath = iconPathProd;
        console.log("[MAIN] Using icon from production resources:", iconPath);
      } else {
        console.log("[MAIN] Icon not found, using default Electron icon");
      }
    } catch (iconError) {
      console.log("[MAIN] Could not load icon:", iconError);
    }

    // Create the browser window
    const mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      icon: iconPath, // Set icon for window (works in dev and production)
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
  async (
    _event,
    flightCode: string,
    date: string,
    bypassCache: boolean = false
  ) => {
    try {
      console.log("[MAIN] fetch-flights called with:", {
        flightCode,
        date,
        bypassCache,
      });

      // Format date for API (YYYY-MM-DD)
      const formattedDate = date.split("T")[0];
      const cacheKey = `flight_${flightCode}_${formattedDate}`;

      // Check cache first (unless bypassing)
      if (!bypassCache) {
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
      } else {
        console.log(
          "[MAIN] ⚠️ Cache bypass requested - fetching fresh data from API"
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
  console.log("[MAIN] 📅 Starting ICS file generation process...");
  try {
    console.log(
      "[MAIN] 📦 Received flight data:",
      JSON.stringify(flight, null, 2)
    );

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      console.error("[MAIN] ❌ No window available for ICS generation");
      return { success: false, error: "No window available" };
    }
    console.log("[MAIN] ✅ Main window found, proceeding with ICS generation");

    // Parse flight data
    console.log("[MAIN] 🔍 Step 1: Parsing flight data...");
    const flightNumber = flight.number || "Unknown";
    console.log("[MAIN]   Flight number extracted:", flightNumber);

    const departure = flight.departure;
    const arrival = flight.arrival;

    console.log("[MAIN]   Departure data:", JSON.stringify(departure, null, 2));
    console.log("[MAIN]   Arrival data:", JSON.stringify(arrival, null, 2));

    if (!departure || !arrival) {
      console.error("[MAIN] ❌ Missing departure or arrival data");
      console.error("[MAIN]   Departure exists:", !!departure);
      console.error("[MAIN]   Arrival exists:", !!arrival);
      return {
        success: false,
        error: "Invalid flight data: missing departure or arrival information",
      };
    }
    console.log("[MAIN] ✅ Departure and arrival data validated");

    // Parse dates - check for scheduledTime object structure (API uses scheduledTime, not time)
    console.log("[MAIN] 🔍 Step 2: Parsing time data...");
    console.log(
      "[MAIN]   Departure scheduledTime object:",
      JSON.stringify(departure.scheduledTime, null, 2)
    );
    console.log(
      "[MAIN]   Arrival scheduledTime object:",
      JSON.stringify(arrival.scheduledTime, null, 2)
    );
    console.log(
      "[MAIN]   Departure time object (legacy):",
      JSON.stringify(departure.time, null, 2)
    );
    console.log(
      "[MAIN]   Arrival time object (legacy):",
      JSON.stringify(arrival.time, null, 2)
    );

    // Try scheduledTime first (current API format), then fall back to time (legacy format)
    console.log("[MAIN]   Attempting to extract departure time...");
    const departureTime =
      departure.scheduledTime?.utc ||
      departure.scheduledTime?.local ||
      departure.time?.utc ||
      departure.time?.local ||
      departure.time;
    console.log("[MAIN]   Departure time extracted:", departureTime);
    console.log(
      "[MAIN]   Departure time source:",
      departure.scheduledTime?.utc
        ? "scheduledTime.utc"
        : departure.scheduledTime?.local
          ? "scheduledTime.local"
          : departure.time?.utc
            ? "time.utc"
            : departure.time?.local
              ? "time.local"
              : departure.time
                ? "time"
                : "none"
    );

    console.log("[MAIN]   Attempting to extract arrival time...");
    const arrivalTime =
      arrival.scheduledTime?.utc ||
      arrival.scheduledTime?.local ||
      arrival.time?.utc ||
      arrival.time?.local ||
      arrival.time;
    console.log("[MAIN]   Arrival time extracted:", arrivalTime);
    console.log(
      "[MAIN]   Arrival time source:",
      arrival.scheduledTime?.utc
        ? "scheduledTime.utc"
        : arrival.scheduledTime?.local
          ? "scheduledTime.local"
          : arrival.time?.utc
            ? "time.utc"
            : arrival.time?.local
              ? "time.local"
              : arrival.time
                ? "time"
                : "none"
    );

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

    console.log(
      "[MAIN] 🔍 Step 3: Checking for delays and converting time strings to Date objects..."
    );

    // Get original scheduled times
    const scheduledDepartureTime = departureTime;
    const scheduledArrivalTime = arrivalTime;

    // Check for predicted/estimated times (delays)
    const predictedDepartureTime =
      departure.predictedTime?.utc ||
      departure.predictedTime?.local ||
      departure.estimatedTime?.utc ||
      departure.estimatedTime?.local;

    const predictedArrivalTime =
      arrival.predictedTime?.utc ||
      arrival.predictedTime?.local ||
      arrival.estimatedTime?.utc ||
      arrival.estimatedTime?.local;

    console.log("[MAIN]   Scheduled departure:", scheduledDepartureTime);
    console.log("[MAIN]   Predicted departure:", predictedDepartureTime);
    console.log("[MAIN]   Scheduled arrival:", scheduledArrivalTime);
    console.log("[MAIN]   Predicted arrival:", predictedArrivalTime);

    // Determine if flight is delayed
    const isDelayed =
      (predictedDepartureTime &&
        new Date(predictedDepartureTime).getTime() >
          new Date(scheduledDepartureTime).getTime()) ||
      (predictedArrivalTime &&
        new Date(predictedArrivalTime).getTime() >
          new Date(scheduledArrivalTime).getTime());

    console.log("[MAIN]   Flight delayed:", isDelayed);

    // Use predicted times if available and different, otherwise use scheduled
    const actualDepartureTime =
      isDelayed && predictedDepartureTime
        ? predictedDepartureTime
        : scheduledDepartureTime;
    const actualArrivalTime =
      isDelayed && predictedArrivalTime
        ? predictedArrivalTime
        : scheduledArrivalTime;

    const departureDate = new Date(actualDepartureTime);
    const arrivalDate = new Date(actualArrivalTime);

    console.log("[MAIN]   Departure Date object created:", departureDate);
    console.log(
      "[MAIN]   Departure Date ISO string:",
      departureDate.toISOString()
    );
    console.log("[MAIN]   Arrival Date object created:", arrivalDate);
    console.log("[MAIN]   Arrival Date ISO string:", arrivalDate.toISOString());

    if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
      console.error("[MAIN] ❌ Invalid date parsing");
      console.error(
        "[MAIN]   Departure date valid:",
        !isNaN(departureDate.getTime())
      );
      console.error(
        "[MAIN]   Arrival date valid:",
        !isNaN(arrivalDate.getTime())
      );
      return {
        success: false,
        error: "Invalid flight data: could not parse dates",
      };
    }
    console.log("[MAIN] ✅ Date objects validated successfully");

    // Format dates for ics library (YYYYMMDDTHHmmss)
    console.log("[MAIN] 🔍 Step 4: Formatting dates for ICS library...");
    const formatDateForICS = (
      date: Date
    ): [number, number, number, number, number] => {
      const formatted: [number, number, number, number, number] = [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
      ];
      console.log("[MAIN]   Formatted date array:", formatted);
      return formatted;
    };

    const start = formatDateForICS(departureDate);
    const end = formatDateForICS(arrivalDate);
    console.log("[MAIN]   Start date array:", start);
    console.log("[MAIN]   End date array:", end);

    // Create event
    console.log("[MAIN] 🔍 Step 5: Creating ICS event object...");
    const departureAirport =
      departure.airport?.iata || departure.airport?.name || "Unknown";
    const arrivalAirport =
      arrival.airport?.iata || arrival.airport?.name || "Unknown";

    const event = {
      title: `Flight ${flightNumber}`,
      description: `Flight from ${departureAirport} to ${arrivalAirport}`,
      location: `${departure.airport?.iata || ""} → ${arrival.airport?.iata || ""}`,
      start: start,
      end: end,
      startInputType: "utc" as const,
      endInputType: "utc" as const,
      startOutputType: "utc" as const,
      endOutputType: "utc" as const,
    };

    console.log(
      "[MAIN]   Event object created:",
      JSON.stringify(event, null, 2)
    );
    console.log("[MAIN]   Departure airport:", departureAirport);
    console.log("[MAIN]   Arrival airport:", arrivalAirport);

    console.log("[MAIN] 🔍 Step 6: Calling ICS library createEvent()...");
    const { error, value } = createEvent(event);

    if (error) {
      console.error("[MAIN] ❌ ICS library error:", error);
      console.error("[MAIN]   Error message:", error.message);
      return {
        success: false,
        error: `Failed to create calendar event: ${error.message}`,
      };
    }
    console.log("[MAIN] ✅ ICS library call successful");

    if (!value) {
      console.error("[MAIN] ❌ ICS library returned no value");
      return { success: false, error: "Failed to generate calendar file" };
    }
    console.log("[MAIN]   ICS content length:", value.length, "characters");
    console.log(
      "[MAIN]   ICS content preview (first 200 chars):",
      value.substring(0, 200)
    );

    // Create Google Calendar URL and open directly in browser
    console.log("[MAIN] 🔍 Step 7: Creating Google Calendar URL...");

    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
    const formatDateForGoogleCalendar = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      const seconds = String(date.getUTCSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    const startDateStr = formatDateForGoogleCalendar(departureDate);
    const endDateStr = formatDateForGoogleCalendar(arrivalDate);

    // Get airline information
    const airlineName = flight.airline?.name || "Unknown Airline";
    const airlineIata = flight.airline?.iata || "";
    const airlineIcao = flight.airline?.icao || "";
    const airlineCode = airlineIata || airlineIcao || "";

    // Get full airport names and codes
    const departureAirportName = departure.airport?.name || "Unknown";
    const departureAirportCode =
      departure.airport?.iata || departure.airport?.icao || "";
    const departureTerminal = departure.terminal || "";

    const arrivalAirportName = arrival.airport?.name || "Unknown";
    const arrivalAirportCode =
      arrival.airport?.iata || arrival.airport?.icao || "";
    const arrivalTerminal = arrival.terminal || "";

    // Format times for display (local time)
    const formatTimeForDisplay = (timeStr: string | undefined): string => {
      if (!timeStr) return "Time not available";
      try {
        const date = new Date(timeStr);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "pm" : "am";
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, "0");
        return `${displayHours}:${displayMinutes}${ampm}`;
      } catch {
        return "Time not available";
      }
    };

    // Get scheduled times for display
    const scheduledDepartureTimeLocal = formatTimeForDisplay(
      departure.scheduledTime?.local || departure.time?.local
    );
    const scheduledArrivalTimeLocal = formatTimeForDisplay(
      arrival.scheduledTime?.local || arrival.time?.local
    );

    // Get predicted/estimated times for display
    const predictedDepartureTimeLocal = formatTimeForDisplay(
      departure.predictedTime?.local || departure.estimatedTime?.local
    );
    const predictedArrivalTimeLocal = formatTimeForDisplay(
      arrival.predictedTime?.local || arrival.estimatedTime?.local
    );

    // Use actual times (predicted if delayed, otherwise scheduled)
    const departureTimeLocal =
      isDelayed && predictedDepartureTimeLocal !== "Time not available"
        ? predictedDepartureTimeLocal
        : scheduledDepartureTimeLocal;
    const arrivalTimeLocal =
      isDelayed && predictedArrivalTimeLocal !== "Time not available"
        ? predictedArrivalTimeLocal
        : scheduledArrivalTimeLocal;

    // Calculate flight duration
    const flightDurationMs = arrivalDate.getTime() - departureDate.getTime();
    const flightDurationHours = Math.floor(flightDurationMs / (1000 * 60 * 60));
    const flightDurationMinutes = Math.floor(
      (flightDurationMs % (1000 * 60 * 60)) / (1000 * 60)
    );
    const flightDurationStr =
      flightDurationHours > 0
        ? `${flightDurationHours}h ${flightDurationMinutes}m`
        : `${flightDurationMinutes}m`;

    // Get flight distance if available
    const distance = flight.greatCircleDistance;
    const distanceStr = distance?.km
      ? `${distance.km} km (${distance.mile} miles)`
      : distance?.mile
        ? `${distance.mile} miles`
        : "";

    // Build event title with airline name (add [DELAYED] if delayed)
    const eventTitle = isDelayed
      ? `[DELAYED] ${airlineName} flight ${flightNumber}`
      : `${airlineName} flight ${flightNumber}`;

    // Build FlightAware URL using ICAO code (preferred) or IATA code
    // FlightAware uses ICAO codes (e.g., SWA for Southwest, not WN)
    const flightAwareCode = airlineIcao || airlineIata || "";
    const flightAwareUrl = flightAwareCode
      ? `https://www.flightaware.com/live/flight/${flightAwareCode}${flightNumber.replace(/\s+/g, "")}`
      : "";

    // Build rich description similar to Google's format
    let descriptionParts: string[] = [];

    // Main flight info line
    descriptionParts.push(`${airlineName} flight ${flightNumber}`);
    descriptionParts.push(""); // Empty line

    // Departure info
    let departureLine = `${departureAirportName} ${departureAirportCode}`;
    if (departureTerminal) {
      departureLine += ` Terminal ${departureTerminal}`;
    }
    departureLine += ` ${departureTimeLocal} (local time)`;
    descriptionParts.push(departureLine);

    // Arrival info
    let arrivalLine = `- ${arrivalAirportName} ${arrivalAirportCode}`;
    if (arrivalTerminal) {
      arrivalLine += ` Terminal ${arrivalTerminal}`;
    }
    arrivalLine += ` ${arrivalTimeLocal} (local time)`;
    descriptionParts.push(arrivalLine);

    // Delay information if delayed
    if (isDelayed) {
      descriptionParts.push(""); // Empty line
      descriptionParts.push("⚠️ FLIGHT DELAYED");
      descriptionParts.push(""); // Empty line
      descriptionParts.push("Original Scheduled Times:");
      descriptionParts.push(
        `  Departure: ${scheduledDepartureTimeLocal} (local time)`
      );
      descriptionParts.push(
        `  Arrival: ${scheduledArrivalTimeLocal} (local time)`
      );
      descriptionParts.push(""); // Empty line
      descriptionParts.push("Updated Times:");
      if (predictedDepartureTimeLocal !== "Time not available") {
        descriptionParts.push(
          `  Departure: ${predictedDepartureTimeLocal} (local time) - Predicted/Estimated`
        );
      }
      if (predictedArrivalTimeLocal !== "Time not available") {
        descriptionParts.push(
          `  Arrival: ${predictedArrivalTimeLocal} (local time) - Predicted/Estimated`
        );
      }
    }

    // Additional details
    descriptionParts.push(""); // Empty line
    descriptionParts.push("Flight Details:");
    if (flightDurationStr) {
      descriptionParts.push(`Duration: ${flightDurationStr}`);
    }
    if (distanceStr) {
      descriptionParts.push(`Distance: ${distanceStr}`);
    }
    if (departureTerminal) {
      descriptionParts.push(`Departure Terminal: ${departureTerminal}`);
    }
    if (arrivalTerminal) {
      descriptionParts.push(`Arrival Terminal: ${arrivalTerminal}`);
    }
    if (airlineCode) {
      descriptionParts.push(`Airline Code: ${airlineCode}`);
    }

    // Add FlightAware tracking link
    if (flightAwareUrl) {
      descriptionParts.push(""); // Empty line
      descriptionParts.push("Live Flight Tracking:");
      descriptionParts.push(flightAwareUrl);
    }

    const description = descriptionParts.join("\n");

    // Location should be just the departure airport (as per Google's format)
    const location = `${departureAirportName} ${departureAirportCode}`;

    // Create Google Calendar URL
    const googleCalendarUrl = new URL(
      "https://calendar.google.com/calendar/render"
    );
    googleCalendarUrl.searchParams.set("action", "TEMPLATE");
    googleCalendarUrl.searchParams.set("text", eventTitle);
    googleCalendarUrl.searchParams.set(
      "dates",
      `${startDateStr}/${endDateStr}`
    );
    googleCalendarUrl.searchParams.set("details", description);
    googleCalendarUrl.searchParams.set("location", location);

    const calendarUrl = googleCalendarUrl.toString();
    console.log("[MAIN]   Google Calendar URL created");
    console.log("[MAIN]   URL:", calendarUrl);

    // Open Google Calendar URL in the default browser
    console.log("[MAIN] 🔍 Step 8: Opening Google Calendar in browser...");
    try {
      await shell.openExternal(calendarUrl);
      console.log("[MAIN] ✅ Google Calendar opened in browser successfully");
      console.log(
        "[MAIN]   The event should be pre-filled and ready to save to your calendar"
      );
    } catch (openError: any) {
      console.error("[MAIN] ❌ Error opening Google Calendar:", openError);
      console.error("[MAIN]   Error message:", openError.message);
      console.error("[MAIN]   Error stack:", openError.stack);
      return {
        success: false,
        error: `Failed to open Google Calendar: ${openError.message}`,
      };
    }

    console.log(
      "[MAIN] ✅ ICS file generation process completed successfully!"
    );
    return { success: true };
  } catch (error: any) {
    console.error("[MAIN] ❌ Unexpected error during ICS generation:", error);
    console.error("[MAIN]   Error type:", error.constructor.name);
    console.error("[MAIN]   Error message:", error.message);
    console.error("[MAIN]   Error stack:", error.stack);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
});

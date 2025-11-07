import { ipcMain } from "electron";
import axios from "axios";
import store from "./store";
import { getApiKey } from "./apiKey";
import { getCacheKey, getCachedData, setCachedData } from "./cache";
import { extractQuotaInfo, QuotaInfo } from "./quota";

/**
 * Flight API service for fetching flight data from Aerodatabox
 */

/**
 * Log API response structure for debugging
 */
function logResponseStructure(data: any): void {
  if (data) {
    if (Array.isArray(data)) {
      console.log(
        "[FLIGHT_API] Response is an array with",
        data.length,
        "items"
      );
      if (data.length > 0) {
        console.log(
          "[FLIGHT_API] First item structure:",
          JSON.stringify(data[0], null, 2)
        );
      }
    } else if (typeof data === "object") {
      console.log(
        "[FLIGHT_API] Response is an object with keys:",
        Object.keys(data)
      );
      // Log each top-level property
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (Array.isArray(value)) {
          console.log(
            `[FLIGHT_API]   - ${key}: array with ${value.length} items`
          );
        } else if (typeof value === "object" && value !== null) {
          console.log(
            `[FLIGHT_API]   - ${key}: object with keys:`,
            Object.keys(value)
          );
        } else {
          console.log(`[FLIGHT_API]   - ${key}:`, typeof value, value);
        }
      });
    }
  }
}

/**
 * Wrap response data with quota information
 */
function wrapResponseWithQuota(data: any, quotaInfo: QuotaInfo): any {
  // If response.data is an array, we need to wrap it in an object to attach _quotaInfo
  if (Array.isArray(data)) {
    // Wrap array in object to preserve quota info
    return {
      _data: data,
      _quotaInfo: {
        remaining: quotaInfo.remaining,
        limit: quotaInfo.limit,
        reset: quotaInfo.reset,
      },
    };
  } else {
    // For objects, we can spread and add quota info
    return {
      ...data,
      _quotaInfo: {
        remaining: quotaInfo.remaining,
        limit: quotaInfo.limit,
        reset: quotaInfo.reset,
      },
    };
  }
}

/**
 * Fetch flights from Aerodatabox API
 */
async function fetchFlightsFromAPI(
  flightCode: string,
  formattedDate: string,
  apiKey: string
): Promise<{ data: any; quotaInfo: QuotaInfo }> {
  console.log("[FLIGHT_API] Calling Aerodatabox API...");

  const response = await axios.get(
    `https://aerodatabox.p.rapidapi.com/flights/number/${flightCode}/${formattedDate}`,
    {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    }
  );

  console.log("[FLIGHT_API] ✅ API response received:", {
    status: response.status,
    statusText: response.statusText,
    hasData: !!response.data,
    dataKeys: response.data ? Object.keys(response.data) : [],
  });

  // Extract quota information
  const quotaInfo = extractQuotaInfo(response.headers);

  // Log the full API response data
  console.log(
    "[FLIGHT_API] 📦 Full API response data:",
    JSON.stringify(response.data, null, 2)
  );

  // Log response structure details
  logResponseStructure(response.data);

  return { data: response.data, quotaInfo };
}

/**
 * Setup IPC handler for fetching flights
 */
export function setupFetchFlightsHandler(): void {
  ipcMain.handle(
    "fetch-flights",
    async (
      _event,
      flightCode: string,
      date: string,
      bypassCache: boolean = false
    ) => {
      try {
        console.log("[FLIGHT_API] fetch-flights called with:", {
          flightCode,
          date,
          bypassCache,
        });

        // Format date for API (YYYY-MM-DD)
        const formattedDate = date.split("T")[0];
        const cacheKey = getCacheKey(flightCode, date);

        // Check cache first (unless bypassing)
        if (!bypassCache) {
          const cachedData = getCachedData(store, cacheKey);
          if (cachedData) {
            return cachedData;
          }
        } else {
          console.log(
            "[FLIGHT_API] ⚠️ Cache bypass requested - fetching fresh data from API"
          );
        }

        console.log("[FLIGHT_API] Fetching fresh data from API...");

        // Get API key
        const apiKey = getApiKey();
        if (!apiKey) {
          console.error("[FLIGHT_API] API key not set");
          return {
            error: "API key not set. Please configure it in Settings.",
          };
        }

        // Fetch from API
        const { data, quotaInfo } = await fetchFlightsFromAPI(
          flightCode,
          formattedDate,
          apiKey
        );

        // Cache the response
        setCachedData(store, cacheKey, data);

        // Return response data with quota information attached
        const responseWithQuota = wrapResponseWithQuota(data, quotaInfo);

        console.log("[FLIGHT_API] 📤 Returning response with quota info:", {
          isArray: Array.isArray(data),
          hasQuotaInfo: !!responseWithQuota._quotaInfo,
          quotaInfo: responseWithQuota._quotaInfo,
        });

        return responseWithQuota;
      } catch (error: any) {
        console.error("[FLIGHT_API] Error fetching flights:", error);
        if (error.response) {
          console.error("[FLIGHT_API] API Error details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          });
          return {
            error: `API Error: ${error.response.status} - ${error.response.data?.message || "Unknown error"}`,
          };
        } else if (error.request) {
          console.error("[FLIGHT_API] Network error - no response received");
          return {
            error: "Network error: Could not reach the API server.",
          };
        } else {
          console.error("[FLIGHT_API] Request setup error:", error.message);
          return { error: `Error: ${error.message}` };
        }
      }
    }
  );
}

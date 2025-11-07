import { Flight, FlightSearchResponse } from "../types";

/**
 * Extract quota information from API response
 */
export function extractQuotaInfo(response: FlightSearchResponse): {
  quotaInfo: any;
  responseData: any;
} {
  let responseData = response;

  if (response && typeof response === "object" && "_quotaInfo" in response) {
    const quota = (response as any)._quotaInfo;

    // Ensure values are properly formatted
    const formattedQuota = {
      remaining:
        quota.remaining !== undefined &&
        quota.remaining !== null &&
        quota.remaining !== "Unknown"
          ? quota.remaining
          : "Unknown",
      limit:
        quota.limit !== undefined &&
        quota.limit !== null &&
        quota.limit !== "Unknown"
          ? quota.limit
          : "Unknown",
      reset:
        quota.reset !== undefined &&
        quota.reset !== null &&
        quota.reset !== "Unknown"
          ? quota.reset
          : "Unknown",
    };

    // Extract actual data (handle both array wrapper and object spread)
    if ("_data" in response) {
      // Array was wrapped
      responseData = (response as any)._data;
    } else {
      // Object was spread, remove _quotaInfo
      const { _quotaInfo, ...rest } = response as any;
      responseData = rest;
    }

    return { quotaInfo: formattedQuota, responseData };
  }

  return { quotaInfo: null, responseData };
}

/**
 * Parse flight data from API response
 */
export function parseFlightData(responseData: any): Flight[] {
  if ((responseData as any).error) {
    return [];
  }

  // Handle different response structures
  if ((responseData as any).outbound) {
    return (responseData as any).outbound;
  } else if (Array.isArray(responseData)) {
    return responseData;
  } else if ((responseData as any).flights) {
    return (responseData as any).flights;
  } else {
    return [responseData];
  }
}

/**
 * Format flight time for display
 */
export function formatFlightTime(timeStr: string | undefined): string {
  if (!timeStr) return "Time not available";
  try {
    return new Date(timeStr).toLocaleString();
  } catch {
    return "Time not available";
  }
}

/**
 * Get airport code or name
 */
export function getAirportCode(airport: any): string {
  return airport?.iata || airport?.name || "Unknown";
}

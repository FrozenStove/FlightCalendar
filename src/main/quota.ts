/**
 * Utilities for extracting and parsing API quota information from response headers
 */

export interface QuotaInfo {
  remaining: string | number;
  limit: string | number;
  reset: string | number;
}

/**
 * Extract header value, trying multiple variations and converting to number if applicable
 */
function getHeaderValue(
  headers: any,
  headerName: string
): string | number | undefined {
  const value = headers[headerName.toLowerCase()] || headers[headerName];
  if (value !== undefined && value !== null) {
    // Try to convert to number if it's a numeric string
    const numValue = typeof value === "string" ? parseInt(value, 10) : value;
    if (
      !isNaN(numValue as number) &&
      typeof value === "string" &&
      /^\d+$/.test(value.trim())
    ) {
      return numValue;
    }
    return value;
  }
  return undefined;
}

/**
 * Extract quota information from API response headers
 */
export function extractQuotaInfo(headers: any): QuotaInfo {
  // Log headers for debugging
  console.log("[QUOTA] 📋 Response headers keys:", Object.keys(headers));
  console.log("[QUOTA] 📋 Sample headers:", {
    "x-ratelimit-requests-remaining": headers["x-ratelimit-requests-remaining"],
    "x-rapidapi-quota-remaining": headers["x-rapidapi-quota-remaining"],
    "x-ratelimit-remaining": headers["x-ratelimit-remaining"],
  });

  const quotaInfo: QuotaInfo = {
    remaining:
      getHeaderValue(headers, "x-ratelimit-requests-remaining") ||
      getHeaderValue(headers, "x-rapidapi-quota-remaining") ||
      getHeaderValue(headers, "x-ratelimit-remaining") ||
      getHeaderValue(headers, "x-rapidapi-requests-remaining") ||
      "Unknown",
    limit:
      getHeaderValue(headers, "x-ratelimit-requests-limit") ||
      getHeaderValue(headers, "x-rapidapi-quota-limit") ||
      getHeaderValue(headers, "x-ratelimit-limit") ||
      getHeaderValue(headers, "x-rapidapi-requests-limit") ||
      "Unknown",
    reset:
      getHeaderValue(headers, "x-ratelimit-requests-reset") ||
      getHeaderValue(headers, "x-rapidapi-quota-reset") ||
      getHeaderValue(headers, "x-ratelimit-reset") ||
      getHeaderValue(headers, "x-rapidapi-requests-reset") ||
      "Unknown",
  };

  // Log quota information
  console.log("[QUOTA] 📊 API Quota Information:");
  console.log("[QUOTA]   Remaining requests:", quotaInfo.remaining);
  console.log("[QUOTA]   Request limit:", quotaInfo.limit);

  if (quotaInfo.reset !== "Unknown") {
    parseAndLogResetTime(quotaInfo.reset);
  }

  // Note: The flights/number endpoint typically consumes 1-2 API units (Tier 1-2)
  console.log(
    "[QUOTA]   Estimated tokens consumed: 1-2 units (Tier 1-2 endpoint)"
  );

  return quotaInfo;
}

/**
 * Parse and log the reset timestamp
 */
function parseAndLogResetTime(resetValue: string | number): void {
  let resetDate: Date | null = null;

  if (typeof resetValue === "string") {
    const resetNum = parseInt(resetValue);
    if (!isNaN(resetNum)) {
      if (resetNum > 946684800) {
        // Year 2000 in seconds
        resetDate = new Date(resetNum * 1000);
      } else if (resetNum > 946684800000) {
        // Year 2000 in milliseconds
        resetDate = new Date(resetNum);
      } else {
        console.log(
          "[QUOTA]   Quota reset timestamp appears invalid:",
          resetValue
        );
      }
    }
  } else if (typeof resetValue === "number") {
    if (resetValue > 946684800) {
      resetDate = new Date(resetValue * 1000);
    } else if (resetValue > 946684800000) {
      resetDate = new Date(resetValue);
    } else {
      console.log(
        "[QUOTA]   Quota reset timestamp appears invalid:",
        resetValue
      );
    }
  }

  if (resetDate && !isNaN(resetDate.getTime())) {
    console.log("[QUOTA]   Quota resets at:", resetDate.toISOString());
  } else if (resetValue !== "Unknown") {
    console.log(
      "[QUOTA]   Quota reset time: Unable to parse (value:",
      resetValue,
      ")"
    );
  }
}

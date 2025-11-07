import { useState } from "react";
import { Flight, QuotaInfo } from "../types";
import { extractQuotaInfo, parseFlightData } from "../utils/flightUtils";

/**
 * Custom hook for flight search functionality
 */
export function useFlightSearch() {
  const [results, setResults] = useState<Flight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);

  const searchFlights = async (
    flightCode: string,
    flightDate: string,
    bypassCache: boolean = false
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    setResults([]);
    setQuotaInfo(null);

    try {
      console.log("[HOOK] 🔍 Starting flight search...", {
        flightCode,
        flightDate,
        bypassCache,
      });

      const response = await window.electronAPI.fetchFlights(
        flightCode,
        flightDate,
        bypassCache
      );

      console.log("[HOOK] 📥 Received response from API:", {
        hasError: !!response.error,
        responseType: typeof response,
        isArray: Array.isArray(response),
        responseKeys:
          response && typeof response === "object"
            ? Object.keys(response)
            : "N/A",
      });

      // Extract quota information
      const { quotaInfo: extractedQuota, responseData } =
        extractQuotaInfo(response);

      if (extractedQuota) {
        setQuotaInfo(extractedQuota);
      }

      // Log the full response data
      console.log(
        "[HOOK] 📦 Full response data:",
        JSON.stringify(responseData, null, 2)
      );

      if ((responseData as any).error) {
        console.error(
          "[HOOK] ❌ API returned error:",
          (responseData as any).error
        );
        setError((responseData as any).error);
        setResults([]);
      } else {
        const flights = parseFlightData(responseData);
        console.log("[HOOK] ✅ Processed", flights.length, "flight(s)");
        setResults(flights);
      }
    } catch (err: any) {
      console.error("[HOOK] ❌ Error during flight search:", err);
      setError(err.message || "An unexpected error occurred");
      setResults([]);
    } finally {
      setLoading(false);
      console.log("[HOOK] 🔚 Search completed");
    }
  };

  return {
    results,
    loading,
    error,
    quotaInfo,
    searchFlights,
    setError,
    setQuotaInfo,
  };
}

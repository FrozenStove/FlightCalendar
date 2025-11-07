import Store from "electron-store";

/**
 * Cache utilities for flight data
 */

export interface CacheData {
  data: any;
  expiresAt: number;
  cachedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate cache key for a flight query
 */
export function getCacheKey(flightCode: string, date: string): string {
  const formattedDate = date.split("T")[0];
  return `flight_${flightCode}_${formattedDate}`;
}

/**
 * Get cached data if available and not expired
 */
export function getCachedData(store: Store, cacheKey: string): any | null {
  const cached = store.get(cacheKey) as CacheData | undefined;

  if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
    console.log("[CACHE] ✅ Cache HIT for:", cacheKey);
    console.log(
      "[CACHE] Cached data retrieved:",
      JSON.stringify(cached.data, null, 2)
    );
    console.log(
      "[CACHE] Cache age:",
      Math.round((Date.now() - cached.cachedAt) / 1000 / 60),
      "minutes"
    );
    console.log(
      "[CACHE] Cache expires in:",
      Math.round((cached.expiresAt - Date.now()) / 1000 / 60),
      "minutes"
    );
    return cached.data;
  }

  if (cached) {
    console.log("[CACHE] ⚠️ Cache expired for:", cacheKey);
    console.log(
      "[CACHE] Expired at:",
      new Date(cached.expiresAt).toISOString()
    );
  } else {
    console.log("[CACHE] ❌ Cache MISS - no cached data found for:", cacheKey);
  }

  return null;
}

/**
 * Cache response data with TTL
 */
export function setCachedData(store: Store, cacheKey: string, data: any): void {
  const cacheData: CacheData = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
    cachedAt: Date.now(),
  };

  store.set(cacheKey, cacheData);
  console.log("[CACHE] 💾 Response cached successfully");
  console.log("[CACHE] Cache key:", cacheKey);
  console.log(
    "[CACHE] Cache expires at:",
    new Date(cacheData.expiresAt).toISOString()
  );
  console.log("[CACHE] Cache will be valid for 24 hours");
}

/**
 * Lightweight LRU cache stored in browser localStorage for address autocomplete results.
 * Cache entries are objects of shape:
 *   { query: string; results: GeocodingResult[]; timestamp: number }
 * The cache is capped at MAX_ITEMS (default 50). On each hit we update the timestamp (touch)
 * to keep it MRU. On insertion we prune oldest entries if exceeding capacity.
 */

import type { GeocodingResult } from '@/lib/mapbox';

const CACHE_KEY = 'autocompleteCache';
const MAX_ITEMS = 50;

interface CacheEntry {
  query: string;
  results: GeocodingResult[];
  timestamp: number; // epoch ms of last access
}

/** Load the cache array from localStorage. Returns empty array if none or malformed. */
function loadCache(): CacheEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CacheEntry[];
    // Guard against corrupted data structures
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** Persist the given cache array to localStorage. */
function saveCache(cache: CacheEntry[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently ignore storage errors (e.g., quota exceeded)
  }
}

/** Retrieve a cache entry for the exact query string, if present. */
export function getCacheEntry(query: string): CacheEntry | undefined {
  const cache = loadCache();
  const entry = cache.find((e) => e.query === query);
  if (entry) {
    // Touch the entry to update its recency
    entry.timestamp = Date.now();
    // Save to reorder timestamps (prune later if needed)
    saveCache(cache);
  }
  return entry;
}

/** Insert or update a cache entry for the given query and results. */
export function setCacheEntry(query: string, results: GeocodingResult[]): void {
  const cache = loadCache();
  const now = Date.now();
  const existingIndex = cache.findIndex((e) => e.query === query);
  if (existingIndex >= 0) {
    cache[existingIndex] = { query, results, timestamp: now };
  } else {
    cache.push({ query, results, timestamp: now });
  }
  // Prune oldest if over capacity
  if (cache.length > MAX_ITEMS) {
    // Sort by timestamp ascending (oldest first) and drop extras
    cache.sort((a, b) => a.timestamp - b.timestamp);
    cache.splice(0, cache.length - MAX_ITEMS);
  }
  // Finally, persist the possibly reordered cache
  saveCache(cache);
}

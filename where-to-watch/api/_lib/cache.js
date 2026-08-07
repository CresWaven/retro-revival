/**
 * Tiny in-memory TTL cache.
 *
 * Streaming availability changes on the order of days, not seconds, so caching
 * aggressively keeps the app fast and keeps us well inside TMDB's rate limits.
 * On serverless this warms per instance, which is plenty for this use case.
 */

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 500;

const store = new Map();

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return undefined;

  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }

  // Refresh insertion order so this key is treated as recently used.
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (store.size >= MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the least recently used.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** Memoize an async producer under `key`. */
export async function withCache(key, ttlMs, producer) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const value = await producer();
  return cacheSet(key, value, ttlMs);
}

export function cacheStats() {
  return { entries: store.size, maxEntries: MAX_ENTRIES };
}

export function cacheClear() {
  store.clear();
}

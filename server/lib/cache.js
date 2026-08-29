/**
 * cache.js
 * Purpose: In-memory TTL cache for persona ranking. Expire on read, not a timer.
 */

const HOUR_MS = 60 * 60 * 1000;

export function createCache(ttlMs = HOUR_MS, now = Date.now) {
  const map = new Map();

  function prune(key) {
    const entry = map.get(key);
    if (!entry) return undefined;
    if (now() > entry.expiresAt) {
      map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  return {
    get(key) {
      return prune(key);
    },
    set(key, value) {
      map.set(key, { value, expiresAt: now() + ttlMs });
    },
    clear() {
      map.clear();
    },
    size() {
      for (const key of [...map.keys()]) prune(key);
      return map.size;
    },
  };
}

/**
 * Stable cache key: same persona + query + id set (order of ids does not matter).
 */
export function buildKey(personaId, queryState = {}) {
  const recallIds = [...(queryState.recallIds ?? [])].map(String).sort();
  return JSON.stringify({
    personaId: personaId ?? '',
    q: queryState.q ?? '',
    classification: queryState.classification ?? '',
    status: queryState.status ?? '',
    dateFrom: queryState.dateFrom ?? '',
    dateTo: queryState.dateTo ?? '',
    page: queryState.page ?? '',
    location: queryState.location ?? '',
    recallIds,
  });
}

export const personaRankCache = createCache();

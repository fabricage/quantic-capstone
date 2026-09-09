/**
 * trending.js
 * Purpose: GET /api/trending-searches — company chips from FDA counts + CPSC samples.
 *
 * Soft-fail each upstream so a 403/timeout never 500s the chips. Cache ~5 min
 * with a versioned key so a bad payload shape can be busted (v6).
 * Cache-Control: no-store — browsers should not keep a stale chip list.
 */
import { Router } from 'express';
import { createCache } from '../lib/cache.js';
import { fetchCpscRecalls } from '../lib/cpsc.js';
import { fetchCpscWebsiteRecalls } from '../lib/cpscWebsite.js';
import { fetchFdaWebsiteRecalls } from '../lib/fdaWebsite.js';
import { fetchRecallingFirmCounts } from '../lib/openfda.js';
import {
  FIRM_COUNT_LOOKBACK_DAYS,
  SUGGESTED_PER_SOURCE,
  buildSuggestedSearchGroups,
  countFirmsFromRecalls,
  daysAgoDate,
  emptySuggestedSearchPayload,
} from '../lib/suggestedSearches.js';

export const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000;
export const TRENDING_CACHE_KEY = 'trending-searches:v6';

export const trendingCache = createCache(TRENDING_CACHE_TTL_MS);

async function settle(loader) {
  try {
    return await loader();
  } catch {
    return null;
  }
}

function firmsFromWebsiteRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => row?.firm).filter(Boolean);
}

export async function loadSuggestedSearches(fetchImpl = fetch) {
  const dateFrom = daysAgoDate(FIRM_COUNT_LOOKBACK_DAYS);
  const dateTo = daysAgoDate(0);
  const countLimit = Math.max(40, SUGGESTED_PER_SOURCE * 5);

  const [foodCounts, consumerRaw, fdaWebsite, cpscWebsite] = await Promise.all([
    settle(() => fetchRecallingFirmCounts({ dateFrom, dateTo, limit: countLimit }, fetchImpl)),
    settle(() => fetchCpscRecalls({ dateFrom, dateTo }, fetchImpl)),
    settle(() => fetchFdaWebsiteRecalls({}, fetchImpl)),
    settle(() => fetchCpscWebsiteRecalls({}, fetchImpl)),
  ]);

  return buildSuggestedSearchGroups({
    foodCounts: foodCounts || [],
    consumerCounts: countFirmsFromRecalls(consumerRaw || []),
    recentFoodFirms: firmsFromWebsiteRows(fdaWebsite),
    recentConsumerFirms: firmsFromWebsiteRows(cpscWebsite),
  });
}

export function createTrendingRouter({ fetchImpl = fetch, cache = trendingCache } = {}) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const cached = cache.get(TRENDING_CACHE_KEY);
    if (cached) {
      return res.json(cached);
    }

    try {
      const payload = await loadSuggestedSearches(fetchImpl);
      cache.set(TRENDING_CACHE_KEY, payload);
      return res.json(payload);
    } catch {
      return res.json(emptySuggestedSearchPayload());
    }
  });

  return router;
}

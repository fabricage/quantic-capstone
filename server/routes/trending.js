/**
 * trending.js
 * Purpose: GET /api/trending-searches — company chips from FDA counts + CPSC samples.
 *
 * Soft-fail each upstream so a 403/timeout never 500s the chips. Cache ~5 min
 * per lookback window (v7) so 1-month and 1-year lists stay independent.
 * Cache-Control: no-store — browsers should not keep a stale chip list.
 */
import { Router } from 'express';
import { createCache } from '../lib/cache.js';
import { fetchCpscRecalls } from '../lib/cpsc.js';
import { fetchCpscWebsiteRecalls } from '../lib/cpscWebsite.js';
import { fetchFdaWebsiteRecalls } from '../lib/fdaWebsite.js';
import { fetchRecallingFirmCounts } from '../lib/openfda.js';
import {
  DEFAULT_LOOKBACK_WINDOW,
  SUGGESTED_PER_SOURCE,
  buildSuggestedSearchGroups,
  countFirmsFromRecalls,
  daysAgoDate,
  emptySuggestedSearchPayload,
  publicLookbackWindows,
  resolveLookbackWindow,
} from '../lib/suggestedSearches.js';

export const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000;

export function trendingCacheKey(windowId = DEFAULT_LOOKBACK_WINDOW) {
  const { id } = resolveLookbackWindow(windowId);
  return `trending-searches:v7:${id}`;
}

export const TRENDING_CACHE_KEY = trendingCacheKey(DEFAULT_LOOKBACK_WINDOW);

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

function withWindowMeta(payload, windowId) {
  const window = resolveLookbackWindow(windowId);
  return {
    ...payload,
    window: window.id,
    windows: publicLookbackWindows(),
  };
}

export async function loadSuggestedSearches(
  fetchImpl = fetch,
  windowId = DEFAULT_LOOKBACK_WINDOW,
) {
  const window = resolveLookbackWindow(windowId);
  const dateFrom = daysAgoDate(window.days);
  const dateTo = daysAgoDate(0);
  const countLimit = Math.max(40, SUGGESTED_PER_SOURCE * 5);

  const [foodCounts, consumerRaw, fdaWebsite, cpscWebsite] = await Promise.all([
    settle(() => fetchRecallingFirmCounts({ dateFrom, dateTo, limit: countLimit }, fetchImpl)),
    settle(() => fetchCpscRecalls({ dateFrom, dateTo }, fetchImpl)),
    settle(() => fetchFdaWebsiteRecalls({}, fetchImpl)),
    settle(() => fetchCpscWebsiteRecalls({}, fetchImpl)),
  ]);

  return withWindowMeta(
    buildSuggestedSearchGroups({
      foodCounts: foodCounts || [],
      consumerCounts: countFirmsFromRecalls(consumerRaw || []),
      recentFoodFirms: firmsFromWebsiteRows(fdaWebsite),
      recentConsumerFirms: firmsFromWebsiteRows(cpscWebsite),
    }),
    window.id,
  );
}

export function createTrendingRouter({ fetchImpl = fetch, cache = trendingCache } = {}) {
  const router = Router();

  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const window = resolveLookbackWindow(req.query.window);
    const cacheKey = trendingCacheKey(window.id);
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    try {
      const payload = await loadSuggestedSearches(fetchImpl, window.id);
      cache.set(cacheKey, payload);
      return res.json(payload);
    } catch {
      return res.json(emptySuggestedSearchPayload(window.id));
    }
  });

  return router;
}

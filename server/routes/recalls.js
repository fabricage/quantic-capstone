/**
 * recalls.js
 * Purpose: GET /api/recalls — FDA food, CPSC consumer, or `all`, which
 * alternates one FDA row with one CPSC row (each side newest first).
 * Cache-Control: no-store — CPSC often drops new notices on Thursday.
 */
import { Router } from 'express';
import { fetchCpscRecalls, paginateCpscRecalls } from '../lib/cpsc.js';
import { fetchCpscWebsiteRecalls } from '../lib/cpscWebsite.js';
import { fetchFdaWebsiteRecalls } from '../lib/fdaWebsite.js';
import { originMatchesFilter, parseLocationFilter } from '../lib/location.js';
import {
  interleaveBySource,
  mergeRecallLists,
  normalizeConsumerRecalls,
  normalizeRecalls,
  sortRecallsByDateDesc,
} from '../lib/normalize.js';
import { fetchRecalls } from '../lib/openfda.js';

function parseLimit(value) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return 20;
  return Math.min(100, Math.max(1, n));
}

function parseSkip(value) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function resolveSource(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'consumer' || value === 'all') return value;
  return 'food';
}

function noStore(res) {
  res.set('Cache-Control', 'no-store');
  return res;
}

function failUpstream(res) {
  return noStore(res).status(502).json({
    error: 'Failed to fetch recalls from an upstream source',
  });
}

async function loadFood(query, fetchImpl) {
  try {
    const data = await fetchRecalls(query, fetchImpl);
    return {
      ok: true,
      results: normalizeRecalls(data.results),
      total: data.total,
      lastUpdated: data.lastUpdated,
    };
  } catch (err) {
    if (err?.statusCode === 404) {
      return { ok: true, results: [], total: 0, lastUpdated: '', empty404: true };
    }
    return { ok: false, error: err };
  }
}

async function loadConsumer(query, fetchImpl) {
  try {
    const raw = await fetchCpscRecalls(query, fetchImpl);
    const results = sortRecallsByDateDesc(normalizeConsumerRecalls(raw));
    return { ok: true, results, total: results.length };
  } catch (err) {
    return { ok: false, error: err };
  }
}

async function loadFdaWebsite(query, fetchImpl) {
  try {
    return await fetchFdaWebsiteRecalls(query, fetchImpl);
  } catch {
    return [];
  }
}

async function loadCpscWebsite(query, fetchImpl) {
  try {
    return await fetchCpscWebsiteRecalls(query, fetchImpl);
  } catch {
    return [];
  }
}

function shouldMergeFoodWebsite({ classification, status, location }) {
  // HTML listings do not carry FDA class/status/country reliably.
  return !classification && !status && !location;
}

function shouldMergeConsumerWebsite(location) {
  // CPSC listing HTML rarely has manufacturer country.
  return !location;
}

/**
 * Filter normalized rows in memory.
 * Why: CPSC ManufacturerCountry query param is unreliable — we classify
 * ManufacturerCountries after fetch, then drop unknown origin when a
 * filter is set.
 */
function filterByOrigin(rows, location) {
  if (!location) return rows;
  return rows.filter((row) => originMatchesFilter(row.origin, location));
}

export function createRecallsRouter({ fetchImpl = fetch } = {}) {
  const router = Router();

  router.get('/', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const classification =
      typeof req.query.classification === 'string' ? req.query.classification : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';
    const limit = parseLimit(req.query.limit);
    const skip = parseSkip(req.query.skip);
    const source = resolveSource(req.query.source);
    const location = parseLocationFilter(req.query.location);

    if (source === 'food') {
      const food = await loadFood(
        { q, classification, status, dateFrom, dateTo, limit, skip, location },
        fetchImpl,
      );
      if (!food.ok) return failUpstream(res);
      let results = food.results;
      let total = food.total;
      if (shouldMergeFoodWebsite({ classification, status, location })) {
        const website = await loadFdaWebsite({ q, dateFrom, dateTo }, fetchImpl);
        results = mergeRecallLists(website, results);
        if (food.empty404) total = results.length;
        else if (website.length) total = Math.max(total, results.length);
      }
      const foodBody = {
        total,
        results,
        source: 'food',
      };
      if (food.lastUpdated) foodBody.lastUpdated = food.lastUpdated;
      return noStore(res).json(foodBody);
    }

    if (source === 'consumer') {
      const consumer = await loadConsumer({ q, dateFrom, dateTo }, fetchImpl);
      if (!consumer.ok) return failUpstream(res);
      const website = shouldMergeConsumerWebsite(location)
        ? await loadCpscWebsite({ q, dateFrom, dateTo }, fetchImpl)
        : [];
      const merged = filterByOrigin(mergeRecallLists(website, consumer.results), location);
      const page = paginateCpscRecalls(merged, skip, limit);
      return noStore(res).json({
        total: page.total,
        results: page.results,
        source: 'consumer',
      });
    }

    const foodOverFetch = Math.min(100, skip + limit + 40);
    const [foodSettled, consumerSettled] = await Promise.allSettled([
      loadFood(
        { q, classification, status, dateFrom, dateTo, limit: foodOverFetch, skip: 0, location },
        fetchImpl,
      ),
      loadConsumer({ q, dateFrom, dateTo }, fetchImpl),
    ]);

    const food = foodSettled.status === 'fulfilled' ? foodSettled.value : { ok: false };
    const consumer = consumerSettled.status === 'fulfilled' ? consumerSettled.value : { ok: false };

    if (!food.ok && !consumer.ok) return failUpstream(res);

    let foodResults = food.ok ? food.results : [];
    let consumerResults = consumer.ok ? consumer.results : [];
    if (food.ok && shouldMergeFoodWebsite({ classification, status, location })) {
      foodResults = mergeRecallLists(
        await loadFdaWebsite({ q, dateFrom, dateTo }, fetchImpl),
        foodResults,
      );
    }
    if (consumer.ok) {
      const website = shouldMergeConsumerWebsite(location)
        ? await loadCpscWebsite({ q, dateFrom, dateTo }, fetchImpl)
        : [];
      consumerResults = filterByOrigin(
        mergeRecallLists(website, consumerResults),
        location,
      );
    }

    const merged = interleaveBySource(foodResults, consumerResults);
    const page = paginateCpscRecalls(merged, skip, limit);
    return noStore(res).json({
      total: page.total,
      results: page.results,
      source: 'all',
      lastUpdated: food.ok ? food.lastUpdated : '',
    });
  });

  return router;
}

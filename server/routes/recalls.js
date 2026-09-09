/**
 * recalls.js
 * Purpose: GET /api/recalls — FDA food, CPSC consumer, or merged `all`.
 * Cache-Control: no-store — CPSC often drops new notices on Thursday.
 */
import { Router } from 'express';
import { fetchCpscRecalls, paginateCpscRecalls } from '../lib/cpsc.js';
import {
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

    if (source === 'food') {
      const food = await loadFood(
        { q, classification, status, dateFrom, dateTo, limit, skip },
        fetchImpl,
      );
      if (!food.ok) return failUpstream(res);
      const foodBody = {
        total: food.total,
        results: food.results,
        source: 'food',
      };
      if (food.lastUpdated) foodBody.lastUpdated = food.lastUpdated;
      return noStore(res).json(foodBody);
    }

    if (source === 'consumer') {
      const consumer = await loadConsumer({ q, dateFrom, dateTo }, fetchImpl);
      if (!consumer.ok) return failUpstream(res);
      const page = paginateCpscRecalls(consumer.results, skip, limit);
      return noStore(res).json({
        total: page.total,
        results: page.results,
        source: 'consumer',
      });
    }

    const foodOverFetch = Math.min(100, skip + limit + 40);
    const [foodSettled, consumerSettled] = await Promise.allSettled([
      loadFood(
        { q, classification, status, dateFrom, dateTo, limit: foodOverFetch, skip: 0 },
        fetchImpl,
      ),
      loadConsumer({ q, dateFrom, dateTo }, fetchImpl),
    ]);

    const food = foodSettled.status === 'fulfilled' ? foodSettled.value : { ok: false };
    const consumer = consumerSettled.status === 'fulfilled' ? consumerSettled.value : { ok: false };

    if (!food.ok && !consumer.ok) return failUpstream(res);

    const merged = sortRecallsByDateDesc([
      ...(food.ok ? food.results : []),
      ...(consumer.ok ? consumer.results : []),
    ]);
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

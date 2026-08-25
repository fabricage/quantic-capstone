/**
 * recalls.js
 * Purpose: GET /api/recalls — keyword search against openFDA via the BFF.
 */
import { Router } from 'express';
import { fetchRecalls } from '../lib/openfda.js';
import { normalizeRecalls } from '../lib/normalize.js';

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

function noStore(res) {
  res.set('Cache-Control', 'no-store');
  return res;
}

export function createRecallsRouter({ fetchImpl = fetch } = {}) {
  const router = Router();

  router.get('/', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = parseLimit(req.query.limit);
    const skip = parseSkip(req.query.skip);

    try {
      const data = await fetchRecalls({ q, limit, skip }, fetchImpl);
      return noStore(res).json({
        total: data.total,
        results: normalizeRecalls(data.results),
        source: 'food',
        lastUpdated: data.lastUpdated,
      });
    } catch (err) {
      // openFDA uses HTTP 404 to mean "zero matches", not a server failure.
      if (err?.statusCode === 404) {
        return noStore(res).json({
          total: 0,
          results: [],
          source: 'food',
        });
      }
      return noStore(res).status(502).json({
        error: 'Failed to fetch recalls from an upstream source',
      });
    }
  });

  return router;
}

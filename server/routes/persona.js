/**
 * persona.js
 * Purpose: GET /api/personas and POST /api/persona-rank (Anthropic, cached, soft fallback).
 */
import { Router } from 'express';
import { rankRecallsForPersona } from '../lib/ai.js';
import { buildKey, personaRankCache } from '../lib/cache.js';
import { getPersonaById, listPersonas } from '../lib/personas.js';

function queryStateFrom(body, recallIds) {
  const query = body?.query && typeof body.query === 'object' ? body.query : {};
  return {
    q: query.q ?? '',
    classification: query.classification ?? '',
    status: query.status ?? '',
    dateFrom: query.dateFrom ?? '',
    dateTo: query.dateTo ?? '',
    page: query.page ?? '',
    location: query.location ?? '',
    recallIds,
  };
}

export function createPersonasRouter() {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({ personas: listPersonas() });
  });
  return router;
}

export function createPersonaRankRouter({
  fetchImpl = fetch,
  cache = personaRankCache,
} = {}) {
  const router = Router();

  router.post('/', async (req, res) => {
    const personaId = typeof req.body?.personaId === 'string' ? req.body.personaId.trim() : '';
    const recalls = req.body?.recalls;

    if (!personaId) {
      return res.status(400).json({ fallback: true, error: 'personaId is required' });
    }
    if (!Array.isArray(recalls) || recalls.length === 0) {
      return res.status(400).json({ fallback: true, error: 'recalls must be a non-empty array' });
    }
    if (recalls.some((recall) => !recall || !recall.id)) {
      return res.status(400).json({ fallback: true, error: 'every recall needs an id' });
    }

    const persona = getPersonaById(personaId);
    if (!persona) {
      return res.status(400).json({ fallback: true, error: 'unknown persona' });
    }

    const recallIds = recalls.map((recall) => recall.id);
    const key = buildKey(personaId, queryStateFrom(req.body, recallIds));
    const cached = cache.get(key);
    if (cached) {
      return res.json({ fallback: false, ranked: cached, cached: true });
    }

    const ranked = await rankRecallsForPersona({
      persona,
      recalls,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.AI_MODEL,
      fetchImpl,
    });

    if (!ranked) {
      return res.status(200).json({ fallback: true });
    }

    cache.set(key, ranked);
    return res.json({ fallback: false, ranked, cached: false });
  });

  return router;
}

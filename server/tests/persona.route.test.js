/**
 * persona.route.test.js
 * Purpose: GET persona presets; POST rank, cache, and fallbacks.
 */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../index.js';
import { personaRankCache } from '../lib/cache.js';

const originalKey = process.env.ANTHROPIC_API_KEY;

function anthropicOk(ranked) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ ranked }) }],
    }),
  };
}

const recalls = [
  { id: 'F-1', product: 'Infant formula', firm: 'Acme', reason: 'Possible contamination' },
  { id: 'F-2', product: 'Coffee beans', firm: 'Bean Co', reason: 'Undeclared allergen' },
];

const ranked = [
  { id: 'F-1', relevance: 5, why: 'Formula is high priority for young kids.' },
  { id: 'F-2', relevance: 2, why: 'Coffee is a weaker match.' },
];

afterEach(() => {
  personaRankCache.clear();
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

describe('GET /api/personas', () => {
  it('returns public presets without attributes', async () => {
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app).get('/api/personas');
    expect(res.status).toBe(200);
    const ids = res.body.personas.map((p) => p.id);
    expect(ids).toEqual([
      'parent-young-kids',
      'renter-twenties',
      'retiree-meds',
      'allergy-household',
    ]);
    for (const persona of res.body.personas) {
      expect(persona.label).toBeTruthy();
      expect(persona.description).toBeTruthy();
      expect(persona.attributes).toBeUndefined();
    }
  });
});

describe('POST /api/persona-rank', () => {
  it('ranks and caches an identical second request', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const fetchImpl = vi.fn().mockResolvedValue(anthropicOk(ranked));
    const app = createApp({ fetchImpl });
    const body = {
      personaId: 'parent-young-kids',
      recalls,
      query: { q: 'formula', page: 1 },
    };

    const first = await request(app).post('/api/persona-rank').send(body);
    expect(first.status).toBe(200);
    expect(first.body.fallback).toBe(false);
    expect(first.body.cached).toBe(false);
    expect(first.body.ranked[0].id).toBe('F-1');

    const second = await request(app).post('/api/persona-rank').send(body);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.ranked).toEqual(first.body.ranked);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns 200 { fallback: true } when AI fails (not 500)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'nope' }),
    });
    const app = createApp({ fetchImpl });
    const res = await request(app).post('/api/persona-rank').send({
      personaId: 'parent-young-kids',
      recalls,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fallback: true });
  });

  it('returns 200 { fallback: true } without an API key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchImpl = vi.fn();
    const app = createApp({ fetchImpl });
    const res = await request(app).post('/api/persona-rank').send({
      personaId: 'parent-young-kids',
      recalls,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fallback: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 400 { fallback: true } for an unknown persona', async () => {
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app).post('/api/persona-rank').send({
      personaId: 'not-a-preset',
      recalls,
    });
    expect(res.status).toBe(400);
    expect(res.body.fallback).toBe(true);
    expect(res.body.error).toMatch(/unknown persona/i);
  });
});

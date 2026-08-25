/**
 * recalls.route.test.js
 * Purpose: HTTP tests for /health and GET /api/recalls with an injected fetch stub.
 */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../index.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function sampleOpenFda(overrides = {}) {
  return {
    meta: {
      last_updated: '2024-01-02',
      results: { total: 1 },
    },
    results: [
      {
        recall_number: 'F-123-2024',
        recalling_firm: 'Acme Foods',
        product_description: 'Infant formula',
        reason_for_recall: 'Possible contamination',
        classification: 'Class I',
        status: 'Ongoing',
        state: 'CA',
        report_date: '20240110',
        recall_initiation_date: '20240101',
      },
    ],
    ...overrides,
  };
}

describe('GET /health', () => {
  it('returns { ok: true }', async () => {
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/recalls', () => {
  it('returns normalized results on the happy path', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, sampleOpenFda()));
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ q: 'formula', limit: 5 });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.source).toBe('food');
    expect(res.body.total).toBe(1);
    expect(res.body.lastUpdated).toBe('2024-01-02');
    expect(res.body.results[0]).toMatchObject({
      id: 'F-123-2024',
      firm: 'Acme Foods',
      product: 'Infant formula',
      source: 'food',
    });

    const calledUrl = String(fetchImpl.mock.calls[0][0]);
    expect(calledUrl).toContain('api.fda.gov/food/enforcement.json');
    expect(calledUrl).toContain('sort=report_date');
    expect(calledUrl).toContain('limit=5');
  });

  it('maps openFDA 404 to an empty result list (not 502)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'No matches found' } }),
    );
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ q: 'zzzxnotarealkeyword' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      results: [],
      source: 'food',
    });
  });

  it('returns 502 when upstream fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ q: 'formula' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: 'Failed to fetch recalls from an upstream source',
    });
  });

  it('caps limit at 100', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, sampleOpenFda({ results: [], meta: { results: { total: 0 } } })),
    );
    const app = createApp({ fetchImpl });

    await request(app).get('/api/recalls').query({ q: 'formula', limit: 999 });

    const calledUrl = String(fetchImpl.mock.calls[0][0]);
    expect(calledUrl).toMatch(/[?&]limit=100(?:&|$)/);
    expect(calledUrl).not.toMatch(/limit=999/);
  });
});

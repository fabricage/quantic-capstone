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

function sampleCpsc(overrides = {}) {
  return {
    RecallID: 10904,
    RecallNumber: '26669',
    RecallDate: '2026-08-06T00:00:00',
    LastPublishDate: '2026-08-07T00:00:00',
    Title: 'Play Yard and Crib Mattresses Recalled',
    URL: 'https://www.cpsc.gov/Recalls/2026/example',
    Description: 'Mattress recall',
    Products: [{ Name: 'Crib mattress' }],
    Hazards: [{ Name: 'Entrapment' }],
    Manufacturers: [],
    Importers: [{ Name: 'Voomf' }],
    Retailers: [],
    Images: [{ URL: 'https://www.cpsc.gov/s3fs-public/crib.jpg', Caption: 'Crib' }],
    ...overrides,
  };
}

function fetchByHost({ fda, cpsc } = {}) {
  return vi.fn().mockImplementation((url) => {
    const href = String(url);
    if (href.includes('saferproducts.gov')) {
      return typeof cpsc === 'function' ? cpsc(href) : jsonResponse(200, cpsc ?? []);
    }
    return typeof fda === 'function' ? fda(href) : jsonResponse(200, fda ?? sampleOpenFda());
  });
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

  it('forwards classification, status, dateFrom, and dateTo into the openFDA search string', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, sampleOpenFda()));
    const app = createApp({ fetchImpl });

    await request(app).get('/api/recalls').query({
      q: 'milk',
      classification: 'Class I',
      status: 'Ongoing',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    });

    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(calledUrl.searchParams.get('search')).toBe(
      '(product_description:milk OR recalling_firm:milk) AND classification:"Class I" AND status:"Ongoing" AND recall_initiation_date:[20240101 TO 20241231]',
    );
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

  it('forwards skip and limit together with filters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, sampleOpenFda()));
    const app = createApp({ fetchImpl });

    await request(app).get('/api/recalls').query({
      q: 'cheese',
      classification: 'Class I',
      skip: 20,
      limit: 20,
    });

    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(calledUrl.searchParams.get('skip')).toBe('20');
    expect(calledUrl.searchParams.get('limit')).toBe('20');
    expect(calledUrl.searchParams.get('search')).toContain('classification:"Class I"');
  });

  it('defaults unknown source to food and dispatches consumer to CPSC', async () => {
    const fetchImpl = fetchByHost({
      fda: sampleOpenFda(),
      cpsc: [sampleCpsc()],
    });
    const app = createApp({ fetchImpl });

    const unknown = await request(app).get('/api/recalls').query({ source: 'widgets', q: 'milk' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.source).toBe('food');
    expect(unknown.body.results[0].source).toBe('food');

    const consumer = await request(app).get('/api/recalls').query({ source: 'consumer', q: 'crib', limit: 5 });
    expect(consumer.status).toBe(200);
    expect(consumer.headers['cache-control']).toBe('no-store');
    expect(consumer.body.source).toBe('consumer');
    expect(consumer.body.results[0]).toMatchObject({
      id: 'cpsc-26669',
      source: 'consumer',
      classification: 'Consumer Product',
      imageUrl: 'https://www.cpsc.gov/s3fs-public/crib.jpg',
    });
    const cpscUrls = fetchImpl.mock.calls
      .map((call) => String(call[0]))
      .filter((href) => href.includes('saferproducts.gov'));
    expect(cpscUrls.length).toBeGreaterThanOrEqual(5);
    expect(cpscUrls.some((href) => href.includes('ProductName=crib'))).toBe(true);
  });

  it('merges food and consumer on source=all and sorts newest first', async () => {
    const fetchImpl = fetchByHost({
      fda: sampleOpenFda({
        results: [
          {
            recall_number: 'F-old',
            recalling_firm: 'Acme Foods',
            product_description: 'Milk',
            reason_for_recall: 'Listeria',
            classification: 'Class II',
            status: 'Ongoing',
            state: 'CA',
            report_date: '20240110',
            recall_initiation_date: '20240101',
          },
        ],
      }),
      cpsc: [sampleCpsc()],
    });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ source: 'all', q: 'crib' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('all');
    expect(res.body.results.map((r) => r.id)).toEqual(['cpsc-26669', 'F-old']);
    expect(res.body.results.map((r) => r.source)).toEqual(['consumer', 'food']);
  });

  it('paginates consumer results in memory after the full CPSC merge', async () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      sampleCpsc({
        RecallID: 100 + index,
        RecallNumber: `N${index}`,
        RecallDate: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00`,
        LastPublishDate: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00`,
        Title: `Item ${index}`,
        Products: [{ Name: `Crib ${index}` }],
      }),
    );
    const fetchImpl = fetchByHost({ cpsc: rows });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({
      source: 'consumer',
      q: 'crib',
      skip: 2,
      limit: 3,
    });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.results.map((r) => r.id)).toEqual(['cpsc-N5', 'cpsc-N4', 'cpsc-N3']);
  });

  it('treats food 404 as empty on source=all when CPSC still returns rows', async () => {
    const fetchImpl = fetchByHost({
      fda: () => jsonResponse(404, { error: { code: 'NOT_FOUND' } }),
      cpsc: [sampleCpsc()],
    });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ source: 'all', q: 'crib' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('all');
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].id).toBe('cpsc-26669');
  });

  it('returns 502 when both branches hard-fail on source=all', async () => {
    const fetchImpl = fetchByHost({
      fda: () => jsonResponse(500, { error: 'boom' }),
      cpsc: () => jsonResponse(500, { error: 'boom' }),
    });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ source: 'all', q: 'crib' });
    expect(res.status).toBe(502);
  });
});

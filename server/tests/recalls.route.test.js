/**
 * recalls.route.test.js
 * Purpose: HTTP tests for /health and GET /api/recalls with an injected fetch stub.
 */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../index.js';
import { websiteCache } from '../lib/websiteCache.js';

afterEach(() => {
  websiteCache.clear();
});

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
    expect(res.headers['cache-control']).toBe('no-store');
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

  it('alternates FDA then CPSC on source=all, even when CPSC rows are newer', async () => {
    const foodRow = (id, day) => ({
      recall_number: id,
      recalling_firm: 'Acme Foods',
      product_description: 'Milk',
      reason_for_recall: 'Listeria',
      classification: 'Class II',
      status: 'Ongoing',
      state: 'CA',
      report_date: `202401${day}`,
      recall_initiation_date: '20240101',
    });
    const fetchImpl = fetchByHost({
      // Deliberately out of order so we can see each side gets sorted.
      fda: sampleOpenFda({ results: [foodRow('F-older', '05'), foodRow('F-newer', '10')] }),
      cpsc: [
        sampleCpsc({ RecallNumber: 'C1', LastPublishDate: '2026-08-07T00:00:00' }),
        sampleCpsc({ RecallNumber: 'C2', LastPublishDate: '2026-08-09T00:00:00' }),
        sampleCpsc({ RecallNumber: 'C3', LastPublishDate: '2026-08-08T00:00:00' }),
      ],
    });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ source: 'all', q: 'crib' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('all');
    expect(res.body.total).toBe(5);
    expect(res.body.results.map((r) => r.id)).toEqual([
      'F-newer',
      'cpsc-C2',
      'F-older',
      'cpsc-C3',
      'cpsc-C1',
    ]);
    expect(res.body.results.map((r) => r.source)).toEqual([
      'food',
      'consumer',
      'food',
      'consumer',
      'consumer',
    ]);
  });

  it('keeps the alternating order stable across pages on source=all', async () => {
    const foodRow = (id, day) => ({
      recall_number: id,
      recalling_firm: 'Acme Foods',
      product_description: 'Milk',
      reason_for_recall: 'Listeria',
      classification: 'Class II',
      status: 'Ongoing',
      state: 'CA',
      report_date: `202401${day}`,
      recall_initiation_date: '20240101',
    });
    const fetchImpl = fetchByHost({
      fda: sampleOpenFda({ results: [foodRow('F1', '10'), foodRow('F2', '09'), foodRow('F3', '08')] }),
      cpsc: [
        sampleCpsc({ RecallNumber: 'C1', LastPublishDate: '2026-08-09T00:00:00' }),
        sampleCpsc({ RecallNumber: 'C2', LastPublishDate: '2026-08-08T00:00:00' }),
        sampleCpsc({ RecallNumber: 'C3', LastPublishDate: '2026-08-07T00:00:00' }),
      ],
    });
    const app = createApp({ fetchImpl });

    const page1 = await request(app)
      .get('/api/recalls')
      .query({ source: 'all', q: 'crib', skip: 0, limit: 4 });
    const page2 = await request(app)
      .get('/api/recalls')
      .query({ source: 'all', q: 'crib', skip: 4, limit: 4 });
    expect(page1.body.results.map((r) => r.id)).toEqual(['F1', 'cpsc-C1', 'F2', 'cpsc-C2']);
    expect(page2.body.results.map((r) => r.id)).toEqual(['F3', 'cpsc-C3']);
    expect(page1.body.total).toBe(6);
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
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('still returns 200 on source=all when only food hard-fails', async () => {
    const fetchImpl = fetchByHost({
      fda: () => jsonResponse(500, { error: 'ECONNREFUSED stack dump' }),
      cpsc: [sampleCpsc()],
    });
    const app = createApp({ fetchImpl });

    const res = await request(app).get('/api/recalls').query({ source: 'all', q: 'crib' });
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.source).toBe('all');
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].id).toBe('cpsc-26669');
  });

  it('merges FDA website press releases ahead of the API page', async () => {
    const websiteHtml = `
      <table>
        <tr>
          <td headers="view-field-change-date-2-table-column"><time datetime="2026-09-08T00:00:00Z">09/08/2026</time></td>
          <td headers="view-brand-name-table-column"><a href="/safety/recalls/fresh-chicken">Created Fresh!</a></td>
          <td headers="view-field-product-description-1-table-column">Chicken Salad Wedge</td>
          <td headers="view-field-regulated-product-field-table-column">Food &amp; Beverages</td>
          <td headers="view-field-recall-reason-description-1-table-column">Undeclared egg</td>
          <td headers="view-company-name-table-column">FreshPoint</td>
        </tr>
      </table>
    `;
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('www.fda.gov') || href.includes('r.jina.ai')) {
        return { ok: true, status: 200, text: async () => websiteHtml };
      }
      return jsonResponse(200, sampleOpenFda());
    });
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/recalls').query({ q: 'chicken', limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.results[0].id).toMatch(/^fda-web-/);
    expect(res.body.results[0].product).toMatch(/chicken salad/i);
    expect(res.body.results.some((row) => row.id === 'F-123-2024')).toBe(true);
  });

  it('still surfaces website press releases when openFDA returns 404', async () => {
    const websiteHtml = `
      <table>
        <tr>
          <td headers="view-field-change-date-2-table-column">09/08/2026</td>
          <td headers="view-brand-name-table-column"><a href="/safety/recalls/zzzx">Zz Brand</a></td>
          <td headers="view-field-product-description-1-table-column">zzzx snack</td>
          <td headers="view-field-regulated-product-field-table-column">Food &amp; Beverages</td>
          <td headers="view-field-recall-reason-description-1-table-column">Listeria</td>
          <td headers="view-company-name-table-column">Zz Co</td>
        </tr>
      </table>
    `;
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('www.fda.gov') || href.includes('r.jina.ai')) {
        return { ok: true, status: 200, text: async () => websiteHtml };
      }
      return jsonResponse(404, { error: { code: 'NOT_FOUND' } });
    });
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/recalls').query({ q: 'zzzx' });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].firm).toBe('Zz Co');
  });

  it('skips the FDA website merge when classification is set', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('fda.gov')) {
        return { ok: true, status: 200, text: async () => '<table></table>' };
      }
      return jsonResponse(200, sampleOpenFda());
    });
    const app = createApp({ fetchImpl });
    await request(app).get('/api/recalls').query({ q: 'milk', classification: 'Class I' });
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(urls.some((href) => href.includes('fda.gov/safety'))).toBe(false);
  });

  it('forwards location=china onto the openFDA country clause and skips website merge', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('www.fda.gov') || href.includes('r.jina.ai')) {
        return { ok: true, status: 200, text: async () => '<table><tr><td>press</td></tr></table>' };
      }
      return jsonResponse(200, sampleOpenFda());
    });
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/recalls').query({
      q: 'milk',
      location: 'china',
      source: 'food',
    });
    expect(res.status).toBe(200);
    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(calledUrl.searchParams.get('search')).toContain('country:"China"');
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(urls.some((href) => href.includes('fda.gov/safety'))).toBe(false);
    expect(urls.some((href) => href.includes('r.jina.ai'))).toBe(false);
  });

  it('still returns empty on openFDA 404 when location is set (no website merge)', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('www.fda.gov') || href.includes('r.jina.ai')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            '<table><tr><td headers="view-field-product-description-1-table-column">press snack</td></tr></table>',
        };
      }
      return jsonResponse(404, { error: { code: 'NOT_FOUND' } });
    });
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/recalls').query({
      q: 'zzzxnotarealkeyword',
      location: 'china',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      results: [],
      source: 'food',
    });
  });

  it('filters consumer recalls in memory by origin and skips website HTML', async () => {
    const china = sampleCpsc({
      RecallID: 1,
      RecallNumber: 'CHINA1',
      Title: 'China crib',
      Products: [{ Name: 'China crib' }],
      URL: 'https://www.cpsc.gov/Recalls/2026/china-crib',
      ManufacturerCountries: [{ Country: 'China' }],
    });
    const usa = sampleCpsc({
      RecallID: 2,
      RecallNumber: 'USA1',
      Title: 'USA crib',
      Products: [{ Name: 'USA crib' }],
      URL: 'https://www.cpsc.gov/Recalls/2026/usa-crib',
      ManufacturerCountries: [{ Country: 'United States' }],
      RecallDate: '2026-07-01T00:00:00',
      LastPublishDate: '2026-07-01T00:00:00',
    });
    const unknown = sampleCpsc({
      RecallID: 3,
      RecallNumber: 'UNK1',
      Title: 'Unknown crib',
      Products: [{ Name: 'Unknown crib' }],
      URL: 'https://www.cpsc.gov/Recalls/2026/unknown-crib',
      ManufacturerCountries: [],
      RecallDate: '2026-06-01T00:00:00',
      LastPublishDate: '2026-06-01T00:00:00',
    });
    const fetchImpl = fetchByHost({ cpsc: [china, usa, unknown] });
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/recalls').query({
      source: 'consumer',
      location: 'china',
      limit: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.results.map((row) => row.id)).toEqual(['cpsc-CHINA1']);
    expect(res.body.results[0].origin).toBe('china');
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(urls.some((href) => href.includes('cpsc.gov'))).toBe(false);
    expect(urls.some((href) => /ManufacturerCountry=/i.test(href))).toBe(false);
  });
});

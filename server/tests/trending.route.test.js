/**
 * trending.route.test.js
 * Purpose: GET /api/trending-searches — grouped chips, cache, website firms first.
 */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../index.js';
import { TRENDING_CACHE_KEY, trendingCache } from '../routes/trending.js';
import { websiteCache } from '../lib/websiteCache.js';

afterEach(() => {
  trendingCache.clear();
  websiteCache.clear();
});

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function padHtml(html) {
  return `${html}\n<!-- ${'x'.repeat(220)} -->`;
}

const fdaWebsiteHtml = padHtml(`
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
`);

const cpscWebsiteHtml = padHtml(`
<div class="recall-list">
  <div class="recall-list__date">September 03, 2026</div>
  <div class="recall-list__title">
    <a href="/Recalls/2026/Truststone">Truststone Group Recalls XO Poppy Power Banks</a>
  </div>
</div>
`);

function trendingFetch() {
  return vi.fn().mockImplementation((url) => {
    const href = String(url);
    if (href.includes('api.fda.gov')) {
      return jsonResponse(200, {
        results: [
          { term: 'Acme Foods Inc', count: 40 },
          { term: 'Dairy Co', count: 12 },
        ],
      });
    }
    if (href.includes('saferproducts.gov')) {
      return jsonResponse(200, [
        {
          RecallID: 1,
          RecallNumber: 'N1',
          Title: 'Crib recall',
          Manufacturers: [{ Name: 'Voomf of China' }],
          Retailers: [{ Name: 'Online at Amazon.com from September 2024' }],
        },
      ]);
    }
    if (href.includes('www.fda.gov') || (href.includes('r.jina.ai') && href.includes('fda.gov'))) {
      return { ok: true, status: 200, text: async () => fdaWebsiteHtml };
    }
    if (href.includes('cpsc.gov') || href.includes('r.jina.ai')) {
      return { ok: true, status: 200, text: async () => cpscWebsiteHtml };
    }
    return jsonResponse(500, { error: 'unexpected' });
  });
}

describe('GET /api/trending-searches', () => {
  it('returns grouped FDA and CPSC frequency chips', async () => {
    const fetchImpl = trendingFetch();
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/trending-searches');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.label).toMatch(/companies with the most recalls/i);
    expect(res.body.suggestions).toEqual([]);
    expect(res.body.groups.map((group) => group.source)).toEqual(['food', 'consumer']);
    expect(res.body.groups[0].suggestions).toContain('Acme Foods Inc');
    expect(res.body.groups[1].suggestions).toContain('Voomf of China');
    expect(res.body.groups[1].suggestions.some((phrase) => /amazon/i.test(phrase))).toBe(false);

    const fdaUrls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(fdaUrls.some((href) => href.includes('count=recalling_firm.exact'))).toBe(true);
  });

  it('puts website-fresh firms first in each group', async () => {
    const app = createApp({ fetchImpl: trendingFetch() });
    const res = await request(app).get('/api/trending-searches');
    expect(res.body.groups[0].suggestions[0]).toBe('FreshPoint');
    expect(res.body.groups[1].suggestions[0]).toBe('Truststone Group');
  });

  it('serves the cached payload on a second request', async () => {
    const fetchImpl = trendingFetch();
    const app = createApp({ fetchImpl });
    const first = await request(app).get('/api/trending-searches');
    const callsAfterFirst = fetchImpl.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(trendingCache.get(TRENDING_CACHE_KEY)).toEqual(first.body);

    const second = await request(app).get('/api/trending-searches');
    expect(second.body).toEqual(first.body);
    expect(fetchImpl.mock.calls.length).toBe(callsAfterFirst);
  });

  it('returns an empty chip payload when every upstream fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const app = createApp({ fetchImpl });
    const res = await request(app).get('/api/trending-searches');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      label: 'Companies with the most recalls',
      groups: [],
      suggestions: [],
    });
  });
});

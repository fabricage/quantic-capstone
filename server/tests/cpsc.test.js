/**
 * cpsc.test.js
 * Purpose: Date formatting, query params, browse window, field union, pagination,
 * and the latest-vs-keyword date rules.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  CPSC_BASE,
  buildCpscParams,
  fetchCpscRecalls,
  paginateCpscRecalls,
  toCpscDate,
  unionCpscRecalls,
} from '../lib/cpsc.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const now = new Date('2026-09-09T12:00:00Z');

const oldRepublish = {
  RecallID: 1,
  RecallNumber: '00111',
  RecallDate: '2000-03-15T00:00:00',
  LastPublishDate: '2026-09-01T00:00:00',
  Title: 'Year-2000 crib toy',
};

const recentCrib = {
  RecallID: 2,
  RecallNumber: '26669',
  RecallDate: '2026-08-06T00:00:00',
  LastPublishDate: '2026-08-07T00:00:00',
  Title: 'Play yard crib mattress',
};

describe('toCpscDate', () => {
  it('formats dates as YYYY-MM-DD for CPSC query params', () => {
    expect(toCpscDate('2024-01-15')).toBe('2024-01-15');
    expect(toCpscDate('20240115')).toBe('2024-01-15');
    expect(toCpscDate('2026-08-06T00:00:00')).toBe('2026-08-06');
    expect(toCpscDate('')).toBe('');
    expect(toCpscDate(null)).toBe('');
  });
});

describe('buildCpscParams', () => {
  it('always sets format=json and only the provided fields', () => {
    const params = buildCpscParams({
      ProductName: 'crib',
      RecallTitle: 'crib',
      Manufacturer: 'Acme',
      Retailer: 'Target',
      Importer: 'Import Co',
      RecallDateStart: '2024-01-01',
      RecallDateEnd: '2024-12-31',
      LastPublishDateStart: '2024-09-09',
      LastPublishDateEnd: '2026-09-09',
    });
    expect(params.get('format')).toBe('json');
    expect(params.get('ProductName')).toBe('crib');
    expect(params.get('RecallTitle')).toBe('crib');
    expect(params.get('Manufacturer')).toBe('Acme');
    expect(params.get('Retailer')).toBe('Target');
    expect(params.get('Importer')).toBe('Import Co');
    expect(params.get('RecallDateStart')).toBe('2024-01-01');
    expect(params.get('RecallDateEnd')).toBe('2024-12-31');
    expect(params.get('LastPublishDateStart')).toBe('2024-09-09');
    expect(params.get('LastPublishDateEnd')).toBe('2026-09-09');
  });

  it('omits empty optional fields', () => {
    const params = buildCpscParams({ ProductName: 'crib', Manufacturer: '' });
    expect(params.get('ProductName')).toBe('crib');
    expect(params.has('Manufacturer')).toBe(false);
    expect(params.has('RecallDateStart')).toBe(false);
  });
});

describe('fetchCpscRecalls', () => {
  it('uses a LastPublishDateStart browse window of today minus 2 years', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [recentCrib]));
    await fetchCpscRecalls({ now }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(CPSC_BASE);
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('LastPublishDateStart')).toBe('2024-09-09');
    expect(url.searchParams.has('RecallDateStart')).toBe(false);
  });

  it('unions product/title/manufacturer/retailer/importer and paginates in memory', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('ProductName=crib')) {
        return jsonResponse(200, [recentCrib, { ...oldRepublish, RecallID: 1 }]);
      }
      if (href.includes('RecallTitle=crib')) {
        return jsonResponse(200, [{ ...recentCrib, Title: 'Title hit' }]);
      }
      if (href.includes('Manufacturer=crib')) {
        return jsonResponse(200, [
          {
            RecallID: 3,
            RecallNumber: '30001',
            RecallDate: '2025-01-01T00:00:00',
            LastPublishDate: '2025-01-02T00:00:00',
            Title: 'Manufacturer crib firm',
          },
        ]);
      }
      return jsonResponse(200, []);
    });

    const records = await fetchCpscRecalls({ q: 'crib', now }, fetchImpl);
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(urls.some((href) => href.includes('ProductName=crib'))).toBe(true);
    expect(urls.some((href) => href.includes('RecallTitle=crib'))).toBe(true);
    expect(urls.some((href) => href.includes('Manufacturer=crib'))).toBe(true);
    expect(urls.some((href) => href.includes('Retailer=crib'))).toBe(true);
    expect(urls.some((href) => href.includes('Importer=crib'))).toBe(true);
    expect(records.map((r) => r.RecallNumber)).toEqual(['26669', '30001', '00111']);

    const page = paginateCpscRecalls(records, 1, 1);
    expect(page.total).toBe(3);
    expect(page.results).toHaveLength(1);
    expect(page.results[0].RecallNumber).toBe('30001');
  });

  it('drops 2000-era republishes on latest browse', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [oldRepublish, recentCrib]));
    const records = await fetchCpscRecalls({ now }, fetchImpl);
    expect(records.map((r) => r.RecallNumber)).toEqual(['26669']);
  });

  it('keeps old notices on keyword search', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [oldRepublish, recentCrib]));
    const records = await fetchCpscRecalls({ q: 'crib', now }, fetchImpl);
    expect(records.some((r) => r.RecallNumber === '00111')).toBe(true);
    expect(records.some((r) => r.RecallNumber === '26669')).toBe(true);
  });

  it('puts user date filters on RecallDateStart/End', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, [recentCrib]));
    await fetchCpscRecalls(
      { q: 'crib', dateFrom: '2024-01-01', dateTo: '2024-12-31', now },
      fetchImpl,
    );
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get('RecallDateStart')).toBe('2024-01-01');
    expect(url.searchParams.get('RecallDateEnd')).toBe('2024-12-31');
    expect(url.searchParams.has('LastPublishDateStart')).toBe(false);
  });
});

describe('unionCpscRecalls', () => {
  it('dedupes by RecallNumber then RecallID', () => {
    const merged = unionCpscRecalls([
      [recentCrib],
      [{ ...recentCrib, Title: 'duplicate' }],
      [{ RecallID: 9, RecallNumber: '', Title: 'id only' }],
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0].Title).toBe(recentCrib.Title);
    expect(merged[1].RecallID).toBe(9);
  });
});

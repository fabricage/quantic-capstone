/**
 * openfda.test.js
 * Purpose: Unit tests for openFDA date parsing and keyword query building.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildSearchQuery, fetchRecallingFirmCounts, formatKeyword, toOpenFdaDate } from '../lib/openfda.js';

describe('toOpenFdaDate', () => {
  it('passes through compact YYYYMMDD', () => {
    expect(toOpenFdaDate('20240115')).toBe('20240115');
  });

  it('converts dashed YYYY-MM-DD to compact YYYYMMDD', () => {
    expect(toOpenFdaDate('2024-01-15')).toBe('20240115');
  });

  it('returns null for junk, empty, or missing values', () => {
    expect(toOpenFdaDate('not-a-date')).toBeNull();
    expect(toOpenFdaDate('2024/01/15')).toBeNull();
    expect(toOpenFdaDate('')).toBeNull();
    expect(toOpenFdaDate('  ')).toBeNull();
    expect(toOpenFdaDate(null)).toBeNull();
    expect(toOpenFdaDate(undefined)).toBeNull();
  });
});

describe('buildSearchQuery / formatKeyword', () => {
  it('returns an empty string for an empty or whitespace query', () => {
    expect(buildSearchQuery({ q: '' })).toBe('');
    expect(buildSearchQuery({ q: '   ' })).toBe('');
    expect(buildSearchQuery({})).toBe('');
    expect(formatKeyword('')).toBe('');
  });

  it('leaves a single word unquoted inside the OR group', () => {
    expect(buildSearchQuery({ q: 'formula' })).toBe(
      '(product_description:formula OR recalling_firm:formula)',
    );
  });

  it('quotes a multi-word phrase and keeps spaces around OR', () => {
    expect(buildSearchQuery({ q: 'peanut butter' })).toBe(
      '(product_description:"peanut butter" OR recalling_firm:"peanut butter")',
    );
  });

  it('AND-joins keyword with classification, status, and date range', () => {
    expect(
      buildSearchQuery({
        q: 'milk',
        classification: 'Class I',
        status: 'Ongoing',
        dateFrom: '2024-01-01',
        dateTo: '2024-06-30',
      }),
    ).toBe(
      '(product_description:milk OR recalling_firm:milk) AND classification:"Class I" AND status:"Ongoing" AND recall_initiation_date:[20240101 TO 20240630]',
    );
  });

  it('ignores unknown classification and status values', () => {
    expect(
      buildSearchQuery({
        q: 'milk',
        classification: 'Class IV',
        status: 'Pending',
      }),
    ).toBe('(product_description:milk OR recalling_firm:milk)');
  });

  it('uses far bounds for open-ended date ranges', () => {
    expect(buildSearchQuery({ dateFrom: '20240101' })).toBe(
      'recall_initiation_date:[20240101 TO 21000101]',
    );
    expect(buildSearchQuery({ dateTo: '2024-06-30' })).toBe(
      'recall_initiation_date:[19000101 TO 20240630]',
    );
  });

  it('AND-joins the FDA country clause when location is set', () => {
    expect(buildSearchQuery({ q: 'milk', location: 'usa' })).toBe(
      '(product_description:milk OR recalling_firm:milk) AND country:"United States"',
    );
    expect(buildSearchQuery({ location: 'china' })).toBe('country:"China"');
    expect(buildSearchQuery({ location: 'other' })).toBe(
      '-country:"United States" AND -country:"China"',
    );
    expect(buildSearchQuery({ q: 'milk', location: 'mexico' })).toBe(
      '(product_description:milk OR recalling_firm:milk)',
    );
  });
});

describe('fetchRecallingFirmCounts', () => {
  it('calls count=recalling_firm.exact with a report_date window', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { term: 'Acme Foods Inc', count: 12 },
          { term: 'Dairy Co', count: 4 },
        ],
      }),
    });

    const rows = await fetchRecallingFirmCounts(
      { dateFrom: '2021-09-09', dateTo: '2026-09-09', limit: 40 },
      fetchImpl,
    );

    expect(rows).toEqual([
      { term: 'Acme Foods Inc', count: 12 },
      { term: 'Dairy Co', count: 4 },
    ]);
    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(calledUrl.searchParams.get('count')).toBe('recalling_firm.exact');
    expect(calledUrl.searchParams.get('limit')).toBe('40');
    expect(calledUrl.searchParams.get('search')).toBe('report_date:[20210909 TO 20260909]');
  });

  it('maps openFDA 404 to an empty list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND' } }),
    });
    await expect(fetchRecallingFirmCounts({ dateFrom: '2024-01-01' }, fetchImpl)).resolves.toEqual(
      [],
    );
  });
});

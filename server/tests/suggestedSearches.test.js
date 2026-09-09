/**
 * suggestedSearches.test.js
 * Purpose: Date helper, firm phrases, CPSC tallies, website-first groups.
 */
import { describe, expect, it } from 'vitest';
import {
  SUGGESTED_LABEL,
  SUGGESTED_PER_SOURCE,
  buildSuggestedSearchGroups,
  countFirmsFromRecalls,
  daysAgoDate,
  isUsableFirmPhrase,
  phraseFromFirm,
  publicLookbackWindows,
  resolveLookbackWindow,
} from '../lib/suggestedSearches.js';

describe('daysAgoDate', () => {
  it('returns YYYY-MM-DD in UTC', () => {
    const now = new Date('2026-09-09T15:00:00Z');
    expect(daysAgoDate(0, now)).toBe('2026-09-09');
    expect(daysAgoDate(1, now)).toBe('2026-09-08');
    expect(daysAgoDate(365, now)).toBe('2025-09-09');
  });
});

describe('resolveLookbackWindow', () => {
  it('maps 1m/3m/1y/5y and falls back to 1 year', () => {
    expect(resolveLookbackWindow('1m')).toMatchObject({ id: '1m', days: 30 });
    expect(resolveLookbackWindow('3m')).toMatchObject({ id: '3m', days: 90 });
    expect(resolveLookbackWindow('5y').days).toBe(5 * 365);
    expect(resolveLookbackWindow('nope').id).toBe('1y');
    expect(resolveLookbackWindow('').id).toBe('1y');
    expect(publicLookbackWindows().map((row) => row.id)).toEqual([
      '1m',
      '3m',
      '6m',
      '1y',
      '2y',
      '5y',
    ]);
  });
});

describe('phraseFromFirm', () => {
  it('drops dba …, takes text before the first comma, and caps ~36 chars', () => {
    expect(phraseFromFirm('Acme Foods Inc., dba Better Foods LLC')).toBe('Acme Foods Inc');
    expect(phraseFromFirm('Nestle USA dba Nestle Waters')).toBe('Nestle USA');
    expect(phraseFromFirm('Dairy Co, Inc.')).toBe('Dairy Co');
    const long = phraseFromFirm(
      'International Consolidated Super Premium Organic Beverage Holdings Company',
    );
    expect(long.length).toBeLessThanOrEqual(36);
    expect(long).toMatch(/^International Consolidated/i);
  });
});

describe('isUsableFirmPhrase', () => {
  it('rejects CPSC retailer/date junk', () => {
    expect(isUsableFirmPhrase('Online at Amazon.com from September 2024')).toBe(false);
    expect(isUsableFirmPhrase('Acme Foods')).toBe(true);
    expect(isUsableFirmPhrase('')).toBe(false);
  });
});

describe('countFirmsFromRecalls', () => {
  it('tallies usable CPSC manufacturer names and skips junk', () => {
    const rows = countFirmsFromRecalls([
      {
        Manufacturers: [{ Name: 'Acme Toys, Inc.' }],
        Retailers: [{ Name: 'Online at Amazon.com from September 2024 through the present' }],
      },
      { Importers: [{ Name: 'Acme Toys' }] },
      { Manufacturers: [{ Name: 'Voomf of China' }] },
      { firm: 'Skip Hop' },
    ]);
    expect(rows[0]).toMatchObject({ term: 'Acme Toys', count: 2 });
    expect(rows.map((row) => row.term)).toEqual(['Acme Toys', 'Skip Hop', 'Voomf of China']);
    expect(rows.some((row) => /amazon/i.test(row.term))).toBe(false);
  });
});

describe('buildSuggestedSearchGroups', () => {
  it('builds FDA and CPSC groups of at most 8, labeled as company frequency', () => {
    const foodCounts = Array.from({ length: 12 }, (_, index) => ({
      term: `Food Firm ${index + 1}`,
      count: 20 - index,
    }));
    const payload = buildSuggestedSearchGroups({
      foodCounts,
      consumerCounts: [{ term: 'Acme Toys', count: 3 }],
    });
    expect(payload.label).toBe(SUGGESTED_LABEL);
    expect(payload.suggestions).toEqual([]);
    expect(payload.groups).toHaveLength(2);
    expect(payload.groups[0]).toMatchObject({ id: 'food', source: 'food', label: 'FDA food' });
    expect(payload.groups[0].suggestions).toHaveLength(SUGGESTED_PER_SOURCE);
    expect(payload.groups[0].suggestions[0]).toEqual({ phrase: 'Food Firm 1', count: 20 });
    expect(payload.groups[1].suggestions).toEqual([{ phrase: 'Acme Toys', count: 3 }]);
  });

  it('prepends website-fresh firms ahead of the frequency list', () => {
    const payload = buildSuggestedSearchGroups({
      foodCounts: [
        { term: 'Acme Foods Inc', count: 40 },
        { term: 'Dairy Co', count: 12 },
      ],
      consumerCounts: [{ term: 'Voomf', count: 5 }],
      recentFoodFirms: ['FreshPoint', 'Acme Foods Inc., dba Other'],
      recentConsumerFirms: ['Truststone Group'],
    });
    expect(payload.groups[0].suggestions.slice(0, 3)).toEqual([
      { phrase: 'FreshPoint', count: 0 },
      { phrase: 'Acme Foods Inc', count: 40 },
      { phrase: 'Dairy Co', count: 12 },
    ]);
    expect(payload.groups[1].suggestions[0]).toEqual({ phrase: 'Truststone Group', count: 0 });
    expect(payload.groups[1].suggestions.map((row) => row.phrase)).toContain('Voomf');
  });
});

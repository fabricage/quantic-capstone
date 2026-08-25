/**
 * openfda.test.js
 * Purpose: Unit tests for openFDA date parsing and keyword query building.
 */
import { describe, expect, it } from 'vitest';
import { buildSearchQuery, formatKeyword, toOpenFdaDate } from '../lib/openfda.js';

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
});

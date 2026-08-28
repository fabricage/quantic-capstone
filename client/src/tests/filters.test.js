/**
 * filters.test.js
 * Purpose: Date-range validation and “are any filters on?” helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  isInvalidDateRange,
} from '../lib/filters.js';

describe('isInvalidDateRange', () => {
  it('is false when either end is missing', () => {
    expect(isInvalidDateRange('', '2024-06-01')).toBe(false);
    expect(isInvalidDateRange('2024-06-01', '')).toBe(false);
    expect(isInvalidDateRange('', '')).toBe(false);
  });

  it('is true only when both are set and from is after to', () => {
    expect(isInvalidDateRange('2024-06-02', '2024-06-01')).toBe(true);
    expect(isInvalidDateRange('2024-06-01', '2024-06-01')).toBe(false);
    expect(isInvalidDateRange('2024-01-01', '2024-12-31')).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  it('is false for EMPTY_FILTERS', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('is true when any filter field is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, classification: 'Class I' })).toBe(
      true,
    );
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'Ongoing' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, dateFrom: '2024-01-01' })).toBe(
      true,
    );
    expect(hasActiveFilters({ ...EMPTY_FILTERS, dateTo: '2024-12-31' })).toBe(true);
  });
});

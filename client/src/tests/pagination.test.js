/**
 * pagination.test.js
 * Purpose: Defaults, skip math, totals, clamp, range, page-size normalize, visible numbers.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  clampPage,
  normalizePageSize,
  pageToSkip,
  resultRange,
  totalPages,
  visiblePageNumbers,
} from '../lib/pagination.js';

describe('pagination defaults', () => {
  it('uses 20 as the default page size and only allows 20, 50, 100', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGE_SIZE_OPTIONS).toEqual([20, 50, 100]);
  });
});

describe('pageToSkip', () => {
  it('maps 1-based pages onto skip', () => {
    expect(pageToSkip(1, 20)).toBe(0);
    expect(pageToSkip(2, 20)).toBe(20);
    expect(pageToSkip(3, 50)).toBe(100);
  });
});

describe('totalPages', () => {
  it('returns 0 when there are no results', () => {
    expect(totalPages(0, 20)).toBe(0);
  });

  it('rounds up partial pages', () => {
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(100, 50)).toBe(2);
  });
});

describe('clampPage', () => {
  it('clamps to 1..last when the total shrinks', () => {
    expect(clampPage(9, 25, 20)).toBe(2);
    expect(clampPage(0, 25, 20)).toBe(1);
    expect(clampPage('nope', 25, 20)).toBe(1);
    expect(clampPage(1, 0, 20)).toBe(1);
  });
});

describe('resultRange', () => {
  it('returns Showing X–Y bounds', () => {
    expect(resultRange(1, 20, 1673)).toEqual({ start: 1, end: 20 });
    expect(resultRange(2, 20, 1673)).toEqual({ start: 21, end: 40 });
    expect(resultRange(84, 20, 1673)).toEqual({ start: 1661, end: 1673 });
    expect(resultRange(1, 20, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe('normalizePageSize', () => {
  it('accepts the allow-list and otherwise falls back to 20 (never above 100)', () => {
    expect(normalizePageSize(50)).toBe(50);
    expect(normalizePageSize(100)).toBe(100);
    expect(normalizePageSize(25)).toBe(20);
    expect(normalizePageSize(999)).toBe(20);
  });
});

describe('visiblePageNumbers', () => {
  it('shows every page when the total is small', () => {
    expect(visiblePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('inserts ellipsis gaps on large totals', () => {
    expect(visiblePageNumbers(1, 12)).toEqual([1, 2, 'ellipsis', 12]);
    expect(visiblePageNumbers(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
    expect(visiblePageNumbers(12, 12)).toEqual([1, 'ellipsis', 11, 12]);
  });
});

/**
 * useRecentSearches.test.js
 * Purpose: Normalize, push/dedupe/cap, and read/write of recent search chips.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_KEY,
  normalizeSearchQuery,
  pushRecentSearch,
  readRecentSearches,
  useRecentSearches,
  writeRecentSearches,
} from '../hooks/useRecentSearches.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
  };
}

afterEach(() => {
  localStorage.clear();
});

describe('normalizeSearchQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSearchQuery('  infant   formula  ')).toBe('infant formula');
    expect(normalizeSearchQuery('\tcheese\n')).toBe('cheese');
    expect(normalizeSearchQuery('   ')).toBe('');
  });
});

describe('pushRecentSearch', () => {
  it('ignores empty queries', () => {
    expect(pushRecentSearch('   ', ['cheese'])).toEqual(['cheese']);
  });

  it('moves a duplicate to the front and caps at 16', () => {
    expect(pushRecentSearch('Cheese', ['milk', 'cheese'])).toEqual(['Cheese', 'milk']);
    const many = Array.from({ length: MAX_RECENT_SEARCHES }, (_, i) => `q${i}`);
    const next = pushRecentSearch('newest', many);
    expect(next).toHaveLength(MAX_RECENT_SEARCHES);
    expect(next[0]).toBe('newest');
    expect(next).not.toContain('q15');
  });
});

describe('readRecentSearches / writeRecentSearches', () => {
  it('round-trips a list of queries', () => {
    const storage = memoryStorage();
    writeRecentSearches(['  cheese  ', 'formula'], storage);
    expect(readRecentSearches(storage)).toEqual(['cheese', 'formula']);
  });

  it('returns [] for missing, corrupt JSON, or a non-array value', () => {
    expect(readRecentSearches(memoryStorage())).toEqual([]);
    expect(
      readRecentSearches(memoryStorage({ [RECENT_SEARCHES_KEY]: '{not json' })),
    ).toEqual([]);
    expect(
      readRecentSearches(memoryStorage({ [RECENT_SEARCHES_KEY]: JSON.stringify({ q: 'x' }) })),
    ).toEqual([]);
  });
});

describe('useRecentSearches', () => {
  it('remembers a search and can clear the list', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useRecentSearches(storage));

    act(() => {
      result.current.rememberSearch('  formula  ');
    });
    expect(result.current.recent).toEqual(['formula']);

    act(() => {
      result.current.rememberSearch('cheese');
    });
    expect(result.current.recent).toEqual(['cheese', 'formula']);

    act(() => {
      result.current.clearRecent();
    });
    expect(result.current.recent).toEqual([]);
    expect(readRecentSearches(storage)).toEqual([]);
  });
});

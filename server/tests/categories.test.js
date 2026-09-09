/**
 * categories.test.js
 * Purpose: Dictionary lookup, produce-vs-juice exclude, and in-memory match.
 */
import { describe, expect, it } from 'vitest';
import {
  applyCategoryFilter,
  publicCategories,
  recallMatchesCategory,
  resolveCategory,
  textMatchesCategory,
} from '../lib/categories.js';

describe('resolveCategory', () => {
  it('returns the dairy bundle and ignores unknown or wrong-source ids', () => {
    expect(resolveCategory('dairy', 'food').id).toBe('dairy');
    expect(resolveCategory('DAIRY', 'all').label).toBe('Dairy');
    expect(resolveCategory('nope', 'food')).toBeNull();
    expect(resolveCategory('dairy', 'consumer')).toBeNull();
    expect(resolveCategory('nursery', 'food')).toBeNull();
    expect(resolveCategory('nursery', 'consumer').id).toBe('nursery');
    expect(resolveCategory('', 'all')).toBeNull();
  });
});

describe('publicCategories', () => {
  it('exposes id, label, and sources without the keyword lists', () => {
    const rows = publicCategories();
    expect(rows.some((row) => row.id === 'dairy' && row.sources.includes('food'))).toBe(true);
    expect(rows.some((row) => row.id === 'nursery' && row.sources.includes('consumer'))).toBe(
      true,
    );
    expect(rows.every((row) => !('keywords' in row))).toBe(true);
  });
});

describe('textMatchesCategory', () => {
  it('matches cheese as dairy and keeps apple juice out of produce', () => {
    const dairy = resolveCategory('dairy', 'food');
    const produce = resolveCategory('produce', 'food');
    const beverage = resolveCategory('beverage', 'food');
    expect(textMatchesCategory('Cheddar cheese slices', dairy)).toBe(true);
    expect(textMatchesCategory('Bagged spinach', produce)).toBe(true);
    expect(textMatchesCategory('Organic apple juice', produce)).toBe(false);
    expect(textMatchesCategory('Organic apple juice', beverage)).toBe(true);
  });
});

describe('applyCategoryFilter', () => {
  it('keeps nursery cribs and drops unrelated consumer rows', () => {
    const nursery = resolveCategory('nursery', 'consumer');
    const rows = [
      { product: 'Crib mattress', reason: 'Entrapment', firm: 'Voomf' },
      { product: 'Power bank', reason: 'Fire', firm: 'Acme' },
    ];
    expect(applyCategoryFilter(rows, nursery).map((row) => row.product)).toEqual([
      'Crib mattress',
    ]);
    expect(recallMatchesCategory(rows[1], nursery)).toBe(false);
  });
});

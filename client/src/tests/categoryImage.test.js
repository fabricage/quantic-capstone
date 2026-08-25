/**
 * categoryImage.test.js
 * Purpose: Category matching — specific patterns first; juice is a beverage, not produce.
 */
import { describe, expect, it } from 'vitest';
import { categoryImageSrc, matchCategory } from '../lib/categoryImage.js';

describe('matchCategory', () => {
  it('matches formula before other food words', () => {
    expect(matchCategory('Infant formula with milk')).toBe('formula');
  });

  it('treats apple juice as a beverage, not produce', () => {
    expect(matchCategory('Organic apple juice')).toBe('beverage');
    expect(matchCategory('Bagged spinach')).toBe('produce');
  });

  it('falls back to packaged when nothing specific matches', () => {
    expect(matchCategory('Assorted snack mix')).toBe('packaged');
  });

  it('builds a public SVG path from the category id', () => {
    expect(categoryImageSrc('Roasted peanuts')).toBe('/category-images/nuts.svg');
    expect(categoryImageSrc('Cheddar cheese')).toBe('/category-images/dairy.svg');
    expect(categoryImageSrc('Frozen shrimp')).toBe('/category-images/seafood.svg');
    expect(categoryImageSrc('Ground beef')).toBe('/category-images/meat.svg');
  });
});

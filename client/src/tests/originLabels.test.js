/**
 * originLabels.test.js
 * Purpose: Filter options and source-aware origin copy.
 */
import { describe, expect, it } from 'vitest';
import {
  ORIGIN_OPTIONS,
  originFieldLabel,
  originLabel,
  originShortLabel,
} from '../lib/originLabels.js';

describe('ORIGIN_OPTIONS', () => {
  it('lists Any / USA / China / Other', () => {
    expect(ORIGIN_OPTIONS.map((opt) => opt.label)).toEqual(['Any', 'USA', 'China', 'Other']);
    expect(ORIGIN_OPTIONS.map((opt) => opt.value)).toEqual(['', 'usa', 'china', 'other']);
  });
});

describe('originLabel', () => {
  it('names CPSC manufacturer country separately from FDA recalling-firm country', () => {
    expect(originLabel({ source: 'consumer', origin: 'china' })).toBe('Manufacturer: China');
    expect(originLabel({ source: 'food', origin: 'usa' })).toBe('Recalling firm: USA');
    expect(originLabel({ source: 'food', origin: 'other' })).toBe('Recalling firm: Other');
    expect(originLabel({ source: 'food', origin: '' })).toBe('');
  });
});

describe('originShortLabel / originFieldLabel', () => {
  it('maps origin codes and field titles', () => {
    expect(originShortLabel('usa')).toBe('USA');
    expect(originShortLabel('china')).toBe('China');
    expect(originFieldLabel({ source: 'consumer' })).toBe('Manufacturer country');
    expect(originFieldLabel({ source: 'food' })).toBe('Recalling-firm country');
  });
});

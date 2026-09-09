/**
 * personaMatch.test.js
 * Purpose: Bio keyword scores and FDA/CPSC alternating order.
 */
import { describe, expect, it } from 'vitest';
import {
  interleaveBySource,
  rankByPersonaBio,
  tokenizePersona,
} from '../lib/personaMatch.js';

const parent = {
  id: 'parent-young-kids',
  label: 'Parent with young kids',
  description: 'Formula, lunchbox snacks, and foods kids eat often.',
  keywords: ['formula', 'crib', 'kids'],
};

describe('tokenizePersona', () => {
  it('keeps bio words and drops tiny stop words', () => {
    expect(tokenizePersona(parent)).toEqual(
      expect.arrayContaining(['formula', 'lunchbox', 'snacks', 'kids', 'crib']),
    );
    expect(tokenizePersona(parent)).not.toContain('and');
  });
});

describe('rankByPersonaBio', () => {
  it('puts bio matches first and writes a why line', () => {
    const recalls = [
      { id: 'coffee', product: 'Espresso pods', reason: 'Mold', source: 'food' },
      { id: 'formula', product: 'Infant formula', reason: 'Possible contamination', source: 'food' },
    ];
    const { results, whyById } = rankByPersonaBio(recalls, parent);
    expect(results.map((r) => r.id)).toEqual(['formula', 'coffee']);
    expect(whyById.formula).toMatch(/formula/i);
    expect(whyById.coffee).toBeUndefined();
  });
});

describe('interleaveBySource', () => {
  it('alternates FDA then CPSC', () => {
    const mixed = interleaveBySource([
      { id: 'f1', source: 'food' },
      { id: 'f2', source: 'food' },
      { id: 'c1', source: 'consumer' },
      { id: 'c2', source: 'consumer' },
    ]);
    expect(mixed.map((r) => r.id)).toEqual(['f1', 'c1', 'f2', 'c2']);
  });
});

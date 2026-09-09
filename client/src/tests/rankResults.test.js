/**
 * rankResults.test.js
 * Purpose: applyRanking reorders a page, maps why-lines, and never drops omitted ids.
 */
import { describe, expect, it } from 'vitest';
import { applyRanking } from '../lib/rankResults.js';

const recalls = [
  { id: 'a', product: 'Apple juice' },
  { id: 'b', product: 'Baby formula' },
  { id: 'c', product: 'Cheese' },
];

describe('applyRanking', () => {
  it('reorders recalls to match the ranked id list', () => {
    const ranked = [
      { id: 'b', relevance: 5, why: 'Often in a nursery.' },
      { id: 'c', relevance: 3, why: 'Less common for toddlers.' },
      { id: 'a', relevance: 1, why: 'Usually an adult drink.' },
    ];

    const { results } = applyRanking(recalls, ranked);

    expect(results.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('builds a why map keyed by recall id', () => {
    const ranked = [
      { id: 'b', relevance: 5, why: 'Often in a nursery.' },
      { id: 'a', relevance: 2, why: 'Usually an adult drink.' },
    ];

    const { whyById } = applyRanking(recalls, ranked);

    expect(whyById).toEqual({
      b: 'Often in a nursery.',
      a: 'Usually an adult drink.',
    });
  });

  it('keeps the original keyword order when ranking is missing', () => {
    expect(applyRanking(recalls, null).results).toEqual(recalls);
    expect(applyRanking(recalls, undefined).results).toEqual(recalls);
    expect(applyRanking(recalls, []).results).toEqual(recalls);
    expect(applyRanking(recalls, null).whyById).toEqual({});
  });

  it('appends ids the model omitted, in original order', () => {
    const ranked = [{ id: 'c', relevance: 5, why: 'Mentioned first.' }];

    const { results, whyById } = applyRanking(recalls, ranked);

    expect(results.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(whyById).toEqual({ c: 'Mentioned first.' });
    expect(whyById.a).toBeUndefined();
  });

  it('ignores ranked ids that are not on the current page', () => {
    const ranked = [
      { id: 'zzz', relevance: 5, why: 'Unknown.' },
      { id: 'b', relevance: 4, why: 'On the page.' },
    ];

    const { results } = applyRanking(recalls, ranked);

    expect(results.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});

/**
 * cache.test.js
 * Purpose: TTL-on-read, stable ranking keys, clear, and size.
 */
import { describe, expect, it } from 'vitest';
import { buildKey, createCache } from '../lib/cache.js';

describe('createCache', () => {
  it('expires entries on read after TTL', () => {
    let now = 1_000;
    const cache = createCache(100, () => now);
    cache.set('a', { n: 1 });
    expect(cache.get('a')).toEqual({ n: 1 });
    expect(cache.size()).toBe(1);
    now = 1_200;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('clear empties the map', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});

describe('buildKey', () => {
  it('is stable when recall id order changes', () => {
    const a = buildKey('parent-young-kids', {
      q: 'cheese',
      classification: 'Class I',
      status: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      location: '',
      recallIds: ['F-2', 'F-1'],
    });
    const b = buildKey('parent-young-kids', {
      q: 'cheese',
      classification: 'Class I',
      status: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      location: '',
      recallIds: ['F-1', 'F-2'],
    });
    expect(a).toBe(b);
    expect(JSON.parse(a).recallIds).toEqual(['F-1', 'F-2']);
  });

  it('changes when the query changes', () => {
    const a = buildKey('parent-young-kids', { q: 'cheese', recallIds: ['F-1'] });
    const b = buildKey('parent-young-kids', { q: 'formula', recallIds: ['F-1'] });
    expect(a).not.toBe(b);
  });
});

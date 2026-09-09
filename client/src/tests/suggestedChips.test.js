/**
 * suggestedChips.test.js
 * Purpose: Monogram initials and string-vs-object chip helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  chipAccessibleName,
  firmMonogram,
  formatRecallCount,
  suggestionCount,
  suggestionPhrase,
} from '../lib/suggestedChips.js';

describe('suggestionPhrase / suggestionCount', () => {
  it('reads both legacy strings and { phrase, count } objects', () => {
    expect(suggestionPhrase('Acme Foods')).toBe('Acme Foods');
    expect(suggestionPhrase({ phrase: 'Acme Foods', count: 12 })).toBe('Acme Foods');
    expect(suggestionCount('Acme Foods')).toBe(0);
    expect(suggestionCount({ phrase: 'Acme Foods', count: 12 })).toBe(12);
    expect(suggestionCount({ phrase: 'FreshPoint', count: 0 })).toBe(0);
  });
});

describe('firmMonogram', () => {
  it('uses two letters and skips Inc/LLC', () => {
    expect(firmMonogram('Acme Foods Inc')).toBe('AF');
    expect(firmMonogram('FreshPoint')).toBe('FR');
    expect(firmMonogram('Truststone Group')).toBe('TG');
    expect(firmMonogram('')).toBe('?');
  });
});

describe('chipAccessibleName', () => {
  it('adds a count only when there is one', () => {
    expect(chipAccessibleName('Acme Foods', 0)).toBe('Acme Foods');
    expect(chipAccessibleName('Acme Foods', 1)).toBe('Acme Foods, 1 recall');
    expect(chipAccessibleName('Acme Foods', 40)).toBe('Acme Foods, 40 recalls');
    expect(formatRecallCount(40)).toBe('40 recalls');
  });
});

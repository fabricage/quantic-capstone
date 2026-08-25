/**
 * textSnippets.test.js
 * Purpose: Whitespace normalization, word-boundary truncation, and shorten helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeWhitespace,
  shortenProductTitle,
  shortenReason,
  truncateAtWord,
  wasShortened,
} from '../lib/textSnippets.js';

describe('textSnippets', () => {
  it('collapses extra whitespace', () => {
    expect(normalizeWhitespace('  peanut \n  butter  ')).toBe('peanut butter');
  });

  it('truncates at a word boundary and marks the result as shortened', () => {
    const original = 'Alpha bravo charlie delta echo foxtrot golf';
    const shortened = truncateAtWord(original, 20);
    expect(shortened.endsWith('…')).toBe(true);
    expect(shortened).not.toContain('foxtrot');
    expect(wasShortened(original, shortened)).toBe(true);
    expect(wasShortened('short', 'short')).toBe(false);
  });

  it('leaves short product titles and reasons unchanged', () => {
    expect(shortenProductTitle('Infant formula')).toBe('Infant formula');
    expect(shortenReason('Undeclared milk')).toBe('Undeclared milk');
  });
});

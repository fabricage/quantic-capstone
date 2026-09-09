/**
 * scroll.test.js
 * Purpose: Stub scrollIntoView and confirm the results-top selector is used.
 */
import { describe, expect, it, vi } from 'vitest';
import { scrollElementIntoView, scrollToPageTop, scrollToResultsTop } from '../lib/scroll.js';

describe('scrollElementIntoView', () => {
  it('calls scrollIntoView with block start', () => {
    const element = { scrollIntoView: vi.fn() };
    scrollElementIntoView(element);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('no-ops when the node is missing', () => {
    expect(() => scrollElementIntoView(null)).not.toThrow();
  });
});

describe('scrollToResultsTop', () => {
  it('scrolls the [data-results-top] node into view', () => {
    const element = { scrollIntoView: vi.fn() };
    const root = { querySelector: vi.fn(() => element) };
    scrollToResultsTop(root);
    expect(root.querySelector).toHaveBeenCalledWith('[data-results-top]');
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });
});

describe('scrollToPageTop', () => {
  it('calls window.scrollTo(0, 0)', () => {
    const win = { scrollTo: vi.fn() };
    scrollToPageTop(win);
    expect(win.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('no-ops when scrollTo is missing', () => {
    expect(() => scrollToPageTop({})).not.toThrow();
    expect(() => scrollToPageTop(null)).not.toThrow();
  });
});

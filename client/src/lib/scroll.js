/**
 * scroll.js
 * Purpose: Scroll helpers for pagination and for opening a recall.
 *
 * Pagination lives at the bottom. Without a sentinel, Next leaves the user
 * staring at the footer instead of the new first card. Target a short
 * [data-results-top] node (not the whole list) so scrollIntoView still
 * runs when the long results box already intersects the viewport.
 *
 * Opening detail is a different bug: the window scroll stays where the card
 * was. The detail page is shorter, so the browser clamps you to the bottom
 * (the FAQ) instead of the Back button.
 */

export function scrollElementIntoView(element, options = { block: 'start' }) {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView(options);
}

export function scrollToResultsTop(root = document) {
  const el = root.querySelector('[data-results-top]');
  scrollElementIntoView(el, { block: 'start' });
}

export function scrollToPageTop(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || typeof win.scrollTo !== 'function') return;
  win.scrollTo(0, 0);
}

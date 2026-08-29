/**
 * scroll.js
 * Purpose: Scroll a small results-top sentinel into view after pagination.
 *
 * Why: pagination lives at the bottom. Without this, Next leaves the user
 * staring at the footer instead of the new first card. Target a short
 * [data-results-top] node (not the whole list) so scrollIntoView still
 * runs when the long results box already intersects the viewport.
 */

export function scrollElementIntoView(element, options = { block: 'start' }) {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView(options);
}

export function scrollToResultsTop(root = document) {
  const el = root.querySelector('[data-results-top]');
  scrollElementIntoView(el, { block: 'start' });
}

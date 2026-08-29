/**
 * scroll.js
 * Purpose: Scroll the results panel into view after pagination changes.
 *
 * Why: pagination lives at the bottom. Without this, Next leaves the user
 * staring at the footer instead of the new first card.
 */

export function scrollElementIntoView(element, options = { block: 'start' }) {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView(options);
}

export function scrollToResultsTop(root = document) {
  const el = root.querySelector('[data-results-top]');
  scrollElementIntoView(el, { block: 'start' });
}

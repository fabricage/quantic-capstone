/**
 * textSnippets.js
 * Purpose: Shorten long FDA product/reason text for cards. Full text is for Card 5.
 */

export function normalizeWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Cut at the last whole word that still fits, then add an ellipsis.
 * Why: mid-word cuts look broken on result cards.
 */
export function truncateAtWord(text, maxLength) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, Math.max(0, maxLength));
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[.,;:]+$/, '')}…`;
}

export function shortenProductTitle(text) {
  return truncateAtWord(text, 96);
}

export function shortenReason(text) {
  return truncateAtWord(text, 140);
}

export function wasShortened(original, shortened) {
  return normalizeWhitespace(original) !== String(shortened ?? '');
}

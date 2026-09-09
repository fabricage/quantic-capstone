/**
 * suggestedChips.js
 * Purpose: Normalize company-chip payloads and draw a 1–2 letter monogram.
 *
 * FDA and CPSC do not ship company logos. A colored initial badge is the
 * honest stand-in: no guessed domains, no third-party logo CDN.
 *
 * Keep LOOKBACK_WINDOWS labels in sync with server/lib/suggestedSearches.js.
 */

export const DEFAULT_LOOKBACK_WINDOW = '1y';

export const LOOKBACK_WINDOWS = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: '2y', label: '2 years' },
  { id: '5y', label: '5 years' },
];

const LEGAL_SKIP = new Set([
  'inc',
  'llc',
  'ltd',
  'co',
  'corp',
  'the',
  'of',
  'and',
  'dba',
]);

/**
 * Chip text: older APIs sent a string; newer ones send `{ phrase, count }`.
 */
export function suggestionPhrase(item) {
  if (typeof item === 'string') return item.trim();
  return String(item?.phrase ?? '').trim();
}

/**
 * Recall count when the BFF sent one. Strings and website-only firms return 0.
 */
export function suggestionCount(item) {
  if (typeof item === 'string') return 0;
  const count = Number(item?.count);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * One or two letters from the company name, skipping Inc/LLC/The.
 * "Acme Foods Inc" → AF. "FreshPoint" → FR.
 */
export function firmMonogram(phrase) {
  const words = String(phrase ?? '')
    .trim()
    .split(/\s+/)
    .filter((word) => {
      const cleaned = word.toLowerCase().replace(/[.,]/g, '');
      return cleaned && !LEGAL_SKIP.has(cleaned);
    });

  if (words.length === 0) {
    const fallback = String(phrase ?? '').replace(/[^a-zA-Z0-9]/g, '');
    return (fallback.slice(0, 2) || '?').toUpperCase();
  }
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/**
 * Screen-reader name. Keep the phrase alone when we have no count so older
 * tests and recent-search chips stay easy to find.
 */
export function chipAccessibleName(phrase, count) {
  const name = String(phrase ?? '').trim();
  if (!name) return 'Company';
  if (count > 0) {
    const noun = count === 1 ? 'recall' : 'recalls';
    return `${name}, ${count} ${noun}`;
  }
  return name;
}

export function formatRecallCount(count) {
  if (!(count > 0)) return '';
  return count === 1 ? '1 recall' : `${count} recalls`;
}

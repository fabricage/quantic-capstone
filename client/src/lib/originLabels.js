/**
 * originLabels.js
 * Purpose: USA / China / Other filter options and origin chips.
 *
 * Lesson: FDA `country` is usually the recalling firm (often United States).
 * CPSC manufacturer country is often China. Same filter values, different
 * meanings — chips and detail copy must not treat them as one fact.
 */

export const ORIGIN_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'usa', label: 'USA' },
  { value: 'china', label: 'China' },
  { value: 'other', label: 'Other' },
];

export function originShortLabel(origin) {
  if (origin === 'usa') return 'USA';
  if (origin === 'china') return 'China';
  if (origin === 'other') return 'Other';
  return '';
}

/**
 * Chip text for a recall. Empty when origin is unknown.
 */
export function originLabel(recall) {
  const short = originShortLabel(recall?.origin);
  if (!short) return '';
  if (recall?.source === 'consumer') {
    return `Manufacturer: ${short}`;
  }
  return `Recalling firm: ${short}`;
}

export function originFieldLabel(recall) {
  if (recall?.source === 'consumer') return 'Manufacturer country';
  return 'Recalling-firm country';
}

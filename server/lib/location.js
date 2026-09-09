/**
 * location.js
 * Purpose: USA / China / Other origin labels.
 *
 * Lesson: FDA `country` is usually the recalling firm (often United States).
 * CPSC `ManufacturerCountries` is the manufacturer (often China). Same
 * filter values, different meanings — UI copy must not treat them as one fact.
 */

export const ORIGIN_FILTERS = ['usa', 'china', 'other'];

export function parseLocationFilter(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return ORIGIN_FILTERS.includes(value) ? value : '';
}

/**
 * Classify a free-text country. Blank → ''. China/PRC/"includes china"
 * win as china; USA / United States / US / america → usa; else other.
 */
export function classifyCountry(raw) {
  if (raw == null) return '';
  const text = String(raw).trim().toLowerCase();
  if (!text) return '';
  if (text.includes('includes china') || /\bchina\b/.test(text) || /\bprc\b/.test(text)) {
    return 'china';
  }
  if (
    text.includes('united states') ||
    /\bamerica\b/.test(text) ||
    /\busa\b/.test(text) ||
    /\bu\.s\.a\.?\b/.test(text) ||
    /\bu\.s\.?\b/.test(text) ||
    /(^|[^a-z])us([^a-z]|$)/.test(text)
  ) {
    return 'usa';
  }
  return 'other';
}

function countryTextFromItem(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return item.Country ?? item.country ?? item.Name ?? item.name ?? '';
}

/**
 * CPSC ManufacturerCountries may be { Country }, { Name }, or strings.
 * China wins if present anywhere, then USA, then other.
 */
export function originFromCpscCountries(list) {
  const labels = [];
  const items = Array.isArray(list) ? list : list ? [list] : [];
  for (const item of items) {
    const origin = classifyCountry(countryTextFromItem(item));
    if (origin) labels.push(origin);
  }
  if (labels.includes('china')) return 'china';
  if (labels.includes('usa')) return 'usa';
  if (labels.includes('other')) return 'other';
  return '';
}

export function originFromFdaRecord(record = {}) {
  return classifyCountry(record.country);
}

export function originFromCpscRecord(record = {}) {
  return originFromCpscCountries(record.ManufacturerCountries);
}

/**
 * Unknown origin is excluded when a filter is set.
 */
export function originMatchesFilter(origin, filter) {
  const parsed = parseLocationFilter(filter);
  if (!parsed) return true;
  if (!origin) return false;
  return origin === parsed;
}

export function fdaCountrySearchClause(location) {
  const parsed = parseLocationFilter(location);
  if (parsed === 'usa') return 'country:"United States"';
  if (parsed === 'china') return 'country:"China"';
  if (parsed === 'other') return '-country:"United States" AND -country:"China"';
  return '';
}

export function originDisplayLabel(origin) {
  if (origin === 'usa') return 'USA';
  if (origin === 'china') return 'China';
  if (origin === 'other') return 'Other';
  return '';
}

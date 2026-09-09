/**
 * suggestedSearches.js
 * Purpose: Turn FDA firm counts + CPSC samples into 8 chips per source.
 *
 * Website-fresh firms (press-release / listing HTML) fill leftover slots
 * after the highest-count firms, so a brand-new posting can still appear
 * without crowding out “most recalls.” CPSC has no count= aggregation —
 * we tally names ourselves.
 *
 * Each chip is `{ phrase, count }` so the UI can show how many recalls
 * that firm has in the window.
 *
 * Lesson: CPSC retailer strings like "Online at Amazon.com from September
 * 2024…" are not company names. isUsableFirmPhrase drops them.
 */

export const SUGGESTED_PER_SOURCE = 8;
export const SUGGESTED_LABEL = 'Companies with the most recalls';
export const MAX_FIRM_PHRASE_LENGTH = 36;

/**
 * Chip lookback windows. `days` is how far back we ask FDA/CPSC to count.
 * Default is 1 year so "most recalls" feels current, not a 5-year all-time list.
 */
export const LOOKBACK_WINDOWS = [
  { id: '1m', label: '1 month', days: 30 },
  { id: '3m', label: '3 months', days: 90 },
  { id: '6m', label: '6 months', days: 182 },
  { id: '1y', label: '1 year', days: 365 },
  { id: '2y', label: '2 years', days: 730 },
  { id: '5y', label: '5 years', days: 5 * 365 },
];
export const DEFAULT_LOOKBACK_WINDOW = '1y';

/** Days for the old 5-year tally — kept as an alias of the 5y window. */
export const FIRM_COUNT_LOOKBACK_DAYS = LOOKBACK_WINDOWS.find((row) => row.id === '5y').days;

/**
 * Public window list for the client (id + label only).
 */
export function publicLookbackWindows() {
  return LOOKBACK_WINDOWS.map(({ id, label }) => ({ id, label }));
}

/**
 * Map a query string like "3m" to a known window. Unknown values fall back to 1 year.
 */
export function resolveLookbackWindow(raw) {
  const id = String(raw ?? '')
    .trim()
    .toLowerCase();
  return LOOKBACK_WINDOWS.find((row) => row.id === id) || LOOKBACK_WINDOWS.find((row) => row.id === DEFAULT_LOOKBACK_WINDOW);
}

const MONTHS =
  'january|february|march|april|may|june|july|august|september|october|november|december';

/**
 * UTC calendar date `days` ago, as YYYY-MM-DD.
 */
export function daysAgoDate(days, now = new Date()) {
  const n = Number(days);
  const offset = Number.isFinite(n) ? n : 0;
  const day = new Date(now);
  day.setUTCDate(day.getUTCDate() - offset);
  const year = day.getUTCFullYear();
  const month = String(day.getUTCMonth() + 1).padStart(2, '0');
  const date = String(day.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Chip text: drop "dba …", take the text before the first comma, cap ~36 chars.
 */
export function phraseFromFirm(raw) {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  text = text.replace(/\s+(?:d\/?b\/?a\.?|doing business as)\s+[\s\S]*$/i, '').trim();
  const comma = text.indexOf(',');
  if (comma > 0) text = text.slice(0, comma).trim();
  text = text.replace(/[.,;:]+$/g, '').trim();
  if (text.length > MAX_FIRM_PHRASE_LENGTH) {
    const sliced = text.slice(0, MAX_FIRM_PHRASE_LENGTH);
    const lastSpace = sliced.lastIndexOf(' ');
    text = (lastSpace >= 12 ? sliced.slice(0, lastSpace) : sliced).trim();
  }
  return text;
}

/**
 * True when the phrase looks like a company name, not a retailer/date dump.
 */
export function isUsableFirmPhrase(phrase) {
  const text = String(phrase ?? '').trim();
  if (text.length < 3) return false;
  const lower = text.toLowerCase();
  if (/^online\s+at\b/.test(lower)) return false;
  if (/\bsold\s+(?:exclusively\s+)?at\b/.test(lower)) return false;
  if (new RegExp(`\\bfrom\\s+(?:${MONTHS})\\b`, 'i').test(lower)) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/^\d+$/.test(text)) return false;
  return true;
}

function namesFromCompanyList(list) {
  if (!Array.isArray(list)) return [];
  const names = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      names.push(item);
      continue;
    }
    const name = item?.Name ?? item?.name ?? '';
    if (name) names.push(String(name));
  }
  return names;
}

function firmNamesFromRecall(record = {}) {
  if (typeof record === 'string') return [record];
  const fromLists = [
    ...namesFromCompanyList(record.Manufacturers),
    ...namesFromCompanyList(record.Importers),
    ...namesFromCompanyList(record.Retailers),
  ];
  if (fromLists.length) return fromLists;
  if (record.firm) return [String(record.firm)];
  if (record.recalling_firm) return [String(record.recalling_firm)];
  if (record.term) return [String(record.term)];
  return [];
}

function asCountRows(counts) {
  if (!Array.isArray(counts)) return [];
  return counts
    .map((row) => {
      if (typeof row === 'string') {
        return { term: row, count: 1 };
      }
      const term = row?.term ?? row?.firm ?? '';
      const count = Number(row?.count);
      return { term: String(term), count: Number.isFinite(count) ? count : 1 };
    })
    .filter((row) => row.term);
}

/**
 * Tally usable firm phrases from a CPSC (or mixed) recall sample.
 */
export function countFirmsFromRecalls(records) {
  const tallies = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const seen = new Set();
    for (const name of firmNamesFromRecall(record)) {
      const phrase = phraseFromFirm(name);
      if (!isUsableFirmPhrase(phrase)) continue;
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const current = tallies.get(key);
      if (current) current.count += 1;
      else tallies.set(key, { term: phrase, count: 1 });
    }
  }
  return [...tallies.values()].sort(
    (a, b) => b.count - a.count || a.term.localeCompare(b.term),
  );
}

function phrasesFromRecentFirms(list) {
  const items = Array.isArray(list) ? list : [];
  const phrases = [];
  for (const item of items) {
    const raw =
      typeof item === 'string' ? item : item?.firm ?? item?.term ?? item?.Name ?? '';
    const phrase = phraseFromFirm(raw);
    if (isUsableFirmPhrase(phrase)) phrases.push(phrase);
  }
  return phrases;
}

/**
 * Highest counts first so the chips match “companies with the most recalls.”
 * Website-fresh names still appear, but only in leftover slots when they
 * are not already in the tally (count 0).
 */
function mergeFirmPhrases(recentFirms, counts) {
  const seen = new Set();
  const items = [];
  const frequency = asCountRows(counts)
    .map((row) => ({
      phrase: phraseFromFirm(row.term),
      count: row.count,
    }))
    .filter((row) => isUsableFirmPhrase(row.phrase))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));

  const countByKey = new Map();
  for (const row of frequency) {
    const key = row.phrase.toLowerCase();
    if (!countByKey.has(key)) countByKey.set(key, row.count);
  }

  function push(phrase, count) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ phrase, count: Number.isFinite(count) ? count : 0 });
  }

  for (const row of frequency) {
    push(row.phrase, row.count);
    if (items.length >= SUGGESTED_PER_SOURCE) return items;
  }
  for (const phrase of phrasesFromRecentFirms(recentFirms)) {
    push(phrase, countByKey.get(phrase.toLowerCase()) ?? 0);
    if (items.length >= SUGGESTED_PER_SOURCE) break;
  }
  return items;
}

function sourceGroup(id, label, source, suggestions) {
  if (!suggestions.length) return null;
  return { id, label, source, suggestions };
}

/**
 * Website-fresh firms first, then frequency. Empty sources are omitted.
 */
export function buildSuggestedSearchGroups({
  foodCounts = [],
  consumerCounts = [],
  recentFoodFirms = [],
  recentConsumerFirms = [],
} = {}) {
  const groups = [
    sourceGroup('food', 'FDA food', 'food', mergeFirmPhrases(recentFoodFirms, foodCounts)),
    sourceGroup(
      'consumer',
      'CPSC consumer',
      'consumer',
      mergeFirmPhrases(recentConsumerFirms, consumerCounts),
    ),
  ].filter(Boolean);

  return {
    label: SUGGESTED_LABEL,
    groups,
    suggestions: [],
  };
}

export function emptySuggestedSearchPayload(windowId = DEFAULT_LOOKBACK_WINDOW) {
  const window = resolveLookbackWindow(windowId);
  return {
    label: SUGGESTED_LABEL,
    window: window.id,
    windows: publicLookbackWindows(),
    groups: [],
    suggestions: [],
  };
}

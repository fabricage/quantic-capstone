/**
 * suggestedSearches.js
 * Purpose: Turn FDA firm counts + CPSC samples into 8 chips per source.
 *
 * Website-fresh firms (press-release / listing HTML) are prepended so a
 * company that just posted is visible even if it is not yet in the 5-year
 * frequency tally. CPSC has no count= aggregation — we tally names ourselves.
 *
 * Lesson: CPSC retailer strings like "Online at Amazon.com from September
 * 2024…" are not company names. isUsableFirmPhrase drops them.
 */

export const SUGGESTED_PER_SOURCE = 8;
export const FIRM_COUNT_LOOKBACK_DAYS = 5 * 365;
export const SUGGESTED_LABEL = 'Companies with the most recalls';
export const MAX_FIRM_PHRASE_LENGTH = 36;

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

function mergeFirmPhrases(recentFirms, counts) {
  const seen = new Set();
  const phrases = [];
  const frequency = asCountRows(counts)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .map((row) => phraseFromFirm(row.term))
    .filter(isUsableFirmPhrase);

  for (const phrase of [...phrasesFromRecentFirms(recentFirms), ...frequency]) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
    if (phrases.length >= SUGGESTED_PER_SOURCE) break;
  }
  return phrases;
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

export function emptySuggestedSearchPayload() {
  return {
    label: SUGGESTED_LABEL,
    groups: [],
    suggestions: [],
  };
}

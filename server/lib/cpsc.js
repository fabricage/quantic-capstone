/**
 * cpsc.js
 * Purpose: Official saferproducts.gov Recall REST client. API only — no HTML scrape.
 *
 * CPSC has no skip/limit. We fetch the matching set, union keyword fields
 * in memory, then the route paginates. Browse-"latest" uses a 2-year
 * LastPublishDate window and then drops stale republishes (see cpscDates.js).
 */
import {
  cpscSortDate,
  isRecentCpscAnnouncement,
  toCpscDay,
} from './cpscDates.js';

export const CPSC_BASE = 'https://www.saferproducts.gov/RestWebServices/Recall';

const KEYWORD_FIELDS = [
  'ProductName',
  'RecallTitle',
  'Manufacturer',
  'Retailer',
  'Importer',
];

/**
 * Format a date as YYYY-MM-DD for CPSC query params.
 */
export function toCpscDate(value) {
  const day = toCpscDay(value);
  if (!day) return '';
  const year = day.getUTCFullYear();
  const month = String(day.getUTCMonth() + 1).padStart(2, '0');
  const date = String(day.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function buildCpscParams({
  ProductName,
  RecallTitle,
  Manufacturer,
  Retailer,
  Importer,
  RecallDateStart,
  RecallDateEnd,
  LastPublishDateStart,
  LastPublishDateEnd,
} = {}) {
  const params = new URLSearchParams();
  params.set('format', 'json');
  const fields = {
    ProductName,
    RecallTitle,
    Manufacturer,
    Retailer,
    Importer,
    RecallDateStart,
    RecallDateEnd,
    LastPublishDateStart,
    LastPublishDateEnd,
  };
  for (const [key, value] of Object.entries(fields)) {
    const text = value == null ? '' : String(value).trim();
    if (text) params.set(key, text);
  }
  return params;
}

function recallKey(record) {
  if (!record || typeof record !== 'object') return '';
  if (record.RecallNumber != null && String(record.RecallNumber).trim()) {
    return `n:${String(record.RecallNumber).trim()}`;
  }
  if (record.RecallID != null && String(record.RecallID).trim()) {
    return `i:${String(record.RecallID).trim()}`;
  }
  return '';
}

export function unionCpscRecalls(lists) {
  const byKey = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const record of list) {
      const key = recallKey(record);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, record);
    }
  }
  return [...byKey.values()];
}

/**
 * In-memory page after merge. Over-fetches skip+limit+40, then slices the page.
 */
export function paginateCpscRecalls(records, skip = 0, limit = 20) {
  const list = Array.isArray(records) ? records : [];
  const start = Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0;
  const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const window = list.slice(0, start + size + 40);
  return {
    total: list.length,
    results: window.slice(start, start + size),
  };
}

function twoYearsBefore(now) {
  const day = toCpscDay(now) || toCpscDay(new Date());
  return new Date(Date.UTC(day.getUTCFullYear() - 2, day.getUTCMonth(), day.getUTCDate()));
}

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getCpsc(params, fetchImpl) {
  const url = `${CPSC_BASE}?${params.toString()}`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RecallLedger/0.1',
    },
  });
  if (!response.ok) {
    throw httpError(`CPSC request failed (${response.status})`, response.status);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function sortRawByCpscDate(records) {
  return [...records].sort((a, b) => {
    const da = cpscSortDate(a)?.getTime() ?? 0;
    const db = cpscSortDate(b)?.getTime() ?? 0;
    return db - da;
  });
}

/**
 * Fetch CPSC recalls. Keyword searches OR across product / title / firm fields
 * so a company chip still matches Manufacturer, Retailer, or Importer.
 */
export async function fetchCpscRecalls(
  { q = '', dateFrom = '', dateTo = '', now = new Date() } = {},
  fetchImpl = fetch,
) {
  const keyword = String(q ?? '').trim();
  const recallStart = toCpscDate(dateFrom);
  const recallEnd = toCpscDate(dateTo);
  const browsingLatest = !keyword && !recallStart && !recallEnd;

  if (browsingLatest) {
    const windowStart = twoYearsBefore(now);
    const params = buildCpscParams({
      LastPublishDateStart: toCpscDate(windowStart),
    });
    const records = await getCpsc(params, fetchImpl);
    return sortRawByCpscDate(
      records.filter((record) => isRecentCpscAnnouncement(record, windowStart)),
    );
  }

  const dateParams = {
    RecallDateStart: recallStart,
    RecallDateEnd: recallEnd,
  };

  if (!keyword) {
    return sortRawByCpscDate(await getCpsc(buildCpscParams(dateParams), fetchImpl));
  }

  const settled = await Promise.allSettled(
    KEYWORD_FIELDS.map((field) =>
      getCpsc(buildCpscParams({ [field]: keyword, ...dateParams }), fetchImpl),
    ),
  );
  const lists = [];
  let failures = 0;
  for (const item of settled) {
    if (item.status === 'fulfilled') lists.push(item.value);
    else failures += 1;
  }
  if (failures === KEYWORD_FIELDS.length) {
    const reason = settled[0].reason;
    throw reason instanceof Error ? reason : httpError('CPSC request failed', 502);
  }
  return sortRawByCpscDate(unionCpscRecalls(lists));
}

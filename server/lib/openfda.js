/**
 * openfda.js
 * Purpose: Build openFDA food-enforcement search queries and fetch recall records.
 */

const OPENFDA_BASE = 'https://api.fda.gov/food/enforcement.json';

/**
 * Escape characters that would break an openFDA search term.
 * Why: backslash and quotes are special in openFDA query syntax.
 */
export function escapeSearchTerm(term) {
  return String(term ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Trim, escape, and quote a keyword for openFDA.
 * Why: quoting a single word inside an OR group makes openFDA return
 * almost nothing; multi-word phrases must be quoted to stay a phrase.
 */
export function formatKeyword(q) {
  const trimmed = String(q ?? '').trim();
  if (!trimmed) return '';
  const escaped = escapeSearchTerm(trimmed);
  if (/\s/.test(trimmed)) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * Convert a date string to openFDA's compact YYYYMMDD, or null if invalid.
 */
export function toOpenFdaDate(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) return raw;
  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) return `${dashed[1]}${dashed[2]}${dashed[3]}`;
  return null;
}

/**
 * Build the keyword search clause: product OR recalling firm.
 * Why: spaces around OR are required; empty q must not send a search param.
 */
export function buildSearchQuery({ q } = {}) {
  const term = formatKeyword(q);
  if (!term) return '';
  return `(product_description:${term} OR recalling_firm:${term})`;
}

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Fetch food-enforcement records from openFDA.
 * Why: sort by report_date (FDA publication date), not recall_initiation_date —
 * initiation can predate the weekly Enforcement Report and makes "latest" look stale.
 * 404 means "no matches" in openFDA, not a transport failure.
 */
export async function fetchRecalls(
  { q = '', limit = 10, skip = 0 } = {},
  fetchImpl = fetch,
) {
  const url = new URL(OPENFDA_BASE);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('skip', String(skip));
  url.searchParams.set('sort', 'report_date:desc');

  const search = buildSearchQuery({ q });
  if (search) {
    url.searchParams.set('search', search);
  }

  const response = await fetchImpl(url.toString());

  if (response.status === 404) {
    throw httpError('No matching recalls', 404);
  }
  if (!response.ok) {
    throw httpError(`openFDA request failed (${response.status})`, response.status);
  }

  const data = await response.json();
  return {
    total: data.meta?.results?.total ?? 0,
    results: data.results ?? [],
    lastUpdated: data.meta?.last_updated ?? '',
  };
}

export { OPENFDA_BASE };

/**
 * api.js
 * Purpose: Browser → Express BFF helpers. The client never calls openFDA directly.
 *
 * Locally VITE_API_BASE_URL is empty, so requests stay same-origin and Vite proxies /api.
 * Production builds set VITE_API_BASE_URL (no trailing slash) so apiUrl prefixes the
 * Render API origin, e.g. https://recall-ledger-api.onrender.com/api/recalls.
 */

export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL ?? '';
  return String(raw).replace(/\/+$/, '');
}

export function apiUrl(path) {
  const base = getApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

const SEARCH_ERROR_MESSAGE =
  'We couldn’t load recalls right now. Please try again.';

/**
 * Keyword search against the BFF.
 * Why: injectable fetchImpl lets tests stub the network without hitting Express.
 * Failures throw a fixed, user-safe message — never status text or upstream dumps.
 */
export async function searchRecalls(
  {
    q = '',
    limit = 20,
    skip = 0,
    classification = '',
    status = '',
    dateFrom = '',
    dateTo = '',
    source = '',
    location = '',
  } = {},
  fetchImpl = fetch,
) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  params.set('skip', String(skip));
  if (classification) params.set('classification', classification);
  if (status) params.set('status', status);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (source) params.set('source', source);
  if (location) params.set('location', location);

  try {
    const response = await fetchImpl(apiUrl(`/api/recalls?${params.toString()}`));
    if (!response.ok) {
      throw new Error(SEARCH_ERROR_MESSAGE);
    }
    return await response.json();
  } catch (err) {
    if (err instanceof Error && err.message === SEARCH_ERROR_MESSAGE) {
      throw err;
    }
    throw new Error(SEARCH_ERROR_MESSAGE);
  }
}

const EMPTY_SUGGESTED_SEARCHES = { label: '', groups: [], suggestions: [] };

/**
 * Company chips from the BFF. Soft-fails to empty groups so a down
 * trending endpoint never blanks the search form.
 */
export async function fetchSuggestedSearches(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(apiUrl('/api/trending-searches'));
    if (!response?.ok) return EMPTY_SUGGESTED_SEARCHES;
    const data = await response.json();
    const groups = Array.isArray(data?.groups) ? data.groups : [];
    return {
      label: typeof data?.label === 'string' ? data.label : '',
      groups,
      suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
    };
  } catch {
    return EMPTY_SUGGESTED_SEARCHES;
  }
}

export async function fetchPersonas(fetchImpl = fetch) {
  const response = await fetchImpl(apiUrl('/api/personas'));
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

/**
 * Ask the BFF to rank recalls for a persona.
 * Why: ranking is optional. A missing key, 4xx, or network error must not
 * crash the UI — Card 10 will keep FDA order when fallback is true.
 */
export async function rankRecallsForPersona(body, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(apiUrl('/api/persona-rank'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      return { fallback: true };
    }
    if (!response.ok || data?.fallback) {
      return { fallback: true, error: data?.error };
    }
    return data;
  } catch {
    return { fallback: true };
  }
}

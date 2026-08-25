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

/**
 * Keyword search against the BFF.
 * Why: injectable fetchImpl lets tests stub the network without hitting Express.
 */
export async function searchRecalls(
  { q = '', limit = 20, skip = 0 } = {},
  fetchImpl = fetch,
) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  params.set('skip', String(skip));

  const response = await fetchImpl(apiUrl(`/api/recalls?${params.toString()}`));
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = String(body.error);
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

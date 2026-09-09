/**
 * fetchHtml.js
 * Purpose: Fetch listing HTML. cpsc.gov / fda.gov often 403 (Akamai) from
 * cloud IPs — retry through Jina with X-Return-Format: html.
 */

export const JINA_PREFIX = 'https://r.jina.ai/';
export const HTML_TIMEOUT_MS = 25_000;
export const MIN_HTML_LENGTH = 200;

/**
 * True when the response looks like a bot/WAF block, not a real listing page.
 */
export function looksBlocked(status, body = '', finalUrl = '') {
  if (status === 401 || status === 403 || status === 429) return true;
  const text = String(body).toLowerCase();
  const url = String(finalUrl).toLowerCase();
  if (text.includes('access denied')) return true;
  if (text.includes('errors.edgesuite.net') || url.includes('errors.edgesuite.net')) return true;
  if (text.includes('abuse') && (text.includes('detection') || text.includes('fda.gov'))) {
    return true;
  }
  if (text.includes('unusual traffic') && text.includes('fda')) return true;
  return false;
}

function jinaUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith(JINA_PREFIX)) return raw;
  return `${JINA_PREFIX}${raw}`;
}

async function fetchOnce(url, fetchImpl, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTML_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'RecallLedger/0.1',
        ...headers,
      },
      signal: controller.signal,
    });
    const body = typeof response.text === 'function' ? await response.text() : '';
    const finalUrl = response.url || url;
    return { status: response.status, ok: Boolean(response.ok), body, finalUrl };
  } finally {
    clearTimeout(timer);
  }
}

function usableHtml(result) {
  if (!result || !result.ok) return false;
  if (looksBlocked(result.status, result.body, result.finalUrl)) return false;
  return String(result.body).length > MIN_HTML_LENGTH;
}

/**
 * Direct fetch first. On failure, short body, or a WAF block, retry via Jina.
 */
export async function fetchHtml(url, fetchImpl = fetch) {
  const target = String(url ?? '').trim();
  if (!target) return '';

  try {
    const direct = await fetchOnce(target, fetchImpl);
    if (usableHtml(direct)) return direct.body;
  } catch {
    // Fall through to Jina. Cloud IPs often cannot reach cpsc.gov at all.
  }

  try {
    const viaJina = await fetchOnce(jinaUrl(target), fetchImpl, {
      'X-Return-Format': 'html',
    });
    if (usableHtml(viaJina)) return viaJina.body;
  } catch {
    return '';
  }
  return '';
}

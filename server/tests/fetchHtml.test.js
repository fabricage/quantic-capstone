/**
 * fetchHtml.test.js
 * Purpose: WAF/block detection, direct success, and Jina fallback on 403.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHtml, looksBlocked } from '../lib/fetchHtml.js';

function htmlResponse(status, body, url = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    text: async () => body,
  };
}

const listing = `<!doctype html><html><body>${'recall-list '.repeat(40)}</body></html>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('looksBlocked', () => {
  it('treats 401/403/429 and common WAF pages as blocked', () => {
    expect(looksBlocked(403, '', '')).toBe(true);
    expect(looksBlocked(401, '', '')).toBe(true);
    expect(looksBlocked(429, '', '')).toBe(true);
    expect(looksBlocked(200, 'Access Denied', '')).toBe(true);
    expect(looksBlocked(200, 'see errors.edgesuite.net', '')).toBe(true);
    expect(looksBlocked(200, '', 'https://errors.edgesuite.net/foo')).toBe(true);
    expect(
      looksBlocked(200, 'FDA abuse detection: we apologize for the inconvenience', ''),
    ).toBe(true);
    expect(looksBlocked(200, listing, 'https://www.cpsc.gov/Recalls')).toBe(false);
  });
});

describe('fetchHtml', () => {
  it('returns the direct body when the listing is usable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse(200, listing, 'https://www.fda.gov/x'));
    await expect(fetchHtml('https://www.fda.gov/x', fetchImpl)).resolves.toBe(listing);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe('https://www.fda.gov/x');
  });

  it('retries through Jina with X-Return-Format: html after a 403', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.startsWith('https://r.jina.ai/')) {
        return htmlResponse(200, listing, href);
      }
      return htmlResponse(403, 'Access Denied', href);
    });

    const html = await fetchHtml('https://www.cpsc.gov/Recalls', fetchImpl);
    expect(html).toBe(listing);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const jinaCall = fetchImpl.mock.calls[1];
    expect(String(jinaCall[0])).toBe('https://r.jina.ai/https://www.cpsc.gov/Recalls');
    expect(jinaCall[1].headers['X-Return-Format']).toBe('html');
  });
});

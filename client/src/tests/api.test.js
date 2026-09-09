/**
 * api.test.js
 * Purpose: getApiBase / apiUrl, search errors, category forwarding, and
 * company-chip / category soft-fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('apiUrl / getApiBase', () => {
  it('uses a same-origin relative path when VITE_API_BASE_URL is unset', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { apiUrl, getApiBase } = await import('../api.js');
    expect(getApiBase()).toBe('');
    expect(apiUrl('/api/recalls')).toBe('/api/recalls');
  });

  it('prefixes the API origin and strips a trailing slash when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
    vi.resetModules();
    const { apiUrl, getApiBase } = await import('../api.js');
    expect(getApiBase()).toBe('https://api.example.com');
    expect(apiUrl('/api/recalls')).toBe('https://api.example.com/api/recalls');
  });
});

describe('searchRecalls', () => {
  it('forwards location onto /api/recalls', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { searchRecalls } = await import('../api.js');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, results: [] }),
    });
    await searchRecalls({ q: 'crib', source: 'consumer', location: 'china', limit: 5 }, fetchImpl);
    expect(fetchImpl).toHaveBeenCalled();
    const requested = String(fetchImpl.mock.calls[0][0]);
    expect(requested).toContain('/api/recalls');
    expect(requested).toContain('location=china');
    expect(requested).toContain('source=consumer');
  });

  it('forwards category onto /api/recalls', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { searchRecalls } = await import('../api.js');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, results: [] }),
    });
    await searchRecalls({ q: '', source: 'all', category: 'dairy', limit: 20 }, fetchImpl);
    const requested = String(fetchImpl.mock.calls[0][0]);
    expect(requested).toContain('/api/recalls');
    expect(requested).toContain('category=dairy');
    expect(requested).not.toMatch(/[?&]q=/);
  });

  it('throws a user-safe message instead of an upstream dump', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { searchRecalls } = await import('../api.js');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'ECONNREFUSED stack dump at TCPConnectWrap' }),
    });
    try {
      await searchRecalls({ q: 'milk' }, fetchImpl);
      throw new Error('searchRecalls should have thrown');
    } catch (err) {
      expect(err.message).toMatch(/couldn’t load recalls right now/i);
      expect(err.message).not.toMatch(/ECONNREFUSED|stack dump|TCPConnectWrap|Request failed/i);
    }
  });

  it('throws the same user-safe message when the network is down', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { searchRecalls } = await import('../api.js');
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchRecalls({ q: 'milk' }, fetchImpl)).rejects.toThrow(
      /couldn’t load recalls right now/i,
    );
  });
});

describe('fetchSuggestedSearches', () => {
  it('soft-fails to empty groups when the BFF is down', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { fetchSuggestedSearches } = await import('../api.js');
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(fetchSuggestedSearches(fetchImpl)).resolves.toEqual({
      label: '',
      groups: [],
      suggestions: [],
      window: '',
      windows: [],
    });
  });

  it('forwards the lookback window onto /api/trending-searches', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { fetchSuggestedSearches } = await import('../api.js');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ label: '', groups: [], suggestions: [], window: '3m', windows: [] }),
    });
    await fetchSuggestedSearches({ windowId: '3m', fetchImpl });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/api/trending-searches');
    expect(String(fetchImpl.mock.calls[0][0])).toContain('window=3m');
  });
});

describe('fetchCategories', () => {
  it('soft-fails to an empty list when the BFF is down', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { fetchCategories } = await import('../api.js');
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(fetchCategories(fetchImpl)).resolves.toEqual({ categories: [] });
  });

  it('soft-fails when the response is not ok', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { fetchCategories } = await import('../api.js');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchCategories(fetchImpl)).resolves.toEqual({ categories: [] });
  });
});

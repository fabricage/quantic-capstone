/**
 * api.test.js
 * Purpose: getApiBase / apiUrl, plus ranking client soft-fallback.
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

describe('rankRecallsForPersona', () => {
  it('returns { fallback: true } and does not throw when ranking fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const { rankRecallsForPersona } = await import('../api.js');
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(
      rankRecallsForPersona({ personaId: 'parent-young-kids' }, fetchImpl),
    ).resolves.toEqual({ fallback: true });
  });
});

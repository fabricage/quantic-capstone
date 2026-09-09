/**
 * websiteCache.js
 * Purpose: 5-minute TTL for scraped listing HTML so home traffic does not
 * re-hit Jina on every refresh. String URL keys are enough.
 */
import { createCache } from './cache.js';

export const WEBSITE_CACHE_TTL_MS = 5 * 60 * 1000;

export const websiteCache = createCache(WEBSITE_CACHE_TTL_MS);

export async function getCachedHtml(url, loader) {
  const key = String(url ?? '');
  const hit = websiteCache.get(key);
  if (typeof hit === 'string' && hit) return hit;
  const html = await loader();
  if (typeof html === 'string' && html) websiteCache.set(key, html);
  return html || '';
}

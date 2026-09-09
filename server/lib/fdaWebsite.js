/**
 * fdaWebsite.js
 * Purpose: Parse FDA recall / press-release listing. Keep food, skip drugs.
 * report_date on openFDA lags these press releases — merge when it helps freshness.
 */
import { fetchHtml } from './fetchHtml.js';
import { compactDate, stripTags } from './htmlText.js';
import { getCachedHtml } from './websiteCache.js';

export const FDA_RECALLS_URL =
  'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts';
export const FDA_SITE_ORIGIN = 'https://www.fda.gov';

export function absolutizeFdaUrl(src) {
  const raw = String(src ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${FDA_SITE_ORIGIN}${raw}`;
  return `${FDA_SITE_ORIGIN}/${raw}`;
}

export function parseFdaListingDate(htmlOrText) {
  const raw = String(htmlOrText ?? '');
  const iso = raw.match(/datetime="([^"]+)"/i);
  if (iso) return compactDate(iso[1]);
  return compactDate(stripTags(raw));
}

export function isFdaFoodProductType(type) {
  const text = String(type ?? '').toLowerCase();
  if (!text) return false;
  const isDrug = /\bdrugs?\b/.test(text) || /\bdrug\b/.test(text);
  const isFood = /\bfood\b/.test(text) || /\bbeverage/.test(text);
  if (isDrug && !isFood) return false;
  return isFood;
}

function cellByHeader(rowHtml, headerFragment) {
  const re = new RegExp(
    `<td\\b[^>]*headers="[^"]*${headerFragment}[^"]*"[^>]*>([\\s\\S]*?)</td>`,
    'i',
  );
  const match = rowHtml.match(re);
  return match ? match[1] : '';
}

export function parseFdaListing(html) {
  const source = String(html ?? '');
  const rows = [];
  const trs = source.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    if (/<th\b/i.test(tr)) continue;
    const dateCell = cellByHeader(tr, 'change-date') || cellByHeader(tr, 'field-change-date');
    const brandCell = cellByHeader(tr, 'brand-name');
    const productCell = cellByHeader(tr, 'product-description');
    const typeCell = cellByHeader(tr, 'regulated-product');
    const reasonCell = cellByHeader(tr, 'recall-reason');
    const companyCell = cellByHeader(tr, 'company-name');
    const productType = stripTags(typeCell);
    if (!isFdaFoodProductType(productType)) continue;
    const href = brandCell.match(/<a\b[^>]*href="([^"]+)"/i)?.[1] || '';
    const brand = stripTags(brandCell);
    const product = stripTags(productCell) || brand;
    const url = absolutizeFdaUrl(href);
    const recallDate = parseFdaListingDate(dateCell);
    const slug = url.split('/').filter(Boolean).pop() || String(rows.length);
    rows.push({
      id: `fda-web-${slug}`,
      firm: stripTags(companyCell) || brand,
      product,
      reason: stripTags(reasonCell),
      classification: '',
      status: '',
      state: '',
      recallDate,
      publishedDate: recallDate,
      source: 'food',
      url,
      imageUrl: '',
      imageAlt: '',
      country: '',
      origin: '',
    });
  }
  return rows;
}

export function fdaWebsiteRecallMatches(recall, { q = '', dateFrom = '', dateTo = '' } = {}) {
  const keyword = String(q ?? '').trim().toLowerCase();
  if (keyword) {
    const hay = `${recall.product || ''} ${recall.firm || ''} ${recall.reason || ''}`.toLowerCase();
    if (!hay.includes(keyword)) return false;
  }
  const from = compactDate(dateFrom);
  const to = compactDate(dateTo);
  const day = compactDate(recall.recallDate);
  if (from && day && day < from) return false;
  if (to && day && day > to) return false;
  return true;
}

export async function fetchFdaWebsiteRecalls(query = {}, fetchImpl = fetch) {
  const html = await getCachedHtml(FDA_RECALLS_URL, () => fetchHtml(FDA_RECALLS_URL, fetchImpl));
  return parseFdaListing(html).filter((row) => fdaWebsiteRecallMatches(row, query));
}

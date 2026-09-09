/**
 * cpscWebsite.js
 * Purpose: Parse the CPSC.gov recalls listing. Images are root-relative
 * /s3fs-public/... — absolutize against https://www.cpsc.gov.
 */
import { fetchHtml } from './fetchHtml.js';
import { compactDate, stripTags } from './htmlText.js';
import { getCachedHtml } from './websiteCache.js';

export const CPSC_RECALLS_URL = 'https://www.cpsc.gov/Recalls';
export const CPSC_SITE_ORIGIN = 'https://www.cpsc.gov';

/**
 * Listing photos are /s3fs-public/... — join them to the CPSC origin.
 */
export function absolutizeCpscUrl(src) {
  const raw = String(src ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${CPSC_SITE_ORIGIN}${raw}`;
  return `${CPSC_SITE_ORIGIN}/${raw}`;
}

export function parseCpscListingDate(text) {
  return compactDate(stripTags(text));
}

/**
 * "Truststone Group Recalls XO Poppy…" → Truststone Group
 */
export function firmFromCpscTitle(title) {
  const raw = String(title ?? '').trim();
  const match = raw.match(
    /^(.+?)\s+(?:voluntarily\s+)?(?:recalls|issues(?:\s+a)?\s+recall|announces(?:\s+a)?\s+recall)\b/i,
  );
  return match ? match[1].trim() : '';
}

function firstListingImage(block) {
  const gallery = block.match(/class="[^"]*recall-list__images[\s\S]*?<\/div>/i);
  const hay = gallery ? gallery[0] : block;
  const img = hay.match(/<img\b[^>]*>/i);
  if (!img) return { imageUrl: '', imageAlt: '' };
  const tag = img[0];
  const src = tag.match(/\bsrc\s*=\s*"([^"]+)"/i)?.[1] || '';
  const alt = tag.match(/\balt\s*=\s*"([^"]*)"/i)?.[1] || '';
  return { imageUrl: absolutizeCpscUrl(src), imageAlt: stripTags(alt) };
}

function titledLink(block) {
  const titleBlock = block.match(/class="[^"]*recall-list__title[\s\S]*?<\/div>/i);
  const hay = titleBlock ? titleBlock[0] : block;
  const link = hay.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!link) return { url: '', title: '' };
  return {
    url: absolutizeCpscUrl(link[1]),
    title: stripTags(link[2]),
  };
}

function labeledText(block, label) {
  const re = new RegExp(`${label}\\s*:?\\s*</div>([\\s\\S]*?)(?:<div class="recall-list__label"|$)`, 'i');
  const match = block.match(re);
  if (match) return stripTags(match[1]);
  const plain = block.match(new RegExp(`${label}\\s*:\\s*([^<]+)`, 'i'));
  return plain ? stripTags(plain[1]) : '';
}

export function parseCpscListing(html) {
  const source = String(html ?? '');
  const chunks = source.split(/<div class="recall-list">/i).slice(1);
  const rows = [];
  for (const chunk of chunks) {
    const dateText = chunk.match(/class="[^"]*recall-list__date[^"]*">([\s\S]*?)<\/div>/i)?.[1] || '';
    const recallDate = parseCpscListingDate(dateText);
    const { url, title } = titledLink(chunk);
    if (!title && !url) continue;
    const photo = firstListingImage(chunk);
    const reason = labeledText(chunk, 'Hazard');
    const slug = url.split('/').filter(Boolean).pop() || String(rows.length);
    rows.push({
      id: `cpsc-web-${slug}`,
      firm: firmFromCpscTitle(title),
      product: title,
      reason,
      classification: 'Consumer Product',
      status: '',
      state: '',
      recallDate,
      publishedDate: recallDate,
      source: 'consumer',
      url,
      imageUrl: photo.imageUrl,
      imageAlt: photo.imageAlt,
      country: '',
      origin: '',
    });
  }
  return rows;
}

export function websiteRecallMatches(recall, { q = '', dateFrom = '', dateTo = '' } = {}) {
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

export async function fetchCpscWebsiteRecalls(query = {}, fetchImpl = fetch) {
  const html = await getCachedHtml(CPSC_RECALLS_URL, () => fetchHtml(CPSC_RECALLS_URL, fetchImpl));
  return parseCpscListing(html).filter((row) => websiteRecallMatches(row, query));
}

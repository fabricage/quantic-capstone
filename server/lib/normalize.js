/**
 * normalize.js
 * Purpose: Map openFDA food and CPSC consumer records onto the shared recall shape.
 */
import { cpscSortDate } from './cpscDates.js';
import { originFromCpscRecord, originFromFdaRecord } from './location.js';

/**
 * Compact a date to YYYYMMDD, or '' when it is missing/invalid.
 */
export function toRecallDate(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) return raw;
  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return `${dashed[1]}${dashed[2]}${dashed[3]}`;
  return '';
}

function firstCompanyName(list) {
  if (!Array.isArray(list)) return '';
  for (const item of list) {
    const name = item?.Name ?? item?.name ?? '';
    if (name) return String(name);
  }
  return '';
}

function imageUrlOf(image) {
  return String(image?.URL ?? image?.Url ?? image?.url ?? '');
}

function imageScore(url) {
  const lower = String(url).toLowerCase();
  if (/\.(jpe?g|png|webp)(?:[?#]|$)/i.test(lower)) return 3;
  if (/\.gif(?:[?#]|$)/i.test(lower)) return 1;
  return 2;
}

/**
 * Prefer a still jpg/png/webp from Images[]. GIFs score lower (often a label loop).
 */
export function firstCpscImage(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return { imageUrl: '', imageAlt: '' };
  }
  let best = null;
  let bestScore = -1;
  for (const image of images) {
    const url = imageUrlOf(image);
    if (!url) continue;
    const score = imageScore(url);
    if (score > bestScore) {
      best = image;
      bestScore = score;
    }
  }
  if (!best) return { imageUrl: '', imageAlt: '' };
  return {
    imageUrl: imageUrlOf(best),
    imageAlt: String(best.Caption ?? best.caption ?? ''),
  };
}

function compactFromDay(day) {
  if (!day || Number.isNaN(day.getTime())) return '';
  const year = day.getUTCFullYear();
  const month = String(day.getUTCMonth() + 1).padStart(2, '0');
  const date = String(day.getUTCDate()).padStart(2, '0');
  return `${year}${month}${date}`;
}

function text(value) {
  if (value == null) return '';
  return String(value);
}

/**
 * Normalize one FDA food recall. Missing fields become '' never undefined.
 * Why: recallDate prefers report_date (the Enforcement Report publish date)
 * and only falls back to recall_initiation_date when publication is missing.
 */
export function normalizeRecall(raw) {
  const record = raw && typeof raw === 'object' ? raw : {};
  const publishedDate = toRecallDate(record.report_date);
  const initiationDate = toRecallDate(record.recall_initiation_date);

  return {
    id: text(record.recall_number),
    firm: text(record.recalling_firm),
    product: text(record.product_description),
    reason: text(record.reason_for_recall),
    classification: text(record.classification),
    status: text(record.status),
    state: text(record.state),
    recallDate: publishedDate || initiationDate,
    publishedDate,
    source: 'food',
    url: '',
    imageUrl: '',
    imageAlt: '',
    country: text(record.country),
    origin: originFromFdaRecord(record),
  };
}

export function normalizeFoodRecall(raw) {
  return normalizeRecall(raw);
}

export function normalizeRecalls(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeRecall);
}

/**
 * Map one CPSC recall. id is cpsc-{RecallNumber|RecallID}.
 * publishedDate ignores stale LastPublishDate bumps so 2000-era toys
 * do not sort as "this week".
 */
export function normalizeConsumerRecall(raw) {
  const record = raw && typeof raw === 'object' ? raw : {};
  const number = text(record.RecallNumber).trim();
  const recallId = text(record.RecallID).trim();
  const products = Array.isArray(record.Products) ? record.Products : [];
  const hazards = Array.isArray(record.Hazards) ? record.Hazards : [];
  const productName = text(products[0]?.Name ?? products[0]?.name);
  const hazardName = text(hazards[0]?.Name ?? hazards[0]?.name);
  const announced = toRecallDate(record.RecallDate);
  const publishedRaw = toRecallDate(record.LastPublishDate);
  const photo = firstCpscImage(record.Images);
  const origin = originFromCpscRecord(record);
  const countryText = Array.isArray(record.ManufacturerCountries)
    ? text(record.ManufacturerCountries[0]?.Country || record.ManufacturerCountries[0]?.Name || record.ManufacturerCountries[0] || '')
    : '';

  return {
    id: `cpsc-${number || recallId}`,
    firm:
      firstCompanyName(record.Manufacturers) ||
      firstCompanyName(record.Importers) ||
      firstCompanyName(record.Retailers),
    product: productName || text(record.Title),
    reason: hazardName || text(record.Description),
    classification: 'Consumer Product',
    status: '',
    state: '',
    recallDate: announced || publishedRaw,
    publishedDate: compactFromDay(cpscSortDate(record)) || publishedRaw || announced,
    source: 'consumer',
    url: text(record.URL || record.RecallURL),
    imageUrl: photo.imageUrl,
    imageAlt: photo.imageAlt,
    country: countryText,
    origin,
  };
}

export function normalizeConsumerRecalls(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeConsumerRecall);
}

/**
 * Newest first: publishedDate, then recallDate, then a stable id.
 */
function normalizeMergeUrl(url) {
  return String(url ?? '')
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

function normalizeMergeTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findApiTwin(websiteRow, apiRows) {
  const url = normalizeMergeUrl(websiteRow.url);
  const title = normalizeMergeTitle(websiteRow.product);
  return apiRows.find((row) => {
    if (url && normalizeMergeUrl(row.url) && normalizeMergeUrl(row.url) === url) return true;
    if (title && normalizeMergeTitle(row.product) === title) return true;
    return false;
  });
}

/**
 * Website-first merge. De-dupe by normalized URL and product title.
 * When a website row lacks a photo, copy image/firm/reason/country from the API twin.
 */
export function mergeRecallLists(website = [], api = []) {
  const webRows = Array.isArray(website) ? website : [];
  const apiRows = Array.isArray(api) ? api : [];
  const merged = [];
  const seenUrls = new Set();
  const seenTitles = new Set();

  function mark(row) {
    const url = normalizeMergeUrl(row.url);
    const title = normalizeMergeTitle(row.product);
    if (url) seenUrls.add(url);
    if (title) seenTitles.add(title);
  }

  function alreadySeen(row) {
    const url = normalizeMergeUrl(row.url);
    const title = normalizeMergeTitle(row.product);
    if (url && seenUrls.has(url)) return true;
    if (title && seenTitles.has(title)) return true;
    return false;
  }

  for (const web of webRows) {
    const twin = findApiTwin(web, apiRows);
    const row = { ...web };
    if (twin && !row.imageUrl) {
      row.imageUrl = twin.imageUrl || '';
      row.imageAlt = twin.imageAlt || '';
      if (!row.firm) row.firm = twin.firm || '';
      if (!row.reason) row.reason = twin.reason || '';
      if (!row.country) row.country = twin.country || '';
      if (!row.origin) row.origin = twin.origin || '';
    }
    merged.push(row);
    mark(row);
  }

  for (const apiRow of apiRows) {
    if (alreadySeen(apiRow)) continue;
    merged.push(apiRow);
  }

  return merged;
}

export const mergeConsumerRecalls = mergeRecallLists;

export function sortRecallsByDateDesc(recalls) {
  const list = Array.isArray(recalls) ? [...recalls] : [];
  return list.sort((a, b) => {
    const published = String(b?.publishedDate || '').localeCompare(String(a?.publishedDate || ''));
    if (published) return published;
    const announced = String(b?.recallDate || '').localeCompare(String(a?.recallDate || ''));
    if (announced) return announced;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

/**
 * Alternate FDA food and CPSC consumer rows: food, consumer, food, consumer…
 * Why: a plain date sort lets whichever agency posted most recently take
 * over the whole page. Each side is sorted newest-first on its own, so the
 * page still reads as "latest" while showing both sources equally. When one
 * side runs out, the rest of the other side follows in date order.
 */
export function interleaveBySource(food, consumer) {
  const a = sortRecallsByDateDesc(food);
  const b = sortRecallsByDateDesc(consumer);
  const out = [];
  const longest = Math.max(a.length, b.length);
  for (let i = 0; i < longest; i += 1) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

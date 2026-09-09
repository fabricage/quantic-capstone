/**
 * normalize.js
 * Purpose: Map openFDA food and CPSC consumer records onto the shared recall shape.
 */
import { cpscSortDate } from './cpscDates.js';

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
    country: '',
    origin: '',
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
    country: '',
    origin: '',
  };
}

export function normalizeConsumerRecalls(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeConsumerRecall);
}

/**
 * Newest first: publishedDate, then recallDate, then a stable id.
 */
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

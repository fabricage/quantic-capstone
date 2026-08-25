/**
 * normalize.js
 * Purpose: Map openFDA food-enforcement records onto the app's recall shape.
 */

/**
 * Compact a date to YYYYMMDD, or '' when it is missing/invalid.
 */
export function toRecallDate(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) return raw;
  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) return `${dashed[1]}${dashed[2]}${dashed[3]}`;
  return '';
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

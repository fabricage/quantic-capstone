/**
 * cpscDates.js
 * Purpose: CPSC date lessons — announcement vs last-publish bumps.
 *
 * CPSC re-saves old notices. RecallDate can be 2000 while LastPublishDate
 * is this week. Sorting "latest" by publish date floated 25-year-old toys
 * and labeled them with the current year. The official listing date is
 * RecallDate. A publish gap over STALE_PUBLISH_DAYS is an edit, not a new recall.
 */

export const STALE_PUBLISH_DAYS = 45;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcYmd(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDay(date) {
  return utcYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Parse a CPSC (or ISO / compact) date to a UTC midnight Date, or null.
 */
export function toCpscDay(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDay(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return utcYmd(Number(compact[1]), Number(compact[2]), Number(compact[3]));

  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return utcYmd(Number(dashed[1]), Number(dashed[2]), Number(dashed[3]));

  const dotNet = raw.match(/\/Date\((-?\d+)/);
  if (dotNet) {
    const parsed = new Date(Number(dotNet[1]));
    return Number.isNaN(parsed.getTime()) ? null : utcDay(parsed);
  }

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;
  return utcDay(fallback);
}

/**
 * Whole days from `from` to `to` (negative if `to` is earlier).
 */
export function daysBetween(from, to) {
  const start = toCpscDay(from);
  const end = toCpscDay(to);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/** Official listing date — RecallDate, not LastPublishDate. */
export function cpscAnnouncementDate(record = {}) {
  return toCpscDay(record.RecallDate);
}

/**
 * True when LastPublishDate is more than 45 days after RecallDate.
 * That gap is a later edit / republish, not a new recall.
 */
export function isStaleCpscPublish(record = {}) {
  const announced = cpscAnnouncementDate(record);
  const published = toCpscDay(record.LastPublishDate);
  if (!announced || !published) return false;
  const gap = daysBetween(announced, published);
  return gap != null && Math.abs(gap) > STALE_PUBLISH_DAYS;
}

/**
 * Date to sort/browse by. Stale publish bumps are ignored so a 2000 toy
 * re-saved this week does not jump to the top.
 */
export function cpscSortDate(record = {}) {
  const announced = cpscAnnouncementDate(record);
  if (isStaleCpscPublish(record)) return announced;
  return toCpscDay(record.LastPublishDate) || announced;
}

/**
 * True when the official announcement falls on/after `windowStart`.
 * Used after a LastPublishDate browse so republished antiques drop out.
 */
export function isRecentCpscAnnouncement(record = {}, windowStart) {
  const announced = cpscAnnouncementDate(record);
  if (!announced) return false;
  const start = toCpscDay(windowStart);
  if (!start) return true;
  return announced.getTime() >= start.getTime();
}

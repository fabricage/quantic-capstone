/**
 * dates.js
 * Purpose: Display helpers for compact FDA dates (YYYYMMDD).
 */

export function formatRecallDate(value) {
  if (value == null) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

/**
 * filters.js
 * Purpose: Shared filter helpers for search (classification, status, dates, location).
 */

export const EMPTY_FILTERS = {
  classification: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  location: '',
};

/**
 * True when both ends are set and from is after to.
 * Why: HTML date inputs are YYYY-MM-DD, so string compare matches calendar order.
 */
export function isInvalidDateRange(from, to) {
  if (!from || !to) return false;
  return String(from) > String(to);
}

export function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.classification ||
      filters.status ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.location,
  );
}

/**
 * filters.js
 * Purpose: Shared filter helpers for the FDA food search UI (no location yet).
 */

export const EMPTY_FILTERS = {
  classification: '',
  status: '',
  dateFrom: '',
  dateTo: '',
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
      filters.dateTo,
  );
}

/**
 * pagination.js
 * Purpose: Page math for skip/limit recalls. Server max page size is 100.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [20, 50, 100];
export const MAX_PAGE_SIZE = 100;

export function normalizePageSize(size) {
  const n = Number.parseInt(size, 10);
  if (PAGE_SIZE_OPTIONS.includes(n)) return Math.min(n, MAX_PAGE_SIZE);
  return DEFAULT_PAGE_SIZE;
}

export function pageToSkip(page, pageSize = DEFAULT_PAGE_SIZE) {
  const size = normalizePageSize(pageSize);
  const p = Number.parseInt(page, 10);
  const safePage = Number.isNaN(p) || p < 1 ? 1 : p;
  return (safePage - 1) * size;
}

export function totalPages(total, pageSize = DEFAULT_PAGE_SIZE) {
  const size = normalizePageSize(pageSize);
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / size);
}

export function clampPage(page, total, pageSize = DEFAULT_PAGE_SIZE) {
  const pages = totalPages(total, pageSize);
  if (pages <= 0) return 1;
  const p = Number.parseInt(page, 10);
  if (Number.isNaN(p) || p < 1) return 1;
  return Math.min(p, pages);
}

export function resultRange(page, pageSize, total) {
  const size = normalizePageSize(pageSize);
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) {
    return { start: 0, end: 0 };
  }
  const safePage = clampPage(page, n, size);
  const start = (safePage - 1) * size + 1;
  const end = Math.min(safePage * size, n);
  return { start, end };
}

/**
 * Build the numbered page list, inserting 'ellipsis' for gaps.
 * Why: small totals show every page; large totals keep 1, last, and a window around current.
 */
export function visiblePageNumbers(currentPage, pageCount) {
  const pages = Number(pageCount);
  if (!Number.isFinite(pages) || pages <= 0) return [];
  const current = Math.min(Math.max(1, Number.parseInt(currentPage, 10) || 1), pages);

  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  const items = [];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(pages - 1, current + 1);

  items.push(1);
  if (windowStart > 2) items.push('ellipsis');
  for (let i = windowStart; i <= windowEnd; i += 1) {
    items.push(i);
  }
  if (windowEnd < pages - 1) items.push('ellipsis');
  items.push(pages);
  return items;
}

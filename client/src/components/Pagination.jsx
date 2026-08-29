/**
 * Pagination.jsx
 * Purpose: Per-page size, numbered pages, prev/next, and jump. Hidden when total is 0.
 */
import { useState } from 'react';
import {
  PAGE_SIZE_OPTIONS,
  totalPages,
  visiblePageNumbers,
} from '../lib/pagination.js';

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) {
  const [jump, setJump] = useState('');
  const pages = totalPages(total, pageSize);

  if (!total) return null;

  function handleJump(event) {
    event.preventDefault();
    const next = Number.parseInt(jump, 10);
    if (Number.isNaN(next)) return;
    onPageChange(next);
    setJump('');
  }

  return (
    <nav className="pagination" aria-label="Result pages">
      <label className="pagination-size" htmlFor="page-size">
        Per page
        <select
          id="page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      {pages > 1 ? (
        <div className="pagination-nav">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>

          {visiblePageNumbers(page, pages).map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
          >
            Next
          </button>

          <form className="pagination-jump" onSubmit={handleJump}>
            <label htmlFor="jump-page">Jump to page</label>
            <input
              id="jump-page"
              type="number"
              min={1}
              max={pages}
              value={jump}
              onChange={(event) => setJump(event.target.value)}
            />
            <button type="submit">Go</button>
          </form>
        </div>
      ) : null}
    </nav>
  );
}

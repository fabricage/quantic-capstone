/**
 * App.jsx
 * Purpose: Search, filters, detail, and skip/limit pagination of recall results.
 */
import { useEffect, useRef, useState } from 'react';
import { searchRecalls } from './api.js';
import FilterBar from './components/FilterBar.jsx';
import Pagination from './components/Pagination.jsx';
import RecallDetail from './components/RecallDetail.jsx';
import RecallList from './components/RecallList.jsx';
import SearchBar from './components/SearchBar.jsx';
import { EMPTY_FILTERS, hasActiveFilters, isInvalidDateRange } from './lib/filters.js';
import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  normalizePageSize,
  pageToSkip,
  resultRange,
} from './lib/pagination.js';
import { scrollToResultsTop } from './lib/scroll.js';

export default function App() {
  const [view, setView] = useState('search');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const pendingScrollRef = useRef(false);

  const dateRangeError = isInvalidDateRange(filters.dateFrom, filters.dateTo);
  const range = resultRange(page, pageSize, total);

  // Scroll after the new page paints. Doing it in the click handler is too
  // early: loading replaces the long list with a short message, then the new
  // cards grow back and leave the user on the footer. The sentinel is a small
  // node at the top — wrapping the whole list made scrollIntoView a no-op
  // because that huge box was already intersecting the viewport.
  useEffect(() => {
    if (loading || !pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    scrollToResultsTop();
  }, [loading, results, page]);

  async function fetchResults(trimmed, nextFilters, nextPage = 1, nextSize = pageSize) {
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }

    const size = normalizePageSize(nextSize);
    setLoading(true);
    setSearchFailed(false);

    try {
      let requestedPage = Math.max(1, nextPage);
      let data = await searchRecalls({
        q: trimmed,
        skip: pageToSkip(requestedPage, size),
        limit: size,
        classification: nextFilters.classification,
        status: nextFilters.status,
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
      });
      const totalCount = data.total ?? 0;
      const clamped = clampPage(requestedPage, totalCount, size);
      if (clamped !== requestedPage) {
        data = await searchRecalls({
          q: trimmed,
          skip: pageToSkip(clamped, size),
          limit: size,
          classification: nextFilters.classification,
          status: nextFilters.status,
          dateFrom: nextFilters.dateFrom,
          dateTo: nextFilters.dateTo,
        });
      }
      setPage(clamped);
      setPageSize(size);
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotal(data.total ?? totalCount);
    } catch {
      setSearchFailed(true);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(trimmed) {
    setQuery(trimmed);
    setActiveQuery(trimmed);
    if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
      return;
    }
    setHasSearched(true);
    setPage(1);
    fetchResults(trimmed, filters, 1, pageSize);
  }

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters);
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }
    if (hasSearched) {
      setPage(1);
      fetchResults(activeQuery, nextFilters, 1, pageSize);
    }
  }

  function handlePageChange(nextPage) {
    const clamped = clampPage(nextPage, total, pageSize);
    setPage(clamped);
    pendingScrollRef.current = true;
    fetchResults(activeQuery, filters, clamped, pageSize);
  }

  function handlePageSizeChange(nextSize) {
    const size = normalizePageSize(nextSize);
    setPageSize(size);
    setPage(1);
    pendingScrollRef.current = true;
    fetchResults(activeQuery, filters, 1, size);
  }

  function handleSelect(recall) {
    setSelected(recall);
    setView('detail');
  }

  function handleBack() {
    setView('search');
    setSelected(null);
  }

  function handleSave(_recall) {
    // Card 7 fills this hook (bookmarks). No-op for now.
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">FDA food enforcement</p>
        <h1>The Recall Ledger</h1>
        <p className="lede">
          Search recent FDA food recalls by product or recalling firm.
        </p>
      </header>

      {view === 'detail' ? (
        <RecallDetail recall={selected} onBack={handleBack} onSave={handleSave} />
      ) : (
        <>
          <SearchBar query={query} onChange={setQuery} onSearch={handleSearch} />
          <FilterBar
            filters={filters}
            onChange={handleFiltersChange}
            dateRangeError={dateRangeError}
          />
          <div className="results-top-sentinel" data-results-top />
          <RecallList
            loading={loading}
            searchFailed={searchFailed}
            hasSearched={hasSearched}
            query={activeQuery}
            results={results}
            total={total}
            rangeStart={range.start}
            rangeEnd={range.end}
            filtersActive={hasActiveFilters(filters)}
            dateFrom={dateRangeError ? '' : filters.dateFrom}
            dateTo={dateRangeError ? '' : filters.dateTo}
            onSelect={handleSelect}
          />
          {hasSearched && !loading && !searchFailed ? (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

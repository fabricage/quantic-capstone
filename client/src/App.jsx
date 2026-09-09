/**
 * App.jsx
 * Purpose: Browse-first home — company chips on top, then source, keyword
 * categories, and the paged latest list with search, filters, detail,
 * pagination, bookmarks, and a static FAQ.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchCategories, fetchSuggestedSearches, searchRecalls } from './api.js';
import CategoryChips from './components/CategoryChips.jsx';
import FilterBar from './components/FilterBar.jsx';
import Pagination from './components/Pagination.jsx';
import RecentSearchChips from './components/RecentSearchChips.jsx';
import RecallDetail from './components/RecallDetail.jsx';
import RecallFaq from './components/RecallFaq.jsx';
import RecallList from './components/RecallList.jsx';
import SavedRecalls from './components/SavedRecalls.jsx';
import SearchBar from './components/SearchBar.jsx';
import SourceToggle from './components/SourceToggle.jsx';
import SuggestedSearchChips from './components/SuggestedSearchChips.jsx';
import { normalizeSearchQuery, useRecentSearches } from './hooks/useRecentSearches.js';
import { useSavedRecalls } from './hooks/useSavedRecalls.js';
import { EMPTY_FILTERS, hasActiveFilters, isInvalidDateRange } from './lib/filters.js';
import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  normalizePageSize,
  pageToSkip,
  resultRange,
} from './lib/pagination.js';
import { scrollToResultsTop } from './lib/scroll.js';
import { DEFAULT_LOOKBACK_WINDOW, LOOKBACK_WINDOWS } from './lib/suggestedChips.js';

const DEFAULT_SOURCE = 'all';

function sourceLede(source, categoryLabel) {
  let line = 'Newest first, alternating one FDA food recall with one CPSC consumer product.';
  if (source === 'consumer') line = 'Newest first. CPSC consumer products.';
  if (source === 'food') line = 'Newest first. FDA food.';
  if (categoryLabel) return `${line} Showing ${categoryLabel}.`;
  return line;
}

function categoryLabelFor(categories, categoryId) {
  return (Array.isArray(categories) ? categories : []).find((row) => row.id === categoryId)
    ?.label;
}

// A Food-only chip on Consumer (or the reverse) is dropped, same idea as an
// unknown FDA classification: ignore it rather than error.
function categoryForSource(categoryId, nextSource, categories) {
  if (!categoryId) return '';
  const row = (Array.isArray(categories) ? categories : []).find((item) => item.id === categoryId);
  if (!row) return '';
  if (nextSource === 'all' || row.sources?.includes(nextSource)) return categoryId;
  return '';
}

// Company chips already switch Food / Consumer. Category chips do the same
// when the current source cannot show that type.
function sourceForCategory(categoryId, currentSource, categories) {
  const row = (Array.isArray(categories) ? categories : []).find((item) => item.id === categoryId);
  if (!row?.sources?.length) return currentSource;
  if (currentSource === 'all' || row.sources.includes(currentSource)) return currentSource;
  return row.sources[0];
}

export default function App() {
  const [view, setView] = useState('search');
  const [returnView, setReturnView] = useState('search');
  const [selected, setSelected] = useState(null);
  const { saved, isSaved, toggleSave } = useSavedRecalls();
  const { recent, rememberSearch, clearRecent } = useRecentSearches();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [searchFailed, setSearchFailed] = useState(false);
  const [suggestedSearches, setSuggestedSearches] = useState({
    label: 'Companies with the most recalls',
    groups: [],
    windows: LOOKBACK_WINDOWS,
  });
  const [suggestedWindow, setSuggestedWindow] = useState(DEFAULT_LOOKBACK_WINDOW);
  const [suggestedReady, setSuggestedReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const pendingScrollRef = useRef(false);
  // Newest request wins. A slow "all" list must not overwrite a quick
  // "consumer" toggle that the user clicked afterwards.
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchSuggestedSearches({ windowId: suggestedWindow }).then((data) => {
      if (cancelled) return;
      setSuggestedSearches({
        label: data?.label || 'Companies with the most recalls',
        groups: Array.isArray(data?.groups) ? data.groups : [],
        windows:
          Array.isArray(data?.windows) && data.windows.length
            ? data.windows
            : LOOKBACK_WINDOWS,
      });
      setSuggestedReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [suggestedWindow]);

  useEffect(() => {
    let cancelled = false;
    fetchCategories().then((data) => {
      if (cancelled) return;
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Home is a search with no keyword. The paged list is the hero, so load it
  // on arrival instead of waiting for someone to type.
  useEffect(() => {
    fetchResults('', EMPTY_FILTERS, 1, DEFAULT_PAGE_SIZE, DEFAULT_SOURCE, '');
  }, []);

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

  function filtersForRequest(nextFilters, nextSource = source) {
    if (nextSource === 'consumer') {
      return { ...nextFilters, classification: '', status: '' };
    }
    return nextFilters;
  }

  async function fetchResults(
    trimmed,
    nextFilters,
    nextPage = 1,
    nextSize = pageSize,
    nextSource = source,
    nextCategory = categoryId,
  ) {
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const isCurrent = () => requestId === requestRef.current;

    const size = normalizePageSize(nextSize);
    const requestFilters = filtersForRequest(nextFilters, nextSource);
    setLoading(true);
    setSearchFailed(false);

    try {
      let requestedPage = Math.max(1, nextPage);
      let data = await searchRecalls({
        q: trimmed,
        skip: pageToSkip(requestedPage, size),
        limit: size,
        classification: requestFilters.classification,
        status: requestFilters.status,
        dateFrom: requestFilters.dateFrom,
        dateTo: requestFilters.dateTo,
        source: nextSource,
        location: requestFilters.location,
        category: nextCategory,
      });
      const totalCount = data.total ?? 0;
      const clamped = clampPage(requestedPage, totalCount, size);
      if (clamped !== requestedPage) {
        data = await searchRecalls({
          q: trimmed,
          skip: pageToSkip(clamped, size),
          limit: size,
          classification: requestFilters.classification,
          status: requestFilters.status,
          dateFrom: requestFilters.dateFrom,
          dateTo: requestFilters.dateTo,
          source: nextSource,
          location: requestFilters.location,
          category: nextCategory,
        });
      }
      if (!isCurrent()) return false;
      setPage(clamped);
      setPageSize(size);
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotal(data.total ?? totalCount);
      return true;
    } catch {
      if (!isCurrent()) return false;
      setSearchFailed(true);
      setResults([]);
      setTotal(0);
      return false;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function handleSearch(trimmed, nextSource = source, nextCategory = categoryId) {
    const q = normalizeSearchQuery(trimmed);
    setQuery(q);
    setActiveQuery(q);
    if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
      return;
    }
    setPage(1);
    const ok = await fetchResults(q, filters, 1, pageSize, nextSource, nextCategory);
    if (ok && q) rememberSearch(q);
  }

  function handleRecentSearch(query) {
    // A firm chip is just q=<firm phrase>. openFDA already ORs recalling_firm.
    handleSearch(query);
  }

  function handleSuggestedSearch(phrase, nextSource) {
    const resolved =
      nextSource === 'consumer' || nextSource === 'food' ? nextSource : source;
    setSource(resolved);
    setCategoryId('');
    handleSearch(phrase, resolved, '');
  }

  function handleClearSearch() {
    setQuery('');
    setActiveQuery('');
    setFilters(EMPTY_FILTERS);
    setCategoryId('');
    setPage(1);
    fetchResults('', EMPTY_FILTERS, 1, pageSize, source, '');
  }

  function handleCategorySelect(nextId) {
    const id = String(nextId || '');
    const nextSource = id ? sourceForCategory(id, source, categories) : source;
    if (nextSource !== source) setSource(nextSource);
    setCategoryId(id);
    setPage(1);
    fetchResults(activeQuery, filters, 1, pageSize, nextSource, id);
  }

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters);
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }
    setPage(1);
    fetchResults(activeQuery, nextFilters, 1, pageSize);
  }

  function handlePageChange(nextPage) {
    const clamped = clampPage(nextPage, total, pageSize);
    setPage(clamped);
    pendingScrollRef.current = true;
    fetchResults(activeQuery, filters, clamped, pageSize);
  }

  function handleSourceChange(nextSource) {
    const nextCategory = categoryForSource(categoryId, nextSource, categories);
    if (nextCategory !== categoryId) setCategoryId(nextCategory);
    setSource(nextSource);
    setPage(1);
    fetchResults(activeQuery, filters, 1, pageSize, nextSource, nextCategory);
  }

  function handlePageSizeChange(nextSize) {
    const size = normalizePageSize(nextSize);
    setPageSize(size);
    setPage(1);
    pendingScrollRef.current = true;
    fetchResults(activeQuery, filters, 1, size);
  }

  function handleSelect(recall) {
    setReturnView(view === 'saved' ? 'saved' : 'search');
    setSelected(recall);
    setView('detail');
  }

  function handleBack() {
    setView(returnView);
    setSelected(null);
  }

  function showSearch() {
    setView('search');
    setSelected(null);
  }

  function showSaved() {
    setView('saved');
    setSelected(null);
  }

  const searchIsCurrent = view === 'search' || (view === 'detail' && returnView === 'search');
  const savedIsCurrent = view === 'saved' || (view === 'detail' && returnView === 'saved');

  const filtersActive = hasActiveFilters(filtersForRequest(filters));
  const categoryLabel = categoryLabelFor(categories, categoryId);
  const narrowed = Boolean(activeQuery) || filtersActive;
  const browseTitle = narrowed
    ? 'Matching recalls'
    : categoryLabel
      ? `${categoryLabel} recalls`
      : 'Latest recalls';
  const showClearSearch = narrowed || Boolean(categoryId);

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">FDA food and CPSC consumer products</p>
        <h1>The Recall Ledger</h1>
        <p className="lede">
          Search FDA food and CPSC consumer-product recalls by product or firm.
        </p>
        <nav className="app-nav" aria-label="Primary">
          <button
            type="button"
            aria-current={searchIsCurrent ? 'page' : undefined}
            onClick={showSearch}
          >
            Search
          </button>
          <button
            type="button"
            aria-current={savedIsCurrent ? 'page' : undefined}
            onClick={showSaved}
          >
            Saved
          </button>
        </nav>
      </header>

      {view === 'detail' ? (
        <RecallDetail
          recall={selected}
          saved={Boolean(selected && isSaved(selected.id))}
          onBack={handleBack}
          onSave={toggleSave}
        />
      ) : view === 'saved' ? (
        <SavedRecalls saved={saved} onSelect={handleSelect} onRemove={toggleSave} />
      ) : (
        <>
          {/* Always visible, always first: the company chips are the fastest
              way into the data, so they never scroll away or collapse. */}
          <section className="company-spotlight" aria-labelledby="suggested-searches-label">
            <SuggestedSearchChips
              label={suggestedSearches.label}
              groups={suggestedSearches.groups}
              windows={suggestedSearches.windows || LOOKBACK_WINDOWS}
              windowId={suggestedWindow}
              ready={suggestedReady}
              onWindowChange={setSuggestedWindow}
              onSelect={handleSuggestedSearch}
            />
          </section>

          <SourceToggle source={source} onChange={handleSourceChange} />

          <CategoryChips
            categories={categories}
            source={source}
            selectedId={categoryId}
            onSelect={handleCategorySelect}
          />

          <section className="browse" aria-labelledby="browse-heading">
            <div className="browse-header">
              <h2 id="browse-heading" className="browse-title">
                {browseTitle}
              </h2>
              {showClearSearch ? (
                <button type="button" className="browse-clear" onClick={handleClearSearch}>
                  Clear search
                </button>
              ) : null}
            </div>
            <p className="browse-lede">{sourceLede(source, categoryLabel)}</p>

            <div className="narrow-tools">
              <SearchBar query={query} onChange={setQuery} onSearch={handleSearch} />
              <RecentSearchChips
                searches={recent}
                onSelect={handleRecentSearch}
                onClear={clearRecent}
              />
              <details
                className="filter-panel"
                open={filtersOpen}
                onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
              >
                <summary>{filtersActive ? 'Filters (active)' : 'Filters'}</summary>
                <FilterBar
                  filters={filters}
                  onChange={handleFiltersChange}
                  dateRangeError={dateRangeError}
                  source={source}
                />
              </details>
            </div>

            <div className="results-top-sentinel" data-results-top />

            <RecallList
              loading={loading}
              searchFailed={searchFailed}
              hasSearched
              query={activeQuery}
              results={results}
              total={total}
              rangeStart={range.start}
              rangeEnd={range.end}
              filtersActive={filtersActive || Boolean(categoryId)}
              dateFrom={dateRangeError ? '' : filters.dateFrom}
              dateTo={dateRangeError ? '' : filters.dateTo}
              source={source}
              onSelect={handleSelect}
              isSaved={isSaved}
              onToggleSave={toggleSave}
            />

            {!loading && !searchFailed ? (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            ) : null}
          </section>
        </>
      )}

      {/* Always last: a static glossary so class / status / CPSC fields
          stay explained on search, saved, and detail. */}
      <RecallFaq />
    </div>
  );
}

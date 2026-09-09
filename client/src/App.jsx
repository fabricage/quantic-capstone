/**
 * App.jsx
 * Purpose: Search, filters, detail, pagination, bookmarks, chips, persona ranking, and home previews.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchPersonas, rankRecallsForPersona, searchRecalls } from './api.js';
import FilterBar from './components/FilterBar.jsx';
import HighRiskRecalls from './components/HighRiskRecalls.jsx';
import Pagination from './components/Pagination.jsx';
import PersonaCards from './components/PersonaCards.jsx';
import RecentRecalls from './components/RecentRecalls.jsx';
import RecentSearchChips from './components/RecentSearchChips.jsx';
import RecallDetail from './components/RecallDetail.jsx';
import RecallList from './components/RecallList.jsx';
import SavedRecalls from './components/SavedRecalls.jsx';
import SearchBar from './components/SearchBar.jsx';
import SourceToggle from './components/SourceToggle.jsx';
import StatusMessage from './components/StatusMessage.jsx';
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
import { applyRanking } from './lib/rankResults.js';
import { scrollToResultsTop } from './lib/scroll.js';

export default function App() {
  const [view, setView] = useState('search');
  const [returnView, setReturnView] = useState('search');
  const [selected, setSelected] = useState(null);
  const { saved, isSaved, toggleSave } = useSavedRecalls();
  const { recent, rememberSearch, clearRecent } = useRecentSearches();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [source, setSource] = useState('food');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [personaId, setPersonaId] = useState('');
  // Keyword order for the current page. Ranking reorders `results` but we
  // keep this copy so deselect / fallback can restore FDA order.
  const [keywordResults, setKeywordResults] = useState([]);
  const [whyById, setWhyById] = useState({});
  const [personaRanking, setPersonaRanking] = useState(false);
  const [personaFallback, setPersonaFallback] = useState(false);
  const [recentFailed, setRecentFailed] = useState(false);
  const [consumerFailed, setConsumerFailed] = useState(false);
  const [classIFailed, setClassIFailed] = useState(false);
  const pendingScrollRef = useRef(false);
  const rankGenerationRef = useRef(0);

  useEffect(() => {
    fetchPersonas()
      .then((data) => setPersonas(Array.isArray(data.personas) ? data.personas : []))
      .catch(() => {
        setPersonas([]);
      });
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

  // Rank the current page when a persona is selected. Deselect restores
  // keyword order. A missing key or failed POST keeps that order and
  // shows a one-line notice — ranking must never blank the list.
  useEffect(() => {
    if (!personaId) {
      rankGenerationRef.current += 1;
      setResults(keywordResults);
      setWhyById({});
      setPersonaFallback(false);
      setPersonaRanking(false);
      return;
    }

    if (!hasSearched || keywordResults.length === 0) {
      setWhyById({});
      setPersonaFallback(false);
      setPersonaRanking(false);
      return;
    }

    const generation = rankGenerationRef.current + 1;
    rankGenerationRef.current = generation;
    setPersonaRanking(true);
    setPersonaFallback(false);

    rankRecallsForPersona({
      personaId,
      recalls: keywordResults,
      query: {
        q: activeQuery,
        classification: filters.classification,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page,
        location: filters.location,
        source,
      },
    }).then((data) => {
      if (generation !== rankGenerationRef.current) return;
      setPersonaRanking(false);
      if (data?.fallback || !Array.isArray(data?.ranked)) {
        setPersonaFallback(true);
        setResults(keywordResults);
        setWhyById({});
        return;
      }
      const applied = applyRanking(keywordResults, data.ranked);
      setResults(applied.results);
      setWhyById(applied.whyById);
      setPersonaFallback(false);
    });

    return () => {
      rankGenerationRef.current += 1;
    };
  }, [
    personaId,
    keywordResults,
    hasSearched,
    activeQuery,
    filters.classification,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.location,
    page,
    source,
  ]);

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
  ) {
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }

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
        });
      }
      setPage(clamped);
      setPageSize(size);
      const nextResults = Array.isArray(data.results) ? data.results : [];
      setKeywordResults(nextResults);
      setResults(nextResults);
      setWhyById({});
      setPersonaFallback(false);
      setTotal(data.total ?? totalCount);
      return true;
    } catch {
      setSearchFailed(true);
      setKeywordResults([]);
      setResults([]);
      setWhyById({});
      setPersonaFallback(false);
      setTotal(0);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(trimmed) {
    const q = normalizeSearchQuery(trimmed);
    setQuery(q);
    setActiveQuery(q);
    if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
      return;
    }
    setHasSearched(true);
    setPage(1);
    const ok = await fetchResults(q, filters, 1, pageSize);
    if (ok) rememberSearch(q);
  }

  function handleRecentSearch(query) {
    // A firm chip is just q=<firm phrase>. openFDA already ORs recalling_firm.
    handleSearch(query);
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

  function handleSourceChange(nextSource) {
    setSource(nextSource);
    setPage(1);
    if (hasSearched) {
      pendingScrollRef.current = true;
      fetchResults(activeQuery, filters, 1, pageSize, nextSource);
    }
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

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">FDA food enforcement</p>
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
          <SearchBar query={query} onChange={setQuery} onSearch={handleSearch}>
            <RecentSearchChips
              searches={recent}
              onSelect={handleRecentSearch}
              onClear={clearRecent}
            />
          </SearchBar>
          <SourceToggle source={source} onChange={handleSourceChange} />
          <FilterBar
            filters={filters}
            onChange={handleFiltersChange}
            dateRangeError={dateRangeError}
            source={source}
          />
          <PersonaCards
            personas={personas}
            selectedId={personaId}
            onSelect={setPersonaId}
          />
          {!hasSearched ? (
            <div className="home-modules">
              {recentFailed ? (
                <StatusMessage>
                  We couldn’t load the latest FDA recalls. You can still search above.
                </StatusMessage>
              ) : null}
              {consumerFailed ? (
                <StatusMessage>
                  We couldn’t load the latest consumer recalls. You can still search above.
                </StatusMessage>
              ) : null}
              {classIFailed ? (
                <StatusMessage>
                  We couldn’t load Class I high-risk recalls. You can still search above.
                </StatusMessage>
              ) : null}
              <RecentRecalls
                onSelect={handleSelect}
                onFailed={setRecentFailed}
                onConsumerFailed={setConsumerFailed}
              />
              <HighRiskRecalls onSelect={handleSelect} onFailed={setClassIFailed} />
            </div>
          ) : (
            <>
              <div className="results-top-sentinel" data-results-top />
              {personaRanking ? (
                <p className="status-message">Reordering for your persona…</p>
              ) : null}
              {personaFallback ? (
                <p className="status-message status-message--notice" role="status">
                  We couldn’t personalize this page. Showing keyword order.
                </p>
              ) : null}
              <RecallList
                loading={loading}
                searchFailed={searchFailed}
                hasSearched={hasSearched}
                query={activeQuery}
                results={results}
                total={total}
                rangeStart={range.start}
                rangeEnd={range.end}
                filtersActive={hasActiveFilters(filtersForRequest(filters))}
                dateFrom={dateRangeError ? '' : filters.dateFrom}
                dateTo={dateRangeError ? '' : filters.dateTo}
                onSelect={handleSelect}
                isSaved={isSaved}
                onToggleSave={toggleSave}
                whyById={whyById}
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
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * App.jsx
 * Purpose: Browse-first home — paged latest recalls, with search, filters,
 * personas, detail, pagination, bookmarks, and demoted company chips.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchPersonas, fetchSuggestedSearches, rankRecallsForPersona, searchRecalls } from './api.js';
import FilterBar from './components/FilterBar.jsx';
import HighRiskRecalls from './components/HighRiskRecalls.jsx';
import Pagination from './components/Pagination.jsx';
import PersonaCards from './components/PersonaCards.jsx';
import RecentSearchChips from './components/RecentSearchChips.jsx';
import RecallDetail from './components/RecallDetail.jsx';
import RecallList from './components/RecallList.jsx';
import SavedRecalls from './components/SavedRecalls.jsx';
import SearchBar from './components/SearchBar.jsx';
import SourceToggle from './components/SourceToggle.jsx';
import StatusMessage from './components/StatusMessage.jsx';
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
import { applyRanking } from './lib/rankResults.js';
import { interleaveBySource, rankByPersonaBio } from './lib/personaMatch.js';
import { scrollToResultsTop } from './lib/scroll.js';
import { DEFAULT_LOOKBACK_WINDOW, LOOKBACK_WINDOWS } from './lib/suggestedChips.js';

const DEFAULT_SOURCE = 'all';

function sourceLede(source) {
  if (source === 'consumer') return 'Newest first. CPSC consumer products.';
  if (source === 'food') return 'Newest first. FDA food.';
  return 'Newest first. FDA food plus CPSC consumer products.';
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
  const [personas, setPersonas] = useState([]);
  const [personasFailed, setPersonasFailed] = useState(false);
  const [personaId, setPersonaId] = useState('');
  // Keyword order for the current page. Ranking reorders `results` but we
  // keep this copy so deselect / fallback can restore FDA order.
  const [keywordResults, setKeywordResults] = useState([]);
  const [whyById, setWhyById] = useState({});
  const [personaRanking, setPersonaRanking] = useState(false);
  const [personaFallback, setPersonaFallback] = useState(false);
  const [suggestedSearches, setSuggestedSearches] = useState({
    label: 'Companies with the most recalls',
    groups: [],
    windows: LOOKBACK_WINDOWS,
  });
  const [suggestedWindow, setSuggestedWindow] = useState(DEFAULT_LOOKBACK_WINDOW);
  const [suggestedReady, setSuggestedReady] = useState(false);
  const pendingScrollRef = useRef(false);
  const rankGenerationRef = useRef(0);
  // Newest request wins. A slow "all" list must not overwrite a quick
  // "consumer" toggle that the user clicked afterwards.
  const requestRef = useRef(0);

  useEffect(() => {
    fetchPersonas()
      .then((data) => {
        setPersonas(Array.isArray(data.personas) ? data.personas : []);
        setPersonasFailed(false);
      })
      .catch(() => {
        // Personas are optional. Show a notice; do not crash home.
        setPersonas([]);
        setPersonasFailed(true);
      });
  }, []);

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

  // Home is a search with no keyword. The paged list is the hero, so load it
  // on arrival instead of waiting for someone to type.
  useEffect(() => {
    fetchResults('', EMPTY_FILTERS, 1, DEFAULT_PAGE_SIZE, DEFAULT_SOURCE);
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

  // Rank / curate when a persona is selected. AI ranking is preferred.
  // If the key is missing, we still order by the persona bio and alternate
  // FDA / CPSC so the profile is never a no-op.
  useEffect(() => {
    if (!personaId) {
      rankGenerationRef.current += 1;
      setResults(keywordResults);
      setWhyById({});
      setPersonaFallback(false);
      setPersonaRanking(false);
      return;
    }

    if (keywordResults.length === 0) {
      setWhyById({});
      setPersonaFallback(false);
      setPersonaRanking(false);
      return;
    }

    const generation = rankGenerationRef.current + 1;
    rankGenerationRef.current = generation;
    setPersonaRanking(true);
    setPersonaFallback(false);
    const persona = personas.find((item) => item.id === personaId);

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
      const aiRanked =
        !data?.fallback && Array.isArray(data?.ranked) ? data.ranked : null;
      if (aiRanked) {
        const applied = applyRanking(keywordResults, aiRanked);
        setResults(interleaveBySource(applied.results));
        setWhyById(applied.whyById);
        setPersonaFallback(false);
        return;
      }
      if (!persona) {
        setPersonaFallback(true);
        setResults(interleaveBySource(keywordResults));
        setWhyById({});
        return;
      }
      const applied = rankByPersonaBio(keywordResults, persona);
      setResults(interleaveBySource(applied.results));
      setWhyById(applied.whyById);
      setPersonaFallback(false);
    });

    return () => {
      rankGenerationRef.current += 1;
    };
  }, [
    personaId,
    personas,
    keywordResults,
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
      if (!isCurrent()) return false;
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
      if (!isCurrent()) return false;
      setSearchFailed(true);
      setKeywordResults([]);
      setResults([]);
      setWhyById({});
      setPersonaFallback(false);
      setTotal(0);
      return false;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function handleSearch(trimmed, nextSource = source) {
    const q = normalizeSearchQuery(trimmed);
    setQuery(q);
    setActiveQuery(q);
    if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
      return;
    }
    setPage(1);
    const ok = await fetchResults(q, filters, 1, pageSize, nextSource);
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
    handleSearch(phrase, resolved);
  }

  function handleClearSearch() {
    setQuery('');
    setActiveQuery('');
    setFilters(EMPTY_FILTERS);
    setPersonaId('');
    setPage(1);
    fetchResults('', EMPTY_FILTERS, 1, pageSize, source);
  }

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters);
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }
    setPage(1);
    fetchResults(activeQuery, nextFilters, 1, pageSize);
  }

  // Class I is an FDA food classification. CPSC consumer recalls carry no
  // class, so the shortcut always pins the source to food.
  function handleClassIShortcut() {
    const nextFilters = { ...filters, classification: 'Class I' };
    setSource('food');
    setFilters(nextFilters);
    setFiltersOpen(true);
    setPage(1);
    fetchResults(activeQuery, nextFilters, 1, pageSize, 'food');
  }

  function handlePageChange(nextPage) {
    const clamped = clampPage(nextPage, total, pageSize);
    setPage(clamped);
    pendingScrollRef.current = true;
    fetchResults(activeQuery, filters, clamped, pageSize);
  }

  function handlePersonaSelect(nextId) {
    const id = typeof nextId === 'string' ? nextId : '';
    setPersonaId(id);
    if (!id || source === 'all') return;
    // Persona bios span FDA food and CPSC products, so widen to both sources.
    setSource('all');
    setPage(1);
    fetchResults(activeQuery, filters, 1, pageSize, 'all');
  }

  function handleSourceChange(nextSource) {
    setSource(nextSource);
    setPage(1);
    fetchResults(activeQuery, filters, 1, pageSize, nextSource);
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
  const narrowed = Boolean(activeQuery) || filtersActive || Boolean(personaId);
  const resultsExist = !searchFailed && results.length > 0;
  const showClassIStrip = !(source === 'food' && filters.classification === 'Class I');

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
          <SourceToggle source={source} onChange={handleSourceChange} />

          <section className="browse" aria-labelledby="browse-heading">
            <div className="browse-header">
              <h2 id="browse-heading" className="browse-title">
                {narrowed ? 'Matching recalls' : 'Latest recalls'}
              </h2>
              {narrowed ? (
                <button type="button" className="browse-clear" onClick={handleClearSearch}>
                  Clear search
                </button>
              ) : null}
            </div>
            <p className="browse-lede">{sourceLede(source)}</p>

            {showClassIStrip ? (
              <HighRiskRecalls onSelect={handleSelect} onBrowse={handleClassIShortcut} />
            ) : null}

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

            {resultsExist && personasFailed ? (
              <StatusMessage>
                We couldn’t load shopper profiles. Search still works as usual.
              </StatusMessage>
            ) : null}
            {resultsExist && !personasFailed ? (
              <PersonaCards
                personas={personas}
                selectedId={personaId}
                onSelect={handlePersonaSelect}
              />
            ) : null}

            <div className="results-top-sentinel" data-results-top />
            {personaRanking ? (
              <StatusMessage>Finding recalls for your profile…</StatusMessage>
            ) : null}
            {personaFallback ? (
              <StatusMessage tone="notice">
                We couldn’t personalize this page. Showing keyword order.
              </StatusMessage>
            ) : null}

            <RecallList
              loading={loading}
              searchFailed={searchFailed}
              hasSearched
              query={activeQuery}
              results={results}
              total={total}
              rangeStart={range.start}
              rangeEnd={range.end}
              filtersActive={filtersActive}
              dateFrom={dateRangeError ? '' : filters.dateFrom}
              dateTo={dateRangeError ? '' : filters.dateTo}
              source={source}
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
          </section>

          <details className="browse-companies">
            <summary>Browse by company</summary>
            <SuggestedSearchChips
              label={suggestedSearches.label}
              groups={suggestedSearches.groups}
              windows={suggestedSearches.windows || LOOKBACK_WINDOWS}
              windowId={suggestedWindow}
              ready={suggestedReady}
              onWindowChange={setSuggestedWindow}
              onSelect={handleSuggestedSearch}
            />
          </details>
        </>
      )}
    </div>
  );
}

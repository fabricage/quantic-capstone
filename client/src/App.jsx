/**
 * App.jsx
 * Purpose: Search list plus an in-memory detail view of the selected recall.
 */
import { useState } from 'react';
import { searchRecalls } from './api.js';
import FilterBar from './components/FilterBar.jsx';
import RecallDetail from './components/RecallDetail.jsx';
import RecallList from './components/RecallList.jsx';
import SearchBar from './components/SearchBar.jsx';
import { EMPTY_FILTERS, hasActiveFilters, isInvalidDateRange } from './lib/filters.js';

export default function App() {
  const [view, setView] = useState('search');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const dateRangeError = isInvalidDateRange(filters.dateFrom, filters.dateTo);

  async function fetchResults(trimmed, nextFilters) {
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }

    setLoading(true);
    setSearchFailed(false);

    try {
      const data = await searchRecalls({
        q: trimmed,
        skip: 0,
        classification: nextFilters.classification,
        status: nextFilters.status,
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
      });
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotal(data.total ?? 0);
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
    fetchResults(trimmed, filters);
  }

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters);
    if (isInvalidDateRange(nextFilters.dateFrom, nextFilters.dateTo)) {
      return;
    }
    if (hasSearched) {
      fetchResults(activeQuery, nextFilters);
    }
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
          <RecallList
            loading={loading}
            searchFailed={searchFailed}
            hasSearched={hasSearched}
            query={activeQuery}
            results={results}
            total={total}
            filtersActive={hasActiveFilters(filters)}
            dateFrom={dateRangeError ? '' : filters.dateFrom}
            dateTo={dateRangeError ? '' : filters.dateTo}
            onSelect={handleSelect}
          />
        </>
      )}
    </div>
  );
}

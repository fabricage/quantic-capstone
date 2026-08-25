/**
 * App.jsx
 * Purpose: Card 1 shell — brand, keyword search, and result cards via the Express BFF.
 */
import { useState } from 'react';
import { searchRecalls } from './api.js';
import RecallList from './components/RecallList.jsx';
import SearchBar from './components/SearchBar.jsx';

export default function App() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(trimmed) {
    setQuery(trimmed);
    setActiveQuery(trimmed);
    setHasSearched(true);
    setLoading(true);
    setSearchFailed(false);

    try {
      const data = await searchRecalls({ q: trimmed });
      setResults(Array.isArray(data.results) ? data.results : []);
      setTotal(data.total ?? 0);
    } catch {
      // Never surface raw exception text in the UI.
      setSearchFailed(true);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
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

      <SearchBar query={query} onChange={setQuery} onSearch={handleSearch} />

      <RecallList
        loading={loading}
        searchFailed={searchFailed}
        hasSearched={hasSearched}
        query={activeQuery}
        results={results}
        total={total}
      />
    </div>
  );
}

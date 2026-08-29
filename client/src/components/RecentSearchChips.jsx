/**
 * RecentSearchChips.jsx
 * Purpose: Clickable recent-query chips plus clear-all. Hidden when the list is empty.
 */
export default function RecentSearchChips({ searches = [], onSelect, onClear }) {
  if (!searches.length) return null;

  return (
    <div className="recent-search-chips">
      <div className="recent-search-chips-header">
        <p id="recent-searches-label">Recent searches</p>
        <button type="button" onClick={() => onClear?.()}>
          Clear all
        </button>
      </div>
      <ul className="recent-search-chip-list" aria-labelledby="recent-searches-label">
        {searches.map((query) => (
          <li key={query}>
            <button type="button" onClick={() => onSelect?.(query)}>
              {query}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

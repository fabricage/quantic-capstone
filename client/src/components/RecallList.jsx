/**
 * RecallList.jsx
 * Purpose: Idle / loading / error / empty / results states, including filter-aware copy.
 */
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

function dateRangeLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return '';
  if (dateFrom && dateTo) return ` · initiation ${dateFrom} to ${dateTo}`;
  if (dateFrom) return ` · initiation on or after ${dateFrom}`;
  return ` · initiation on or before ${dateTo}`;
}

function idleCopy(source) {
  if (source === 'consumer') {
    return 'Enter a keyword to search CPSC consumer-product recalls by product or firm.';
  }
  if (source === 'all') {
    return 'Enter a keyword to search FDA food and CPSC consumer-product recalls by product or firm.';
  }
  return 'Enter a keyword to search FDA food recalls by product or firm.';
}

export default function RecallList({
  loading,
  searchFailed,
  hasSearched,
  query,
  results,
  total = 0,
  rangeStart = 0,
  rangeEnd = 0,
  filtersActive = false,
  dateFrom = '',
  dateTo = '',
  source = 'food',
  onSelect,
  isSaved,
  onToggleSave,
  whyById = {},
}) {
  if (loading) {
    return <StatusMessage>Loading recalls…</StatusMessage>;
  }

  if (searchFailed) {
    return (
      <StatusMessage tone="error">
        We couldn’t load recalls right now. Please try again.
      </StatusMessage>
    );
  }

  if (!hasSearched) {
    return <StatusMessage>{idleCopy(source)}</StatusMessage>;
  }

  if (!results?.length) {
    if (filtersActive) {
      return (
        <StatusMessage>No recalls match these filters.</StatusMessage>
      );
    }
    if (!query) {
      return <StatusMessage>No results for this keyword.</StatusMessage>;
    }
    return (
      <StatusMessage>
        No results for this keyword (“{query}”).
      </StatusMessage>
    );
  }

  return (
    <>
      <p className="result-count">
        Showing {rangeStart}–{rangeEnd} of {total}
        {dateRangeLabel(dateFrom, dateTo)}
      </p>
      <ul className="recall-list">
        {results.map((recall) => (
          <li key={recall.id || recall.product}>
            <RecallCard
              recall={recall}
              onSelect={onSelect}
              saved={Boolean(isSaved?.(recall.id))}
              onToggleSave={onToggleSave}
              why={whyById?.[recall.id] ?? ''}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

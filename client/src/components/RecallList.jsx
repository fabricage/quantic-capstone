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

export default function RecallList({
  loading,
  searchFailed,
  hasSearched,
  query,
  results,
  total = 0,
  filtersActive = false,
  dateFrom = '',
  dateTo = '',
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
    return (
      <StatusMessage>
        Enter a keyword to search FDA food recalls by product or firm.
      </StatusMessage>
    );
  }

  if (!results?.length) {
    if (filtersActive) {
      return (
        <StatusMessage>No recalls match these filters.</StatusMessage>
      );
    }
    const label = query ? `“${query}”` : 'this keyword';
    return (
      <StatusMessage>
        No results for this keyword{query ? ` (${label})` : ''}.
      </StatusMessage>
    );
  }

  return (
    <>
      <p className="result-count">
        {total} matching {total === 1 ? 'recall' : 'recalls'}
        {dateRangeLabel(dateFrom, dateTo)}
      </p>
      <ul className="recall-list">
        {results.map((recall) => (
          <li key={recall.id || recall.product}>
            <RecallCard recall={recall} />
          </li>
        ))}
      </ul>
    </>
  );
}

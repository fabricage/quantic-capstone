/**
 * RecallList.jsx
 * Purpose: Idle / loading / error / empty / results states for a keyword search.
 */
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

export default function RecallList({
  loading,
  searchFailed,
  hasSearched,
  query,
  results,
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
    const label = query ? `“${query}”` : 'this keyword';
    return (
      <StatusMessage>
        No results for this keyword{query ? ` (${label})` : ''}.
      </StatusMessage>
    );
  }

  return (
    <ul className="recall-list">
      {results.map((recall) => (
        <li key={recall.id || recall.product}>
          <RecallCard recall={recall} />
        </li>
      ))}
    </ul>
  );
}

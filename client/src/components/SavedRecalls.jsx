/**
 * SavedRecalls.jsx
 * Purpose: List of localStorage bookmarks. Opening one uses the sparse stub.
 */
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

export default function SavedRecalls({ saved = [], onSelect, onRemove }) {
  if (!saved.length) {
    return (
      <section className="saved-recalls">
        <h2 className="saved-recalls-title">Saved recalls</h2>
        <StatusMessage>
          No saved recalls yet. Save one from search to see it here.
        </StatusMessage>
      </section>
    );
  }

  return (
    <section className="saved-recalls">
      <h2 className="saved-recalls-title">Saved recalls</h2>
      <ul className="recall-list">
        {saved.map((recall) => (
          <li key={recall.id} className="saved-recall-item">
            <RecallCard recall={recall} onSelect={onSelect} />
            <button
              type="button"
              className="saved-recall-remove"
              onClick={() => onRemove?.(recall)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

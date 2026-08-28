/**
 * RecallCard.jsx
 * Purpose: One search-result card. Click or keyboard activates onSelect(recall).
 */
import { formatRecallDate } from '../lib/dates.js';
import { shortenProductTitle, shortenReason } from '../lib/textSnippets.js';
import RecallImage from './RecallImage.jsx';

export default function RecallCard({ recall, onSelect }) {
  const title = shortenProductTitle(recall.product);
  const reason = shortenReason(recall.reason);

  function activate() {
    onSelect?.(recall);
  }

  function handleKeyDown(event) {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  }

  return (
    <article
      className="recall-card"
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? activate : undefined}
      onKeyDown={handleKeyDown}
      aria-label={onSelect ? `View details for ${title}` : undefined}
    >
      <RecallImage recall={recall} />
      <div className="recall-card-body">
        <h2 className="recall-card-title">{title}</h2>
        <p className="recall-card-firm">{recall.firm}</p>
        {reason ? <p className="recall-card-reason">{reason}</p> : null}
        <p className="recall-card-meta">
          <span>{recall.classification}</span>
          <time dateTime={recall.recallDate}>{formatRecallDate(recall.recallDate)}</time>
        </p>
      </div>
    </article>
  );
}

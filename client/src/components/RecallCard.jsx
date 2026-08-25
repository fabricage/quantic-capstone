/**
 * RecallCard.jsx
 * Purpose: One search-result card. Not clickable yet (detail view is Card 5).
 */
import { formatRecallDate } from '../lib/dates.js';
import { shortenProductTitle, shortenReason } from '../lib/textSnippets.js';
import RecallImage from './RecallImage.jsx';

export default function RecallCard({ recall }) {
  const title = shortenProductTitle(recall.product);
  const reason = shortenReason(recall.reason);

  return (
    <article className="recall-card">
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

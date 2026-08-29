/**
 * RecallDetail.jsx
 * Purpose: Full-text view of one normalized recall. No extra fetch — same object as the card.
 */
import { useEffect } from 'react';
import { categoryImageAlt, matchCategory } from '../lib/categoryImage.js';
import { formatRecallDate } from '../lib/dates.js';
import RecallImage from './RecallImage.jsx';
import StatusMessage from './StatusMessage.jsx';

function isSparseRecall(recall) {
  // Bookmarks in Card 7 may store only id + product + date.
  const hasIdentity = Boolean(recall.id && recall.product);
  const hasDate = Boolean(recall.recallDate || recall.publishedDate);
  const missingBody =
    !recall.firm &&
    !recall.reason &&
    !recall.classification &&
    !recall.status &&
    !recall.state;
  return hasIdentity && hasDate && missingBody;
}

function Field({ label, value }) {
  const text = value ? String(value) : '—';
  return (
    <div className="recall-detail-field">
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

export default function RecallDetail({ recall, onBack, onSave, saved = false }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onBack();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  if (!recall) {
    return (
      <section className="recall-detail">
        <button type="button" className="recall-detail-back" onClick={onBack}>
          Back
        </button>
        <StatusMessage tone="error">
          We couldn’t open that recall. Go back to search to keep going.
        </StatusMessage>
      </section>
    );
  }

  const sparse = isSparseRecall(recall);
  const showCategoryCue = !recall.imageUrl;
  const categoryId = matchCategory(recall.product);

  return (
    <article className="recall-detail">
      <div className="recall-detail-toolbar">
        <button type="button" className="recall-detail-back" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="recall-detail-save"
          aria-pressed={saved}
          onClick={() => onSave(recall)}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {showCategoryCue ? (
        <figure className="recall-detail-figure">
          <RecallImage recall={recall} className="recall-detail-image" />
          <figcaption>
            Category illustration — {categoryImageAlt(recall.product)} ({categoryId})
          </figcaption>
        </figure>
      ) : (
        <RecallImage recall={recall} className="recall-detail-image" />
      )}

      <h2 className="recall-detail-title">{recall.product || 'Untitled recall'}</h2>

      {sparse ? (
        <StatusMessage>
          Full fields unavailable. This saved recall only has an id, product, and date.
        </StatusMessage>
      ) : null}

      <dl className="recall-detail-fields">
        <Field label="Firm" value={recall.firm} />
        <Field label="Classification" value={recall.classification} />
        <Field label="Status" value={recall.status} />
        <Field label="State" value={recall.state} />
        <Field label="Date" value={formatRecallDate(recall.recallDate)} />
      </dl>

      <section className="recall-detail-reason-block">
        <h3>Reason</h3>
        <p className="recall-detail-reason">{recall.reason || '—'}</p>
      </section>
    </article>
  );
}

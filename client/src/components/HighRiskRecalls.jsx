/**
 * HighRiskRecalls.jsx
 * Purpose: Compact Class I strip (FDA food only) with a shortcut that filters
 * the main list. Severity is not popularity.
 */
import { useEffect, useRef, useState } from 'react';
import { searchRecalls } from '../api.js';
import { shortenProductTitle } from '../lib/textSnippets.js';
import StatusMessage from './StatusMessage.jsx';

const STRIP_LIMIT = 3;

export default function HighRiskRecalls({ onSelect, onBrowse, onFailed }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    onFailedRef.current?.(false);

    // CPSC consumer recalls have no classification, so this is FDA food only.
    searchRecalls({ source: 'food', classification: 'Class I', limit: STRIP_LIMIT })
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data.results) ? data.results : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setItems([]);
        setLoading(false);
        onFailedRef.current?.(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="class-one-strip" aria-labelledby="high-risk-heading">
      <div className="class-one-strip-header">
        <h3 id="high-risk-heading" className="class-one-strip-title">
          Class I high-risk <span className="class-one-strip-scope">FDA food only</span>
        </h3>
        {onBrowse ? (
          <button type="button" className="class-one-strip-browse" onClick={() => onBrowse()}>
            Show all Class I
          </button>
        ) : null}
      </div>
      <p className="class-one-strip-lede">
        Class I means a reasonable chance of serious health consequences — severity,
        not popularity. CPSC consumer recalls are not classified.
      </p>
      {loading ? <StatusMessage>Loading Class I recalls…</StatusMessage> : null}
      {!loading && failed ? (
        <StatusMessage>We couldn’t load Class I recalls right now.</StatusMessage>
      ) : null}
      {!loading && !failed && items.length === 0 ? (
        <StatusMessage>No Class I recalls to show right now.</StatusMessage>
      ) : null}
      {!loading && !failed && items.length > 0 ? (
        <ul className="class-one-strip-list">
          {items.map((recall) => {
            const title = shortenProductTitle(recall.product);
            return (
              <li key={recall.id || recall.product}>
                <button
                  type="button"
                  className="class-one-strip-item"
                  aria-label={`Open Class I recall: ${title}`}
                  onClick={() => onSelect?.(recall)}
                >
                  {recall.firm ? `${title} · ${recall.firm}` : title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

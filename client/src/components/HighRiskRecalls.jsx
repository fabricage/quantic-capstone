/**
 * HighRiskRecalls.jsx
 * Purpose: Home preview of Class I FDA recalls. Severity is not popularity.
 */
import { useEffect, useRef, useState } from 'react';
import { searchRecalls } from '../api.js';
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

const PREVIEW_LIMIT = 5;

export default function HighRiskRecalls({ onSelect, onFailed }) {
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

    searchRecalls({ source: 'food', classification: 'Class I', limit: PREVIEW_LIMIT })
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
    <section className="home-module high-risk-recalls" aria-labelledby="high-risk-heading">
      <h2 id="high-risk-heading" className="home-module-title">
        Class I high-risk
      </h2>
      <p className="home-module-lede">
        Class I means a reasonable chance of serious health consequences — that is
        severity, not popularity. A Class I recall is not the same as a trending
        product.
      </p>
      {loading ? <StatusMessage>Loading Class I recalls…</StatusMessage> : null}
      {!loading && failed ? (
        <StatusMessage>We couldn’t load Class I recalls right now.</StatusMessage>
      ) : null}
      {!loading && !failed && items.length === 0 ? (
        <StatusMessage>No Class I recalls to preview right now.</StatusMessage>
      ) : null}
      {!loading && !failed && items.length > 0 ? (
        <ul className="recall-list">
          {items.map((recall) => (
            <li key={recall.id || recall.product}>
              <RecallCard recall={recall} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

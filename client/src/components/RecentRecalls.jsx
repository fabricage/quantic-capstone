/**
 * RecentRecalls.jsx
 * Purpose: Home “latest” preview. FDA column only until consumer reports land.
 */
import { useEffect, useRef, useState } from 'react';
import { searchRecalls } from '../api.js';
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

const PREVIEW_LIMIT = 5;

export default function RecentRecalls({ onSelect, onFailed }) {
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

    searchRecalls({ source: 'food', limit: PREVIEW_LIMIT })
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
    <section className="home-module recent-recalls" aria-labelledby="recent-recalls-heading">
      <h2 id="recent-recalls-heading" className="home-module-title">
        Latest recalls
      </h2>
      <p className="home-module-lede">
        The most recent FDA food enforcement reports. A consumer-report column
        will sit beside this later.
      </p>
      <div className="home-columns">
        <div className="home-column">
          <h3 className="home-column-title">FDA food</h3>
          {loading ? <StatusMessage>Loading latest recalls…</StatusMessage> : null}
          {!loading && failed ? (
            <StatusMessage>We couldn’t load the latest FDA recalls right now.</StatusMessage>
          ) : null}
          {!loading && !failed && items.length === 0 ? (
            <StatusMessage>No recent FDA recalls to preview right now.</StatusMessage>
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
        </div>
      </div>
    </section>
  );
}

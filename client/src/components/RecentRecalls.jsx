/**
 * RecentRecalls.jsx
 * Purpose: Home “latest” preview — FDA food column and CPSC consumer column.
 */
import { useEffect, useRef, useState } from 'react';
import { searchRecalls } from '../api.js';
import RecallCard from './RecallCard.jsx';
import StatusMessage from './StatusMessage.jsx';

const PREVIEW_LIMIT = 5;

function Column({ title, loading, failed, items, onSelect, loadingLabel, failedLabel, emptyLabel }) {
  return (
    <div className="home-column">
      <h3 className="home-column-title">{title}</h3>
      {loading ? <StatusMessage>{loadingLabel}</StatusMessage> : null}
      {!loading && failed ? <StatusMessage>{failedLabel}</StatusMessage> : null}
      {!loading && !failed && items.length === 0 ? <StatusMessage>{emptyLabel}</StatusMessage> : null}
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
  );
}

export default function RecentRecalls({ onSelect, onFailed, onConsumerFailed }) {
  const [food, setFood] = useState([]);
  const [consumer, setConsumer] = useState([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [consumerLoading, setConsumerLoading] = useState(true);
  const [foodFailed, setFoodFailed] = useState(false);
  const [consumerFailed, setConsumerFailed] = useState(false);
  const onFailedRef = useRef(onFailed);
  const onConsumerFailedRef = useRef(onConsumerFailed);
  onFailedRef.current = onFailed;
  onConsumerFailedRef.current = onConsumerFailed;

  useEffect(() => {
    let cancelled = false;
    setFoodLoading(true);
    setConsumerLoading(true);
    setFoodFailed(false);
    setConsumerFailed(false);
    onFailedRef.current?.(false);
    onConsumerFailedRef.current?.(false);

    searchRecalls({ source: 'food', limit: PREVIEW_LIMIT })
      .then((data) => {
        if (cancelled) return;
        setFood(Array.isArray(data.results) ? data.results : []);
        setFoodLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFoodFailed(true);
        setFood([]);
        setFoodLoading(false);
        onFailedRef.current?.(true);
      });

    searchRecalls({ source: 'consumer', limit: PREVIEW_LIMIT })
      .then((data) => {
        if (cancelled) return;
        setConsumer(Array.isArray(data.results) ? data.results : []);
        setConsumerLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setConsumerFailed(true);
        setConsumer([]);
        setConsumerLoading(false);
        onConsumerFailedRef.current?.(true);
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
        The most recent FDA food enforcement reports and CPSC consumer-product
        recalls. CPSC “latest” uses the official listing date, not a later edit.
      </p>
      <div className="home-columns home-columns--two">
        <Column
          title="FDA food"
          loading={foodLoading}
          failed={foodFailed}
          items={food}
          onSelect={onSelect}
          loadingLabel="Loading latest recalls…"
          failedLabel="We couldn’t load the latest FDA recalls right now."
          emptyLabel="No recent FDA recalls to preview right now."
        />
        <Column
          title="CPSC consumer"
          loading={consumerLoading}
          failed={consumerFailed}
          items={consumer}
          onSelect={onSelect}
          loadingLabel="Loading consumer recalls…"
          failedLabel="We couldn’t load the latest consumer recalls right now."
          emptyLabel="No recent consumer recalls to preview right now."
        />
      </div>
    </section>
  );
}

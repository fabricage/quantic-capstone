/**
 * RecallImage.jsx
 * Purpose: FDA food uses a category SVG. CPSC consumer uses API imageUrl/imageAlt.
 */
import { useState } from 'react';
import { categoryImageAlt, categoryImageSrc } from '../lib/categoryImage.js';

export default function RecallImage({ recall, className = 'recall-image' }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  if (recall?.source === 'consumer') {
    if (!recall.imageUrl) return null;
    return (
      <img
        className={className}
        src={recall.imageUrl}
        alt={recall.imageAlt || ''}
        onError={() => setHidden(true)}
      />
    );
  }

  if (recall?.source && recall.source !== 'food') return null;

  const src = recall.imageUrl || categoryImageSrc(recall.product);
  const alt = recall.imageAlt || categoryImageAlt(recall.product);

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
    />
  );
}

/**
 * RecallImage.jsx
 * Purpose: Show a category SVG for FDA food recalls. Hide the image if it fails to load.
 */
import { useState } from 'react';
import { categoryImageAlt, categoryImageSrc } from '../lib/categoryImage.js';

export default function RecallImage({ recall }) {
  const [hidden, setHidden] = useState(false);

  // CPSC product photos arrive in Card 11; Card 1 only cues FDA food categories.
  if (hidden || recall?.source !== 'food') return null;

  const src = recall.imageUrl || categoryImageSrc(recall.product);
  const alt = recall.imageAlt || categoryImageAlt(recall.product);

  return (
    <img
      className="recall-image"
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
    />
  );
}

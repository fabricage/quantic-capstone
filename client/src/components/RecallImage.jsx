/**
 * RecallImage.jsx
 * Purpose: Redesigned recall square. WebGL paints a Three.js clay tile
 * (shared renderer). No GPU → same category SVG / CPSC photo as before.
 */
import { useEffect, useRef, useState } from 'react';
import { categoryImageAlt, categoryImageSrc } from '../lib/categoryImage.js';
import { createTileScene } from '../lib/recallTileScene.js';
import { registerTile, unregisterTile } from '../lib/recallTileRuntime.js';
import {
  prefersReducedMotion,
  tileAlt,
  tileKind,
} from '../lib/recallTileTheme.js';
import { canUseWebGL } from '../lib/webgl.js';

function FallbackImage({ recall, className }) {
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
    <img className={className} src={src} alt={alt} onError={() => setHidden(true)} />
  );
}

function TileCanvas({ recall, size }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const kind = tileKind(recall);
    const tile = createTileScene({
      kind,
      classification: recall?.classification || '',
    });
    tile.visible = false;
    tile.reduceMotion = prefersReducedMotion();
    tile.ctx = canvas.getContext('2d');

    function syncSize() {
      const css = Math.max(1, Math.round(canvas.clientWidth || (size === 'detail' ? 192 : 72)));
      const dpr = Math.min(window.devicePixelRatio || 1, size === 'detail' ? 1.75 : 1.25);
      const px = Math.max(1, Math.round(css * dpr));
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      tile.width = px;
      tile.height = px;
      tile.camera.aspect = 1;
      tile.camera.updateProjectionMatrix();
    }

    syncSize();
    tile.visible = true;
    if (tile.reduceMotion) tile.tick?.(0);

    let io;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(
        ([entry]) => {
          tile.visible = Boolean(entry?.isIntersecting);
        },
        { rootMargin: '80px' },
      );
      io.observe(canvas);
    }

    let ro;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(syncSize);
      ro.observe(canvas);
    }

    registerTile(tile);
    return () => {
      io?.disconnect();
      ro?.disconnect();
      unregisterTile(tile);
    };
  }, [
    recall?.id,
    recall?.product,
    recall?.source,
    recall?.classification,
    recall?.imageUrl,
    size,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="recall-tile-canvas"
      role="img"
      aria-label={tileAlt(recall)}
    />
  );
}

export default function RecallImage({ recall, className = '', size = 'card' }) {
  const kind = tileKind(recall);
  const webgl = canUseWebGL();
  const showPhoto = recall?.source === 'consumer' && Boolean(recall.imageUrl);
  const [photoHidden, setPhotoHidden] = useState(false);

  if (!webgl) {
    return <FallbackImage recall={recall} className={className || 'recall-image'} />;
  }

  return (
    <div
      className={`recall-tile ${className}`.trim()}
      data-recall-tile="webgl"
      data-tile-kind={kind}
      data-tile-size={size}
    >
      <TileCanvas recall={recall} size={size} />
      {showPhoto && !photoHidden ? (
        <img
          className="recall-tile-photo"
          src={recall.imageUrl}
          alt={recall.imageAlt || ''}
          onError={() => setPhotoHidden(true)}
        />
      ) : null}
    </div>
  );
}

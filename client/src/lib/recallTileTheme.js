/**
 * recallTileTheme.js
 * Purpose: Map a recall to a 3D "kind" and sage-garden colors.
 *
 * FDA food uses the same category ids as the SVG fallback (formula, dairy…).
 * CPSC is one kind (`consumer`) because the photo, not a food shape, is the cue.
 * Class I gets a warmer rim so severity still reads at a glance.
 */

import { matchCategory } from './categoryImage.js';

export const TILE_KINDS = [
  'formula',
  'nuts',
  'dairy',
  'seafood',
  'meat',
  'beverage',
  'produce',
  'packaged',
  'consumer',
];

const KIND_COLORS = {
  formula: 0x7aa3c7,
  nuts: 0xb0894f,
  dairy: 0xe8d9a8,
  seafood: 0x4f8ea8,
  meat: 0xb45a4a,
  beverage: 0x5d8c5a,
  produce: 0x6fa35c,
  packaged: 0xc4a574,
  consumer: 0x4d6b8a,
};

export function tileKind(recall) {
  if (recall?.source === 'consumer') return 'consumer';
  return matchCategory(recall?.product);
}

export function tileAlt(recall) {
  if (recall?.source === 'consumer') {
    return recall.imageAlt || 'Consumer product recall';
  }
  const kind = tileKind(recall);
  return `${kind} category`;
}

export function tileAccent(kind) {
  return KIND_COLORS[kind] ?? KIND_COLORS.packaged;
}

export function tilePlateColor(classification) {
  const text = String(classification ?? '').toLowerCase();
  if (text.includes('class i') && !text.includes('class ii') && !text.includes('class iii')) {
    return 0xf3e2d8;
  }
  return 0xd9e4cc;
}

export function tileRimColor(classification) {
  const text = String(classification ?? '').toLowerCase();
  if (text.includes('class i') && !text.includes('class ii') && !text.includes('class iii')) {
    return 0x8a2f2f;
  }
  return 0x2f6b3a;
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

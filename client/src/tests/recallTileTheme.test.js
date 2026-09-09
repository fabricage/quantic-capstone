/**
 * recallTileTheme.test.js
 * Purpose: Kind + palette follow FDA categories and Class I rims.
 */
import { describe, expect, it } from 'vitest';
import {
  tileAccent,
  tileKind,
  tilePlateColor,
  tileRimColor,
} from '../lib/recallTileTheme.js';

describe('tileKind', () => {
  it('uses food categories for FDA and consumer for CPSC', () => {
    expect(tileKind({ source: 'food', product: 'Infant formula' })).toBe('formula');
    expect(tileKind({ source: 'food', product: 'Cheddar cheese' })).toBe('dairy');
    expect(tileKind({ source: 'consumer', product: 'Crib mattress' })).toBe('consumer');
  });
});

describe('tile palette', () => {
  it('gives Class I a warmer plate and a danger rim', () => {
    expect(tilePlateColor('Class I')).not.toBe(tilePlateColor('Class II'));
    expect(tileRimColor('Class I')).toBe(0x8a2f2f);
    expect(tileRimColor('Class II')).toBe(0x2f6b3a);
    expect(tileRimColor('Class III')).toBe(0x2f6b3a);
  });

  it('assigns a distinct accent per kind', () => {
    expect(tileAccent('dairy')).not.toBe(tileAccent('meat'));
    expect(tileAccent('consumer')).not.toBe(tileAccent('formula'));
  });
});

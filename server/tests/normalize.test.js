/**
 * normalize.test.js
 * Purpose: Unit tests for FDA food-recall field mapping and date compacting.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeFoodRecall,
  normalizeRecall,
  normalizeRecalls,
  toRecallDate,
} from '../lib/normalize.js';

const sample = {
  recall_number: 'F-123-2024',
  recalling_firm: 'Acme Foods Inc',
  product_description: 'Infant formula, 12 oz cans',
  reason_for_recall: 'Possible Cronobacter contamination',
  classification: 'Class I',
  status: 'Ongoing',
  state: 'CA',
  report_date: '20240110',
  recall_initiation_date: '20231220',
};

describe('toRecallDate', () => {
  it('compacts dashed dates and passes through YYYYMMDD', () => {
    expect(toRecallDate('20240115')).toBe('20240115');
    expect(toRecallDate('2024-01-15')).toBe('20240115');
  });

  it('returns an empty string for missing or junk values', () => {
    expect(toRecallDate('')).toBe('');
    expect(toRecallDate(null)).toBe('');
    expect(toRecallDate(undefined)).toBe('');
    expect(toRecallDate('Monday')).toBe('');
  });
});

describe('normalizeRecall', () => {
  it('maps openFDA fields onto the shared recall shape', () => {
    const recall = normalizeRecall(sample);
    expect(recall).toEqual({
      id: 'F-123-2024',
      firm: 'Acme Foods Inc',
      product: 'Infant formula, 12 oz cans',
      reason: 'Possible Cronobacter contamination',
      classification: 'Class I',
      status: 'Ongoing',
      state: 'CA',
      recallDate: '20240110',
      publishedDate: '20240110',
      source: 'food',
      url: '',
      imageUrl: '',
      imageAlt: '',
      country: '',
      origin: '',
    });
    expect(normalizeFoodRecall(sample)).toEqual(recall);
  });

  it('uses empty strings for missing fields and falls back to initiation date', () => {
    const recall = normalizeRecall({
      recall_initiation_date: '2024-02-01',
    });
    expect(recall.id).toBe('');
    expect(recall.firm).toBe('');
    expect(recall.product).toBe('');
    expect(recall.reason).toBe('');
    expect(recall.classification).toBe('');
    expect(recall.status).toBe('');
    expect(recall.state).toBe('');
    expect(recall.publishedDate).toBe('');
    expect(recall.recallDate).toBe('20240201');
    expect(Object.values(recall).every((v) => v !== undefined)).toBe(true);
  });
});

describe('normalizeRecalls', () => {
  it('maps an array of records', () => {
    expect(normalizeRecalls([sample])).toHaveLength(1);
    expect(normalizeRecalls([sample])[0].id).toBe('F-123-2024');
  });

  it('returns an empty array for non-array input', () => {
    expect(normalizeRecalls(null)).toEqual([]);
    expect(normalizeRecalls(undefined)).toEqual([]);
    expect(normalizeRecalls({ results: [] })).toEqual([]);
  });
});

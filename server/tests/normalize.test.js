/**
 * normalize.test.js
 * Purpose: Unit tests for FDA food-recall field mapping and date compacting.
 */
import { describe, expect, it } from 'vitest';
import {
  firstCpscImage,
  normalizeConsumerRecall,
  normalizeFoodRecall,
  normalizeRecall,
  normalizeRecalls,
  sortRecallsByDateDesc,
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

describe('firstCpscImage', () => {
  it('prefers a still jpg/png/webp over a GIF', () => {
    const photo = firstCpscImage([
      { URL: 'https://www.cpsc.gov/s3fs-public/label.gif', Caption: 'Label loop' },
      { URL: 'https://www.cpsc.gov/s3fs-public/crib.jpg', Caption: 'Crib still' },
      { URL: 'https://www.cpsc.gov/s3fs-public/other.webp', Caption: 'Other still' },
    ]);
    expect(photo.imageUrl).toBe('https://www.cpsc.gov/s3fs-public/crib.jpg');
    expect(photo.imageAlt).toBe('Crib still');
  });

  it('returns empty strings when Images is missing', () => {
    expect(firstCpscImage(null)).toEqual({ imageUrl: '', imageAlt: '' });
    expect(firstCpscImage([])).toEqual({ imageUrl: '', imageAlt: '' });
  });
});

describe('normalizeConsumerRecall', () => {
  const sampleCpsc = {
    RecallID: 10904,
    RecallNumber: '26669',
    RecallDate: '2026-08-06T00:00:00',
    LastPublishDate: '2026-08-07T00:00:00',
    Title: 'Play Yard and Crib Mattresses Recalled',
    URL: 'https://www.cpsc.gov/Recalls/2026/example',
    Description: 'This recall involves Voomf mattresses.',
    Products: [{ Name: 'Voomf Play Yard and Crib Mattresses' }],
    Hazards: [{ Name: 'Entrapment hazard' }],
    Manufacturers: [],
    Importers: [{ Name: 'Voomf of China' }],
    Retailers: [{ Name: 'Amazon.com' }],
    Images: [
      { URL: 'https://www.cpsc.gov/s3fs-public/voomf-1.jpg', Caption: 'Mattress photo' },
      { URL: 'https://www.cpsc.gov/s3fs-public/voomf-3.gif', Caption: 'Label gif' },
    ],
  };

  it('maps CPSC fields onto the shared recall shape', () => {
    expect(normalizeConsumerRecall(sampleCpsc)).toEqual({
      id: 'cpsc-26669',
      firm: 'Voomf of China',
      product: 'Voomf Play Yard and Crib Mattresses',
      reason: 'Entrapment hazard',
      classification: 'Consumer Product',
      status: '',
      state: '',
      recallDate: '20260806',
      publishedDate: '20260807',
      source: 'consumer',
      url: 'https://www.cpsc.gov/Recalls/2026/example',
      imageUrl: 'https://www.cpsc.gov/s3fs-public/voomf-1.jpg',
      imageAlt: 'Mattress photo',
      country: '',
      origin: '',
    });
  });

  it('falls back to Title, Description, RecallID, and LastPublishDate', () => {
    const recall = normalizeConsumerRecall({
      RecallID: 42,
      Title: 'Untitled widget',
      Description: 'Sharp edges',
      LastPublishDate: '2024-02-01T00:00:00',
    });
    expect(recall.id).toBe('cpsc-42');
    expect(recall.product).toBe('Untitled widget');
    expect(recall.reason).toBe('Sharp edges');
    expect(recall.recallDate).toBe('20240201');
    expect(recall.classification).toBe('Consumer Product');
  });

  it('does not treat a stale LastPublishDate as the published sort date', () => {
    const recall = normalizeConsumerRecall({
      RecallID: 1,
      RecallNumber: '00111',
      RecallDate: '2000-03-15T00:00:00',
      LastPublishDate: '2026-09-01T00:00:00',
      Title: 'Old toy',
    });
    expect(recall.recallDate).toBe('20000315');
    expect(recall.publishedDate).toBe('20000315');
  });
});

describe('sortRecallsByDateDesc', () => {
  it('sorts by publishedDate, then recallDate, then id', () => {
    const sorted = sortRecallsByDateDesc([
      { id: 'b', publishedDate: '20240101', recallDate: '20240101' },
      { id: 'a', publishedDate: '20240102', recallDate: '20240102' },
      { id: 'c', publishedDate: '20240101', recallDate: '20240103' },
      { id: 'd', publishedDate: '20240101', recallDate: '20240101' },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(['a', 'c', 'b', 'd']);
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

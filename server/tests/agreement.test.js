/**
 * agreement.test.js
 * Purpose: Ranking eval metric plus mock ranker vs fixtures (min-score 0.5).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatCaseReport,
  scoreTopNAgreement,
} from '../../evals/lib/agreement.js';
import { mockRankRecalls } from '../../evals/lib/mockRanker.js';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../evals/fixtures/ranking-cases.json',
);
const { cases } = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('scoreTopNAgreement', () => {
  it('is |intersection| / |expected| over the actual top N', () => {
    expect(scoreTopNAgreement(['a', 'b'], ['a', 'c', 'b'], 2)).toBe(0.5);
    expect(scoreTopNAgreement(['a', 'b'], ['a', 'b', 'c'], 2)).toBe(1);
    expect(scoreTopNAgreement(['a', 'b'], ['b', 'a'], 2)).toBe(1);
    expect(scoreTopNAgreement(['a', 'b', 'c'], ['a', 'x', 'y'], 3)).toBeCloseTo(1 / 3);
  });

  it('returns 1 when expected is empty', () => {
    expect(scoreTopNAgreement([], ['a', 'b'], 2)).toBe(1);
    expect(scoreTopNAgreement(null, ['a'], 1)).toBe(1);
  });

  it('returns 0 when expected ids never appear in the window', () => {
    expect(scoreTopNAgreement(['a'], ['b', 'c'], 2)).toBe(0);
  });
});

describe('formatCaseReport', () => {
  it('includes status, score, and both id lists', () => {
    const report = formatCaseReport({
      id: 'demo',
      personaId: 'parent-young-kids',
      score: 1,
      minScore: 0.5,
      topN: 3,
      expectedTopIds: ['F-1'],
      actualTopIds: ['F-1', 'F-2'],
      pass: true,
    });
    expect(report).toMatch(/PASS/);
    expect(report).toMatch(/demo/);
    expect(report).toMatch(/score=1\.00/);
    expect(report).toMatch(/expected=\[F-1\]/);
    expect(report).toMatch(/actualTop=\[F-1, F-2\]/);
  });
});

describe('mockRanker vs fixtures', () => {
  it('keeps mock agreement at or above 0.5 for every case', () => {
    expect(cases.length).toBeGreaterThanOrEqual(4);
    const ids = cases.map((testCase) => testCase.id);
    expect(ids).toEqual(expect.arrayContaining([
      'parent-young-kids-formula-allergens',
      'retiree-meds-supplements',
      'renter-twenties-convenience',
      'allergy-household-undeclared',
    ]));

    for (const testCase of cases) {
      const ranked = mockRankRecalls(testCase.personaId, testCase.recalls);
      expect(ranked.every((item) => item.id && item.why && Number.isInteger(item.relevance))).toBe(
        true,
      );
      expect(ranked.map((item) => item.id).sort()).toEqual(
        testCase.recalls.map((recall) => recall.id).sort(),
      );
      const score = scoreTopNAgreement(
        testCase.expectedTopIds,
        ranked.map((item) => item.id),
        testCase.topN,
      );
      expect(score, testCase.id).toBeGreaterThanOrEqual(0.5);
    }
  });
});

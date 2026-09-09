/**
 * agreement.js
 * Purpose: Top-N set overlap for ranking evals. Order inside the window
 * does not matter — we only ask “did the expected ids show up?”
 *
 * score = |expected ∩ actualTopN| / |expected|
 * Empty expected → 1 (nothing to miss).
 */

export function asIdList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const ids = [];
  for (const item of value) {
    const id = typeof item === 'string' ? item : item?.id;
    const text = String(id ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    ids.push(text);
  }
  return ids;
}

export function scoreTopNAgreement(expected, actualRankedIds, topN) {
  const want = asIdList(expected);
  if (want.length === 0) return 1;

  const parsedN = Number(topN);
  const n = Number.isFinite(parsedN) && parsedN > 0 ? Math.floor(parsedN) : want.length;
  const got = new Set(asIdList(actualRankedIds).slice(0, n));
  let hits = 0;
  for (const id of want) {
    if (got.has(id)) hits += 1;
  }
  return hits / want.length;
}

export function formatCaseReport({
  id = '',
  personaId = '',
  score = 0,
  minScore = 0,
  topN = 0,
  expectedTopIds = [],
  actualTopIds = [],
  pass = false,
  error = '',
} = {}) {
  const expected = asIdList(expectedTopIds).join(', ') || '—';
  const actual = asIdList(actualTopIds).join(', ') || '—';
  const status = pass ? 'PASS' : 'FAIL';
  const err = error ? `  error=${error}` : '';
  return [
    `${status}  ${id}  (${personaId})`,
    `  score=${score.toFixed(2)}  min=${Number(minScore).toFixed(2)}  topN=${topN}`,
    `  expected=[${expected}]`,
    `  actualTop=[${actual}]${err}`,
  ].join('\n');
}

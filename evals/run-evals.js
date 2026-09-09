#!/usr/bin/env node
/**
 * run-evals.js
 * Purpose: Fixture-based persona-ranking evals.
 *
 * --mock (default) uses the deterministic keyword ranker (no API key).
 * --live POSTs /api/persona-rank; fallback counts as failure.
 * Exit 0 only when every case scores at or above --min-score (default 0.5).
 */
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { formatCaseReport, scoreTopNAgreement } from './lib/agreement.js';
import { mockRankRecalls } from './lib/mockRanker.js';

const DEFAULT_FIXTURE = fileURLToPath(new URL('./fixtures/ranking-cases.json', import.meta.url));
const DEFAULT_BASE_URL = 'http://localhost:3001';
const DEFAULT_MIN_SCORE = 0.5;

export function parseEvalArgs(argv = []) {
  const args = {
    mode: 'mock',
    baseUrl: DEFAULT_BASE_URL,
    minScore: DEFAULT_MIN_SCORE,
    fixture: DEFAULT_FIXTURE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--mock') {
      args.mode = 'mock';
    } else if (flag === '--live') {
      args.mode = 'live';
    } else if (flag === '--base-url') {
      args.baseUrl = String(argv[i + 1] ?? '').trim() || DEFAULT_BASE_URL;
      i += 1;
    } else if (flag === '--min-score') {
      const value = Number(argv[i + 1]);
      args.minScore = Number.isFinite(value) ? value : DEFAULT_MIN_SCORE;
      i += 1;
    } else if (flag === '--fixture') {
      const raw = String(argv[i + 1] ?? '').trim();
      if (raw) {
        args.fixture = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
      }
      i += 1;
    }
  }

  return args;
}

export function loadRankingCases(fixturePath = DEFAULT_FIXTURE) {
  const parsed = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const cases = Array.isArray(parsed) ? parsed : parsed?.cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error(`No ranking cases in ${fixturePath}`);
  }
  return cases;
}

async function liveRank(baseUrl, personaId, recalls, fetchImpl) {
  const origin = String(baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const response = await fetchImpl(`${origin}/api/persona-rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId, recalls }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, rankedIds: [], error: 'live response was not JSON' };
  }

  if (!response.ok || data?.fallback || !Array.isArray(data?.ranked)) {
    return { ok: false, rankedIds: [], error: data?.error || 'live ranking fallback' };
  }

  return {
    ok: true,
    rankedIds: data.ranked.map((item) => item?.id).filter(Boolean),
  };
}

export async function evaluateCase(testCase, { mode, baseUrl, minScore }, fetchImpl = fetch) {
  const expectedTopIds = testCase.expectedTopIds ?? [];
  const topN = testCase.topN ?? expectedTopIds.length;
  let rankedIds = [];
  let error = '';

  if (mode === 'live') {
    try {
      const live = await liveRank(baseUrl, testCase.personaId, testCase.recalls, fetchImpl);
      rankedIds = live.rankedIds;
      if (!live.ok) error = live.error || 'live ranking fallback';
    } catch (err) {
      error = err?.message || 'live ranking request failed';
    }
  } else {
    rankedIds = mockRankRecalls(testCase.personaId, testCase.recalls).map((item) => item.id);
  }

  const score = error ? 0 : scoreTopNAgreement(expectedTopIds, rankedIds, topN);
  const pass = !error && score >= minScore;
  const actualTopIds = rankedIds.slice(0, topN);

  return {
    id: testCase.id,
    personaId: testCase.personaId,
    score,
    minScore,
    topN,
    expectedTopIds,
    actualTopIds,
    pass,
    error,
  };
}

export async function runEvals(options, fetchImpl = fetch) {
  const cases = loadRankingCases(options.fixture);
  const results = [];
  for (const testCase of cases) {
    results.push(await evaluateCase(testCase, options, fetchImpl));
  }
  return results;
}

function printResults(results, options) {
  console.log(`Ranking evals (${options.mode})  min-score=${options.minScore}`);
  console.log(`fixture=${options.fixture}`);
  console.log('');
  for (const result of results) {
    console.log(formatCaseReport(result));
    console.log('');
  }
  const passed = results.filter((result) => result.pass).length;
  console.log(`${passed}/${results.length} cases passed`);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseEvalArgs(argv);
  let results;
  try {
    results = await runEvals(options);
  } catch (err) {
    console.error(err?.message || err);
    process.exitCode = 1;
    return;
  }
  printResults(results, options);
  process.exitCode = results.every((result) => result.pass) ? 0 : 1;
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  await main();
}

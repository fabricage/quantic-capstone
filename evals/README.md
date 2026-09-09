# Ranking evals

Fixture-based checks for persona ranking. They **do not change** production ranking. Mock mode needs no API key; live mode is optional.

## Metric

`scoreTopNAgreement(expected, actualRankedIds, topN)` =

`|expected ∩ first topN actual ids| / |expected|`

- Order inside the window does not matter.
- An empty `expectedTopIds` list scores **1** (nothing to miss).
- A live `{ fallback: true }` response is a **failure** (score 0).

Default pass line: every case ≥ **0.5**.

## Run modes

From the repo root:

```bash
node evals/run-evals.js --mock
```

From `server/` (same mock run):

```bash
npm run eval
```

Live against a running BFF (needs `ANTHROPIC_API_KEY` on the server). Fallback counts as fail. Not required in CI.

```bash
node evals/run-evals.js --live --base-url http://localhost:3001
```

Useful flags:

| Flag | Default | Meaning |
|---|---|---|
| `--mock` | on | Deterministic keyword ranker |
| `--live` | off | `POST /api/persona-rank` |
| `--base-url` | `http://localhost:3001` | Live BFF origin |
| `--min-score` | `0.5` | Per-case pass line |
| `--fixture` | `evals/fixtures/ranking-cases.json` | Cases file |

CI runs `node evals/run-evals.js --mock` after client tests. No key is used.

## Adding a case

1. Open `evals/fixtures/ranking-cases.json`.
2. Append an object to `cases` with:
   - `id` — unique slug
   - `personaId` — one of `parent-young-kids`, `renter-twenties`, `retiree-meds`, `allergy-household` (must match `server/lib/personas.js`)
   - `topN` — how many ranked ids to compare
   - `expectedTopIds` — ids that should appear in that window (formula + nut/allergen for the parent case; supplement/tea for the retiree case)
   - `recalls` — normalized recall objects (`id`, `firm`, `product`, `reason`, `classification`, …)
3. Run `node evals/run-evals.js --mock`. Mock agreement for the suite should stay ≥ 0.5.

The mock ranker is a keyword + Class I/II heuristic. It proves the harness, not Claude.

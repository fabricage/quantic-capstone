/**
 * mockRanker.js
 * Purpose: Deterministic keyword + Class I/II heuristic per persona.
 *
 * Same { id, relevance, why }[] shape as the live ranker, best first.
 * This proves the eval harness — it is not a Claude substitute.
 */

const CLASS_BONUS = {
  'Class I': 3,
  'Class II': 1,
};

const PERSONA_TERMS = {
  'parent-young-kids': [
    ['formula', 5],
    ['infant', 4],
    ['peanut', 4],
    ['allergen', 3],
    ['yogurt', 3],
    ['lunchbox', 3],
    ['snack', 2],
    ['kids', 2],
    ['child', 2],
    ['milk', 2],
  ],
  'renter-twenties': [
    ['coffee', 5],
    ['frozen', 4],
    ['ready-to-eat', 4],
    ['ramen', 3],
    ['convenience', 3],
    ['budget', 2],
    ['iced', 2],
  ],
  'retiree-meds': [
    ['supplement', 5],
    ['vitamin', 4],
    ['tea', 4],
    ['medical food', 4],
    ['pharmacy', 3],
    ['sodium', 2],
    ['dietary', 2],
  ],
  'allergy-household': [
    ['undeclared', 5],
    ['peanut', 4],
    ['tree nut', 4],
    ['cross-contact', 4],
    ['sesame', 3],
    ['allergen', 3],
    ['soy', 2],
    ['wheat', 2],
    ['egg', 2],
  ],
};

function haystack(recall = {}) {
  return `${recall.product ?? ''} ${recall.reason ?? ''} ${recall.firm ?? ''} ${recall.classification ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTerm(text, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function relevanceFromScore(score) {
  if (score >= 8) return 5;
  if (score >= 5) return 4;
  if (score >= 3) return 3;
  if (score >= 1) return 2;
  return 1;
}

function whyFor(personaId, hits, classification) {
  const classBit = CLASS_BONUS[classification]
    ? ` ${classification} raises the priority.`
    : '';
  if (hits.length) {
    return `Matched ${hits.join(', ')} for ${personaId}.${classBit}`.trim();
  }
  return `Weaker match for ${personaId}.${classBit}`.trim();
}

/**
 * Rank recalls for a persona. Includes every input id exactly once.
 */
export function mockRankRecalls(personaId, recalls = []) {
  const terms = PERSONA_TERMS[personaId] ?? [];
  const scored = [];

  for (const recall of Array.isArray(recalls) ? recalls : []) {
    const id = String(recall?.id ?? '').trim();
    if (!id) continue;
    const text = haystack(recall);
    let score = CLASS_BONUS[recall.classification] ?? 0;
    const hits = [];
    for (const [term, weight] of terms) {
      if (hasTerm(text, term)) {
        score += weight;
        hits.push(term);
      }
    }
    scored.push({
      id,
      relevance: relevanceFromScore(score),
      why: whyFor(personaId, hits, recall.classification),
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score || b.relevance - a.relevance || a.id.localeCompare(b.id));
  return scored.map(({ id, relevance, why }) => ({ id, relevance, why }));
}

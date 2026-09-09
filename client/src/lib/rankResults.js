/**
 * Apply a persona ranking list to the current result page.
 *
 * `ranked` is the model response: [{ id, relevance, why }, ...] in
 * preferred order. We never drop a recall the user already saw — if the
 * model skips an id, that card is appended in the original keyword order.
 *
 * @param {Array<{ id: string }>} recalls  Keyword-order page
 * @param {Array<{ id: string, why?: string }> | null | undefined} ranked
 * @returns {{ results: Array, whyById: Record<string, string> }}
 */
export function applyRanking(recalls, ranked) {
  const list = Array.isArray(recalls) ? recalls : [];

  if (!Array.isArray(ranked) || ranked.length === 0) {
    return { results: list, whyById: {} };
  }

  const byId = new Map(list.map((recall) => [recall.id, recall]));
  const whyById = {};
  const seen = new Set();
  const results = [];

  for (const item of ranked) {
    if (!item || typeof item.id !== 'string') continue;
    const recall = byId.get(item.id);
    if (!recall || seen.has(item.id)) continue;
    results.push(recall);
    seen.add(item.id);
    if (typeof item.why === 'string' && item.why.trim()) {
      whyById[item.id] = item.why.trim();
    }
  }

  for (const recall of list) {
    if (!seen.has(recall.id)) {
      results.push(recall);
    }
  }

  return { results, whyById };
}

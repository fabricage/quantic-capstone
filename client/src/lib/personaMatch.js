/**
 * personaMatch.js
 * Purpose: When the ranking API is missing a key, still order recalls by the
 * persona bio (label + description + keywords), then alternate FDA / CPSC.
 */

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'their',
  'this',
  'to',
  'with',
]);

export function tokenizePersona(persona) {
  const parts = [
    persona?.label,
    persona?.description,
    ...(Array.isArray(persona?.keywords) ? persona.keywords : []),
  ];
  const words = String(parts.filter(Boolean).join(' '))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  return [...new Set(words)];
}

function haystack(recall) {
  return `${recall?.product ?? ''} ${recall?.reason ?? ''} ${recall?.firm ?? ''}`.toLowerCase();
}

function scoreRecall(recall, tokens) {
  const text = haystack(recall);
  const matched = tokens.filter((token) => text.includes(token));
  return { score: matched.length, matched };
}

function whyLine(matched) {
  if (!matched.length) return '';
  const unique = [];
  for (const word of [...matched].sort((a, b) => a.length - b.length)) {
    if (unique.some((kept) => word.startsWith(kept) || kept.startsWith(word))) continue;
    unique.push(word);
  }
  const shown = unique.slice(0, 3).join(', ');
  return `Matches this profile’s focus on ${shown}.`;
}

/**
 * Sort recalls by how well they match the persona bio.
 * Every input row is kept (zeros last) so the list never goes blank.
 */
export function rankByPersonaBio(recalls, persona) {
  const list = Array.isArray(recalls) ? recalls : [];
  const tokens = tokenizePersona(persona);
  const whyById = {};

  const scored = list.map((recall, index) => {
    const { score, matched } = scoreRecall(recall, tokens);
    if (score > 0 && recall?.id) {
      whyById[recall.id] = whyLine(matched);
    }
    return { recall, score, index };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return {
    results: scored.map((row) => row.recall),
    whyById,
  };
}

/**
 * FDA, CPSC, FDA, CPSC… preserving each source’s existing order.
 */
export function interleaveBySource(recalls) {
  const list = Array.isArray(recalls) ? recalls : [];
  const food = [];
  const consumer = [];
  const other = [];

  for (const recall of list) {
    if (recall?.source === 'consumer') consumer.push(recall);
    else if (recall?.source === 'food') food.push(recall);
    else other.push(recall);
  }

  const mixed = [];
  const n = Math.max(food.length, consumer.length);
  for (let i = 0; i < n; i += 1) {
    if (i < food.length) mixed.push(food[i]);
    if (i < consumer.length) mixed.push(consumer[i]);
  }
  return mixed.concat(other);
}

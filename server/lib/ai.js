/**
 * ai.js
 * Purpose: Anthropic ranking contract — JSON only, validate, or return null.
 *
 * Missing API key never throws; the BFF then answers { fallback: true }.
 */

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = [
  'Reply with JSON only. No markdown. No code fences.',
  'Schema: {"ranked":[{"id":string,"relevance":integer,"why":string}]}',
  'Include every recall id exactly once. No extra ids. No duplicates.',
  'relevance is an integer from 1 to 5. why is a non-empty sentence.',
  'Persona attributes are soft signals only. Do not invent retailer matches',
  'or facts that are not in the recall text.',
].join(' ');

export function stripCodeFences(text) {
  const trimmed = String(text ?? '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseModelJson(text) {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
}

export function validateRankingPayload(payload, allowedIds) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'payload must be an object' };
  }
  if (!Array.isArray(payload.ranked)) {
    return { ok: false, reason: 'ranked must be an array' };
  }

  const allowed = [...new Set((allowedIds ?? []).map((id) => String(id)))];
  const allowedSet = new Set(allowed);
  const seen = new Set();

  for (const item of payload.ranked) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, reason: 'ranked item must be an object' };
    }
    if (typeof item.id !== 'string' || !item.id.trim()) {
      return { ok: false, reason: 'id must be a non-empty string' };
    }
    const id = item.id;
    if (!allowedSet.has(id)) {
      return { ok: false, reason: 'unknown id' };
    }
    if (seen.has(id)) {
      return { ok: false, reason: 'duplicate id' };
    }
    seen.add(id);

    if (!Number.isInteger(item.relevance) || item.relevance < 1 || item.relevance > 5) {
      return { ok: false, reason: 'relevance must be an integer 1–5' };
    }
    if (typeof item.why !== 'string' || !item.why.trim()) {
      return { ok: false, reason: 'why must be a non-empty string' };
    }
  }

  if (seen.size !== allowedSet.size) {
    return { ok: false, reason: 'incomplete: every input id exactly once' };
  }

  return { ok: true };
}

function joinTextBlocks(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((block) => (block?.text ? String(block.text) : '')).join('');
}

function compactRecall(recall) {
  return {
    id: recall.id,
    product: recall.product ?? '',
    firm: recall.firm ?? '',
    reason: recall.reason ?? '',
    classification: recall.classification ?? '',
    status: recall.status ?? '',
  };
}

export async function rankRecallsForPersona({
  persona,
  recalls = [],
  apiKey,
  model,
  fetchImpl = fetch,
} = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) return null;

  const allowedIds = recalls.map((recall) => recall?.id).filter(Boolean);
  if (!allowedIds.length) return null;

  const chosenModel = model || process.env.AI_MODEL || DEFAULT_MODEL;
  const userPayload = {
    persona: {
      id: persona?.id,
      label: persona?.label,
      attributes: persona?.attributes ?? {},
    },
    recalls: recalls.map(compactRecall),
  };

  try {
    const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: 2048,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(userPayload),
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const body = await response.json();
    const parsed = parseModelJson(joinTextBlocks(body?.content));
    const check = validateRankingPayload(parsed, allowedIds);
    if (!check.ok) return null;

    return [...parsed.ranked].sort((a, b) => b.relevance - a.relevance);
  } catch {
    return null;
  }
}

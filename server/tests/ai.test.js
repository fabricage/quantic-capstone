/**
 * ai.test.js
 * Purpose: Ranking JSON parse/validate and rankRecallsForPersona fallbacks.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  parseModelJson,
  rankRecallsForPersona,
  stripCodeFences,
  validateRankingPayload,
} from '../lib/ai.js';

const allowed = ['F-1', 'F-2'];

function completePayload() {
  return {
    ranked: [
      { id: 'F-1', relevance: 5, why: 'Formula matches a young-kid household.' },
      { id: 'F-2', relevance: 2, why: 'Coffee is less relevant here.' },
    ],
  };
}

describe('stripCodeFences / parseModelJson', () => {
  it('parses bare JSON', () => {
    expect(parseModelJson('{"ranked":[]}')).toEqual({ ranked: [] });
  });

  it('parses fenced JSON', () => {
    expect(stripCodeFences('```json\n{"ranked":[]}\n```')).toBe('{"ranked":[]}');
    expect(parseModelJson('```json\n{"ranked":[]}\n```')).toEqual({ ranked: [] });
  });

  it('returns null for invalid JSON', () => {
    expect(parseModelJson('not json')).toBeNull();
    expect(parseModelJson('```json\n{nope}\n```')).toBeNull();
  });
});

describe('validateRankingPayload', () => {
  it('accepts a complete payload', () => {
    expect(validateRankingPayload(completePayload(), allowed)).toEqual({ ok: true });
  });

  it('rejects unknown ids, bad relevance, empty why, and incomplete lists', () => {
    expect(
      validateRankingPayload(
        {
          ranked: [
            { id: 'F-99', relevance: 5, why: 'Nope.' },
            { id: 'F-2', relevance: 2, why: 'Coffee.' },
          ],
        },
        allowed,
      ).ok,
    ).toBe(false);

    expect(
      validateRankingPayload(
        {
          ranked: [
            { id: 'F-1', relevance: 6, why: 'Too high.' },
            { id: 'F-2', relevance: 2, why: 'Coffee.' },
          ],
        },
        allowed,
      ).ok,
    ).toBe(false);

    expect(
      validateRankingPayload(
        {
          ranked: [
            { id: 'F-1', relevance: 5, why: '   ' },
            { id: 'F-2', relevance: 2, why: 'Coffee.' },
          ],
        },
        allowed,
      ).ok,
    ).toBe(false);

    expect(
      validateRankingPayload(
        {
          ranked: [{ id: 'F-1', relevance: 5, why: 'Only one id.' }],
        },
        allowed,
      ).ok,
    ).toBe(false);
  });
});

describe('rankRecallsForPersona', () => {
  const recalls = [
    { id: 'F-1', product: 'Infant formula', firm: 'Acme' },
    { id: 'F-2', product: 'Coffee', firm: 'Bean Co' },
  ];
  const persona = { id: 'parent-young-kids', label: 'Parent', attributes: { hasKids: true } };

  it('returns null without an API key and does not fetch', async () => {
    const fetchImpl = vi.fn();
    expect(await rankRecallsForPersona({ persona, recalls, apiKey: '', fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns sorted ranked rows on a valid Anthropic response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ranked: [
                { id: 'F-2', relevance: 2, why: 'Less relevant.' },
                { id: 'F-1', relevance: 5, why: 'Formula for kids.' },
              ],
            }),
          },
        ],
      }),
    });

    const ranked = await rankRecallsForPersona({
      persona,
      recalls,
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-20250514',
      fetchImpl,
    });

    expect(ranked.map((row) => row.id)).toEqual(['F-1', 'F-2']);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-test',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(2048);
    expect(body.system).toMatch(/JSON only/i);
    expect(body.system).toMatch(/do not invent retailer matches/i);
  });

  it('returns null when the model payload is invalid', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"ranked":[]}' }] }),
    });
    expect(
      await rankRecallsForPersona({ persona, recalls, apiKey: 'sk-test', fetchImpl }),
    ).toBeNull();
  });
});

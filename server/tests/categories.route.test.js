/**
 * categories.route.test.js
 * Purpose: GET /api/categories returns the public dictionary.
 */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../index.js';

describe('GET /api/categories', () => {
  it('returns id, label, and sources with no-store', async () => {
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(Array.isArray(res.body.categories)).toBe(true);
    const dairy = res.body.categories.find((row) => row.id === 'dairy');
    expect(dairy).toMatchObject({ id: 'dairy', label: 'Dairy', sources: ['food'] });
    expect(dairy.keywords).toBeUndefined();
  });
});

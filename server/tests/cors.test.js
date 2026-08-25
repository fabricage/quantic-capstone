/**
 * cors.test.js
 * Purpose: CLIENT_ORIGIN CORS — open locally, allow-list on Render, no-Origin still ok.
 */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, parseClientOrigins } from '../index.js';

const original = process.env.CLIENT_ORIGIN;

afterEach(() => {
  if (original === undefined) {
    delete process.env.CLIENT_ORIGIN;
  } else {
    process.env.CLIENT_ORIGIN = original;
  }
});

describe('parseClientOrigins', () => {
  it('returns null when unset or blank (open CORS)', () => {
    expect(parseClientOrigins(undefined)).toBeNull();
    expect(parseClientOrigins('')).toBeNull();
    expect(parseClientOrigins('   ')).toBeNull();
  });

  it('trims, splits, and strips trailing slashes', () => {
    expect(
      parseClientOrigins(
        ' https://recall-ledger-web.onrender.com/ , https://other.onrender.com ',
      ),
    ).toEqual([
      'https://recall-ledger-web.onrender.com',
      'https://other.onrender.com',
    ]);
  });
});

describe('CORS', () => {
  it('reflects any Origin when CLIENT_ORIGIN is unset', async () => {
    delete process.env.CLIENT_ORIGIN;
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('allows the configured origin and rejects others', async () => {
    process.env.CLIENT_ORIGIN = 'https://recall-ledger-web.onrender.com/';
    const app = createApp({ fetchImpl: vi.fn() });

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://recall-ledger-web.onrender.com');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://recall-ledger-web.onrender.com',
    );

    const rejected = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(rejected.status).toBe(200);
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows requests with no Origin header (curl, health checks)', async () => {
    process.env.CLIENT_ORIGIN = 'https://recall-ledger-web.onrender.com';
    const app = createApp({ fetchImpl: vi.fn() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

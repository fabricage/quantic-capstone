/**
 * index.js
 * Purpose: Express BFF entry — health check + /api/recalls. Browser never talks to openFDA.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import { createRecallsRouter } from './routes/recalls.js';

/**
 * Parse CLIENT_ORIGIN into a list of allowed browser origins.
 * Empty / unset → null (open CORS for local Vite).
 */
export function parseClientOrigins(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const origins = trimmed
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.length ? origins : null;
}

/**
 * cors origin callback.
 * Why: the static site is a different origin from the API, so browsers send
 * Origin. Locally CLIENT_ORIGIN is unset so Vite on :5173 can call :3001.
 * curl and Render health checks send no Origin — those must still succeed.
 * Unknown origins are rejected (no Access-Control-Allow-Origin).
 */
export function corsOriginDelegate(origin, callback) {
  const allowed = parseClientOrigins(process.env.CLIENT_ORIGIN);
  if (!allowed) {
    return callback(null, true);
  }
  if (!origin) {
    return callback(null, true);
  }
  const normalized = String(origin).replace(/\/+$/, '');
  if (allowed.includes(normalized)) {
    return callback(null, true);
  }
  return callback(null, false);
}

export function createApp({ fetchImpl = fetch } = {}) {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: corsOriginDelegate }));
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/recalls', createRecallsRouter({ fetchImpl }));
  return app;
}

export const app = createApp();

const isMainModule =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const port = Number(process.env.PORT) || 3001;
  // Bind 0.0.0.0 so Render's proxy (not only localhost) can reach this process.
  app.listen(port, '0.0.0.0', () => {
    console.log(`Recall Ledger API listening on 0.0.0.0:${port}`);
  });
}

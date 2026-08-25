/**
 * index.js
 * Purpose: Express BFF entry — health check + /api/recalls. Browser never talks to openFDA.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import { createRecallsRouter } from './routes/recalls.js';

export function createApp({ fetchImpl = fetch } = {}) {
  const app = express();
  app.use(express.json());
  // Open CORS for local Vite in Card 1; Card 3 tightens this with CLIENT_ORIGIN.
  app.use(cors());
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
  app.listen(port, () => {
    console.log(`Recall Ledger API listening on http://localhost:${port}`);
  });
}

# Deploy on Render (free tier)

Human runbook for the Card 3 Blueprint deploy. Dashboard clicks are marked **(me)**.

This app is two Render services from one repo, described in [`render.yaml`](../render.yaml):

| Service | Type | What it is |
|---|---|---|
| `recall-ledger-api` | Web Service | Express BFF (`/health`, `/api/*`) |
| `recall-ledger-web` | Static Site | Vite production build (`client/dist`) |

No custom domain in this card. Use the `*.onrender.com` URLs Render gives you.

The **Anthropic API key** (when you add one later) goes on the **API service only**. Never put it on the static site. Never commit it.

## Why two env vars after first boot

Vite bakes `VITE_*` into the JavaScript **at build time**. The browser then calls that absolute API origin. The API must also allow that browser origin (CORS) via `CLIENT_ORIGIN`.

Locally you leave both empty: Vite proxies `/api`, and CORS stays open.

## (me) Blueprint apply

1. Open [Render Dashboard → New → Blueprint](https://dashboard.render.com/select-repo?type=blueprint).
2. Connect this GitHub repo and apply `render.yaml` from `main`.
3. Wait until **recall-ledger-api** is **Live**. Copy its URL, with **no trailing slash**, e.g. `https://recall-ledger-api.onrender.com`.
4. On **recall-ledger-web**, set `VITE_API_BASE_URL` to that API URL.
5. **Clear build cache & deploy** the static site (required so Vite rebuilds with the new env var).
6. Copy the static site origin (no trailing slash), e.g. `https://recall-ledger-web.onrender.com`.
7. On **recall-ledger-api**, set `CLIENT_ORIGIN` to that static origin. Save / redeploy the API if Render does not pick it up automatically.
8. Optional later: paste `ANTHROPIC_API_KEY` on the **API** service only (`sync: false` in the Blueprint means you type it in the dashboard).

Do not set a `plan` on the static site. Render rejects it. The Blueprint already omits that field.

## (me) Smoke checks

Free-tier Web Services spin down after idle. The **first** request after idle can take **30–60 seconds**. Wait; do not assume a timeout means a bad deploy.

```bash
curl "https://YOUR-API.onrender.com/health"
curl "https://YOUR-API.onrender.com/api/recalls?q=formula&limit=5"
```

Then open the static site and search `formula`. DevTools Network should show calls to your API origin `/api/recalls`, never `api.fda.gov`.

## The two usual static-site failures

1. **Publish path.** `rootDir` is `client`, so `staticPublishPath` is `dist`, **not** `client/dist`. Using `client/dist` publishes an empty folder.
2. **`vite: not found`.** Vite is a `devDependency`. Render production `npm ci` skips those unless the build is `npm ci --include=dev && npm run build`. GitHub Actions CI does **not** need `--include=dev` because Actions does not set `NODE_ENV=production`.

## Local check before you click deploy

```bash
cd server && npm test
cd client && npm test
cd client && npm ci --include=dev && npm run build   # should write client/dist
curl "http://localhost:3001/health"
```

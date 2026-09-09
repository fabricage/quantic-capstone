# Deploy on Render (free tier)

Human runbook for the Blueprint deploy and custom-domain cutover. Dashboard and registrar clicks are marked **(me)**.

This app is two Render services from one repo, described in [`render.yaml`](../render.yaml):

| Service | Type | What it is |
|---|---|---|
| `recall-ledger-api` | Web Service | Express BFF (`/health`, `/api/*`) |
| `recall-ledger-web` | Static Site | Vite production build (`client/dist`) |

**Live URLs (after cutover):**

| What | URL |
|---|---|
| Public site | https://www.getproductrecall.com/ |
| API (stays on Render) | https://recall-ledger-api.onrender.com |

The **Anthropic API key** goes on the **API service only**. Never put it on the static site. Never commit it. Never put a public hostname in `render.yaml` — `CLIENT_ORIGIN` and `VITE_API_BASE_URL` stay `sync: false`.

## Why two env vars after first boot

Vite bakes `VITE_*` into the JavaScript **at build time**. The browser then calls that absolute API origin. The API must also allow that browser origin (CORS) via `CLIENT_ORIGIN`.

Locally you leave both empty: Vite proxies `/api`, and CORS stays open.

`VITE_API_BASE_URL` is the **API** origin (`https://recall-ledger-api.onrender.com`), not the public website. Moving the static site to a custom domain does **not** change that value.

## (me) Blueprint apply

1. Open [Render Dashboard → New → Blueprint](https://dashboard.render.com/select-repo?type=blueprint).
2. Connect this GitHub repo and apply `render.yaml` from `main`.
3. Wait until **recall-ledger-api** is **Live**. Copy its URL, with **no trailing slash**, e.g. `https://recall-ledger-api.onrender.com`.
4. On **recall-ledger-web**, set `VITE_API_BASE_URL` to that API URL.
5. **Clear build cache & deploy** the static site (required so Vite rebuilds with the new env var).
6. Copy the static site origin (no trailing slash), e.g. `https://recall-ledger-web.onrender.com`.
7. On **recall-ledger-api**, set `CLIENT_ORIGIN` to that static origin. Save / redeploy the API if Render does not pick it up automatically.
8. Optional: paste `ANTHROPIC_API_KEY` on the **API** service only (`sync: false` in the Blueprint means you type it in the dashboard).

Do not set a `plan` on the static site. Render rejects it. The Blueprint already omits that field.

## Custom domain cutover

The public site moves to the registrar domain. The API **stays** on Render (`https://recall-ledger-api.onrender.com`). App code must not hardcode either hostname — origins come from env.

### After DNS

1. **(me)** In Render’s custom-domain UI, add **www** and **apex** (`www.getproductrecall.com` and `getproductrecall.com`) and copy the DNS records Render shows.
2. **(me)** At the registrar, create those records. Wait until Render shows TLS as ready (certificates can lag DNS).
3. **Static site `VITE_API_BASE_URL` still points at the Render API origin** (`https://recall-ledger-api.onrender.com`, no trailing slash). Do **not** point it at the custom domain. If you change this value, **Clear build cache & deploy** so Vite bakes the new string in.
4. On **recall-ledger-api**, set `CLIENT_ORIGIN` to the **custom** origin(s), comma-separated, no trailing slash:

   ```
   CLIENT_ORIGIN=https://www.getproductrecall.com,https://getproductrecall.com
   ```

   Save / redeploy the API so CORS picks up the list.

5. Open https://www.getproductrecall.com/, search `formula`, toggle **Consumer**, pick a persona. DevTools should show `/api/*` calls to `recall-ledger-api.onrender.com` and **no CORS errors**.

### Lesson

CORS errors after the move almost always mean `CLIENT_ORIGIN` still lists `*.onrender.com` (the old static-site origin) instead of `https://www.getproductrecall.com` and `https://getproductrecall.com`. Browsers send `Origin: https://www.getproductrecall.com`. If that string is not on the allow-list, the API omits `Access-Control-Allow-Origin` and the UI looks “broken” even though `/health` still works from curl (curl sends no `Origin`).

A second, equally common failure: the **static build is calling the wrong API host**. Vite bakes `VITE_API_BASE_URL` into the JS file. If that string is a different Render service (a random suffix such as `recall-ledger-api-xxxxx.onrender.com`) than the one whose `CLIENT_ORIGIN` you just set, **both FDA and CPSC fail in the browser** — home previews and search all look empty or “couldn’t load,” while curl against the canonical API still looks fine.

**(me) How to check and fix**

1. Open https://www.getproductrecall.com/, View Source, open the `/assets/index-….js` file, and search for `onrender.com`.
2. That value **must** be `https://recall-ledger-api.onrender.com` (no trailing slash, no extra suffix).
3. On the **static site that owns the custom domain**, set `VITE_API_BASE_URL` to that exact URL → **Clear build cache & deploy**.
4. DevTools → Network: `/api/recalls` must go to `recall-ledger-api.onrender.com`. If you still see another `*.onrender.com` API host, the new build is not what the custom domain is serving (wrong service, or CDN/cache).
5. Confirm **that** API service’s `CLIENT_ORIGIN` includes `https://www.getproductrecall.com,https://getproductrecall.com`.

`https://recall-ledger-web.onrender.com` is the Blueprint static site and should already bake the canonical API URL. The public hostname must be attached to **that** static site, not an older duplicate.

## (me) Smoke checks

Free-tier Web Services spin down after idle. The **first** request after idle can take **30–60 seconds**. Wait; do not assume a timeout means a bad deploy.

```bash
curl "https://recall-ledger-api.onrender.com/health"
curl "https://recall-ledger-api.onrender.com/api/recalls?q=formula&limit=5"
curl "https://recall-ledger-api.onrender.com/api/recalls?q=crib&source=consumer&limit=5"
curl "https://recall-ledger-api.onrender.com/api/personas"
```

Then open the public site and search `formula`. DevTools Network should show calls to the API origin `/api/recalls`, never `api.fda.gov`.

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

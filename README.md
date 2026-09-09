# The Recall Ledger

Public site: **https://www.getproductrecall.com/**  
API (Render, stays here): **https://recall-ledger-api.onrender.com**

Search FDA **food** and CPSC **consumer-product** recalls by product or firm. The React client talks only to this Express **backend-for-frontend (BFF)** — never directly to openFDA, CPSC, or Anthropic.

## Live

| What | URL |
|---|---|
| App | https://www.getproductrecall.com/ |
| API | https://recall-ledger-api.onrender.com |
| Health | https://recall-ledger-api.onrender.com/health |

```bash
curl "https://recall-ledger-api.onrender.com/health"
curl "https://recall-ledger-api.onrender.com/api/recalls?q=formula&limit=5"
curl "https://recall-ledger-api.onrender.com/api/recalls?q=crib&source=consumer&limit=5"
curl "https://recall-ledger-api.onrender.com/api/personas"
```

Hostnames are **not** hardcoded in app logic. The static build uses `VITE_API_BASE_URL` (the Render API origin). The API allow-list uses `CLIENT_ORIGIN` (www + apex after DNS cutover). See **[docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)**.

## What it does

- Keyword search across FDA food enforcement and CPSC consumer-product recalls (Food / Consumer / All)
- Filters: classification, status, date range, location (USA / China / Other)
- Recall detail, pagination, saved bookmarks, recent-search chips
- "Companies with the most recalls" chips at the top of home (monogram, count, 1 month – 2 year lookback) that switch source and search
- Browse-first home: the newest FDA + CPSC recalls load as a paged list before anyone types
- Persona ranking API (`/api/personas`, `/api/persona-rank`) kept server-side as an experiment; not shown in the UI
- Static FAQ at the bottom of every view: FDA Class I / II / III, Ongoing / Completed / Terminated, and why CPSC cards have neither
- Predictable empty / error copy and a React error boundary (no blank screens, no raw upstream dumps)

## Stack

- **Client:** React 18 + Vite 6 (JavaScript, plain CSS)
- **Server:** Node 18+ (20 recommended) + Express (ES modules)
- **Data:** [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) and CPSC (server-side only)
- **Tests:** Vitest, React Testing Library, supertest
- **CI:** GitHub Actions runs `npm ci` + `npm test` in `server/` and `client/` on every push to `main` and every pull request.

## Repository layout

```
server/     Express BFF
client/     React + Vite UI
docs/       Render deploy + custom-domain runbook
evals/      Persona-ranking mock harness
```

Two packages, no root workspace. Live secrets stay in `.env` (gitignored). Copy the `.env.example` files.

## Local setup

### Prerequisites

- Node.js 18+ (20 recommended)
- npm

### 1. Server (BFF)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Server: `http://localhost:3001`

```bash
curl "http://localhost:3001/health"
curl "http://localhost:3001/api/recalls?q=formula&limit=5"
curl "http://localhost:3001/api/recalls?q=crib&source=consumer&limit=5"
curl "http://localhost:3001/api/personas"
```

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` (Vite proxies `/api` → Express). Leave `VITE_API_BASE_URL` empty locally.

### 3. Tests

```bash
cd server && npm test
cd client && npm test
```

## Architecture notes

- **BFF:** Browser → Express only. Upstream sources stay server-side (normalization, unified errors, no API keys in the client).
- **Normalized recall shape:** `{ id, firm, product, reason, classification, status, state, recallDate, publishedDate, source, url, imageUrl, imageAlt, country, origin }`
- **CORS:** `CLIENT_ORIGIN` is a comma-separated list (trimmed, no trailing slash). Production after cutover: `https://www.getproductrecall.com,https://getproductrecall.com`.

## Deploy (Render free tier)

Full click-through guide: **[docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)**  
Blueprint file: [`render.yaml`](render.yaml) (API Web Service + client Static Site).

**(me)** Dashboard: New → Blueprint → this repo. Wait for **recall-ledger-api** to go Live; copy its URL (no trailing slash). On **recall-ledger-web**, set `VITE_API_BASE_URL` to that **API** URL → Clear build cache & deploy. On **recall-ledger-api**, set `CLIENT_ORIGIN` to the browser origin(s). After custom DNS: both www and apex. Do not put API keys or public hostnames on the static site / in `render.yaml`.

Local client leaves `VITE_API_BASE_URL` empty (Vite proxies `/api`). Production builds need the absolute **API** origin (`https://recall-ledger-api.onrender.com`), which does not change when the site moves to a custom domain.

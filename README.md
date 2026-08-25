# The Recall Ledger

Search FDA **food** recalls by product or recalling firm. The React client talks only to this Express **backend-for-frontend (BFF)** — never directly to openFDA.

## Stack

- **Client:** React 18 + Vite 6 (JavaScript, plain CSS)
- **Server:** Node 18+ (20 recommended) + Express (ES modules)
- **Data:** [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) (server-side only)
- **Tests:** Vitest, React Testing Library, supertest
- **CI:** GitHub Actions runs `npm ci` + `npm test` in `server/` and `client/` on every push to `main` and every pull request.

## Repository layout

```
server/     Express BFF (openFDA food keyword search)
client/     React + Vite UI
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

- **BFF:** Browser → Express only. openFDA stays server-side (normalization, unified errors, no API keys in the client).
- **Normalized recall shape:** `{ id, firm, product, reason, classification, status, state, recallDate, publishedDate, source, url, imageUrl, imageAlt, country, origin }`

## Deploy (Render free tier)

Full click-through guide: **[docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)**  
Blueprint file: [`render.yaml`](render.yaml) (API Web Service + client Static Site).

**(me)** Dashboard: New → Blueprint → this repo. Wait for **recall-ledger-api** to go Live; copy its URL (no trailing slash). On **recall-ledger-web**, set `VITE_API_BASE_URL` to that URL → Clear build cache & deploy. On **recall-ledger-api**, set `CLIENT_ORIGIN` to the static site origin. Do not put API keys on the static site.

Local client leaves `VITE_API_BASE_URL` empty (Vite proxies `/api`). Production builds need the absolute API origin.

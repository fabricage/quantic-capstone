# The Recall Ledger — Design & Testing Document


Public site: **https://www.getproductrecall.com/**  
API (Render, stays here): **https://recall-ledger-api.onrender.com**  
Trello (MSSE capstone board): **https://trello.com/invite/b/6a77330540d1eca3d3f9cdc5/ATTI65d6bab2e6a3c7302abd4ac3037d539868DE3DFC/recall-ledger-msse-capstone**
Author: Ellis Painter
---

## 1. What the system does, and for whom

The Recall Ledger is a public web application that unifies U.S. product
recalls from two federal sources — FDA food enforcement (openFDA) and CPSC
consumer-product recalls (saferproducts.gov) — into one searchable, browsable
interface. It serves two audiences:

- **Consumers** — checking whether products in their household were recalled
  (search, category browsing, plain-language FAQ on recall classes/statuses).
- **Recall and manufacturing professionals** — tracking which firms recur and
  where products are manufactured across a global supply chain
  (company-frequency chips with selectable lookback windows, manufacturer-
  country filtering, dual-source merge).

The home page is deliberately **browse-first**: the newest FDA + CPSC recalls,
company chips, and category chips load before the visitor types anything.

Behind the UI, the server also hosts a **persona-based AI ranking service**
(Anthropic API) — deliberately shipped as a validated server-side experiment
rather than a UI feature (see §2.4).

I chose this problem because it connects my work in manufacturing and supply chains with something that matters to everyday consumers. People should be able to check whether a product has been recalled without first figuring out which federal agency oversees it. From the professional side, I also saw value in tracking companies that appear repeatedly in recall records and exploring where recalled products were manufactured. Recall Ledger gave me a practical way to apply what I am learning in software engineering to a problem relevant to both my industry and my own household.


## 2. Architecture and design decisions

### 2.1 Overall architecture: Backend-for-Frontend (BFF)

Two deployable units:

- **Client** — React 18 + Vite SPA (Render Static Site)
- **Server** — Node/Express BFF (Render Web Service), the *only* component
  that talks to external services: openFDA, CPSC, official .gov recall
  listings, and the Anthropic API.

**Reasons (rubric: patterns + reasons):**

1. **Secret isolation.** The Anthropic key exists only in the server
   environment; it never ships to a browser.
2. **Normalization.** openFDA and CPSC return incompatible schemas. The
   server maps both into one normalized recall shape
   (`server/lib/normalize.js`), so the UI is source-agnostic. Evidence the
   boundary was drawn correctly: adding CPSC as a second source required no
   changes to the list/detail components.
3. **Failure mapping.** Upstream quirks are absorbed server-side — openFDA's
   HTTP-404-means-no-matches becomes a clean empty result; hard upstream
   failures become one 502 contract the client renders as friendly copy.
4. **Caching and rate control.** AI rankings, trending chip payloads (cached
   per lookback window), and scraped .gov pages are cached in the BFF —
   cutting cost/latency and removing third-party variance.

### 2.2 Software patterns used

| Pattern | Where | Reason |
|---|---|---|
| Backend-for-Frontend | `server/` as a whole | §2.1 |
| Adapter | `lib/openfda.js`, `lib/cpsc.js` → one normalized shape | Two incompatible upstream schemas behind one contract |
| Strategy (source dispatch) | `routes/recalls.js` `source=food\|consumer\|all` | User-selectable data source without branching UI logic |
| Server-owned dictionary | `lib/categories.js` | Product-type browsing is a *data* concern: keyword bundles (with `exclude` lists — "apple juice" is a Beverage, not Produce) live server-side so categories evolve without client releases |
| Router / modular routes | `routes/recalls.js`, `persona.js`, `trending.js`, `categories.js` | Each endpoint isolated and independently testable |
| Dependency injection (test seam) | `fetchImpl = fetch` parameters throughout | Tests inject stubs; upstream failures become reproducible |
| TTL cache | `lib/cache.js` (Map + expiry), `lib/websiteCache.js` | Demo determinism, cost control, politeness to scraped sources; trending keys are versioned per lookback window so 1-month and 1-year lists stay independent |
| Custom hooks | `useSavedRecalls`, `useRecentSearches` | localStorage side-effects isolated from render logic; injectable storage for tests; `storage`-event sync across tabs |
| Error boundary | `ErrorBoundary.jsx` | A component crash degrades to a message, never a blank page |

- **Backend-for-Frontend:** I accepted the extra work of deploying and maintaining a separate server because it protects API keys and gives the client one consistent interface for accessing recall data.
- **Adapter:** I accepted the responsibility of maintaining a mapping for each source because it allows upstream differences and schema changes to be handled without spreading that complexity throughout the UI.
- **TTL cache:** I accepted that cached results can temporarily lag behind the original source in exchange for faster responses, fewer external requests, and lower API costs.

### 2.3 Data-source engineering (the hard-won lessons)

- **Freshness.** FDA's `report_date` (weekly Enforcement Report publication)
  is the honest "latest" signal — `recall_initiation_date` can predate it by
  weeks. Sorting uses publication date.
- **CPSC re-publish trap.** CPSC re-saves decades-old notices with fresh
  `LastPublishDate` values. The official listing date is `RecallDate`;
  publish gaps beyond a staleness window are treated as edits, not new
  recalls (`lib/cpscDates.js`) — without this, year-2000 toys surface as
  "this week."
- **Website supplement layer.** Official .gov listing pages
  (`lib/cpscWebsite.js`, `lib/fdaWebsite.js`) supplement the APIs when press
  releases outrun API data. Because cpsc.gov/fda.gov often block cloud IPs
  (Akamai 403s), `lib/fetchHtml.js` falls back to a text-extraction proxy
  (r.jina.ai) when a direct fetch looks blocked; scraped HTML is cached
  (~5 min) and every parse soft-fails — the website layer can only ever add
  rows, never break a request.
- **Country semantics.** FDA "country" is usually the recalling firm's
  country; CPSC reports manufacturer country. The system classifies origin
  per source (`lib/location.js`) and filters CPSC in memory because the
  upstream country parameter is unreliable. The UI copy treats the two
  meanings as the different things they are.

### 2.4 AI engineering design — and a deliberate scoping decision

The persona-ranking service (`POST /api/persona-rank`) applies four
techniques:

1. **Structured output contract** — the model must return JSON only:
   `{"ranked":[{"id","relevance":1–5,"why"}]}` (temperature 0).
2. **Server-side validation before use** — unknown or duplicate ids,
   out-of-range relevance, empty "why" strings, or incomplete coverage of the
   input set are rejected; invalid output is never used.
3. **Graceful fallback** — any failure (missing key, API error, malformed
   JSON, failed validation) returns `{ fallback: true }`; the AI can degrade
   the experience but can never break the application.
4. **Caching + evals** — rankings are cached by persona + query + result ids;
   a fixture-based eval suite (`evals/`) scores top-N agreement per persona
   and runs in CI (mock mode) on every push, with an optional live mode.

**The scoping decision:** during Sprint 3 the persona *UI* story was
re-scoped (recorded on the task board's Sprint 3 review). The evals validated
ranking quality, but the feature had not yet earned its interface complexity
for a public consumer site. It ships as a working, tested, documented
server-side experiment; the browse-first home, category browsing, company
chips, and FAQ shipped in its place. Personas are synthetic presets — the
system collects no personal data and has no accounts.

I chose an existing model through an API instead of fine-tuning because this was a small ranking task with no project-specific training dataset, and prompting, validation, and caching gave me a practical way to manage reliability, response time, and cost. While developing the four persona types, I started questioning who would actually use the feature and realized that identifying recalled products someone might already have at home would require much more data and machine-learning work than I had originally scoped. I kept the ranking service as a tested experiment and focused the public interface on browsing and searching until I could establish a clearer use case for personalization.

### 2.5 Technology choices and reasons

| Choice | Reason |
|---|---|
| React 18 + Vite | Component model fits browse/filter/list/detail; Vite gives fast dev + a plain static build for free-tier hosting |
| Node + Express (ES modules) | Minimal HTTP layer; one language across the stack |
| Vitest + React Testing Library + supertest | One runner both sides; RTL tests behavior; supertest exercises real route handlers |
| GitHub Actions | On every push/PR: server tests → client tests → mock evals; merge-to-main is the deploy trigger |
| Render (Blueprint `render.yaml`) | Free tier meets the deployment requirement; infra-as-config keeps deploys reproducible |
| Trello | Scrum board: backlog, sprint backlogs, ceremonies, completion status |

### 2.6 Deployment recommendation and cost implications *(required)*

**Recommendation: cloud PaaS (current: Render).**

- **Cloud free tier (current):** $0/month; tradeoffs are cold starts after
  idle (~30–60s) and modest resource limits — acceptable for a portfolio and
  demo product.
- **Cloud paid tier (real users):** ~$7–25/month for an always-on small
  instance + static hosting; removes cold starts.
- **On-premises: rejected.** Comparable self-hosting costs ~$5–20/month at
  minimum *plus* patching, TLS, monitoring, and availability becoming my
  responsibility. For a public, read-mostly app with no sensitive data at
  rest, none of the usual on-prem drivers (data residency, regulatory
  control, existing datacenter) apply; the operational cost in time far
  exceeds the hosting savings.

### 2.6 Deployment recommendation and cost implications *(required)*

**Recommendation: cloud PaaS (current: Render).**

- **Cloud free tier (current):** $0/month; tradeoffs are cold starts after
  idle (~30–60s) and modest resource limits — acceptable for a portfolio and
  demo product.
- **Cloud paid tier (real users):** ~$7–25/month for an always-on small
  instance + static hosting; removes cold starts.
- **On-premises: rejected.** Comparable self-hosting costs ~$5–20/month at
  minimum *plus* patching, TLS, monitoring, and availability becoming my
  responsibility. For a public, read-mostly app with no sensitive data at
  rest, none of the usual on-prem drivers (data residency, regulatory
  control, existing datacenter) apply; the operational cost in time far
  exceeds the hosting savings.

I would keep Recall Ledger on Render because it lets me spend more time improving the application and less time maintaining infrastructure. The free tier fits the project’s current purpose as a portfolio and demonstration product, but I would move to an always-on paid service if people began relying on it regularly. As usage grows, I would track hosting expenses and AI API costs separately to understand the total operating cost. On-premises hosting would only make sense if a future requirement justified the additional maintenance and responsibility.


## 3. Software testing

### 3.1 Test inventory *(verify at submission)*

At the time of this draft: **135 server tests (18 files) + 130 client tests
(25 files), all passing; 4/4 eval cases passing; the full suite plus mock
evals runs in CI on every push and pull request.**

| Layer | Tooling | Covers | What it proves |
|---|---|---|---|
| Server unit | Vitest | normalize (both sources, merge/dedupe), openfda (query building, dates, country clause, firm counts), cpsc + cpscDates (params, union, publish-bump staleness), location, categories, suggestedSearches, ai (parse + validator matrix), cache, htmlText, fetchHtml (blocked-detection + Jina fallback), cpscWebsite/fdaWebsite parsers | Edge-case behavior pinned cheaply and deterministically |
| Server route (integration) | Vitest + supertest, injected `fetchImpl` | recalls (404→empty, 502, source dispatch, in-memory pagination/location, website merge), persona (400s, fallback, cache hit), trending (per-window cache, soft-fail), categories | The client-server contract — the system's riskiest seam — under happy paths *and* reproducible upstream failures |
| Client unit | Vitest | filters, pagination, scroll, dates, textSnippets, categoryImage, originLabels, both hooks | Pure logic + localStorage persistence (injectable storage) |
| Client component | Vitest + RTL | every major component + App flows | Rendered behavior: browse-first home, search→results, empty/error states, source toggle, bookmarks, chips, FAQ, error boundary |
| AI evals | Fixture runner (`evals/`) | 4 persona cases, top-N agreement ≥ threshold | Model-output quality measured, not assumed; mock mode in CI, live mode on demand |

### 3.2 Testing methods and why *(rubric: methods + reasons)*

- **Unit testing** for all pure logic — pins exact edge-case behavior
  (malformed dates, publish-bump staleness, category exclusions, invalid AI
  payloads) at near-zero cost.
- **Integration (route) testing with injected upstream stubs** — the
  BFF contract is where failures are most consequential; dependency-injected
  `fetchImpl` makes 404s, 5xxs, blocked scrapes, and AI failures
  reproducible in CI.
- **Component testing** as the primary UI method over browser E2E — faster
  and deterministic, and sufficient because the contract beneath the UI is
  already integration-tested.
- **AI evals** — model output cannot be unit-tested for correctness, only
  measured for agreement against expected outcomes per persona.
- **Continuous integration as a gate** — every card merged through a pull
  request with a green check; merge-to-main deploys, so nothing ships
  untested.

### 3.3 Manual test pass *(run before recording the demo)*

- Every story on the **deployed** site with normal, edge, and failure inputs
- Both sources + All through browse, search, filters, detail, pagination
- Company chips across lookback windows; category chips per source
- Persona curls: ranked output with the key; `{ fallback: true }` without it
- Bookmarks and recents surviving reload; two-tab sync
- API stopped → friendly error, no blank screen, no raw upstream text

One of the most interesting bugs involved decades-old CPSC recalls appearing in the newest results because their notices had recently been updated. I added tests around `LastPublishDate`, `RecallDate`, and the staleness check to verify that updates to older notices would not make those recalls appear new. This taught me that testing needs to check whether the application interprets source data correctly, since a technically valid date can still produce misleading results.

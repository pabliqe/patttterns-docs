---
title: Expose API Cache + MCP Extraction
parent: Roadmaps
nav_order: 9
---

# PRD Prompt — Evaluate MCP/Chatbot Extraction and API Cache Exposure

---

## 0. As-Is Architecture (Current State)

> Code analysis completed May 2026. Sources verified against `chatbot-gemini` branch.

### Cache consumption map

| System | Artifact | Consumption method | Location |
|---|---|---|---|
| MCP edge function | `search-index.json` | `fetch("https://patttterns.com/search-index.json")` — HTTP at request time | `netlify/edge-functions/mcp.ts` |
| Chatbot proxy | MCP endpoint | `fetch("https://patttterns.com/mcp")` — HTTP POST at request time | `netlify/functions/chatbot-proxy.mts` |
| Main site (client) | `search-index.json` | `fetch("/search-index.json")` — relative URL, runtime | `src/lib/search.ts` |
| Main site (SSR/build) | `search-index.json` | `fs.readFile(path.join(process.cwd(), "public", "search-index.json"))` — filesystem | `src/lib/notion-cover.ts` |
| Main site (middleware) | `search-index.json` | `import searchIndex from "../public/search-index.json"` — bundled at build time | `src/proxy.ts` |
| Main site (layout) | `search-index.json` | `import searchIndexData from "../../public/search-index.json"` — static import + inline WebMCP | `src/app/layout.tsx` |
| Main site (build) | `.notion-cache/*.json` | `fs.readFile` via `getBuildCachedNotionPage()` — filesystem only during `next build` | `src/lib/notion-server.ts` |
| AI metadata script | `pattern-metadata-cache.json` | Written by build script, never consumed at runtime by any system | `scripts/build-pattern-metadata-cache.mjs` |
| Docs site | `chatbot.js` / `chatbot.css` | `<script src="https://patttterns.com/chatbot.js">` — HTTP from main domain | `docs/_includes/head_custom.html` |

### Hardcoded URL constants (must become env vars before extraction)

| File | Constant | Current value |
|---|---|---|
| `netlify/functions/chatbot-proxy.mts` | `MCP_URL` | `"https://patttterns.com/mcp"` |
| `public/chatbot.js` | `PROXY_URL` | `"https://patttterns.com/.netlify/functions/chatbot-proxy"` |
| `netlify/edge-functions/mcp.ts` | inline `fetch(...)` | `"https://patttterns.com/search-index.json"` |

### Missing infrastructure (must add before extraction)

- `search-index.json` has **no CORS headers** in `netlify.toml` — cross-origin reads from an extracted MCP repo would fail silently
- No `Cache-Control` headers on `search-index.json` — CDN freshness undefined
- No health check endpoint in MCP — no signal when JSON is stale

### Extraction risk classification

| Component | Risk | Rationale |
|---|---|---|
| MCP edge function | **Low** | Already reads `search-index.json` via HTTP, no shared code with Next.js, no internal fs access, pure Deno-compatible |
| Chatbot proxy | **Low-Medium** | One hardcoded `MCP_URL` constant to update, CORS `ALLOWED_ORIGIN_RE` must be expanded to cover new domain |
| `chatbot.js` widget | **Low** | Hardcoded `PROXY_URL`; docs site already loads it from main domain, URL change only |
| Build scripts / caches | **None** | Build artifacts stay in main repo; no extraction needed unless API contract changes |
| Main site (`search-index.json`) | **Low** | Client-side read stays relative; only the MCP HTTP read needs a CORS header added |

### File inventory corrections vs. PRD prompt

- `docs/assets/js/chatbot.js` — **does not exist**; chatbot widget is `public/chatbot.js` served from main site
- `docs/assets/css/chatbot.scss` — **does not exist**; styles are `public/chatbot.css`
- `pattern-metadata-cache.json` — **not a runtime dependency**; build/sync artifact only, does not need an API endpoint
- `.notion-cache/*.json` — **not a runtime dependency**; consumed only during `next build`, not by MCP or chatbot

### Prerequisites before any extraction begins

- [ ] Add CORS (`Access-Control-Allow-Origin: *`) and `Cache-Control` headers for `public/search-index.json` in `netlify.toml`
- [ ] Convert `MCP_URL` in `chatbot-proxy.mts` and `PROXY_URL` in `chatbot.js` to environment variables
- [ ] Add health/readiness endpoint to MCP (e.g. `GET /mcp/health`) returning JSON age of `search-index.json`
- [ ] Confirm `ALLOWED_ORIGIN_RE` in chatbot proxy is updated to include extracted service domains

---

Context:
You are a staff-level architect + TPM. Evaluate a repo-extraction initiative for PATTTTERNS. Base your analysis on:
- [ ] docs/roadmaps/ROADMAP_CHAT_AUTH.md
- [ ] docs/roadmaps/ROADMAP_CHATBOT_MCP.md
- [ ] docs/setup/CACHE_PIPLINE.md

Goal:
Design and estimate a safe extraction of MCP + Chatbot out of the main site repo, while preserving current cache-based behavior and isolating deployments from the public website.

Scope to evaluate:
- [ ] Extract MCP and Chatbot into new repository architecture:
   - [ ] Option A: one new repo containing both MCP and Chatbot
   - [ ] Option B: two new repos, one for MCP API and one for Chatbot app/widget
- [ ] Expose existing artifacts through stable API endpoints, starting with:
   - [ ] /api1/search-index.json
   - [ ] /api1/content-cache/... (define shape and path strategy)
   - [ ] /api1/pattern-metadata-cache.json and metadata descriptions
- [ ] Ensure PATTTTERNS.com no longer uses MCP directly
- [ ] Ensure MCP/Chatbot deploys do not impact main branch deploys where public site lives

Hard constraints:
- [ ] Main public site must remain independently deployable and stable
- [ ] MCP and Chatbot release cycles must be decoupled from public site release cycle
- [ ] Backward compatibility and migration path required
- [ ] No security regressions in auth, CORS, or origin policy
- [ ] Clear rollback plan for each migration phase

Expected output format:

## 1. Affected Files Evaluation (Do this first)

- [ ] Create a concrete impact inventory of files that must be changed, moved, mirrored, or deprecated.
- [ ] Include at minimum these file groups in the evaluation:
   - [ ] Chatbot clients and styles:
      - [ ] public/chatbot.js
      - [ ] public/chatbot.css
      - [ ] docs/assets/js/chatbot.js
      - [ ] docs/assets/css/chatbot.scss
      - [ ] docs/_includes/head_custom.html
   - [ ] MCP and AI runtime:
      - [ ] netlify/edge-functions/mcp.ts
      - [ ] netlify/functions/chatbot-proxy.mts
      - [ ] netlify/functions/chatbot-proxy.ts (if still active in branch history)
      - [ ] netlify.toml
      - [ ] wrangler.toml
   - [ ] Cache build and artifacts:
      - [ ] scripts/build-search-index.mjs
      - [ ] scripts/build-content-cache.mjs
      - [ ] scripts/build-pattern-metadata-cache.mjs
      - [ ] public/search-index.json
      - [ ] public/.notion-cache/*.json
      - [ ] public/pattern-metadata-cache.json
   - [ ] Main app consumers and coupling points:
      - [ ] src/app/layout.tsx
      - [ ] src/lib/search.ts
      - [ ] src/lib/notion-server.ts
      - [ ] src/lib/notion-cover.ts
      - [ ] any MCP fetch callsites in src/**
   - [ ] Deployment and CI surfaces:
      - [ ] package.json scripts and prebuild flow
      - [ ] open-next.config.ts
      - [ ] next.config.ts
      - [ ] netlify/plugins/notion-cache/index.js
      - [ ] GitHub Actions / Netlify build config (if present)
   - [ ] Docs and roadmap references to update:
      - [ ] docs/roadmaps/ROADMAP_CHATBOT_MCP.md
      - [ ] docs/roadmaps/ROADMAP_CHAT_AUTH.md
      - [ ] docs/setup/CACHE_PIPLINE.md
- [ ] For each impacted file, classify:
   - [ ] action type (move, copy, split, deprecate, keep)
   - [ ] target repo (main-site, mcp-service, chatbot-service)
   - [ ] ownership (team/persona)
   - [ ] migration order dependency
   - [ ] risk if migrated incorrectly
- [ ] Provide an output table with columns:
   - [ ] file/path
   - [ ] current role
   - [ ] future role
   - [ ] action
   - [ ] migration phase
   - [ ] rollback strategy

## 2. Executive recommendation
- [ ] Pick Option A or Option B
- [ ] Explain why in terms of complexity, team ownership, cost, blast radius, and velocity

## 3. Side-by-side architecture comparison
- [ ] Components and boundaries
- [ ] Data flow
- [ ] CI/CD topology
- [ ] Domain and routing strategy
- [ ] Secrets/env management
- [ ] Observability ownership

## 4. API contract proposal
- [ ] Final endpoint list under /api1
- [ ] Versioning strategy
- [ ] JSON schemas for search index, content cache, metadata cache
- [ ] Caching headers and invalidation strategy
- [ ] Rate limits and abuse controls
- [ ] CORS and auth policy per endpoint

## 5. Migration plan in phases
- [ ] Phase 0 discovery and contract freeze
- [ ] Phase 1 parallel deploy and shadow traffic
- [ ] Phase 2 consumer cutover
- [ ] Phase 3 MCP detachment from PATTTTERNS.com
- [ ] Phase 4 cleanup and deprecation

For each phase include:
- [ ] Deliverables
- [ ] Dependencies
- [ ] Risks
- [ ] Exit criteria
- [ ] Rollback action

## 6. Estimate model
- [ ] Engineering estimate in dev-days per phase
- [ ] Confidence level per phase
- [ ] Critical path
- [ ] Team shape assumptions
- [ ] Best case, expected case, worst case totals

## 7. Testing and acceptance criteria
- [ ] Unit, integration, E2E, and production verification checks
- [ ] Explicit acceptance criteria proving:
   - [ ] MCP not used by PATTTTERNS.com
   - [ ] MCP/Chatbot deploys do not affect main branch site deploy
   - [ ] Cache endpoints serve expected artifacts and freshness guarantees

## 8. Open questions
- [ ] List unresolved decisions that block accurate estimates
- [ ] For each question, show impact on estimate if unresolved

Quality bar:
- [ ] Be concrete, no generic recommendations
- [ ] Include at least one deployment diagram in text form
- [ ] Provide a final Go/No-Go checklist

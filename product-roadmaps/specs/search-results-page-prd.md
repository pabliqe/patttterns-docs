---
title: Search Results Page PRD
parent: Product Roadmaps
---

# PRD — PATTTTERNS 2.0 Search (Phase 1)

Roadmap: [ROADMAP SEARCH](../roadmaps/ROADMAP_SEARCH).

## Vision

Global, persistent search: live autocomplete **and** a `/search` SERP, later filtered by Notion properties (Device, Language, UX Flows, UI Components, System). Swiss / technical-minimal chrome. Fuse.js and `CMD+K` are Phase 3. Facet sidebar is [Phase 2](search-facet-sidebar-prd).

## Phase 1 in

1. Dropdown results without pressing Enter (keep 300ms debounce).
2. Enter with no row selected, or **See all results**, opens `/search?q=query`.
3. SERP uses the `/library` masonry grid + `PatternCard` (same card as related patterns).
4. Matching fix so `drag and drop`, `drag-drop`, and `drag & drop` hit the same patterns (normalize + stopwords; **no Fuse.js**).
5. `usePatternSearch({ query, maxResults })` as the shared client hook.
6. JSON-LD `SearchAction` targets `/search?q={search_term_string}`.

## Phase 1 out

- Facet toolbar / Advanced Search panel / index schema change
- Fuse.js
- `CMD+K`, date sort, nth-pattern jump
- Chatbot Enter-to-MCP behavior
- Redesigning dropdown row chrome

## Behavior

### Autocomplete ([`SearchBar.tsx`](../../../src/components/SearchBar.tsx))

- Search as the user types; do not wait for Enter.
- Do not auto-select the first row (Enter means open the SERP).
- Arrow Up/Down highlights; Enter on a highlight navigates to that hit.
- Escape closes. Mobile overlay closes on navigate.
- Off `/search`, any `?q` (including `/patterns?q=`) `replace`s to `/search?q=`.
- On `/search`, keep `?q` and prefill the input; Enter updates `q` in place.

### SERP (`/search`)

- Client static-export page (same `force-static` + `useSearchParams` pattern as `/library`).
- In-page `SearchBar` (`size="lg"`, Search submit) sits in the results column and sticks under the header (`top: 72px`). The column is a flex row only when the sidebar is shown — loading and zero-hit states are a single full-width column so the bar is not dropped into the sidebar track. It prefills `q`, keeps facet params on submit, and stays visible while loading or when there are zero hits. Header search (desktop field + mobile magnifier) is hidden on every `/search` path. Empty `/search` (no `q`) stays the centered hero.
- No visible page title — Libraries / Patterns section counts cover the hit breakdown. `document.title` stays `Results for “{query}”`; an `sr-only` h1 keeps the accessible name.
- Active filter tags sit under the field when any Notion facet is on. See [Phase 2](search-facet-sidebar-prd).
- Pattern hits: Masonry `columnWidth={280}`, `maxColumnCount={6}`, `usePatternGridGapPx`, `PatternCard` `variant="grid"`.
- Library hits: compact list above the grid (do not mix into pattern masonry).
- Empty / loading / no-query states.
- `/patterns` remains the Notion collection.

### Matching ([`src/lib/search.ts`](../../../src/lib/search.ts) + MCP `normalize`)

- Same lowercase / `&` → space / punctuation strip as before.
- Conjunctions `and` and `&` are stopwords after normalize.
- Score **normalized** title, then tags, then description.
- Token match is enough to keep a hit (do not drop relevance `0`).
- Keep MCP tokenize in sync ([`netlify/edge-functions/mcp.ts`](../../../netlify/edge-functions/mcp.ts)).

## Files

| Area | Path |
|---|---|
| Hook | `src/lib/usePatternSearch.ts` |
| Rank/normalize | `src/lib/search-match.mjs`, `src/lib/search.ts` |
| SERP | `src/app/search/page.tsx`, `src/components/SearchPageClient.tsx`, `src/components/SearchResultsGrid.tsx`, `src/components/SearchActiveFilterTags.tsx` |
| Dropdown | `src/components/SearchBar.tsx` |
| Analytics | `src/lib/analytics.ts` |
| JSON-LD | `src/app/layout.tsx` |

## Acceptance

- [ ] Typing `sidebar` shows a dropdown without Enter.
- [ ] Enter with no highlight opens `/search?q=sidebar`.
- [ ] See all opens the same URL.
- [ ] Arrow + Enter opens the highlighted pattern.
- [ ] SERP masonry cards match library grid density and save controls.
- [ ] `drag and drop` / `drag-drop` / `drag & drop` return the drag-drop patterns.
- [ ] `/patterns?q=modal` lands on `/search?q=modal`.
- [ ] JSON-LD SearchAction points at `/search?q=`.

## Phase 2 / 3

Phase 2 facet sidebar: [Search Facet Sidebar PRD](search-facet-sidebar-prd).  
Phase 3 (Fuse.js, `CMD+K`, sort): [ROADMAP SEARCH](../roadmaps/ROADMAP_SEARCH).

---
title: ROADMAP SEARCH
parent: Roadmaps
nav_order: 4
---

# ROADMAP — PATTTTERNS 2.0 Search

Status: Phase 2 in progress  
Updated: October 2026

Execution specs: [Search Results Page PRD](../specs/search-results-page-prd) (Phase 1), [Search Facet Sidebar PRD](../specs/search-facet-sidebar-prd) (Phase 2).

## Goal

Evolve header autocomplete into a global, URL-addressable search system: live suggestions, a `/search` results page, and shareable Notion-property filters.

## Why this exists

Site search today is a topbar dropdown. Typing already queries `/search-index.json`, but Enter does nothing, there is no results page, and Device / Language / UX / UI / System live only as mixed `tags[]`. Adjacent MCP/chatbot docs do not cover this product surface.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Dual UI (live dropdown + `/search?q=` SERP), keyboard, masonry grid, matching fix for drag/drop variants | Shipped |
| 2 | Named Notion facets, sticky SERP sidebar, shareable filter URLs | This ship |
| 3 | Fuse.js only if still needed, `CMD+K`, date / nth-pattern sort, filter motion | Documented, not scheduled |

## Phase 1 — Dual UI

- Autocomplete stays in the header: results appear while typing (no Enter required).
- Enter with no highlighted row, or **See all results**, opens `/search?q=…`.
- Arrow keys highlight a row; Enter on a highlight opens that pattern or library.
- SERP reprints hits with the `/library` masonry + `PatternCard`.
- `?q=` is the shareable query; `/patterns?q=` redirects to `/search`.
- Matching: normalize both sides, treat `and` / `&` as stopwords, score on normalized text. No Fuse.js.

## Phase 2 — Notion facets

- Index named fields: Device, System, Language, UX Flows, UI Components (not mixed `tags[]`).
- Sticky left sidebar on `/search` (Filters drawer on small screens). Page scroll; unboxed Notion-property lists (Device, Language, UX, UI, System). Dismissible tags under the in-page SearchBar reinforce the active selection; the sidebar stays the full editor.
- URL: `?q=&device=&language=&ux=&ui=&system=` (comma-separated values) via `history.replaceState` (no SERP remount). In-page SearchBar updates to `q` keep facets. Header search is hidden on `/search`.
- Long facet groups cap at 10 with Show all; group titles collapse.
- OR within a group, AND across groups. Device is Notion Select; the rest are Multi-select.
- `usePatternSearch` ANDs facets with the text query. Library hits ignore facets.
- `/ux-patterns` and `/ui-patterns` browse stays as-is.

## Phase 3 — Engine extras

- Fuse.js (or similar) only if token+stopword search still misses synonyms/typos.
- `CMD+K` focuses header search (already omnipresent).
- Sort Newest/Oldest; jump to nth catalog pattern.
- Soft grid transitions when filters change.

## Constraints

- Swiss / technical-minimal: reuse SearchBar, PatternCard, TagPill, grid-gap tokens.
- Keep MCP `normalize()` in sync with client `normalizeQuery()` / tokenize.
- Do not overload `/patterns` (Notion collection).

## Related

- [Search & MCP Architecture](../../search-and-mcp/architecture)
- [ROADMAP Patterns Metadata](ROADMAP_PATTERNS_METADATA) (description quality)
- [ROADMAP MCP Unified Data Access](ROADMAP_MCP_UNIFIED_DATA_ACCESS) (Tier A index)

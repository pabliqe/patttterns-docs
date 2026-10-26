---
title: Search Facet Sidebar PRD
parent: Product Roadmaps
---

# PRD — PATTTTERNS 2.0 Search (Phase 2 facets)

Roadmap: [ROADMAP SEARCH](../roadmaps/ROADMAP_SEARCH).  
Phase 1: [Search Results Page PRD](search-results-page-prd).

## Vision

Shareable Notion-property filters on `/search`, as a sticky left sidebar. Named fields in `search-index.json` — do not infer from mixed `tags[]`.

## In

1. Index `device`, `system`, `language`, `ux`, `ui` from Notion (same aliases as `scripts/add-pattern.mjs`).
2. URL: `?q=&device=&language=&ux=&ui=&system=` (comma-separated multi values).
3. OR within a facet group, AND across groups.
4. Sticky desktop sidebar (page scroll, no inner scroller); Filters drawer on small screens.
5. In-page SearchBar on `/search` keeps facet params when `q` changes. Header search is hidden on `/search`.
6. Facet checks apply without a Next remount (`history.replaceState` + local state); URL stays shareable.
7. Facet lists longer than 10 show **Show all**; group titles collapse. Groups are unboxed Notion properties only (Devices, Localization, Platform, UX Flows, UI Components).
8. Dismissible active-filter tags under the in-page SearchBar reinforce the current selection. The sidebar remains the full editor.

## Out

- Fuse.js, `CMD+K`, date sort, nth-pattern jump, filter motion.
- Replacing the facet sidebar with chips-only chrome.
- Filter-only browse with no `q`.
- MCP facet parameters.
- Version, Generated ID, Description, company/product props.

## Behavior

- Device is Notion Select (one of Desktop / Mobile / Tablet). Other groups are Multi-select. All groups still OR on checked values.
- Empty group = no constraint.
- Facet counts come from query-matched patterns after *other* groups are applied.
- Library hits ignore facets (no Notion props).
- Clear (trash) drops facet params and keeps `q`. The tag-row **Clear all** control calls the same handler.
- Active-filter tags (`SearchActiveFilterTags`) list each selected Notion facet value. Each tag is the search-dropdown `TagPill` (`variant="compact"`, `.search-hit-tag` washed primary) plus a close icon. Hide the row when no facets are selected. Dropdown row hover stays `--theme-surface`; tags do not use that fill.
- Unboxed stacked lists.
- Checking a facet updates results immediately; `replaceState` writes the shareable URL without refreshing the SERP.
- Groups with more than 10 values collapse to 10 + Show all; headers toggle open/closed.

## Files

- `scripts/build-search-index.mjs`
- `src/lib/search-match.mjs`, `src/lib/search.ts`, `src/lib/usePatternSearch.ts`
- `src/components/SearchFilterSidebar.tsx`, `src/components/SearchActiveFilterTags.tsx`, `src/components/SearchPageClient.tsx`, `src/components/SearchBar.tsx`
- `src/styles/_globals.css`

## Acceptance

- `/search?q=forms` shows Devices, Localization, Platform, UX Flows, UI Components when those values exist in the hits.
- Checking Desktop + Mobile returns patterns tagged either device.
- Checking Desktop and Español returns only patterns that are Desktop **and** include Español.
- Copying the URL and refreshing restores the same checks.
- Changing `q` from the in-page SearchBar on `/search` keeps the facet params.
- Chip X removes that one facet; **Clear all** matches the sidebar trash.
- Toggling a facet does not remount `/search` or flash the grid.
- UI Components (and any group > 10) shows 10 rows then Show all; collapsing a header hides that list.
- Mobile uses a Filters sheet (bookmark-drawer chrome: topbar close, glass blur, no page dim), not a persistent sidebar.

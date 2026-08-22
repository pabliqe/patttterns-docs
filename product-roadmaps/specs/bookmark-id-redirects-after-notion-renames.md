---
title: Bookmark ID Redirects After Notion Renames
parent: Product Roadmaps
nav_order: 40
---

# Bookmark ID redirects after Notion renames

## Problem

Pattern public URLs are title-derived (`/patterns/229-top-banner-…`). Saved bookmarks stored that slug. Renaming Notion titles (e.g. adding brands) regenerates the slug at build time, so old library links 404’d even though the Notion page id never changed.

Example: `/patterns/229-top-banner-for-design-changes` → `/patterns/229-top-banner-for-design-changes-google-meet`.

## Fix (free-tier safe)

Shipped on the client + existing CDN `_redirects` only. **No** widening of the Netlify edge redirector to `/patterns/*` (that would bill an edge invocation on every pattern pageview).

1. **Stable identity** — bookmarks already store Notion `pattern_id`. Normalize to dashless hex everywhere (local + cloud).
2. **Navigate by id** — drawer / library links use `/patterns/{notionId}`. Netlify `_redirects` already maps folder + Notion id → current canonical slug (regenerated each build).
3. **Refresh metadata** — on library/drawer load, merge title/slug/cover/tags from `search-index.json` by id so UI shows current names.

## Deferred (higher free-tier cost)

- Edge `patternNumberMap` + serving the redirector on `/patterns/*` to repair **shared/external** stale title-slugs server-side.

## Soft repair for shared/old title URLs (no edge)

`StalePatternRedirect` on the 404 page reads the pattern number from `/patterns/{n}-…`, looks up a unique match in `search-index.json`, and `location.replace`s to the current slug. Client-only — no edge invocations.

## Key files

- `src/lib/bookmarks.ts` — `getBookmarkHref`, `mergeBookmarksWithIndex`, id normalization
- `src/components/BookmarkDrawer.tsx`, `LibraryFlowView.tsx`, `BookmarkButton.tsx`, `src/app/library/page.tsx`
- `src/lib/bookmark-cloud.ts` — dashless `pattern_id`
- Existing `scripts/build-redirects.mjs` Notion-id rules (unchanged)

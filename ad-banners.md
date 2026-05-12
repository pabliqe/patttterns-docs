---
title: Ad Banner System
parent: Building and Deploy
---

# Ad Banner System

## Overview

Dynamic ad banners injected from code, not from Notion content. This keeps ad placement fully under our control, avoids the lightbox-button bug on Notion images, and allows easy swap of advertiser without a content rebuild.

## Rules

| Page | Ad shown |
|---|---|
| Home (`/`) | Landscape banner above device tabs |
| Category grids (`/ux-patterns`, `/ui-patterns`, `/patterns`) | Cover card at position 8 in the grid |
| Pattern detail (`/patterns/[id]`) | None |

## Configuration

All ad settings live in `site.config.mjs` under the `ads` key:

```js
ads: {
  uink: {
    enabled: true,
    url: "https://uink.agency",
    label: "UINK – Strategic Design & Research",
    landscapeBanner: "/banners/uink-banner.png",
    coverCard: "/banners/uink-cover.png",
    insertAtIndex: 7, // 0-based → appears as item 8 in the grid
  }
}
```

To swap the advertiser: update `url`, `label`, and image paths. To disable: set `enabled: false`.

## Architecture

### New files
- `src/components/AdBanner.tsx` — two exported variants:
  - `<AdBannerLandscape />` — full-width image link, used on Home
  - `<AdBannerCard device={...} />` — grid card matching CollectionCard dimensions, used in grids

### Modified files

| File | Change |
|---|---|
| `site.config.mjs` | Add `ads.uink` config block |
| `src/components/NotionPageRenderer.tsx` | Add `adVariant?: "landscape" \| "grid"` prop; pass to `NotionCollection` closure |
| `src/components/NotionCollection.tsx` | Add `adVariant` prop; inject `AdBannerLandscape` above `<Tabs>` / inject `AdBannerCard` at `insertAtIndex` in grids |
| `src/app/page.tsx` | Pass `adVariant="landscape"` |
| `src/app/[type]/page.tsx` | Pass `adVariant="grid"` |
| `src/app/patterns/page.tsx` | Pass `adVariant="grid"` |

### Data flow

```
page.tsx  →  NotionPageRenderer (adVariant prop)
                └→  Collection closure  →  NotionCollection (adVariant prop)
                                              ├→ AdBannerLandscape  (if adVariant="landscape")
                                              └→ AdBannerCard       (if adVariant="grid", at index 7)
```

## AdBannerCard – grid injection

The card is injected as the N-th item (default: index 7, i.e. 8th visible card) using `.flatMap()` on the block list. It reads the `device` from the surrounding tab context so its aspect ratio matches the other cards.

If the grid has fewer than `insertAtIndex` items, the card is appended at the end.

Ad cards carry no bookmark button and no expand/lightbox button. The `rel="noopener noreferrer sponsored"` attribute is set on the link for SEO compliance.

## Image files

| Path | Used for |
|---|---|
| `public/banners/uink-banner.png` | Landscape banner (home) |
| `public/banners/uink-cover.png` | Card thumbnail (grid) |

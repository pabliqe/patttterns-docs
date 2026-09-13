---
title: Static Export Size Reduction
parent: Specs
status: in-progress
---

# Static Export Size Reduction

Keep the current pipeline: **Notion only in local `publish:content` → commit caches → Netlify static export**. No on-demand OG functions. No Notion on Netlify.

## Targets

| Lever | Approach | Expected |
| --- | --- | ---: |
| OG covers | JPEG q80 at publish time (static `/og/covers`) | ~99 MB → ~6–10 MB |
| `out/.notion-cache` | Harden post-build strip (already designed) | −79 MB if leaked |
| Gallery HTML/RSC | Scope `coverMap` on `/patterns` + category routes | follow-up |

## Non-goals

- Netlify Function / Edge OG generation
- Leaving static export
- WebP as default (JPEG is safer for LinkedIn/Twitter)

## Quick fixes (this pass)

1. **OG JPEG** — `scripts/build-og-images.mjs` encodes mozjpeg; `socialOgCoverFileName` → `.jpg`; resolver MIME `image/jpeg`. Re-encode existing PNGs locally (no Giphy refetch).
2. **Strip assert** — `strip-components-from-out.mjs` fails the build if `out/.notion-cache` still exists after strip.

## Follow-up

- Scope whole-catalog maps on gallery pages (`patterns/page.tsx`, `[type]/page.tsx`, `[type]/[slug]/page.tsx`) using visible collection ids from the cached recordMap.
- Optional: strip inert `X-Amz-*` query params from cover URLs in `search-index.json`.

## Verify

```bash
npm run build:og-images -- --reencode-existing
du -sh public/og/covers
npm run build
du -sh out out/og
test ! -d out/.notion-cache
```

## Results

| Step | `out/` size |
| --- | ---: |
| Before this work | ~853 MB |
| After OG JPEG | ~638 MB |
| After stripping RSC `.txt` flight files | **~210 MB** |

Notes:

- Soft navigation via Next `<Link>` becomes a full HTML document load (no RSC `.txt` prefetch). Set `KEEP_RSC_TXT=1` to keep the old behavior.
- Cover URL Amz stripping + gallery map scoping need a fresh `npm run build` to shrink remaining HTML further.

### search-index.json (this pass)

| | Size |
| --- | ---: |
| Before Amz strip (persisted) | ~1754 KB |
| After | **~584 KB** |

Kept `images[]` and `searchText` (needed for publish pipeline + client search). Navigation only needs `id` / `slug` / `type` (+ covers for UI).

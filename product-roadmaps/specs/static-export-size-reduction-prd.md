---
title: Static Export Size Reduction
parent: Specs
status: implemented
---

# Static Export Size Reduction

Keep the current pipeline: **Notion only in local `publish:content` → commit caches → Netlify static export**. No on-demand OG functions. No Notion on Netlify.

## Targets

| Lever | Approach | Expected |
| --- | --- | ---: |
| OG covers | JPEG q80 at publish time (static `/og/covers`) | ~99 MB → ~6–10 MB |
| `out/.notion-cache` | Strip after build and fail if still publishable | −79 MB if leaked |
| RSC flight files | Strip exported `.txt` sidecars after build | ~638 MB → ~210 MB |
| Gallery/search payloads | Strip inert Notion `X-Amz-*` signatures and scope visible maps | smaller HTML/RSC payloads |

## Non-goals

- Netlify Function / Edge OG generation
- Leaving static export
- WebP as default (JPEG is safer for LinkedIn/Twitter)

## Implemented Changes

1. **OG JPEG** — `scripts/build-og-images.mjs` encodes mozjpeg; `socialOgCoverFileName` → `.jpg`; resolver MIME `image/jpeg`. Re-encode existing PNGs locally (no Giphy refetch).
2. **Post-build strip** — `strip-components-from-out.mjs` removes `out/components/code`, `out/components/history`, `out/.notion-cache`, and exported RSC `.txt` flight sidecars. It fails the build if `out/.notion-cache` remains.
3. **RSC `.txt` tradeoff** — removing sidecars preserves full HTML document loads but disables quiet Next soft-navigation/prefetch payloads. Browser console 404s for `_next_tree.txt?_rsc=...` or per-page `.txt` routes are expected unless `KEEP_RSC_TXT=1` is set.
4. **Notion cover URL stripping** — cover/image URLs keep the `notion.so/image` proxy wrapper but drop inert embedded `X-Amz-*` query text from `search-index.json`, server cover maps, and client search loading.
5. **Gallery map scoping** — homepage, `/patterns`, `[type]`, and `[type]/[slug]` pass cover/tag/description/version maps scoped to the ids visible on that page.

## Remaining Follow-up

- Re-measure and record final `out/` size after a fresh production build with OG JPEG, RSC `.txt` stripping, Notion Amz stripping, and gallery map scoping all applied together.

## Verify

```bash
npm run build:og-images -- --reencode-existing
du -sh public/og/covers
npm run build
du -sh out out/og
test ! -d out/.notion-cache
find out -path 'out/_next' -prune -o -name '*.txt' -print
```

## Results

| Step | `out/` size |
| --- | ---: |
| Before this work | ~853 MB |
| After OG JPEG | ~638 MB |
| After stripping RSC `.txt` flight files | **~210 MB** |

Notes:

- Soft navigation via Next `<Link>` becomes a full HTML document load (no RSC `.txt` prefetch). Set `KEEP_RSC_TXT=1` to keep the old behavior at the cost of a much larger deploy.
- Console 404s for `_next_tree.txt?_rsc=...` or per-page `.txt` prefetches are expected after stripping RSC flight files; they are not OG-image failures.
- Cover URL Amz stripping + gallery map scoping only affect payload size. They should not change which covers render.

### search-index.json (this pass)

| | Size |
| --- | ---: |
| Before Amz strip (persisted) | ~1754 KB |
| After | **~584 KB** |

Kept `images[]` and `searchText` (needed for publish pipeline + client search). Navigation only needs `id` / `slug` / `type` (+ covers for UI).

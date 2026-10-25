---
title: Cover Stills CDN and Viewport Giphy
parent: Specs
status: implemented
---

# Cover Stills CDN + Viewport-Gated Giphy

Ship same-origin (CDN) stills for layout and social cards, run Giphy animation only for covers in the viewport, and stop committing generated cover JPEGs in `patttterns-next`.

**Status:** Phases 0–4 landed. OG/posters use `https://cdn.patttterns.com/og/{id}.jpg`. This repo keeps `public/og/covers/manifest.json` only; JPEGs are gitignored and generated into `.cdn-images/`.

Related: [Homepage Search Hero](homepage-search-hero) · [Static Export Size Reduction](static-export-size-reduction-prd) · [Cache Pipeline](../../build-and-deploy/setup/CACHE_PIPLINE) · [Publishing Notion Content](../../build-and-deploy/setup/CRON_SETUP) · [Components Generation Prompting](components-generation-prompting) · [Components API CDN PRD](components-api-cdn-prd)

---

## Goal

1. **Layout still** — every cover tile has a static JPEG (card size) so off-screen cards reserve space without hitting Giphy or Notion.
2. **Giphy only in view** — animated `200w.webp` (then `200w.gif`) starts only after `IntersectionObserver`. Never the original `giphy.gif`. Honor `prefers-reduced-motion`.
3. **CDN publish** — generated stills and OG cards live on [pabliqe/patttterns-cdn](https://github.com/pabliqe/patttterns-cdn) at `https://cdn.patttterns.com/`.
4. **Smaller git tree** — remove `public/og/covers/*.jpg` from this repo after the CDN has them.
5. **Placeholder hostname** — rewrite existing component TSX + the Gemini prompt from GitHub raw to `cdn.patttterns.com`.

## Non-goals

- **Do not move component TSX to `patttterns-cdn`.** Seeds stay in Netlify Blobs ([Components API CDN PRD](components-api-cdn-prd)). That PRD’s “CDN” is a headless TSX API, not this image repo.
- Do not commit animated GIFs to either repo.
- Do not generate covers on Netlify. Still local `publish:content`.
- Do not host full Giphy GIFs on the image CDN.

## Current state (2026-10)

| Asset | Where | Notes |
| --- | --- | --- |
| Social OG JPEG | `public/og/covers/{id}.jpg` (~163 files, GIF/Giphy only) | 1200×630 letterbox, q80. `resolveSocialOgImage` prefers these. |
| UI covers | Notion / Giphy URLs in `search-index.json` | `SpinnerImage` chain: `200w.webp` → `200w.gif` → `giphy_s.gif`. Native `loading="lazy"` only. |
| Hero Latest | `RecentPatternItem.id` present | First two tiles eager; rest lazy. Can resolve OG JPEG **now**. |
| Hero floats | `HeroCoverItem` has **no `id`** | Mounted only at `min-width: 1100px`. Cannot resolve OG JPEG until `id` is added. |
| Component placeholders | Prompt + generated TSX | `https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-0{1,2,3}.png`. Same files already at `https://cdn.patttterns.com/placeholder-01.png`. |
| Component TSX | `public/components/code/` + Blobs | Not on `patttterns-cdn`. Upload skips existing seeds unless `--force`. |

Native lazy still puts `src` in HTML, so Chromium prefetches ~1–2 screens of Giphy/Notion. Off-screen tiles are not free.

---

## Target URLs

Keep placeholders at the CDN root (already live). Put generated covers in two folders:

```text
https://cdn.patttterns.com/placeholder-01.png
https://cdn.patttterns.com/placeholder-02.png
https://cdn.patttterns.com/placeholder-03.png
https://cdn.patttterns.com/covers/{id}.jpg     # card still (~800px wide, object-cover)
https://cdn.patttterns.com/og/{id}.jpg         # 1200×630 social (today’s /og/covers)
```

`{id}` = normalized Notion id (no hyphens, lowercase), same as `socialOgCoverFileName`.

| Surface | First paint | Enhancement |
| --- | --- | --- |
| Card / hero / search thumb | `covers/{id}.jpg` | Giphy `200w.webp` only when in view and not reduced-motion |
| Off-screen / below-fold | `covers/{id}.jpg` only (or CSS color if file missing) | No Giphy/Notion request |
| `og:image` | `og/{id}.jpg` | No JS; crawlers fetch CDN URL |
| Missing still | Existing `STATIC_OG_IMAGE` / PhotoIcon fallback | Do not invent a Giphy original |

Until card stills exist for **all** covers, GIF patterns can use the current OG JPEG as the poster (letterboxed 1200×630, acceptable short-term). Notion stills stay on Notion until Phase 2 generates `covers/{id}.jpg` for them.

---

## Phase 0 — Placeholder hostname (independent, small)

Rewrite GitHub raw → custom domain. Placeholders already work; this is hostname only.

**Prompt (future generations):**

- `src/lib/component-generation/prompt-shared.mjs` IMAGES list
- `docs/product-roadmaps/specs/components-generation-prompting.md` (same three URLs)

Use:

```text
https://cdn.patttterns.com/placeholder-01.png
https://cdn.patttterns.com/placeholder-02.png
https://cdn.patttterns.com/placeholder-03.png
```

**Existing TSX:** string-replace in `public/components/code/*.tsx`:

```text
https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-0N.png
→ https://cdn.patttterns.com/placeholder-0N.png
```

Match both quote styles. Do not touch other `raw.githubusercontent.com` URLs if any appear.

**Blobs:** local rewrite is not enough. Production Export/Preview reads Blobs. After the git rewrite:

```bash
npm run components:seeds:upload -- --force
```

Without `--force`, upload skips existing seeds and previews keep GitHub raw.

**Allowlist:** add `cdn.patttterns.com` to `next.config.ts` `images.remotePatterns` (Next `<Image>` paths). Native `<img>` in generated TSX does not need it.

---

## Phase 1 — Static poster + Giphy only in view (this repo)

No CDN required. Uses files already at `/og/covers/{id}.jpg`.

### 1a. Poster URL helper

Add a resolver next to `hostedSocialOgUrl`: given `id` + original `cover`, return:

1. `/og/covers/{id}.jpg` if the file exists (or later the CDN card/OG URL)
2. else Giphy `giphy_s.gif` / optimized Notion still
3. never original `giphy.gif`

### 1b. `id` on float items

`HeroCoverItem` must include `id`. Set it in `toHeroCoverItem` from the search-index entry so floats can resolve the poster.

### 1c. Viewport gate in `SpinnerImage` (or a thin `CoverMedia` wrapper)

- Always render the poster `<img>` (or CSS `background-image`) so layout is stable.
- Do **not** set Giphy `src` until `IntersectionObserver` fires (`rootMargin` ~200px is enough).
- First two Latest tiles: poster can be eager; Giphy may start immediately because they are in-fold LCP-adjacent — still prefer poster first, then swap.
- `prefers-reduced-motion`: poster only.
- Chain when animated and in view: poster stays underneath; Giphy `200w.webp` → `200w.gif`; on error keep the poster. **No original GIF.**
- Off-screen: poster only. Native `loading="lazy"` on the poster is fine.

Surfaces: hero tiles, hero floats, `CategoryCard`, `CollectionCard`, search dropdown thumbs, library flow cards.

### 1d. Docs

Update [Homepage Search Hero](homepage-search-hero) cover-loading note: in-view Giphy, OG/CDN JPEG as poster, no original GIF.

---

## Phase 2 — Card stills for every cover

Extend `scripts/build-og-images.mjs` (or split `build-cover-stills.mjs`) so **every** pattern/category with a cover gets a card JPEG, not only GIF/Giphy OG cards.

| Output | Size | Source |
| --- | --- | --- |
| `og/{id}.jpg` | 1200×630 letterbox | GIF first frame (current behavior). Optional later: Notion still letterboxed too. |
| `covers/{id}.jpg` | ~800px wide, JPEG q80, cover-crop | GIF first frame or Notion still |

Keep generation local. Incremental via `manifest.json` keyed by source URL (same skip as today). `--force` rebuilds all.

Until Phase 3, write both under a local output dir (can still be `public/og/` temporarily, or `tmp/cdn-covers/` to avoid growing git). Prefer **not** committing new card stills into this repo if Phase 3 follows immediately.

---

## Phase 3 — Push to `patttterns-cdn` and rewrite OG paths

### Publish step

After still generation, a new script (e.g. `scripts/publish-cdn-images.mjs`) copies `og/` + `covers/` into a checkout of `pabliqe/patttterns-cdn` and commits/pushes. Placeholders stay untouched.

Wire it at the end of `publish:content` (after `build:og-images`). Needs git credentials for that repo locally (same machine that already publishes Notion).

CDN repo layout:

```text
placeholder-01.png
placeholder-02.png
placeholder-03.png
covers/{id}.jpg
og/{id}.jpg
```

Prune CDN files whose ids left the search index (same idea as current OG prune).

### Path rewrite in this app

| Today | After |
| --- | --- |
| `${siteConfig.url}/og/covers/{id}.jpg` | `https://cdn.patttterns.com/og/{id}.jpg` |
| `hostedSocialOgFsPath` `fs.existsSync` | Manifest of published ids (keep a small JSON in this repo **or** trust the CDN manifest committed with publish) |
| UI poster | `https://cdn.patttterns.com/covers/{id}.jpg` |

`resolveSocialOgImage` must emit the **absolute CDN URL**. Social crawlers do not run JS.

Add `cdn.patttterns.com` to `next.config.ts` if not done in Phase 0.

`/debug/og` should show CDN URLs, not `/og/covers/`.

Constant for the CDN origin (e.g. `site.config.mjs` `cdnUrl: "https://cdn.patttterns.com"`) so prompt, OG resolver, and posters share one string.

### Fallback if CDN 404s

Poster `onError` → Giphy still / Notion URL / PhotoIcon. `og:image` that 404s should not happen if the manifest matches; if the JPEG is missing, keep `STATIC_OG_IMAGE`.

---

## Phase 4 — Clean this repo

Once production `og:image` and UI posters hit the CDN:

1. `git rm public/og/covers/*.jpg` (and any leftover PNGs).
2. Gitignore `public/og/covers/` except a tiny `manifest.json` if we keep the id list here.
3. Generation writes to a local temp / ignored dir, then the CDN publish script copies out.
4. Drop `public/og/covers/` from `git add` in `publish-content.mjs`, [CRON_SETUP](../../build-and-deploy/setup/CRON_SETUP), [DEPLOY](../../build-and-deploy/setup/DEPLOY), [CACHE_PIPELINE](../../build-and-deploy/setup/CACHE_PIPLINE).
5. Note in [Static Export Size Reduction](static-export-size-reduction-prd) that OG binaries left this repo; `out/og` should shrink to near-zero.

Keep `public/og-image.png` (site-wide fallback) and `public/og-library.png` here.

---

## Suggested order

| Slice | Ships | Depends on CDN push? |
| --- | --- | --- |
| **0** Placeholder hostname + Blobs `--force` | Custom-domain demo photos | No |
| **1** Poster + IntersectionObserver | Fewer Giphy requests, stable layout for GIF tiles | No |
| **2** Card stills for Notion + GIF | Posters for every tile | No (local files ok) |
| **3** Push + URL rewrite | Stills served from `cdn.patttterns.com` | Yes |
| **4** `git rm` OG JPEGs | Smaller `patttterns-next` | Yes, after 3 is live |

0 and 1 can land in this repo immediately. 2–4 are the git-size win.

---

## Files (expected)

| Area | Files |
| --- | --- |
| Prompt | `src/lib/component-generation/prompt-shared.mjs`, prompting spec |
| Seeds | `public/components/code/*.tsx` + `components:seeds:upload --force` |
| Cover UI | `SpinnerImage.tsx`, `image-optimization.ts`, `HomeHero.tsx`, `HomeHeroFloats.tsx`, `CategoryCard.tsx`, `CollectionCard.tsx`, `SearchBar.tsx` |
| Data | `src/lib/notion-cover.ts` (`HeroCoverItem.id`) |
| OG | `src/lib/og-image.ts`, `src/lib/og-image-shared.mjs`, `src/app/debug/og/page.tsx` |
| Generate | `scripts/build-og-images.mjs` (+ new stills + CDN push script) |
| Publish docs | `scripts/publish-content.mjs`, CRON / DEPLOY / CACHE_PIPELINE |
| Config | `site.config.mjs`, `next.config.ts` |

---

## Acceptance

- Off-screen homepage / category cards do not request Giphy `200w.webp` or `200w.gif`.
- In-view GIF covers animate via `200w.webp` (GIF fallback); original `giphy.gif` never appears in UI.
- Reduced-motion users never start Giphy animation.
- Pattern pages’ `og:image` is a 1200×630 JPEG on `cdn.patttterns.com/og/{id}.jpg` (after Phase 3) or `/og/covers/{id}.jpg` (Phase 1).
- New Gemini seeds use `https://cdn.patttterns.com/placeholder-0N.png` only.
- Existing seeds in git **and** Blobs use the same hostname after Phase 0.
- After Phase 4, `public/og/covers/*.jpg` is gone from git; `publish:content` still produces and pushes stills.
- Component TSX is unchanged in location (Blobs). `patttterns-cdn` contains images only.

## Risks

- **Blobs skip** — forgetting `--force` after the TSX rewrite leaves production on GitHub raw.
- **Social crawlers** — switching `og:image` before the CDN files exist yields broken LinkedIn/Twitter cards. Push first, then flip the resolver (or keep `/og/covers` for one deploy as dual-write).
- **CDN git history** — hundreds of JPEGs in `patttterns-cdn` is fine; do not also leave them in this repo.
- **Notion expiry** — card stills captured at publish time are the durable UI source; search-index may still keep Notion URLs for generation.
- **GitHub Pages cache** — `cdn.patttterns.com` may lag a few minutes after push; OG flip should wait until a sample `curl -I` returns 200.

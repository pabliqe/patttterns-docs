---
title: Debug Origin and Sync
parent: Specs
nav_order: 24
---

# Debug Origin and Sync

Every `/debug` page states **origin** (what you are looking at), **destination** (what it affects), and **sync** (how they meet, or live / none). No silent fallback between stores.

`/debug` is a sibling of the public `(site)` layout. Root layout is fonts/auth/theme only; Header + `loadSearchIndex()` live in `src/app/(site)/layout.tsx` so debug does not compile or fetch the public nav graph.

Layout chrome (not the page body): one hero header — `+` module menu, page title, identity/theme/`noindex`, and the I/O / transparency module (origin, destination, sync, cache path, env **names** only). Page bodies render live data only. `/debug` links are plain `<a>` so static export does not request missing RSC sidecars.

Related: [Debug Admin Access](debug-admin-access-prd), [Components Seeds Pipeline](../../build-and-deploy/components-seeds-pipeline), [Cache Pipeline](../../build-and-deploy/setup/CACHE_PIPLINE).

## Rule

| Field | Meaning |
|---|---|
| Origin | The store this view reads |
| Destination | Runtime surface that depends on it |
| Sync | Command, Publish action, `live`, or `n/a` |

Hub groups: **Git snapshot** · **Live runtime** · **Harness**. Source of truth: `src/lib/debug-origin.ts` (`DEBUG_PAGES`). `/debug/urls` aliases `/debug/routes`.

## Origin catalog

| Page | Origin | Destination | Sync |
|---|---|---|---|
| Search Index | `public/search-index.json` (this checkout / this deploy) | Site search, cards, MCP | `npm run build:search` or `publish:content` |
| Covers | `search-index` `coverImage` / `images[]` | Pattern cards | `build:covers -- --ids=` / `build:search` |
| OG Images | search-index + `public/og/covers/manifest.json` | Social / CDN | `build:og-images` then `publish:cdn-images` |
| Categories | `site.config.mjs` vs search-index types | Menu / hubs | `build:search` |
| Routes | search-index slugs | Next routes + `_redirects` | `publish:content` (redirects/edge) |
| ID converter | search-index | none (tool) | n/a |
| Notion JSON | this deploy search-index + site.config (live RecordMap inspect stubbed) | `.notion-cache` / pattern pages | `build:content -- --ids=` |
| Artifacts | localhost: local disk only. production: production Blobs only. | Production Blobs → Export/Preview | Publish row or `components:seeds:upload` |
| Votes | Supabase runtime | Pattern vote UI | live |
| Public libraries | Supabase / public-library function | `/l/:token` | live |
| Chatbot | local `/chatbot.js`; proxy/MCP hardcoded to patttterns.com | chatbot-proxy + MCP | live |
| UI Kit | repo components | none | n/a |

## Auth

Admin SSO on every `/debug` page, including localhost (`DEBUG_ADMIN_EMAILS`). Mutations stay disabled until `whoami` is ok. Local Next debug APIs still call `requireDebugAuthUser`.

## Artifacts (two stores, never merged)

| Host | Default origin | Regenerates | Publish |
|---|---|---|---|
| `next dev` (:3022) | Local disk (`code/` + gitignored `history/`) | Disk `vN`, labeled LOCAL | Production Blobs (`op=publish` on patttterns.com) |
| Production | Production Blobs | Production Blobs `vN` | Already there |
| `netlify dev` (:8822) | Do not use for Artifacts | Sandbox `getStore()` is not production | Blocked / warned |

Localhost may open an explicit **Production Blobs** tab. It must not replace disk rows when the local generations API 401s.

## Operator notes

- Localhost `/debug` = git/disk inspector + local regenerate + Publish to production.
- Production `/debug` = live stores (Blobs, Supabase).
- Do not use `netlify dev` for `/debug/components`.
- First-gen seeds still ship with `npm run components:seeds:upload` / `publish:content`.
- In `next dev`, `/debug` compiles without the public Header/search-index graph (`src/app/(site)/layout.tsx`).
- Local `/api/debug/*` stay request-scoped in `next dev`. `next build` parks `src/app/api/debug` so the static export never sees those handlers — do not flip `dynamic` on them. Production `/debug` uses Netlify Functions (`op=hide` / `op=delete` / `op=promote-seed` on Blobs).

---
title: Components Seeds Pipeline
nav_order: 6
parent: Building and Deploy
---

# Components Seeds Pipeline (Phase 2 closed)

Clean local path for **first-gen seeds** and shipping them into Netlify Blobs. Runtime Export / Preview / regenerate never write seeds via Gemini; they only read Blobs.

Related:
- [Components Cache Workflow](components-cache-workflow) — Gemini first-gen details
- [Components API CDN PRD](../product-roadmaps/specs/components-api-cdn-prd) — Phase 2 closed
- [Components Generation Prompting](../product-roadmaps/specs/components-generation-prompting) — seed vs regenerate prompts

## Mental model

| Step | Where | Command |
|------|--------|---------|
| 1. Generate seed TSX | Local (`public/components/code/`) | `publish:content` → `build:artifacts` / `build:components` |
| 2. Upload seed to Blobs | Local → **Netlify CLI → Blobs** | `publish:content` → `components:seeds:upload` |
| 3. Runtime | Netlify Blobs | Export / Preview / Reimagine / Fix |

**Default publish path:** `npm run publish:content` runs generation **and** uploads new seeds (existing Blobs seeds are skipped). Use the standalone upload command only for targeted/ops recovery.

- **Default upload uses Netlify CLI** (`netlify login` + `netlify link`) — same approach as meta enrich.
- **Seeds are immutable.** Existing Blobs seeds are skipped (`seed_exists`), not overwritten.
- **Regenerates** (`vN`) are click-only on `/debug` and do not replace `seed` / `v0`.
- **`out/components/code` is stripped** on publish. Do not rely on the live site serving TSX.

## Prerequisites (once per machine)

```bash
netlify login
netlify link   # selects the PATTTTERNS site; writes .netlify/state.json
```

Or set `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`.

## One-liner recipes

### Full publish (new patterns included)

```bash
# search → content/shell → artifacts → upload new seeds to Blobs
npm run publish:content
# then commit public/search-index.json, .notion-cache/, components/
```

### New or rebuilt seed for one pattern

```bash
# 1) Gemini first-gen → public/components/code/<id>.tsx
npm run build:components -- --ids=<patternId> --force --promote=all

# 2) Ship into Blobs via Netlify CLI (no Supabase token)
npm run components:seeds:upload -- --ids=<patternId>
```

### Full local cache → Blobs bootstrap
```bash
npm run build:components -- --force --promote=all   # or use existing code/ files
npm run components:seeds:upload
```

### Manifest only (no upload)

```bash
npm run components:seeds:manifest
npm run components:seeds:manifest -- --ids=<id[,id…]>
```

### Dry-run upload plan

```bash
npm run components:seeds:upload -- --dry-run
npm run components:seeds:upload -- --ids=<id> --dry-run
```

### Optional: upload via Components API instead

```bash
export COMPONENTS_MIGRATE_TOKEN=<supabase-access-token>
export COMPONENTS_API_BASE=https://patttterns.com/.netlify/functions/components-api
npm run components:seeds:upload -- --via-api --ids=<patternId>
```

## npm scripts

| Script | What it does |
|--------|----------------|
| `build:components` | Gemini first-gen into `public/components/code/` |
| `build:components:dry` | Dry-run first-gen |
| `components:seeds:manifest` | Write `public/components/seeds-manifest.json` |
| `components:seeds:upload` | Manifest + write seeds to Blobs (**Netlify CLI** by default) |
| `components:seeds:enrich` | Backfill title/slug/cover on existing Blobs meta (Netlify CLI) |
| `strip:components-out` | Remove `out/components/code` + `history` after `next build` (also part of `npm run build`) |

## Environment

| Var | Required | Purpose |
|-----|----------|---------|
| Netlify CLI auth | Upload (default) | `netlify login` + `netlify link`, or `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` |
| `COMPONENTS_MIGRATE_TOKEN` | Only with `--via-api` | Supabase access token for `op=put-seed` |
| `COMPONENTS_API_BASE` | Only with `--via-api` | Function base URL |
| `COMPONENTS_SEEDS_BASE_URL` | Optional / transitional | Function may still fetch `/components/code/{id}.tsx` when Blobs seed is missing |
| `GEMINI_API_KEY` | First-gen only | `build:components` |
| `COMPONENTS_STRIP_OUT` | Optional | Set `0` to skip publish strip (escape hatch) |

## Upload behavior (Netlify CLI)

- Reads `public/components/code/*.tsx` (optionally filtered by `--ids=`).
- Attaches `title` / `slug` / `coverImage` from `public/search-index.json` when present.
- Writes Blobs keys:
  - `code/<id>/seed.tsx`
  - `meta/<id>.json` (index with immutable seed version)
- **Already has seed** → `SKIP (seed_exists)`
- **Created** → `OK`
- **Error** → `FAIL`; process exits non-zero if any fail

## Replacing a bad seed

Not supported via API/CLI upload (immutable). Ops path:

1. Rebuild local: `npm run build:components -- --ids=<id> --force --promote=all`
2. Delete Blobs keys `meta/<id>.json` and `code/<id>/seed.tsx` (Netlify UI/CLI)
3. Re-upload: `npm run components:seeds:upload -- --ids=<id>`
4. Hide or keep existing `vN` regenerates as needed; set active back to `seed` if required

## Phase 2 close checklist

- [x] Production loads TSX from Components API (not published `out/` TSX)
- [x] Postbuild strips `out/components/code` + `history`
- [x] Local first-gen + Netlify CLI Blobs upload documented above
- [x] `publish:content` uploads new seeds to Blobs (no extra step for brand-new patterns)
- [ ] Ops: run a full (or filtered) `components:seeds:upload` against the linked prod site once for any seeds created before this wire-up

After that bootstrap upload (if needed), Phase 2 ops is complete. Ongoing: `npm run publish:content` covers generate + Blobs for new seeds.

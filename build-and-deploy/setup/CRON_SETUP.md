---
title: Publishing Notion Content
parent: Setup & Configuration
nav_order: 5
---

# Publishing Notion Content

How Notion content gets from the CMS into production.

## Mental model

**Source of truth for deploys = git commits**, not live Notion calls.

| Artifact | In git? | How it is updated |
|----------|---------|-------------------|
| `public/search-index.json` | Yes | `npm run publish:content` (local) |
| `public/.notion-cache/` | Yes | `npm run publish:content` (local) |
| `public/components/` | Yes (local/`next dev` cache) | `npm run publish:content` (local) |
| Component seeds (Export/Preview) | **No** — Netlify Blobs | `publish:content` → `components:seeds:upload` |
| `public/_redirects`, `netlify/redirect-data.json` | No | Regenerated on every `npm run build` (Netlify prebuild) |

Netlify never persists `.notion-cache` between builds. Every deploy uses whatever is in the repo at that commit. Runtime component TSX is **not** served from git/`out/` — `publish:content` uploads new seeds to Blobs so Export works after deploy.

---

## Full pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  LOCAL PUBLISH  (when Notion content changes)                │
│                                                              │
│  npm run publish:content                                     │
│    1. build:search                                           │
│    2. build:metadata          (incremental, no --force)      │
│    3. build:search            (re-index after metadata)      │
│    4. build:content --refresh-shell + homepage gallery merge │
│    5. build:artifacts         (metadata + components)        │
│    6. validate:artifacts                                     │
│    7. components:seeds:upload (new Blobs seeds; skip exists) │
│                                                              │
│  git add -f public/search-index.json public/.notion-cache/   │
│            public/components/                                │
│  git commit -m "chore: publish notion content"               │
│  git push origin main                                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  NETLIFY DEPLOY  (automatic on every push)                   │
│                                                              │
│  prebuild → redirects, edge-data, mcp-discovery, skills      │
│  next build → static export to /out (strips components/code) │
│  Export/Preview reads Blobs via Components API               │
│  ~3 min, zero Notion API calls                               │
└──────────────────────────────────────────────────────────────┘
```

---

## One command to publish

```bash
npm run publish:content
git add -f public/search-index.json public/.notion-cache/ public/components/
git commit -m "chore: publish notion content"
git push origin main
```

Requires `.env.local` with `NOTION_API_KEY`, `NOTION_TOKEN`, and `GEMINI_API_KEY`, plus Netlify CLI auth for seed upload (`netlify login` + `netlify link`, or `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`).

Netlify deploys automatically. No cache clear needed. New pattern seeds are already in Blobs from step 7 — no separate upload.

---

## Secondary commands (low-level)

Use these only when you need a targeted run. Normal publishing should use `publish:content`.

| Command | Purpose |
|---------|---------|
| `npm run add:pattern` | Create a row in ALL_PATTERNS_DB (`{Generated ID}. {title}` + image blocks). See [Add a Pattern](ADD_PATTERN) |
| `npm run build:search` | Rebuild `public/search-index.json` only |
| `npm run build:content` | Incremental Notion page cache |
| `npm run build:content -- --refresh-shell` | Refresh homepage + menuGroup DB views |
| `npm run build:content -- --force` | Overwrite all `.notion-cache` files |
| `npm run build:metadata` | AI descriptions + Notion sync (incremental) |
| `npm run build:components` | Component TSX exports (incremental) |
| `npm run build:artifacts` | Metadata + components orchestrator |
| `npm run validate:artifacts` | Write artifacts report only |
| `npm run components:seeds:upload` | Ship local TSX seeds to Netlify Blobs (also step 7 of `publish:content`) |

Force flags (`--force`) are for recovery or full rebuilds — not part of the default publish flow.

Escape hatch: `PATTERN_PUBLISH_SKIP_SEEDS_UPLOAD=1 npm run publish:content` skips Blobs upload (debug only — new patterns will not Export on deploy).

---

## `--refresh-shell` explained

`build:content` skips existing cache files by default. New pattern pages get their own cache file, but **homepage and category database views** can stay stale.

`publish:content` always passes `--refresh-shell`, which re-fetches:

- Homepage (`siteConfig.notionPageId`)
- Menu group DBs: `ux-patterns`, `ui-patterns`, `all-patterns`

It also merges the patterns gallery `collection_query` from the all-patterns shell into the homepage cache (Notion's homepage fetch omits that data).

---

## Env var reference (content builds)

| Var | Effect | Default |
|-----|--------|---------|
| `NOTION_DEEP_COVER_SCAN` | Absent = content-body image scan **on** | On |
| `NOTION_COVER_DEBUG` | Verbose cover/image logs | Off |
| `NOTION_FORCE_IMAGE_SCAN` | Re-scan Notion body images (ignore cached `images[]`) | Off |
| `NOTION_API_DEBUG` | Verbose Notion request logs | Off |
| `NOTION_FAIL_FAST` | Fail on first Notion error | Follows `CI` env |
| `GEMINI_API_KEY` | Required for metadata/components generation | — |

---

## Related docs

- [Deployment guide](DEPLOY)
- [Cache pipeline](CACHE_PIPLINE)
- [Components cache workflow](../components-cache-workflow)

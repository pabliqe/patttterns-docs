---
title: Notion Content Refresh — Setup Guide
parent: Setup & Configuration
nav_order: 5
---

# Notion Content Refresh — Setup Guide

Content (Notion pages, covers, search index) is managed by a GitHub Actions workflow,
not by Netlify. Netlify builds are always fast (~3 min) because they skip all Notion
fetching and use committed files from git (`public/search-index.json` + `public/.notion-cache/`).

## How it works

```
┌─────────────────────────────────────────────────┐
│  GitHub Actions (.github/workflows/refresh-content.yml)  │
│                                                 │
│  1. npm run build:search   → search-index.json  │
│     + cover deep scan (NOTION_DEEP_COVER_SCAN    │
│       absent = deep scan ON)                    │
│  2. npm run build:content  → .notion-cache/     │
│  3. git add -f + commit + push → main           │
└──────────────────┬──────────────────────────────┘
                   │ commit triggers Netlify (optional)
                   ▼
┌─────────────────────────────────────────────────┐
│  Netlify build (any deploy)                     │
│                                                 │
│  NOTION_SKIP_SEARCH=1  → skips build:search     │
│  NOTION_SKIP_CONTENT=1 → skips build:content    │
│  uses committed search-index.json + .notion-cache/ │
│  next build  ~3 min, zero Notion API calls      │
└─────────────────────────────────────────────────┘
```

## Triggers

| Trigger | When | How |
|---|---|---|
| **Weekly cron** | Every Monday at 6am UTC | Automatic |
| **Manual button** | On demand | GitHub → Actions → "Refresh Notion content" → Run workflow |

## One-time setup

### 1. Add GitHub repository secrets

Go to **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `NOTION_API_KEY` | Same as `.env.local` → `NOTION_API_KEY` |
| `NOTION_TOKEN` | Same as `.env.local` → `NOTION_TOKEN` |

### 2. Confirm Netlify env vars

These should already be set in **Netlify → Site configuration → Environment variables**:

| Var | Value | Scope |
|---|---|---|
| `NOTION_API_KEY` | your key | All contexts (for emergency manual overrides) |
| `NOTION_TOKEN` | your token | All contexts |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL | All contexts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | All contexts |

`NOTION_SKIP_SEARCH=1` and `NOTION_SKIP_CONTENT=1` are set in `netlify.toml` — no Netlify UI action needed.

### 3. Verify the workflow appears in GitHub

After pushing `.github/workflows/refresh-content.yml` to `main`, go to:
**GitHub → Actions tab → "Refresh Notion content"**

Click **Run workflow** → **Run workflow** to trigger a manual run and confirm it works.

## Env var reference

| Var | Effect | Default |
|---|---|---|
| `NOTION_SKIP_SEARCH`  | Skip `build:search` entirely  | Off (absent = runs) |
| `NOTION_SKIP_CONTENT` | Skip `build:content` entirely | Off (absent = runs) |
| `NOTION_DEEP_COVER_SCAN` | **Absent = deep scan ON.** Set to any value to disable. | On |
| `NOTION_COVER_DEBUG` | Verbose cover pipeline logs | Off (`=== "1"` to enable) |
| `NOTION_API_DEBUG` | Verbose per-request Notion logs | Off |
| `NOTION_API_STATS` | Aggregated Notion stats summary | Off |
| `NOTION_FAIL_FAST` | Fail build on any Notion error | Follows `CI` env |

## Forcing a content rebuild outside the schedule

**Option A — Manual trigger (recommended):**
GitHub → Actions → "Refresh Notion content" → Run workflow

**Option B — Temporarily override on Netlify:**
1. Go to Netlify → Environment variables
2. Remove or set to `0`: `NOTION_SKIP_SEARCH` and `NOTION_SKIP_CONTENT`
3. Trigger a deploy
4. Set both back to `1` after

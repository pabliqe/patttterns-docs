---
title: Deployment Guide
parent: Setup & Configuration
nav_order: 1
---

# Deployment Guide — PATTTTERNS

**Platform:** Netlify  
**Framework:** Next.js (App Router, static export)  
**Production URL:** https://patttterns.com  
**Last updated:** July 2026

---

## How publishing works (read this first)

Production is a **two-step** process:

1. **Refresh content** — pull from Notion, write cache files, **upload new component seeds to Blobs**, commit to git
2. **Deploy site** — Netlify builds static HTML from those committed files (strips `out/components/code`)

Netlify does **not** call Notion during normal deploys. It reads what is already in the repo. Export/Preview reads **Blobs** (populated during `publish:content`).

```
Notion
  ↓  npm run publish:content  (local)
public/search-index.json + public/.notion-cache/ + public/components/
  + new seeds → Netlify Blobs
  ↓  git commit + push
Netlify: npm ci && npm run build  →  /out  →  CDN
```

| Step | Who runs it | Output |
|------|-------------|--------|
| Content publish | Local: `npm run publish:content` | Git caches + Blobs seeds for new components |
| Site deploy | Netlify on every push to `main` | Static site in `/out` |

See also: [Cache Pipeline](CACHE_PIPLINE) · [Publishing Notion content](CRON_SETUP)

---

## Netlify build settings

Configured in `netlify.toml`:

| Setting | Value |
|---------|-------|
| Build command | `npm ci && npm run build` |
| Publish directory | `out` |
| Notion during build | **Never** — content is committed to git before deploy |

Do **not** set publish directory to `.next` — production uses static export to `/out`.

---

## Local development

```bash
git clone https://github.com/pabliqe/patttterns-next.git
cd patttterns-next
npm ci
cp .env.example .env.local   # add Notion keys, Supabase, etc.
npm run dev                  # http://localhost:3000 — live Notion API
```

`npm run dev` talks to Notion directly. Production uses committed cache files only — so you can see patterns locally that are not on the live site until you refresh and commit.

---

## Simulate a production build locally

```bash
npm run build
```

This matches Netlify: prebuild regenerates redirects and edge data, then `next build` exports static pages from committed `public/search-index.json`, `public/.notion-cache/`, and `public/og/covers/`.

---

## Publishing new Notion content

After adding or editing patterns in Notion:

```bash
npm run publish:content
git add -f public/search-index.json public/.notion-cache/ public/components/
git commit -m "chore: publish notion content"
git push origin main
```

Netlify deploys automatically (~3 min). No Notion API calls on Netlify.

Details: [Publishing Notion content](CRON_SETUP)

---

## Publishing code-only changes

Push to `main` — Netlify rebuilds using the **existing** committed cache. No content refresh needed.

```bash
git push origin main
```

---

## Environment variables

### Local (`.env.local`)

Copy from `.env.example`. Minimum for content refresh:

- `NOTION_API_KEY`
- `NOTION_TOKEN` (if private pages need it)

Database IDs default in `site.config.mjs`; override with env vars if needed.

### Netlify (dashboard)

Set in **Site configuration → Environment variables**:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth / bookmarks |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth / bookmarks |
| `GEMINI_API_KEY` | Chatbot proxy (serverless function) |

Never commit secrets to git.

---

## Post-deploy checks

```bash
curl -I https://patttterns.com/
curl -I https://patttterns.com/patterns
curl -I https://patttterns.com/sitemap.xml
curl -I https://patttterns.com/search-index.json
```

Confirm a new pattern:

```bash
curl -s https://patttterns.com/search-index.json | jq '[.[] | select(.type=="pattern")] | length'
curl -I https://patttterns.com/patterns/<slug>
```

---

## Troubleshooting

### New pattern works locally but not on production

1. Run `npm run publish:content` locally.
2. Commit `public/search-index.json`, `public/.notion-cache/`, and `public/components/`.
3. Push to `main`.

Local dev uses live Notion; production only sees committed cache.

### Pattern in search but 404 on its page

The slug must exist in `search-index.json` **and** have a matching file in `public/.notion-cache/{id}.json`. Run `npm run publish:content`.

### Pattern on `/patterns` but missing from homepage grid

Run `npm run publish:content` — it refreshes shell pages and merges the patterns gallery into the homepage cache.

### Build fails on Netlify

1. Check deploy logs in Netlify dashboard.
2. Reproduce locally: `npm run build`.
3. Common causes: TypeScript errors, missing cache file for an index entry, redirect validation failure.

### `[notion-cache] miss` during build

Run `npm run publish:content`, then commit the new `.notion-cache` files.

---

## Rollback

**Fast:** Netlify dashboard → Deploys → pick a previous successful deploy → **Publish deploy**.

**Git:** `git revert <commit>` and push — Netlify rebuilds from the reverted tree.

---

## Release checklist

**Code release**

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Push to `main`; confirm Netlify deploy succeeds

**Content release** (new/updated Notion patterns)

- [ ] `npm run publish:content`
- [ ] Commit `public/search-index.json` + `public/.notion-cache/` + `public/components/`
- [ ] Push to `main`; verify pattern on production

---

## Related docs

- [Publishing Notion content](CRON_SETUP)
- [Cache pipeline](CACHE_PIPLINE)
- [Components cache workflow](../components-cache-workflow)
- [Auth setup](AUTH_SETUP)

---
title: Multi-Library & AI Optimization
parent: Roadmaps
nav_order: 5
---

# ROADMAP — Multi-Library & AI Optimization

## Status (Aug 2026)

| Phase | Status |
|-------|--------|
| 1 — Editable title | ✅ Done |
| 2 — `libraries` schema + switcher MVP | ✅ Done (SQL applied; app reads/writes `libraries`) |
| 3a — `buildLibraryContext` | ✅ Done (`src/lib/library-ai-context.mjs`) |
| 3b — Public JSON-LD | ✅ Done (`/l/{token}`) |
| 3c — Gemini auto-fill title/description | ✅ Done (`library-ai` Function + UI) |
| 4 — AI export / recommend / README | ⏳ Partial — recommend empty-library examples ✅ |
| 5 — Multi-library UX | ✅ Done (shipped with Phase 2) |
| Cleanup — drop dormant `user_profiles.library_*` | ⏳ Optional later |

**`user_profiles` note:** Library title/description/share live on **`libraries` only**. `user_profiles` is still used for **author** fields (`public_display_name`, `public_avatar_url`, `public_show_author`). Legacy `library_*` / `share_*` columns on `user_profiles` are unused by the app after migration — safe to leave until a dedicated drop migration.

**Public discovery (read):** MCP `list_public_libraries` / `search_public_libraries` / `get_public_library`, site search `type: "library"`, sitemap, and chatbot proxy (parallel public-library search) all read share-enabled `libraries`.

---

## Context

PATTTTERNS supports **N libraries per user** with editable title, share token, and AI context description. Architecture: **Supabase REST + RLS** from the client (`library-cloud.ts` / `bookmark-cloud.ts`) — no Prisma.

Constraints:

- Patterns may belong to **one or many** libraries (M2M via `bookmark_on_library`).
- Pricing / plan gating is **not** in scope.
- Token share URLs (`/l/{token}`) are canonical; username slugs stay later ([Public Libraries PRD](../specs/public-libraries-mcp-jsonld-prd)).

---

## Goals

- [x] Editable library title
- [x] Library context (description) for AI
- [x] Multiple libraries per user + switcher
- [x] Patterns assignable to multiple libraries
- [x] Gemini auto-fill when title is default and/or description empty
- [x] AI recommend examples for empty libraries with context
- [ ] AI export / README (rest of Phase 4)

## Non-Goals (this roadmap)

- Pricing tiers or `isPro` enforcement.
- Username SEO slug URLs (tracked in Public Libraries PRD).
- Full CMS / Notion replacement.

---

## Data model (current)

```text
auth.users
    │ 1:N
    ▼
libraries  (title, description, share_token, share_enabled, is_default, position)
    │
    │ M:N via bookmark_on_library
    ▼
bookmarks  (pattern payload)

user_profiles  — author display fields only (not library chrome)
```

SQL: [`docs/queries/DB_LIBRARIES_MULTILIBRARY.sql`](../../queries/DB_LIBRARIES_MULTILIBRARY.sql)

---

## Phased Roadmap

### Phase 1 — Editable Library Title ✅

Shipped: inline rename (now via library tabs), persistence on `libraries.title`.

### Phase 2 — Schema + multi-folder MVP ✅

- [x] `libraries` + `bookmark_on_library` + RLS + backfill
- [x] `library-cloud.ts` / `bookmark-cloud.ts` cut over
- [x] Share via `/l/{token}` + `/library?token=`
- [x] Switcher, create, rename, delete (non-default), `?lib=`
- [x] Save picker when user has multiple libraries
- [x] Drawer filter + per-library counts
- [x] Public shared library: save-to picker + duplicate as new owner library
- [ ] Drop dormant `user_profiles.library_*` / `share_*` columns (optional)

### Phase 3 — AI context ✅ (core)

#### 3a — Structured context object ✅

[`src/lib/library-ai-context.mjs`](../../src/lib/library-ai-context.mjs) — `buildLibraryContext()` grounds title, curator, description, top tags, and up to 20 patterns.

#### 3b — JSON-LD for public libraries ✅

Canonical `/l/{token}` injects ItemList JSON-LD (Public Libraries PRD).

#### 3c — Gemini auto-fill ✅

- Netlify Function: `POST /.netlify/functions/library-ai` (alias `/api/v1/library-ai`)
- Auth: owner Bearer token
- Fills **title** only if still default (`My Pattern Library` / empty)
- Fills **description** only if empty
- Requires ≥1 pattern in the library
- UI: **Auto-fill with AI** on owner `/library` context field

### Phase 4 — AI Features: Export & Build From Patterns ⏳

- [x] Pattern recommender (empty library → **Auto-load examples with AI** from title/context)
- [ ] Code export from library context
- [ ] Shareable README / summary copy

`library-ai` `action: "recommend"` ranks search-index candidates, asks Gemini to pick 5–8, client upserts into the active library.

### Phase 5 — Multiple Libraries Per User ✅

Merged into Phase 2 ship (client Supabase REST, not Next `/api/libraries` routes).

Exit criteria:

- [x] Create / rename / delete additional libraries
- [x] Patterns in multiple libraries (join table + save picker)
- [x] Default library keeps working
- [x] Switcher on `/library`

---

## Public listing (MCP / search / bot)

| Surface | Status |
|---------|--------|
| MCP `list_public_libraries` | ✅ reads `libraries` |
| MCP `search_public_libraries` | ✅ |
| MCP `get_public_library` | ✅ |
| Topbar search (`type: "library"`) | ✅ `listNonEmptyPublicLibraries` |
| Chatbot proxy | ✅ parallel `search_public_libraries` in prompt |
| Sitemap `/sitemap-libraries.xml` | ✅ |

---

## Critical path doc

[Close stage and multilibrary path](../specs/close-stage-and-multilibrary-path) — Stage close decisions (no `public_library_index` table; branded OG deferred).

---

## Migration safety

1. Do not drop `user_profiles.library_*` in the same deploy that still reads them — app no longer reads them; drop can be a separate SQL change when ready.
2. Default library is created lazily via `ensureDefaultLibrary()` (internal) / SQL backfill.
3. Deleting a library detaches join rows; bookmarks remain unless removed from all libraries.

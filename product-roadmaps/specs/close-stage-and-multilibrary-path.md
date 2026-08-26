---
title: Close public-libraries Stage + Multi-library critical path
parent: Specs
nav_order: 14
---

# Close public-libraries Stage + Multi-library critical path

## Status note (Aug 2026)

Multi-library **app path is implemented** and SQL has been applied. Library chrome lives on `libraries`; `user_profiles` keeps author fields only. Stage close does **not** require a `public_library_index` table.

Gemini auto-fill (title if default + description if empty) ships via `library-ai` Function. Public listing is available to MCP, site search, and the chatbot proxy in read mode.

---

## A. Close Stage (Phase 1–2) — before `/library/[username]`

Do **not** start username aliases until this checklist is done.

### Already done

- `/l/{token}` SEO/agent document (JS handoff to Flow for humans)
- Static `/og-library.png`
- Sitemap, anonymous `/library` listing (directory UI also at `/debug/libraries`)
- Search `type: "library"`, public MCP tools
- Hide empty shared libraries from public lists

### Remaining to mark Stage closed

| Item | Critical path decision |
|---|---|
| **Branded per-library OG** | **Leave deferred.** Closing the stage does not require `uink-brand-cli` / Blobs. Static OG is enough. |
| **`public_library_index`** | **Do not add a table.** Keep listing via live `user_profiles` + `bookmarks` (already shipped). A SQL VIEW is optional sugar only — not required to close the stage. |
| **Token regen cleanup** | Old `share_token` naturally 404s on `/l/` and drops out of live lists. Mark acceptance **done**. No purge job until Blobs OG returns. |
| **`libraries-index.json` snapshot** | **Skip for Stage close.** Optional later if Function/CDN cost hurts. |
| **Docs** | Update PRD status to “Stage closed”; keep OG + username as later. |

### Stage-close backend

**Nothing new required for “index.”** Directory, search, MCP, and sitemap already read share-enabled profiles and filter empty libraries in app/Function code.

Optional later (only if list queries get painful): a **VIEW** over the same tables — still not a second stored copy:

```sql
-- Optional convenience only — not a Stage-close blocker
create or replace view public.public_libraries_list as
select
  up.share_token,
  up.user_id,
  coalesce(nullif(trim(up.library_title), ''), 'My Pattern Library') as title,
  coalesce(nullif(trim(up.library_description), ''), 'A curated pattern library on PATTTTERNS.') as description,
  case when up.public_show_author then up.public_display_name else null end as author_name,
  up.public_show_author as show_author,
  (select count(*)::int from public.bookmarks b where b.user_id = up.user_id) as pattern_count
from public.user_profiles up
where up.share_enabled = true
  and up.share_token is not null
  and exists (select 1 from public.bookmarks b where b.user_id = up.user_id);
```

Prefer **no VIEW** until multi-library cutover — then list from `libraries` the same live way.

### Stage-close frontend

- No marketplace redesign required.
- Optional polish only: card titles already fall back; encourage owners to rename “My Pattern Library” (product copy, not a blocker).

**Exit:** PRD acceptance boxes for index + token regen checked; OG stays deferred; username still blocked.

---

## B. Multi-library without refactoring everything

### Constraint (from your screenshot)

Today one user ↔ one library on `user_profiles`. Directory shows generic “My Pattern Library” per person. You need **N folders per user** soon, without rewriting bookmarks, Flow, share, or discovery from scratch.

### What NOT to do first

- Username URLs (`/library/[username]`) — needs stable library identity + default/list semantics.
- Full Prisma / new API layer — keep Supabase REST + RLS.
- Moving every consumer to M2M in one PR.
- Rebuilding Library Flow as a multi-root IA before `libraries` exists.

### Target model (same as MULTILIBRARY Phase 2 — keep it)

```text
auth.users
    │ 1:N
    ▼
libraries  (title, description, share_token, share_enabled, is_default, position)
    │
    │ M:N via bookmark_on_library
    ▼
bookmarks  (pattern payload — keep as today)
```

Author display fields (`public_display_name`, avatar, show_author) can **stay on `user_profiles`** (user-level), not duplicated per library.

### Critical path — ordered

#### Step 1 — Schema + default migration (backend only)

1. Create `libraries` + `bookmark_on_library` with RLS (owner CRUD; anon read when `share_enabled`).
2. Backfill: **one `is_default` library per existing `user_profiles`**, copy title/description/share_*.
3. Backfill join: every existing bookmark → default library.
4. **Do not drop `user_profiles` library columns yet** — dual-read possible.

#### Step 2 — Compatibility shim (backend + thin FE)

Change **`library-cloud.ts` only** (and Function readers: `/l/`, sitemap, MCP):

| API | Behavior after shim |
|---|---|
| `getMyLibraryProfile()` | Load **default** `libraries` row |
| `updateMyLibraryProfile()` | Update default library |
| `getPublicProfile(token)` | `libraries` by `share_token` (+ join user_profiles for author) |
| `getPublicBookmarks` | Via `bookmark_on_library` for that library’s `user_id`+`library_id` |
| Bookmark save/delete | Write `bookmarks` **and** ensure row on **active** library (default until switcher exists) |

Frontend `/library` keeps working unchanged: still “one library” UX = the default.

**Exit:** Zero UX change for users; data lives on `libraries`.

#### Step 3 — Multi-folder MVP (frontend + small API)

Minimum product:

1. **Library switcher** on owner Flow (list my libraries; select active).
2. **Create library** (title only → new `libraries` row, empty join).
3. Active library id in URL: `/library?lib={uuid}` (owner) or keep session state; public stays `/library?token=`.
4. Save bookmark → active library’s `bookmark_on_library` (pattern can later be added to multiple libs).
5. Share toggle / token remain **per library** (already fits `/l/{token}` + directory).

Avoid for MVP: drag between folders, nested folders, username routes, per-library avatars.

#### Step 4 — Cut over + cleanup

1. Stop reading `user_profiles.library_*` / `share_*`.
2. Drop or deprecate those columns.
3. Recreate public lists on **`libraries`** + counts via `bookmark_on_library` (still live queries — no index table).
4. Then (later) username: `/library/[username]` → default library or directory of that user’s public libs.

---

## C. Suggested sequencing (calendar sense)

```text
Week A  Close Stage: docs + mark live-list index/token-regen done (no new SQL table)
Week B  libraries table + backfill + shim library-cloud + /l/ + MCP
Week C  Switcher + create library + ?lib= + bookmark attach to active
Later   Username aliases, branded OG, view counters, AI context
```

### Why this is the best critical path

- **Closes discovery Stage** without waiting on OG, usernames, or a denormalized index table.
- **Live RLS lists** stay the listing surface; after cutover, same pattern on `libraries`.
- **Shim-first** means Flow/share/marketplace keep working while you get a second library for yourself.
- **Token identity stays** — multi-lib doesn’t force SEO URL redesign; each folder gets its own `share_token`.
- Username comes **after** `libraries` exist so `/library/pablo` has a clear default (or list).

### Risk to watch

- Bookmark save paths that bypass `library-cloud` / `bookmark-cloud` must also attach to active library.
- Directory cards must key by `share_token` / `library_id`, not `user_id` (two cards from same author become normal).
- Empty-library rule stays: `pattern_count > 0` for public lists.

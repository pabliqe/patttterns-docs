# DB Setup — Supabase

## Architecture overview

The app is migrating from Prisma + NextAuth (server-side) to Supabase Auth + Supabase REST (client-side, static-export compatible).

| Layer | Old (Prisma/NextAuth) | New (Supabase) |
|---|---|---|
| Auth sessions | NextAuth `Session` table (cuid strings) | Supabase Auth `auth.users` (UUIDs) |
| User records | Prisma `User` table | Supabase Auth user metadata |
| Bookmarks | Prisma `Bookmark` table via Next API routes | `public.user_bookmarks` via Supabase REST + RLS |
| ORM | Prisma client | None — direct REST API calls from the browser |

The existing Prisma-managed tables (`"User"`, `"Bookmark"`, `"Collection"`, etc.) remain in the database but are no longer used in the static-export code path.

---

## Required env vars

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both are public (browser-visible). The anon key is safe to expose — RLS policies enforce per-user access.

Optional override to force a specific bookmark backend (defaults to `supabase` in static-login mode):
```
NEXT_PUBLIC_BOOKMARK_SYNC_BACKEND=supabase   # or: legacy-api
```

---

## Supabase Auth setup

1. Go to **Authentication → Providers → Google** and enable it.
2. Add the following to **Redirect URLs** (under Authentication → URL Configuration):
   - `http://localhost:3000/auth/callback` (dev)
   - `http://localhost:8888/auth/callback` (netlify dev)
   - `https://<your-prod-domain>/auth/callback` (production)
3. The callback page is at `src/app/auth/callback/page.tsx` — it reads the OAuth tokens from the URL and stores them in `localStorage` under the key `patttterns-auth-session`.

Session storage format (`patttterns-auth-session` in localStorage):
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1234567890000,
  "user": {
    "id": "<supabase-uuid>",
    "name": "...",
    "email": "...",
    "image": "..."
  }
}
```

---

## Bookmarks table

The existing Prisma `"Bookmark"` table is **not used** in the Supabase path because its `userId` column stores Prisma cuid strings, which cannot be matched to Supabase Auth UUIDs in RLS policies.

Create a separate table (name avoids collision with Prisma's quoted `"Bookmark"` table):

```sql
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  pattern_id  text not null,
  title       text not null,
  slug        text not null,
  cover       text,
  tags        text[] default '{}',
  sort_order  int default 0,
  created_at  timestamptz default now(),
  unique (user_id, pattern_id)
);

alter table public.bookmarks enable row level security;

create policy "Users can manage own bookmarks"
  on public.bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Run this in **Supabase Dashboard → SQL Editor**.

### Column mapping

| Supabase column | Source |
|---|---|
| `user_id` | Supabase Auth `auth.uid()` (UUID) |
| `pattern_id` | Notion page ID (`BookmarkedPage.id`) |
| `title` | Pattern title |
| `slug` | URL slug |
| `cover` | Cover image URL (nullable) |
| `tags` | Array of tag strings |
| `sort_order` | Integer position in user's list |
| `created_at` | Auto-set on insert |

---

## Bookmark REST endpoint

All bookmark operations use `NEXT_PUBLIC_SUPABASE_URL/rest/v1/bookmarks` directly from the browser via `src/lib/bookmark-cloud.ts`.

Auth headers sent on every request:
```
apikey: <anon-key>
Authorization: Bearer <access-token>
```

RLS ensures each user only sees and modifies their own rows.

Operations:
| Action | Method | Filter |
|---|---|---|
| List | `GET` | (none — RLS filters by `user_id`) |
| Add / update | `POST` + `Prefer: resolution=merge-duplicates` | `on_conflict=user_id,pattern_id` |
| Delete one | `DELETE` | `pattern_id=eq.<id>` |
| Clear all | `DELETE` | `pattern_id=not.is.null` |
| Reorder | `POST` + `Prefer: resolution=merge-duplicates` | `on_conflict=user_id,pattern_id` |

---

## What to do with Prisma

Prisma has been removed from the runtime and package dependencies. The static-export auth/data path now uses Supabase Auth + REST directly.

Files that are now dead code:
- `src/auth.ts` (NextAuth config)
- `src/lib/prisma.ts`
- `src/app/api/auth/[...nextauth]/` (deleted)
- All Next API routes under `src/app/api/` (replaced with `force-static` stubs)

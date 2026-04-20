---
title: Static Login Migration
parent: Roadmaps
nav_order: 7
---

# ROADMAP — Static Export + Login Migration

## Goal
Move PATTTTERNS to static-export-first delivery while preserving login and bookmarks with minimal infrastructure cost.

Primary objective:
- Public browsing runs from static files only (`out`, `_redirects`, static assets).
- No runtime Notion calls for public content.
- Login/bookmark features migrate away from Next server runtime.

## Why
Netlify free tier budget:
- 125,000 function calls / month
- 5,000 MAU target
- Budget per MAU:

$$
125000 / 5000 = 25
$$

To stay under this budget with growth margin, public routes must avoid server invocations entirely.

## Current Baseline
Static architecture already exists on `main` branch:
- Redirect strategy via `public/_redirects`
- Static output contract via `out`
- Content artifacts in `public/.notion-cache` and `public/search-index.json`

`social-login` added dynamic runtime for auth, which increased invocation risk.

---

## Phase 1 — Static Export Contract ✅

### Scope
Restore static export as deploy contract.

### Changes
- `next.config.ts`
  - Enable static export output in production (`output: "export"`).
- `netlify.toml`
  - Remove Next runtime plugin.
  - Publish from `out`.
  - Keep local Notion cache plugin.

### Expected result
- Build outputs static files to `out`.
- Netlify serves public site from static output.

### Risks
- Any server-only route handlers are incompatible with pure static export.
- Existing login endpoints will not be available in this mode.

### Validation
1. Run full build.
2. Confirm `out` is generated.
3. Confirm static routes load without function invocations.

---

## Phase 2 — Static Root Shell ✅

### Scope
Remove root layout server runtime dependencies.

### Changes
- `src/app/layout.tsx`
  - Remove `auth()` call from root layout.
  - Remove runtime `fs`/`path` reads.
  - Use static JSON import for `search-index`-based navigation.
  - Keep `AuthSessionProvider` mounted with `session={null}`.

### Expected result
- Root shell can be rendered in static export mode.
- No server auth call in global layout.

### Risks
- If auth-aware components still trigger server session fetches, they can generate noise.

### Validation
1. Load home + category + pattern pages.
2. Confirm nav/menu renders from static index data.
3. Confirm no runtime Notion dependency from layout path.

---

## Phase 3 — Auth Runtime Decoupling ✅

### Scope
Prevent broken NextAuth runtime flows during static migration and reduce background auth traffic.

### Changes
- Add migration flag:
  - `src/lib/static-login-mode.ts`
  - `NEXT_PUBLIC_STATIC_LOGIN_MODE !== "0"` enables static-login migration mode.
- Add client auth seam:
  - `src/lib/auth-client.tsx`
  - Centralizes auth state and actions behind a provider/hook so a static-compatible auth backend can replace NextAuth without another wide UI refactor.
- Implement Supabase OAuth client flow:
  - Browser-only token storage
  - Google OAuth redirect through Supabase Auth
  - Static callback page at `src/app/auth/callback/page.tsx`
  - Session restore on app boot
  - Client-side sign-out
- `src/components/AuthSessionProvider.tsx`
  - Replace direct NextAuth `SessionProvider` usage with local auth facade provider.
  - Skip sync side effects (`SyncRunner`, `GaUserSync`, `SyncToast`) in static-login mode.
- `src/components/AuthButton.tsx`
  - Consume local auth facade instead of `next-auth/react`.
- `src/components/Header.tsx`
  - Consume local auth facade instead of `next-auth/react`.
- `src/components/LoginModal.tsx`
  - Consume local auth facade instead of `next-auth/react`.
- `src/components/BookmarkButton.tsx`, `src/components/BookmarkDrawer.tsx`, `src/components/CollectionCard.tsx`, `src/lib/useUserSync.ts`
  - Consume local auth facade instead of `next-auth/react`.
- `src/app/api/auth/[...nextauth]/route.ts`
  - Remove NextAuth route from the exported app tree during phases 1-3.
- `src/app/library/page.tsx`
  - Replace dynamic library implementation with a static migration placeholder.
- `src/app/dashboard/page.tsx`
  - Replace dynamic dashboard redirect with a static migration placeholder.

### Expected result
- Public site remains testable in static mode without broken auth route loops.
- Login UI is explicitly paused while backend migration is in progress.
- Export build no longer traverses unsupported auth-backed route handlers/pages.

### Current result
- Static-export-compatible Google login works end-to-end through Supabase OAuth.
- Authenticated UI state is restored client-side from stored Supabase session tokens.
- Bookmark cloud access is now centralized behind a client adapter (`legacy-api` / `supabase`) to unblock Phase 5 migration.
- Library route is still a placeholder while bookmark and share flows finish migrating.

### Required env vars for testing
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase dashboard must allow the site origin and `/auth/callback` redirect URL for Google OAuth.

### Risks
~~Login is temporarily unavailable in static-login mode.~~
~~Bookmark cloud sync remains paused until Phase 4+ replacement backend is integrated.~~

### Validation ✅
1. ✅ Login modal y navbar auth actions funcionales.
2. ✅ Google OAuth redirige a Supabase y vuelve a través de `/auth/callback`.
3. ✅ Estado autenticado persiste después de recarga.
4. ✅ Browsing funcional sin regresiones.

---

## Phase 4 — External Auth Provider ✅

- ✅ Provider reemplazado por Supabase OAuth client-side (`src/lib/auth-client.tsx`).
- ✅ `AuthSessionProvider` usa facade local en lugar de `next-auth/react`.
- ✅ NextAuth route en `/api/auth/[...nextauth]` reemplazado por stub estático.
- ✅ Callback page estática en `src/app/auth/callback/page.tsx`.
- ✅ Env vars: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Phase 5 — External Bookmark Data Path ✅

- ✅ `src/lib/bookmark-cloud.ts` abstrae backend `legacy-api` / `supabase`.
- ✅ Supabase REST directo con RLS — sin Next API routes.
- ✅ Rollout controlado por `NEXT_PUBLIC_BOOKMARK_SYNC_BACKEND` (default: `supabase` en static-login mode).
- ✅ Modo anónimo (localStorage) sin cambios para usuarios sin sesión.

---

## Phase 6 — Library Route in Static Architecture ✅

- ✅ `/library` es shell estática hidratada client-side.
- ✅ Vista owner: carga bookmarks via `getMyLibraryProfile` + `useBookmarks`.
- ✅ Vista pública: carga via `getPublicProfile(token)` + `getPublicBookmarks(userId)`.
- ✅ Empty state con chips de búsqueda rápida (`LibraryEmptyState`).

---

## Phase 7 — Final Cost Guardrails 🔲 *Próximo*

- [ ] Instrumentar llamadas a Supabase por usuario/sesión (contabilizar lecturas REST).
- [ ] Definir budget threshold: máx. llamadas Supabase REST por MAU.
- [ ] Agregar logging agregado en `bookmark-cloud.ts` y `library-cloud.ts` (opt-in via env var).
- [ ] Revisar si hay console.log de debug en producción (`library-cloud.ts` líneas 26-32) y eliminar.

---

## Rollout Plan
1. Deploy phases 1-3 to preview.
2. Validate static browsing and call behavior.
3. Approve before implementing phases 4-7.

## Rollback Plan
If any regression appears:
1. Revert `next.config.ts` static output setting.
2. Re-enable previous Netlify plugin runtime config.
3. Disable static-login migration mode.

---

## Notes
This roadmap intentionally separates:
- Delivery mode migration (phases 1-3)
- Auth/data backend migration (phases 4-7)

That split allows safe testing checkpoints and avoids mixing infra and auth rewrites in one deployment.

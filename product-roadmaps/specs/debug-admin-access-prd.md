---
title: Debug Admin Access and Generation Deletion
parent: Specs
nav_order: 23
---

# PRD: Debug Admin Access and Generation Deletion

## Objective

Make PATTTTERNS `/debug` admin-only, including localhost, while keeping the production site on static export and Gemini-backed regeneration ready for future paid or selected users. Keep hide (soft) and add hard delete plus promote-to-seed so a bad published seed can be replaced without bricking Export.

Production stays static-first (`npm run build` → `out`) for Netlify free-tier limits. `/debug` is a static shell with a client gate; authorization for data and mutations is enforced by Netlify Functions (and by local Next debug APIs in `next dev` only).

The first supported admin mechanism is a server-side environment variable allowlist:

```bash
DEBUG_ADMIN_EMAILS=pablo.armentano@gmail.com
```

The allowlist is comma-separated, case-insensitive, and trimmed. Do not hardcode admin emails in client code.

This PRD intentionally separates **debug admin** from **component generator** access. Admins can access operational/debug tools. Future paid or selected users may regenerate components without receiving `/debug` or destructive storage permissions.

## Current Behavior

- `src/app/debug/layout.tsx` wraps debug pages in `DebugAuthGate` (client). Localhost uses the same admin allowlist as production — no SSO skip.
- Origin / destination / sync chrome: [Debug Origin and Sync](debug-origin-sync).
- Local Next debug APIs call `requireDebugAuthUser` (allowlisted JWT).
- `netlify/functions/lib/components-auth.mts` requires an allowlisted admin for mutating ops.
- `/debug` responses have `noindex` / `no-store` headers in `netlify.toml`, but those headers are not authorization.
- `ComponentsGenerationsTable` renders many pattern `Link`s; Next prefetch can request missing static-export RSC sidecars such as `__next._tree.txt`.
- Some generation rows keep old Blobs slugs, producing plain `/patterns/...` 404s from stale pattern links.
- Hide feels slow because the UI waits for a full `op=list` refresh after a single version mutation.

## Authorization Requirements

- `/debug` and `/debug/*` are a static shell with a client auth/admin gate. Do not switch the site to a Next runtime or publish `.next`.
- Sensitive reads and all mutations are evaluated per request on Functions (production) or local debug APIs (`next dev`).
- Localhost follows the same admin email allowlist as production.
- Unauthenticated users see the sign-in path.
- Signed-in non-admin users see a clear admin-required state.
- Signed-in admins can use the debug UI and debug component actions.
- Server-side debug APIs that mutate or expose debug-only local data enforce the same admin allowlist.
- Public component code reads used by pattern preview/export (`op=active`, `op=code`) remain public.
- Existing noindex/no-store headers remain.
- Future enhancement: support Supabase `app_metadata.role === "admin"` in addition to email allowlist.

## Capability Model

Do not model all component mutations as permanently admin-only. Use separate capabilities:

- `debug_admin`: can access `/debug`, list all generations, delete/hide generations, rebuild stored TSX, publish local artifacts, manage seeds, and inspect debug-only data.
- `component_generator`: can call Gemini-backed generate/regenerate flows.

Initial rollout:

- `debug_admin` is controlled by `DEBUG_ADMIN_EMAILS`.
- `component_generator` may initially delegate to `debug_admin`.

Future rollout:

- `component_generator` may include paid users, selected email allowlists, beta flags, or Supabase metadata without granting `/debug` access or destructive storage permissions.

Suggested server helpers:

```ts
requireAuthUser()
requireDebugAdminUser()
requireComponentGeneratorUser()
```

Suggested components API mapping:

- `op=whoami` → `requireDebugAdminUser()`
- `op=generate` → `requireComponentGeneratorUser()`
- `op=rebuild` → `requireDebugAdminUser()`
- `op=publish` → `requireDebugAdminUser()`
- `op=put-seed` → `requireDebugAdminUser()`
- `op=promote-seed` → `requireDebugAdminUser()`
- `op=hide` / `op=delete` → `requireDebugAdminUser()`
- `op=list` → `requireDebugAdminUser()` when it lists all generations globally
- `op=active` / `op=code` → public
- `op=versions` → public for single-pattern preview needs, or admin when used by global debug UI

## Static Debug Requirements

Keep `/debug` on the static-export contract:

- Continue publishing `/debug` as static HTML from `out/`.
- Gate the UI in the client (`DebugAuthGate`): unauthenticated users see sign-in; signed-in non-admins see admin-required.
- Probe admin access with a cheap Function/`next dev` `whoami` check. Do not embed `DEBUG_ADMIN_EMAILS` in the client bundle as the security boundary.
- Keep `X-Robots-Tag` and `Cache-Control: no-store` for `/debug`.
- Static HTML may still be downloadable; that is acceptable. Secrets and mutations must not succeed without an allowlisted JWT.
- Local Next debug APIs (`src/app/api/debug/*`) stay request-scoped in `next dev` (read `Authorization`). Do not set `force-static` or `force-dynamic` on them. `next build` parks that folder out of the App Router (`scripts/park-debug-api-for-export.mjs`) so `output: export` never collects them. Production `/debug` uses Netlify Functions. Public `/debug` pages stay a static shell.

## Hide, Delete, and Promote-to-Seed Requirements

Keep **Hide generation** (soft) and add **Delete** (hard). Seeds are no longer locked.

Rules:

- Hide sets `hiddenAt`. The blob/file stays.
- Delete requires double confirmation, removes the index row, and deletes the TSX blob/file.
- Promote-to-seed copies a visible `vN` onto `seed.tsx`, keeps the `vN` row, and sets `activeVersionId` to `seed`.
- Seed may be hidden or deleted when another **visible** version exists.
- The last visible version cannot be hidden or deleted (`last_version`). Export/Preview must keep a TSX.
- If hiding/deleting the active version, move active to the newest remaining visible version.
- After seed delete, `ensureSeed` must not refill `seed.tsx` from git/static TSX while other versions remain.
- Return deleted/hidden `versionId` and new `activeVersionId`.

Local delete:

- Remove `public/components/history/by-id/{patternId}/{versionId}.tsx`.
- Update `public/components/history/by-id/{patternId}/versions.json`.
- Rewrite `public/components/code/{patternId}.tsx` if active changes.

Blobs delete:

- Delete `code/{patternId}/{versionId}.tsx`.
- Update `meta/{patternId}.json`.

## Version Numbering Requirements

Local and Blobs version counters are separate and must remain monotonic. Hard delete must not make a version number reusable.

Add a per-store index field:

```ts
nextVersionNumber: number
```

Version allocation:

```ts
const n = index.nextVersionNumber ?? inferMaxVersion(index.versions) + 1;
const versionId = `v${n}`;
index.nextVersionNumber = n + 1;
```

Backward compatibility:

- If `nextVersionNumber` is missing, infer `max(vN) + 1`.
- Persist `nextVersionNumber` on the next index write.
- Delete never decrements `nextVersionNumber`.
- Publishing local `v5` to Blobs creates the next Blobs `vN`, not necessarily `v5`.

## Debug Table Performance and 404 Requirements

Reduce console noise and mutation latency:

- Add `prefetch={false}` to debug-table pattern links to avoid missing `__next._tree.txt` prefetches.
- Prefer current search-index metadata for `patternUrl`, title, and cover in debug rows, so stale Blobs slugs do not create `/patterns/...` 404s.
- After delete/hide, optimistically remove the row and clear busy state as soon as the mutation succeeds.
- Run full list refresh in the background, not as a blocking step.
- Avoid `op=list` after single-version operations where possible; use the mutation response or `op=versions&id=...`.
- Consider improving `op=list` later with cached/parallel index reads if the global generations list remains slow.

## Implementation Notes

Add shared admin helpers for server and Function code:

- Parse `DEBUG_ADMIN_EMAILS`.
- Normalize email casing.
- Check a validated Supabase user against the allowlist.
- Return `401 auth_required` when no valid session exists.
- Return `403 admin_required` when the user is valid but not allowlisted.

Keep `/debug` static:

- Do not change `netlify.toml` away from `npm ci && npm run build` / `publish = "out"`.
- Do not disable production `output: "export"` in `next.config.ts`.
- Keep `X-Robots-Tag` and `Cache-Control: no-store` headers for `/debug`.
- Client gate + Function/`whoami` probe; Bearer tokens from localStorage for Function and local debug API calls.

Add hide/delete/promote helpers:

- Local: `deleteVersion()` and `promoteVersionToSeed()` next to `softDeleteVersion()` in `src/lib/component-generation/versions.ts`.
- Blobs: `deleteCode()` next to `readCode()` / `writeCode()` in `netlify/functions/lib/components-store.mts`.
- API: keep `op=hide`; add `op=delete` and `op=promote-seed` in `netlify/functions/components-api.mts`.
- Client: `hideComponentVersion()`, `deleteComponentVersion()`, `promoteComponentSeed()` in `src/lib/components-api-client.ts`.
- UI: row menu **Promote to seed** (vN), **Hide generation**, **Delete** (including seed when a sibling exists).

## Acceptance Criteria

- Production unauthenticated visitors hitting `/debug` see the sign-in gate (static HTML may still download; APIs reject them).
- Production signed-in non-admin users see admin-required and cannot use debug tools or mutations.
- Production `pablo.armentano@gmail.com` can view `/debug` and use debug component actions.
- Localhost unauthenticated access is blocked.
- `localhost (auth skipped)` is gone.
- Localhost signed-in admin users can use `/debug` and publish/regenerate/rebuild.
- Debug/ops mutations reject non-admin JWTs with `403 admin_required`.
- `op=generate` uses `component_generator`, initially admin-only but separable for future paid/selected users.
- Pattern preview/export still load public active code as before.
- Existing noindex/no-store headers remain.
- Hide/delete of the last visible version (including a lone seed) is rejected with `last_version`.
- Hide/delete of seed is allowed when another visible version exists.
- Promote-to-seed overwrites `seed.tsx` from `vN` and sets active to `seed`.
- Deleting inactive `vN` removes it from table and storage without changing active.
- Deleting/hiding active `vN` or seed moves active to the newest remaining visible version.
- Deleting `v5` does not let the next generation reuse `v5`; next version remains monotonic.
- Debug table no longer floods DevTools with pattern-link prefetch 404s.
- Delete completion feels immediate after mutation success.

## Key Files

- `src/app/debug/layout.tsx`
- `src/components/debug/DebugAuthGate.tsx`
- `src/lib/debug-supabase-auth.ts`
- `src/lib/debug-admin.mjs`
- `src/lib/auth-client.tsx`
- `src/components/debug/ComponentsGenerationsTable.tsx`
- `src/lib/component-generation/versions.ts`
- `src/lib/components-api-client.ts`
- `netlify/functions/lib/components-auth.mts`
- `netlify/functions/lib/components-store.mts`
- `netlify/functions/components-api.mts`

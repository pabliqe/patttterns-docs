---
title: Login Flow
parent: Setup & Configuration
nav_order: 8
---

# Login Flow (Supabase OAuth + Local Session)

This document is a future-facing operational reference for how login currently works in PATTTTERNS.

## Scope

- Authentication model: client-side Supabase OAuth (Google)
- Session storage: browser localStorage
- Callback path: `/auth/callback`
- No server session runtime (static-export friendly)

## Entry Points

1. User clicks sign in from UI.
2. App builds OAuth URL with Supabase provider config.
3. User completes provider consent.
4. Supabase redirects browser to `/auth/callback` with tokens in URL hash.
5. Callback page persists session and redirects to the original requested path.

## Implementation Map

- OAuth URL builder and token/session utilities:
  - `src/lib/auth-client.tsx`
- Callback completion page:
  - `src/app/auth/callback/page.tsx`
- Auth context consumer/provider:
  - `src/components/AuthSessionProvider.tsx`
  - `src/lib/auth-client.tsx`

## Detailed Sequence

### 1) Sign-in trigger

- `buildSupabaseOAuthUrl(provider, callbackUrl)` builds a provider authorize URL.
- Redirect target is encoded in `next` query param on `/auth/callback`.

### 2) Provider callback

- Browser lands on `/auth/callback` with:
  - `access_token`
  - `refresh_token`
  - `expires_in`
  in URL hash.

### 3) Session finalization

- `completeSupabaseOAuthFromUrl(currentUrl)` does:
  1. parse hash tokens
  2. fetch user profile from Supabase `/auth/v1/user`
  3. write local session (`patttterns-auth-session`) to localStorage
  4. return success + next path

### 4) Redirect after login

- Callback page redirects to `next` path on success.
- Redirects to `/` on failure.

### 5) Session restore on app load

- `restoreSupabaseSession()` reads local session.
- If token still valid, refreshes user profile.
- If expired, attempts refresh token flow.
- If refresh fails, clears local session.

## Storage Contract

Local key:

- `patttterns-auth-session`

Stored shape:

- `accessToken`
- `refreshToken`
- `expiresAt`
- `user` (normalized user object)

## Sign-out

- `signOutFromSupabase(accessToken)` calls Supabase logout endpoint.
- localStorage session is cleared.

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional feature flags:

- `NEXT_PUBLIC_STATIC_LOGIN_MODE`
- `NEXT_PUBLIC_BOOKMARK_SYNC_BACKEND`

## Failure Modes

1. Missing env vars
- Symptom: sign-in button appears but OAuth URL is null.
- Fix: set Supabase URL + anon key.

2. Callback missing tokens
- Symptom: callback page shows failure and sends user home.
- Fix: verify provider and Supabase redirect URL configuration.

3. Session silently lost
- Symptom: user appears logged out after reload.
- Fix: inspect refresh flow and ensure refresh token exchange succeeds.

4. Wrong return path after login
- Symptom: users always return to home.
- Fix: verify `next` query param propagation in sign-in trigger.

## Operational Notes

- This flow is intentionally browser-centric to stay compatible with static deployment.
- Keep auth logic centralized in `src/lib/auth-client.tsx`; avoid duplicate token parsing in components.
- For future migration to server sessions, preserve callback compatibility to avoid breaking existing links.

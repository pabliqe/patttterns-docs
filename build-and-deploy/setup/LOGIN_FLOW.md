---
title: Login Flow
parent: Setup & Configuration
nav_order: 8
---

# Login Flow (Supabase OAuth + Local Session)

This document is a future-facing operational reference for how login currently works in PATTTTERNS.

## Scope

- Authentication model: client-side Supabase OAuth (Google, GitHub)
- Session storage: browser localStorage
- Callback path: `/auth/callback`
- No server session runtime (static-export friendly)

## Entry Points

Every entry point outside the modal is provider-neutral ("Create account") and only opens the modal. Provider selection happens in exactly one place — `LoginModal` — so no surface has to be updated when a provider is added or removed.

Entry points and the `source` they report to analytics:

| Entry point | `source` |
|---|---|
| Navbar button, desktop overflow menu, mobile menu | `navbar` |
| Pattern footer CTA | `pattern_footer` |
| My Library header | `library` |
| `/debug` gate | `debug_gate` |
| `/debug/components` regenerate gate | `debug_components` |
| Bookmark / chat / export / image gates | `login_modal` (trigger carries the detail) |

1. User clicks a sign-in entry point → `openModal("manual", { source })`.
2. User picks Google or GitHub in the modal; the app builds the OAuth URL for that provider.
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
- Provider selection UI and modal store:
  - `src/components/LoginModal.tsx`
  - `src/lib/auth-modal.ts`
- Buttons:
  - `src/components/SignInCtaButton.tsx` (neutral, entry points)
  - `src/components/GoogleSignInButton.tsx`, `src/components/GitHubSignInButton.tsx` (modal only)

## Detailed Sequence

### 1) Sign-in trigger

- Entry points call `openModal("manual", { source })`; only the modal calls `signIn(provider)`.
- `buildSupabaseOAuthUrl(provider, callbackUrl)` builds a provider authorize URL.
- `provider` is `"google" | "github"` (the `AuthProvider` type). The argument is required — there is no implicit Google fallback in the URL builder, so a new provider cannot be added without handling its parameters.
- Provider-specific `scopes` (and Google's `prompt=select_account`) come from `OAUTH_PROVIDER_PARAMS`.
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
- `user` (normalized user object, including `provider` read from Supabase `app_metadata.provider`)

`user.provider` is what `sign_in_completed` analytics reports, since the completing page has no memory of which button started the flow.

## Sign-out

- `signOutFromSupabase(accessToken)` calls Supabase logout endpoint.
- localStorage session is cleared.

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional feature flags:

- `NEXT_PUBLIC_STATIC_LOGIN_MODE`
- `NEXT_PUBLIC_BOOKMARK_SYNC_BACKEND`

## Product login gates

Soft conversion (see [Soft Login Preview and Guest Chat](../../product-roadmaps/specs/soft-login-preview-guest-chat)):

- Guests may open Component Preview and the chat widget.
- Login modal on copy/download (`component_export`) and on a second chat turn (`chatbot`).
- Gemini guest quota is enforced in `chatbot-proxy`, not in the browser.

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

5. GitHub user shows a blank display name
- Symptom: header shows no name after a GitHub sign-in.
- Cause: account has no public full name and a private email.
- Fix: confirm the `user:email` scope is requested and the GitHub provider in Supabase has it enabled; `normalizeUser` falls back to `user_name`/`preferred_username`.

6. Same-email user loses their library after switching provider
- Symptom: bookmarks and libraries vanish for a user who signed in with the other provider.
- Cause: Supabase issued a separate `auth.uid()` instead of linking identities, and RLS scopes all rows by `auth.uid()`.
- Fix: check the identity-linking setting in the Supabase dashboard; see [Auth Setup](AUTH_SETUP).

## Operational Notes

- This flow is intentionally browser-centric to stay compatible with static deployment.
- Keep auth logic centralized in `src/lib/auth-client.tsx`; avoid duplicate token parsing in components.
- For future migration to server sessions, preserve callback compatibility to avoid breaking existing links.
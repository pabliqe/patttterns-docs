---
title: GitHub OAuth — Provider Selection
parent: Specs
---

# GitHub OAuth — Provider Selection

Adopt GitHub as a second sign-in provider on the current stack: client-side Supabase OAuth, implicit flow, localStorage session, static export. This spec supersedes Stage 3 of [Identity & Persistence Infrastructure](../archive/ROADMAP_SOCIAL_LOGINS), whose three-bullet plan understated the work.

## Status

Application code is complete (items 1–3 and 6 below). Shipping is blocked on two operator actions that live in the Supabase dashboard and cannot be done from the repo:

1. Create the GitHub OAuth App and enable the provider — see [Auth Setup](../../build-and-deploy/setup/AUTH_SETUP) step 3.
2. Decide and verify account-linking behavior for same-email users — step 5 of the same doc.

Until the provider is enabled, the "Continue with GitHub" button renders and redirects, but Supabase returns a provider-not-enabled error.

## Current state

The flow is already provider-parametric end to end. `buildSupabaseOAuthUrl(provider, callbackUrl)` accepts a provider argument, the callback page parses tokens from the URL hash without inspecting the issuer, and session restore, refresh, and sign-out are all provider-agnostic. RLS policies key off `auth.uid()`, so a GitHub identity gets identical database behavior with no policy changes.

What is *not* ready is everything around that core: the provider string is hardcoded to `"google"` at every call site, the authorize URL sets Google-only query parameters, and analytics attribution is a fixed literal rather than the actual provider.

## Corrections to the archived plan

| Archived bullet | Correction |
|---|---|
| "enable GitHub provider in Supabase" | Accurate, but also requires creating a GitHub OAuth App first. No `[auth]` section exists in `supabase/config.toml`, so this is dashboard-only state that is not tracked in the repo. |
| "support provider selection in auth client and modal" | Understated. Nine call sites hardcode `"google"`, across the modal, header (two), auth button, pattern footer CTA, library page, and two debug components. |
| — (missing) | `scopes` and `prompt` in the authorize URL are Google-specific and will misbehave on GitHub. |
| — (missing) | `trackSignInStarted` / `trackSignInCompleted` hardcode `"google"`, so GitHub sign-ins would be misattributed in analytics. |
| "verify account linking by email" | Accurate and the highest-risk item. Also needs a decision for the case where GitHub returns no public email. |
| — (missing) | User-facing copy names Google as the only provider in the callback page, ToS, and Privacy. |

## Work breakdown

### 1. Provider-aware authorize URL

`src/lib/auth-client.tsx:190-207` hardcodes `scopes=email profile` and `prompt=select_account`. GitHub does not understand either: its scope syntax is `read:user user:email`, and `prompt` is a Google parameter. Make both conditional on the provider, keeping the existing Google behavior byte-for-byte so the working flow does not regress.

Also worth removing the `provider = "google"` default so the argument becomes explicit at the type level, which surfaces any missed call site as a compile error rather than a silent Google fallback.

### 2. Provider selection through the UI

`AuthSessionProvider.signIn` already forwards a provider argument (`src/components/AuthSessionProvider.tsx:114`, which also defaults to Google). The nine literals to thread:

- `src/components/LoginModal.tsx:124,126` — `handleContinueWithGoogle` needs to become provider-parameterized; this is the only site that also carries pending-bookmark and deferred-image intent, so it is the one with real logic to preserve
- `src/components/Header.tsx:612-613,923-924`
- `src/components/AuthButton.tsx:64-65`
- `src/components/PatternFooterSignInCta.tsx:31-32`
- `src/app/library/page.tsx:634`
- `src/components/debug/DebugAuthGate.tsx:164`
- `src/components/debug/ComponentsGenerationsTable.tsx:942`

**Provider selection belongs only to the modal.** Every other entry point is provider-neutral: it renders `SignInCtaButton` labelled "Create account" and calls `openModal("manual", { source })`. This avoids both a provider picker duplicated across seven surfaces and the worse outcome of surfaces that silently favour one provider — the mobile menu previously offered "Sign in with Google" as the *only* way in, which would have made GitHub unreachable on mobile.

Because the modal is now the single place that starts a sign-in, `openModal` carries a `source` so `sign_in_started` still reports the originating surface (`navbar`, `pattern_footer`, `library`, `debug_gate`, `debug_components`) instead of collapsing everything to `login_modal`.

### 3. Analytics attribution

`analytics.trackSignInStarted(provider, source)` already takes a provider, but every caller passes the literal. With provider choice centralised in the modal, the provider comes from the clicked button and the source comes from the modal store. `trackSignInCompleted` at `src/lib/useUserSync.ts:237` is worse: at completion time the component no longer knows which provider was used, since the session is restored from the URL hash. Resolve the provider from the Supabase user payload (`app_metadata.provider`) and thread it into the normalized user, or stash the initiating provider before the redirect.

### 4. Supabase dashboard configuration

Create a GitHub OAuth App with callback `https://<project-ref>.supabase.co/auth/v1/callback`, then enable the provider under Authentication → Providers → GitHub with the client ID and secret. Existing redirect URLs (`http://localhost:3000/auth/callback`, `https://patttterns.com/auth/callback`) already cover the app side and need no change.

### 5. Account linking

The unresolved question: a user who already signed in with Google, then signs in with GitHub using the same email address. Supabase's behavior depends on the project's identity-linking setting, and getting it wrong either creates a duplicate `auth.uid()` — which orphans that user's bookmarks and libraries under RLS — or links accounts in a way that has security implications if the GitHub email is unverified. Decide and test this explicitly before shipping.

Secondary case: GitHub users with a private email produce a null `email`. `normalizeUser` (`src/lib/auth-client.tsx:89-98`) falls back to `null` for name, and the `notify-signup` edge function already skips gracefully (`supabase/functions/notify-signup/index.ts:92-95`), so nothing breaks — but the header would render an empty display name. Requesting the `user:email` scope mitigates most of this.

### 6. Copy

- `src/app/auth/callback/page.tsx:39` — "finalize your Google sign-in"
- `src/app/tos/page.tsx:39-40,118` and `src/app/privacy/page.tsx:173` — provider named as Google only
- `docs/build-and-deploy/setup/AUTH_SETUP.md` and `docs/build-and-deploy/setup/LOGIN_FLOW.md` — both describe Google as the sole provider

## Acceptance criteria

- No surface outside the modal names a provider; every entry point opens the modal, so both providers are reachable from every surface including mobile.
- Signing in with GitHub from the login modal lands back on the originating path with a valid session, including the pending-bookmark save intent.
- Signing in with Google is unchanged: same scopes, same `prompt=select_account` account chooser.
- `sign_in_started` and `sign_in_completed` carry the correct provider label.
- A GitHub user's bookmarks and libraries persist across reload and sign-out/sign-in, confirming RLS resolves the right `auth.uid()`.
- Same-email Google and GitHub sign-ins resolve to the documented, intended outcome — either linked or deliberately separate.

## Risks

The linking behavior is the one that can corrupt user data rather than merely look wrong, so test it on a throwaway account before enabling the provider in production. Everything else is additive and reversible by disabling the provider in the dashboard.

## Out of scope

Migrating to `@supabase/ssr`, PKCE with `exchangeCodeForSession`, cookie-based sessions, or middleware session refresh. The implicit flow stays as-is; see [Static Login](../roadmaps/ROADMAP_STATIC_LOGIN) for that track.

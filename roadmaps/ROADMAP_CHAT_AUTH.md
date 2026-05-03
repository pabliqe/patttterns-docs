---
title: 🟠 Chat Auth Gate + Paywall Readiness
parent: Roadmaps
nav_order: 8
---

# ROADMAP — Chatbot Auth Gating and Subscription Readiness

Status: 🟠 Planned  
Updated: May 2026

## Goals

1. Work without OAuth in local and private embed environments.
2. Enforce secure auth only where needed (main product site).
3. Be ready for a later PRO paywall without re-architecting the chatbot.
4. Support script-tag embedding on CORS-allowed sites (for example docs domains).
5. Ship with explicit test coverage for auth, origin policy, and fallback behavior.

---

## Context and Constraints

- The chatbot client runs as public browser JavaScript and cannot be trusted for security decisions.
- Secure gating must be enforced in the server entrypoint: Netlify function `chatbot-proxy`.
- Embed hosts (docs) may not have Supabase OAuth, so forcing account login there would break UX.
- Main app host should be the only host that requires authenticated access to Gemini.

---

## Target Policy (Origin-Based)

| Origin / Host class | MCP search cards | Gemini answer | Auth required |
|---|---|---|---|
| Main app (`patttterns.com`) | Allowed | Allowed | Yes |
| Docs/embed hosts (`docs.patttterns.com`, optional `docs.patttterns.net`) | Allowed | Allowed (free mode) | No |
| Localhost/private preview (`localhost`, `127.0.0.1`) | Allowed | Allowed | No by default (dev mode) |
| Unknown/no origin | Deny by default | Deny | N/A |

Notes:
- This keeps docs embedding useful while protecting paid AI usage on the main app.
- Later, docs hosts can be moved to auth-required by config only.

---

## Security Model

### Server-side enforcement (required)

In `netlify/functions/chatbot-proxy.mts`:

1. Parse and classify `Origin`.
2. Decide route policy from env-configured origin classes.
3. If policy requires auth:
   - Read bearer token from `Authorization`.
   - Validate Supabase JWT server-side.
   - Reject with `401` if missing/invalid/expired.
4. Only after auth pass, execute Gemini flow.

### Client-side UX gate (optional but recommended)

In `public/chatbot.js`:

- On main app host, check local auth session before fetch.
- If unauthenticated, preserve user query and show login CTA.
- Resume automatically after login callback.

Important:
- Client checks improve UX only.
- Proxy validation remains the security control.

---

## Implementation Phases and Estimates

## Phase 0 — Policy and Config Contract

Scope:
- Add explicit env variables for origin policy and auth mode.

Deliverables:
- `CHAT_AUTH_REQUIRED_ORIGINS` (CSV or regex map)
- `CHAT_AUTH_OPTIONAL_ORIGINS`
- `CHAT_AUTH_DEV_BYPASS` (`true` for localhost/private by default)
- `CHAT_PRO_REQUIRED` (future switch, default `false`)

Estimate:
- 0.5 day

Exit criteria:
- Proxy logs show deterministic origin classification for each request.

## Phase 1 — Secure Proxy Auth Gate

Scope:
- Implement mandatory server auth validation for protected origins.

Deliverables:
- Token extraction from `Authorization: Bearer <jwt>`
- Supabase token verification server-side
- Structured 401/403 responses with stable error codes:
  - `auth_required`
  - `auth_invalid`
  - `pro_required` (reserved for Phase 3)

Estimate:
- 1 to 1.5 days

Exit criteria:
- Unauthenticated calls to protected origin are blocked before Gemini execution.

## Phase 2 — Chat UX: Login Prompt + Resume Pending Query

Scope:
- Preserve user intent when auth is missing on protected hosts.

Deliverables:
- Store pending query in `sessionStorage`
- Trigger login flow on protected hosts only
- On callback, auto-open chatbot and replay pending query
- Handle expired session by retrying once after refresh/login

Estimate:
- 1 day

Exit criteria:
- User submits once, logs in, and receives response without retyping.

## Phase 3 — PRO Subscription Readiness (No Billing Yet)

Scope:
- Add entitlement checks and response paths without enabling paid plans yet.

Deliverables:
- `isPro` claim source decision:
  - Supabase JWT claim, or
  - profile lookup by user id
- Authorization branch in proxy:
  - free users: optional limited mode
  - pro users: full Gemini access
- Stable error contract for client rendering (`pro_required`)

Estimate:
- 1 to 2 days

Exit criteria:
- Feature can be switched from auth-only to auth+pro via env/config, no client rewrite.

## Phase 4 — Embed and CORS Hardening

Scope:
- Make embedding predictable across docs and future partner hosts.

Deliverables:
- Maintain strict CORS allowlist
- Keep auth policy separate from CORS policy
- Add host-specific rate limits (at least app host vs docs host)
- Audit no-origin behavior (default deny)

Estimate:
- 0.5 to 1 day

Exit criteria:
- Docs embed works anonymously; app host remains protected.

## Phase 5 — Observability and Abuse Controls

Scope:
- Add monitoring needed before paywall rollout.

Deliverables:
- Logs: origin class, auth result, user id hash, model calls, status code
- Metrics dashboard for 401/403 rates and token failures
- Basic rate limiting and burst protection

Estimate:
- 1 day

Exit criteria:
- Team can detect auth bypass attempts and abnormal Gemini usage quickly.

---

## Testing Plan

## A. Unit Tests (Proxy policy and auth)

1. Origin classification
- app origin classified as `auth_required`
- docs origin classified as `auth_optional`
- localhost classified as `dev_optional`
- unknown/no origin classified as `deny`

2. Auth guard behavior
- missing bearer token on required origin returns `401 auth_required`
- invalid token returns `401 auth_invalid`
- valid token reaches Gemini path

3. Future PRO branch
- valid token + non-pro claim returns `403 pro_required` when `CHAT_PRO_REQUIRED=true`
- valid token + pro claim returns `200`

## B. Integration Tests (Client + proxy)

1. Main app protected flow
- signed out user submits query
- login prompt displayed
- pending query stored
- after login callback, query auto-replayed

2. Main app signed-in flow
- bearer token attached
- Gemini call succeeds
- retry behavior works on token-expired path

3. Docs/embed flow
- no Supabase session present
- query submits without login prompt
- Gemini call succeeds within docs policy

4. Localhost/private flow
- with dev bypass enabled, chat works without OAuth
- with dev bypass disabled, same behavior as protected host

## C. E2E and Security Tests

1. Direct request abuse test
- send POST to proxy without token for app origin -> blocked

2. CORS contract test
- disallowed origin blocked by CORS policy

3. Regression tests
- resume conversation still works
- new chat and resume buttons still work
- dark mode sync unaffected

## D. Manual QA Checklist

- Protected host: login required before first Gemini call
- Docs host: no forced login
- Pending query replay works after auth
- Error messages are user-readable and non-technical
- No API key or sensitive auth details exposed in client logs

---

## Rollout Strategy

1. Deploy Phase 1 behind feature flag.
2. Enable for internal users on app host only.
3. Enable Phase 2 resume UX.
4. Validate metrics for 48 to 72 hours.
5. Roll out to all app users.
6. Enable Phase 3 entitlement check when subscriptions are ready.

Rollback:
- Disable auth enforcement via env flag while keeping CORS unchanged.
- Keep docs/embed behavior unchanged during rollback.

---

## Risks and Mitigations

- Risk: origin-policy confusion between CORS and auth.
  - Mitigation: separate config keys and explicit logs for both decisions.

- Risk: token validation latency increases response time.
  - Mitigation: local JWT verification preferred over per-request remote lookup.

- Risk: broken UX if callback replay fails.
  - Mitigation: fallback to restoring pending query into input field with one-click resend.

- Risk: docs domain changes (`.com` vs `.net`) cause outages.
  - Mitigation: centralize allowed embed origins in env config, not hardcoded regex only.

---

## Rough Timeline (Sequential)

- Phase 0: 0.5 day
- Phase 1: 1 to 1.5 days
- Phase 2: 1 day
- Phase 3: 1 to 2 days
- Phase 4: 0.5 to 1 day
- Phase 5: 1 day

Total:
- Auth gate MVP (Phases 0 to 2): about 2.5 to 3 days
- Paywall-ready architecture (Phases 0 to 5): about 5 to 7 days

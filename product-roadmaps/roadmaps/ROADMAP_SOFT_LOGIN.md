# PRD: Dynamic Soft Login for PATTTTERNS (Stack-Aligned)

## 1. Executive Summary

Goal: increase authenticated conversion without hurting browsing flow by introducing a dismissible soft login prompt on anonymous high-intent behavior, while preserving the existing hard login gate for bookmark saves.

Business targets:
- Primary: move Social Login Rate from <2% toward 15%.
- Secondary: improve Week 1 retention toward 5% by increasing saved-library ownership.

## 2. Current Stack Reality (What This PRD Must Align With)

This repo currently uses:
- Next.js App Router (Next 16) + React 19 client components.
- Custom Supabase auth client (not NextAuth runtime flow for modal gate).
- Global login modal store via Zustand (`useAuthModal`) and modal component `LoginModal`.
- Existing hard anonymous save gate in bookmark flow using `FREE_BOOKMARK_LIMIT = 7`.
- Existing deferred save recovery via `localStorage` keys consumed by `useUserSync` after OAuth callback.
- Existing analytics naming with `image_clicked` and `save_pattern*` events.

Implication: implement by extending existing auth-gate primitives, not by creating a parallel auth system.

## 3. Scope and Non-Goals

In scope:
- Dismissible soft login trigger for anonymous image interactions.
- Reuse and extend current modal + auth redirect + deferred intent behavior.
- Keep hard gate behavior for bookmarks and make threshold configurable.

Out of scope:
- Replacing auth provider or auth architecture.
- Full growth experimentation platform.
- Redesigning the entire modal visual language.

## 4. Prioritized Phases by Criticality

### Phase P0 - Safety, Contracts, and Observability (Critical)

Objective: prevent regressions before feature rollout.

Deliverables:
- Define canonical event taxonomy and thresholds used by code and analytics:
	- soft trigger event source: `image_clicked`.
	- hard trigger event source: bookmark save attempts (`save_pattern*`).
- Introduce env-driven config with safe defaults:
	- `NEXT_PUBLIC_SOFT_LOGIN_THRESHOLD` default `3`.
	- `NEXT_PUBLIC_HARD_LOGIN_THRESHOLD` default `7` (aligned with current `FREE_BOOKMARK_LIMIT`).
- Define a single storage namespace for soft-gate counters and pending actions.
- Add tracking specs for:
	- soft modal shown / dismissed / continued.
	- deferred action replay success/failure.

Exit criteria:
- Config contract documented and validated at runtime with fallback defaults.
- No mismatch between product copy, event names, and code-level constants.

### Phase P1 - Core Interceptor Logic (Critical)

Objective: introduce soft interruption logic without breaking hard gate.

Deliverables:
- Create a reusable client hook/service (for example `useAuthInterceptor`) that:
	- increments anonymous image interaction count in `localStorage`.
	- evaluates soft threshold using env config.
	- returns decision: proceed directly vs open soft modal.
- Keep hard gate behavior for save action:
	- non-dismissible gate at/over hard threshold.
	- preserve current pending bookmark/save-all behavior.
- Ensure deep-link context is preserved for image intent (hash/query/path).

Exit criteria:
- Anonymous users see soft modal only at configured cadence.
- Save hard gate remains authoritative and unchanged in behavior (except config source alignment).

### Phase P2 - Modal Behavior Adaptation (High)

Objective: support two modes in one modal primitive.

Deliverables:
- Extend `LoginModal` to support explicit mode:
	- soft mode: dismissible (X button, backdrop click, Escape).
	- hard mode: non-dismissible (no close affordance, no backdrop dismiss, Escape disabled).
- Minimal utility-first copy for soft mode:
	- Headline: "Save your patterns cross-device."
	- Subheadline: "Create a free account to sync your library and access technical specs."
- Preserve existing OAuth callback behavior and redirect continuity.

Exit criteria:
- Mode-specific accessibility and interaction behavior verified.
- No regression in existing manual/login-limit triggers.

### Phase P3 - Deferred Action Replay and UX Integrity (High)

Objective: guarantee interrupted intent resumes after authentication.

Deliverables:
- Generalize deferred action payload schema:
	- action type (`open_image`, `save_pattern`, `save_all`).
	- context payload (pattern id, slug, URL/hash).
	- timestamp/version for safe parsing.
- On successful auth state transition, replay exactly once and clear payload.
- Add guardrails for stale/invalid payloads.

Exit criteria:
- Interrupted image open and save flows reliably resume post-login.
- Replay is idempotent (no duplicate saves, no repeated zoom action).

### Phase P4 - Progressive Rollout and Tuning (Medium)

Objective: reduce risk while tuning conversion.

Deliverables:
- Roll out behind env/config flag.
- Weekly threshold tuning based on funnel metrics:
	- image interactions -> modal shown -> sign-in started -> sign-in completed -> deferred action completed.
- Document rollback procedure (disable soft gate quickly via env).

Exit criteria:
- Stable conversion uplift with no significant drop in engagement metrics.

## 5. Desired Tests Before Implementation (Required Gate)

Because this repository currently has no automated test suite, define and agree on this test plan before coding:

### A. Test Harness Decision (pre-work)

- Unit/component: Vitest + Testing Library.
- E2E: Playwright.
- Minimal CI command contract:
	- `npm run test:unit`
	- `npm run test:e2e` (or smoke subset in CI)

### B. Unit Tests to Author First

1. Interceptor threshold logic
- Anonymous counter increments correctly.
- Soft modal triggers at configured interval.
- Authenticated users bypass soft logic.

2. Config fallback logic
- Missing/invalid env values fall back to defaults.
- Hard threshold cannot resolve below 1.

3. Deferred action serializer
- Valid payload round-trip passes.
- Invalid payload is safely discarded.

### C. Component Tests to Author First

1. `LoginModal` soft mode
- Shows close button.
- Backdrop click dismisses.
- Escape dismisses.

2. `LoginModal` hard mode
- No dismiss controls.
- Backdrop click ignored.
- Escape ignored.

3. Copy regression
- Soft-mode headline/subheadline match approved copy.

### D. E2E Scenarios to Author First

1. Anonymous image flow
- After N image clicks, soft modal appears.
- Dismissing modal preserves ability to continue browsing.

2. Soft login with deferred image action
- Trigger soft modal, sign in, original image intent replays.

3. Hard gate save flow
- Anonymous user at hard limit attempts save -> hard modal appears.
- After login, pending save is applied once and UI refreshes.

4. Cross-session persistence
- Soft counters survive page reload and new tab (same browser profile).

### E. Manual QA Checklist (must pass before launch)

- Mobile Safari OAuth round-trip preserves deferred intent.
- Desktop Chrome/Firefox/Safari parity.
- No console errors on malformed localStorage payloads.
- Analytics events emitted with expected names and metadata.

## 6. Implementation Notes for This Codebase

- Keep naming consistent with current code:
	- `LoginModal` (not `ModalLogin`).
	- `image_clicked` analytics event naming.
- Reuse existing auth modal store and user sync hooks where possible.
- Prefer one shared gate/interceptor utility used by image and save entry points.
- Keep `FREE_BOOKMARK_LIMIT` behavior aligned with `NEXT_PUBLIC_HARD_LOGIN_THRESHOLD` to avoid split logic.

## 7. Success Metrics and Monitoring

Primary:
- Social Login Rate.

Secondary:
- Week 1 retention.
- Save completion rate after modal exposure.
- Deferred action replay success rate.

Guardrails:
- Bounce rate on pattern pages.
- Time on page and image interaction depth.

## 8. Updated Build Prompt (Copilot/Gemini)

"Implement a stack-aligned dynamic soft login for this Next.js + TypeScript + Supabase codebase by extending existing `LoginModal`, `useAuthModal`, and deferred localStorage replay flows. Add env-configurable soft/hard thresholds, preserve existing hard bookmark gate semantics, and ensure interrupted image/save intents replay after successful auth. Start by adding automated tests for threshold logic, modal mode behavior, and deferred action replay before shipping implementation code." 
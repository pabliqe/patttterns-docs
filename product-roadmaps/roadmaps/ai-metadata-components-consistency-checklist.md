---
title: AI Metadata + Components
parent: Roadmaps
---

# AI Metadata + Components Consistency Checklist

Status: In Progress
Owner: PATTTTERNS platform
Last updated: 2026-05-27

Related spec (generation quality / regenerate modes): [Component Generation Quality PRD](../specs/component-generation-quality-prd)

## Objective
Create a deterministic, low-cost, low-risk content generation pipeline where metadata description and components code remain consistent across local runs, CI refresh, and production serving.

Current status override (2026-05-27):
- Notion is the persistent source of truth for pattern descriptions.
- Search index is the runtime snapshot built from Notion and should persist description parity.
- Metadata cache is a supplemental/reconciliation layer for missing or incomplete profiles.
- Components generation must consume the same resolved description used by Notion/Search/Metadata.
- Effective source order: `Notion >> Search >> Metadata >> Components`.

Strategy update (2026-05-22):
- Generate metadata description and components code in two separate Gemini calls per pattern.
- Keep metadata and components artifact writes independently controllable via ENV/setup toggles.
- Notion description remains persistent; search-index mirrors it for runtime use.
- Metadata generation fills and improves missing/incomplete descriptions but must reconcile with Notion/Search.
- Components generation is code-only and must not overwrite metadata description.

One-shot migration goal:
- Keep Notion as canonical description source while hardening deterministic cache sync and validation.
- Keep votes on runtime DB only.

## Phase 1 - Source-Of-Truth Contract

- [ ] Define and document canonical source per field.
- [x] Define split AI response contracts (metadata description-only + components code-only).
- [ ] Define explicit reconciliation writeback policy (manual/validated) for Notion Description.
- [x] Keep optional Notion sync path with rate-limited safeguards.
- [x] Use taxonomy tags in Gemini generation context:
  - `UX Flows` guide generated description quality.
  - `UI Categories` guide generated component implementation.
- [x] Add `DESCRIPTION_SOURCE` runtime switch (`notion` | `metadata`).
- [ ] Default `DESCRIPTION_SOURCE=notion` once parity automation is stable.
- [ ] Specify cutover criteria to switch to `metadata`.
- [x] Define canonical vote source (`runtime-db`) and ban Notion as vote source at runtime.
- [x] Remove `VOTE_SOURCE` migration switch after cutover to runtime DB.
- [x] Define build toggles:
  - `PATTERN_BUILD_METADATA=1|0`
  - `PATTERN_BUILD_COMPONENTS=1|0`
  - `PATTERN_BUILD_UNIFIED_AI=0` (deprecated)

Commercial quality direction:
- [ ] Add public pattern sentence: `Published at v{appVersion}` sourced from cache metadata/components version.
- [ ] Define cache quality policy (`draft` -> `reviewed` -> `premium-ready`) as DB-like governance.

Acceptance criteria:
- One doc clearly states source ownership for title/tags/description/components/votes.
- No ambiguous fallback chains in app code.
- Validation workflow exists to compare Notion/Search/Metadata before any Notion writeback.

## Phase 2 - Deterministic Build Order

- [x] Enforce ordered pipeline in all environments:
  1. `build:search`
  2. `build:content`
  3. `build:metadata` (Gemini description stage)
  4. `build:components` (Gemini code stage)
  5. `validate:artifacts` (materialize metadata/components outputs according to toggles)
- [ ] Ensure CI uses the same order as local workflows. *(Partial today: GitHub refresh runs metadata but does not commit `public/components/`; full `build:artifacts` is local-only — see Content refresh doc in build-and-deploy/setup.)*
- [x] Prevent mixed snapshot publishes when a stage fails.
- [x] Ensure toggles do not break deterministic outputs for enabled artifacts.
- [x] Remove `description` extraction/writeback from components Gemini response.
- [x] Persist generation reports for cache builds (`public/components/_components-report.json`).

Acceptance criteria:
- CI and local output from same inputs produce same cache versions.
- No partial publish with stale dependent artifacts.

## Phase 3 - Incremental Regeneration

- [ ] Compute changed IDs in metadata stage.
- [ ] Pass changed IDs to metadata and components stages.
- [ ] Skip components by existing output file when not forcing regeneration.
- [ ] Keep force rebuild as manual-only path.
- [ ] Support selective artifact updates per stage (`metadata-only`, `components-only`, `both`).
- [x] Restore metadata-side description generation path (metadata is primary description owner).

Acceptance criteria:
- Typical refresh run processes only changed patterns.
- Token usage scales with delta, not corpus size.

## Phase 4 - Regeneration Policy Hardening

- [ ] Document simple cache rule in one line: "file exists => skip, --force => regenerate".
- [ ] Keep per-item write behavior so successful generations survive canceled runs.
- [ ] Add explicit counters for `skippedByExistingFile`, `generated`, and `failed` in reports.
- [ ] Add operator note for safe chunked runs (`--ids`, `--limit`, `--start-from`).
- [ ] Keep optional deep invalidation strategy as future work, not default behavior.

Acceptance criteria:
- Component regeneration is predictable without hidden cache logic.
- Operators can explain and validate cache behavior from logs alone.

## Phase 5 - Description Serving Safety

- [x] Add centralized description resolver used by all pattern surfaces.
- [x] Implement dual-read precedence:
  - `DESCRIPTION_SOURCE=notion`: search snapshot first, metadata fallback.
  - `DESCRIPTION_SOURCE=metadata`: metadata first, search snapshot fallback.
- [x] Add mismatch counter for search snapshot vs metadata description.

Acceptance criteria:
- No user-facing description regressions during migration.
- Mismatch metrics available for cutover decision.

## Phase 5B - Vote Serving Safety

- [x] Add centralized vote resolver used by ranking and UI vote counters.
- [x] Serve votes from Supabase runtime DB only (no Notion vote fallback).
- [x] Add `/debug/votes` ranking diagnostics page showing top up/down and net score.

Acceptance criteria:
- Ranking and counters are driven by one resolver path.
- Debug page clearly shows top upvoted and downvoted patterns.

## Phase 6 - CI Reliability + Cost Controls

- [ ] Update refresh workflow to include metadata+components Gemini stages + artifact materialization.
- [ ] Keep weekly schedule at one safe run with bounded concurrency (no overlap).
- [ ] Add concurrency guard to avoid overlapping expensive runs.
- [ ] Keep debug logging disabled in CI by default.
- [ ] Add stage timeout and retry policy with explicit fail reasons.
- [ ] Add CI matrix/inputs to validate toggle modes (`metadata-only`, `components-only`, `both`).
- [ ] Add weekly summary report artifact with soft-error counters (parse fails, fallback use, skipped, failed, recovered).

Acceptance criteria:
- Weekly/manual refresh completes with stable runtime.
- No silent hangs or unbounded retry loops.

## Phase 7 - Security And Leak Prevention

- [ ] Restrict Actions permissions to least privilege.
- [ ] Keep Gemini debug logs env-gated (`PATTERN_COMPONENTS_CACHE_GEMINI_DEBUG=0` in CI/prod).
- [ ] Never persist raw prompt/response payloads into public artifacts.
- [ ] Rotate keys and separate dev/staging/prod secrets.

Acceptance criteria:
- No sensitive payloads in public repo or published caches.
- Secret scope and rotation policy documented.

## Phase 8 - Monetization Readiness

- [ ] Assign quality state to description and components artifacts (`draft`, `reviewed`, `premium-ready`).
- [ ] Keep public cache as free tier payload.
- [ ] Plan private artifact delivery path for premium code access.
- [ ] Track analytics events for code view/copy/unlock/convert.

Acceptance criteria:
- Revenue-critical assets have quality and access controls.
- Upgrade funnel events are measurable.

## Rollback Plan

- [ ] Keep `DESCRIPTION_SOURCE=notion` available until metadata parity is stable.
- [x] Keep votes on runtime DB only (no Notion fallback).
- [ ] Keep components generation force path for emergency rebuilds.
- [ ] Maintain previous stable artifact snapshot for instant revert.

Rollback trigger examples:
- Description mismatch rate exceeds target threshold.
- Components generation failure rate exceeds target threshold.
- CI refresh duration/cost exceeds budget limits.

## Coordinated One-Shot Cutover (Description + Votes)

- [x] Freeze vote schema around cutover (`pattern_vote_choices`, `pattern_vote_totals`, `record_pattern_vote`).
- [x] Enable dual-read for description only during migration.
- [ ] Verify parity dashboards for 1-2 refresh cycles.
- [x] Switch runtime votes to Supabase DB and remove vote toggle.
- [x] Disable runtime vote reads from Notion snapshots.
- [ ] Keep Notion writeback as optional snapshots only.
- [x] Remove vote-side Notion fallback code after cutover.

Acceptance criteria:
- Description and votes no longer depend on Notion for runtime behavior.
- One release performs both cutovers with no mixed-source regressions.

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 5B
7. Coordinated One-Shot Cutover (Description + Votes)
8. Phase 6
9. Phase 7
10. Phase 8

## Done Definition

- [ ] Description source is unambiguous and switchable.
- [x] Vote source is runtime DB only (no runtime switch, no Notion fallback).
- [ ] Full refresh cycle is deterministic and incremental.
- [ ] Components and metadata stay version-aligned.
- [ ] Split AI request contracts are stable and versioned.
- [x] Metadata script performs primary description generation.
- [x] Metadata/components can be enabled/disabled independently via ENV/setup.
- [ ] Components cache behavior is simple and operator-friendly (`exists/force`).
- [ ] Security posture is documented and enforced.
- [ ] Monetization-critical assets are stable and traceable.

## Next Steps (Ordered)

1. Ship components simplification: existence-based skip + force-based regeneration.
2. Add weekly soft-error report with counters and top failing IDs.
3. Enforce one weekly safe CI run with concurrency lock and timeout budget.
4. Add `Published at v{appVersion}` on product surfaces from cache data.
5. Introduce quality-state workflow to polish description + code as commercial assets.

---
title: Export Preview Release PRD
parent: Product Roadmaps
nav_order: 10
---

# Export Preview Release PRD

## Objective

Ship a user-facing preview experience for code artifacts (modal and dedicated route) to improve trust and conversion to copy/download actions in the export module.

## Release Goal (Next Week)

- Increase conversion from export panel exposure to code export actions.
- Add preview entrypoint without breaking current export analytics.

## Scope

- Add preview CTA in export panel.
- Support modal preview and route preview for a single pattern artifact.
- Reuse visualizer rendering core safely in production.

## Non-Goals

- Rewriting the existing export module UX.
- Replacing current copy/download event names.
- Building a new analytics pipeline.

## Success Metrics

- Increased ratio of `code_exported` after preview exposure.
- Stable error rate for preview rendering.
- No drop in existing export conversion baseline.

## Phase Checklist

### Phase 1 - Shared Visualizer Refactor (foundation)

- [x] Add configurable visualizer controls so debug and production can use different UI surfaces.
- [x] Keep current debug behavior as default so existing flows do not regress.
- [x] Add a shared non-debug import surface for preview reuse (`full` and `iframe-only` modes).
- [x] Validate TypeScript/build health for touched files.

### Phase 2 - Export Module Preview Entry

- [x] Add Preview CTA to export panel (icon or text button).
- [x] Emit `preview_opened` analytics event with `pattern_id`, `pattern_title`, and `source_surface`.
- [x] Open preview in modal using shared iframe-only mode.
- [x] Ensure copy/download analytics remain owned by export panel actions.

### Phase 3 - Dedicated Route

- [ ] Implement route-level preview page (candidate: `/exports/[id]`).
- [ ] Reuse shared preview renderer on route.
- [ ] Add route-open analytics (`preview_opened_in_route`).
- [ ] Add clear back navigation to pattern detail.

### Phase 4 - QA and Launch

- [ ] Test auth and non-auth behavior matrix.
- [ ] Test artifact exists / missing / rendering-error states.
- [ ] Test desktop + mobile + keyboard controls.
- [ ] Verify analytics payloads in GA/DebugView before release.
- [ ] Roll out behind feature flag and monitor conversion trend.

## Implementation Notes (Phase 1)

Completed in this iteration:

- Extended `ArtifactComponentPreview` with visibility flags for toolbar/buttons.
- Added `ArtifactPreview` reusable entry component at `src/components/preview/ArtifactPreview.tsx` with:
  - `mode="full"` for debug-like behavior.
  - `mode="iframe-only"` for production preview surfaces without debug actions.

## Implementation Notes (Phase 2)

- Added a `Preview` CTA to `PatternCodePanel` and opened a modal preview surface.
- Modal preview uses shared `ArtifactPreview` in `iframe-only` mode.
- Modal keeps `Copy code` and `Download` visible and wired to the same handlers used by the export panel.
- Added `preview_opened` analytics event helper via `trackCodePreviewOpened(...)` with `source_surface` metadata.

## Risks and Mitigations

- Risk: duplicate copy actions can split analytics semantics.
- Mitigation: production preview should use iframe-only mode; keep copy/download only in export panel.

- Risk: iframe rendering failures reduce trust.
- Mitigation: maintain error hints and add preview failure analytics in Phase 2.

## Open Decisions

- Final route shape: `/exports/[id]` vs `/patterns/[id]/preview`.
- Modal routing strategy: URL-backed or local UI state.
- Whether maximize control appears in production modal.

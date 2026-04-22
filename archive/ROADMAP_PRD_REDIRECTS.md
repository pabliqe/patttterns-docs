---
title: ✅ Redirect & Routing Stabilization PRD
parent: Roadmaps
---

# Redirect & Routing Stabilization PRD

## Context

The production site must preserve SEO continuity across legacy URL shapes while reducing Netlify runtime usage and build-time risk.

Current known issues:
- Legacy URLs like `/ux-patterns/<pattern-slug>.html` can miss canonical redirect handling.
- Redirect generation can emit malformed lines due to mutation while iterating.
- Redirect volume is high and close to Netlify free-tier limits.
- Notion-rendered links can leak page IDs, forcing large compatibility redirect sets.

## Goals

- Ensure legacy URL requests consistently resolve to canonical URLs.
- Keep production on safe static-export path where possible.
- Reduce dependency on runtime/serverless fallbacks.
- Prevent malformed redirect artifacts from ever shipping.
- Incrementally reduce redirect volume by improving link canonicalization at source.

## Non-Goals

- Full architecture rewrite.
- Replacing Notion as content source.
- Removing all historical redirects in one release.

## Success Criteria

- No malformed lines in `public/_redirects`.
- Legacy `.html` and wrong-prefix pattern URLs resolve to canonical pattern URLs.
- Static export deployment serves canonical routes without runtime function dependency.
- Redirect generation is deterministic and fails fast on invalid output.

## Phased Roadmap

### Phase 1 — Redirect Pipeline Hardening (Start Now)

Scope:
- Fix redirect generator corruption bug.
- Add redirect artifact validation to fail on malformed lines.
- Keep output shape stable to minimize regression risk.

Deliverables:
- Safe, deterministic `scripts/build-redirects.mjs` generation flow.
- Validation guard in generator before writing final file.
- Basic rule-count warning retained for operational visibility.

Exit Criteria:
- `npm run build:redirects` produces valid `_redirects` with no malformed lines.
- No generator-side data-structure mutation artifacts.

### Phase 2 — Legacy URL Normalization

Scope:
- Normalize `.html` suffix in legacy URLs.
- Route numeric pattern slugs under wrong folders to `/patterns/<slug>` canonical.
- Preserve existing canonical behavior for `ux-patterns` and `ui-patterns` category entries.

Deliverables:
- Route-level fallback updates and/or generated redirects for legacy URL forms.
- Regression checks for representative problematic URLs.

Exit Criteria:
- Known failing legacy URLs now 301 to canonical routes.

### Phase 3 — Canonical Link Emission

Scope:
- Stop emitting raw Notion page IDs in rendered links where canonical slugs are known.
- Keep fallback redirects for external backlinks and stale indexes.

Deliverables:
- Canonical URL mapping in renderer pipeline.
- Reduction strategy for removable ID-based redirects.

Exit Criteria:
- New HTML output favors canonical slug links.
- Redirect list growth slows and starts shrinking over time.

### Phase 4 — Deploy Workflow Optimization

Scope:
- Separate heavy Notion indexing from routine deploy paths.
- Prefer prebuilt artifact deploys during constrained Netlify build windows.

Deliverables:
- Operational deploy playbook for low-risk releases.
- Optional script split for data-refresh vs deploy-build paths.

Exit Criteria:
- Predictable deployment without unnecessary build-minute burn.

## Risks & Mitigations

- Risk: Redirect regressions during cleanup.
  - Mitigation: Phase-based rollout and targeted legacy URL validation list.

- Risk: Redirect count exceeds platform limits.
  - Mitigation: Keep warning visibility, reduce ID link emissions in Phase 3.

- Risk: Build-time dependency on Notion API causes schedule misses.
  - Mitigation: Favor prebuilt artifacts and separate indexing cadence in Phase 4.

## Initial Validation Matrix

- Canonical pattern URL returns 200.
- Bare slug redirects to canonical path.
- Legacy `.html` variant redirects to canonical path.
- Wrong-prefix pattern URL under `ux-patterns` redirects to `/patterns/...`.
- Raw Notion ID path redirects to canonical slug path.

## Status

- Phase 1: Completed
- Phase 2: Implemented in generator, pending artifact regeneration verification
- Phase 3: Pending
- Phase 4: Pending

## Phase 1 Completion Notes

- Redirect generator mutation bug removed (`scripts/build-redirects.mjs`).
- Generator now validates produced redirect lines before writing output.
- Independent validator script added (`scripts/validate-redirects.mjs`).
- Build pipeline now enforces redirect validation in `prebuild`.

## Phase 2 Implementation Notes

- Added `.html` legacy normalization rules in `scripts/build-redirects.mjs`.
- Added wrong-prefix numeric pattern normalization:
  - `/ux-patterns/<numeric-slug>` -> `/patterns/<numeric-slug>`
  - `/ui-patterns/<numeric-slug>` -> `/patterns/<numeric-slug>`
  - `.html` variants of both paths are also normalized.

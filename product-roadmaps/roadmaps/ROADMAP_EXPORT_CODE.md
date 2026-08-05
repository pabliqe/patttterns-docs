---
title: Roadmap Export Code (Components Cache)
parent: Roadmaps
nav_order: 7
---

# ROADMAP - Export Code Components Cache (Script-Aligned)

Status: In Progress
Updated: May 2026

## Goal

Keep build-time code generation stable while evolving from single output per pattern to multi-variant outputs.

Current simplification rule (approved for this phase):
- Reuse policy is file-based: if `public/components/code/{normalizedId}.tsx` exists, skip unless `--force` is used.
- Do not block reuse on fingerprint checks.

Short-run product direction:
- one Notion pattern id can produce zero, one, or many generated code variants
- user can pick one source image from a pattern and generate from that image
- if cache is missing for requested variant, generate on run
- keep pipeline callable with `build:artifacts -- --ids=...` from API/function/MCP-triggered jobs

## Current Script State (Source of Truth)

Implemented and active now:
- metadata cache file: `public/components/components-metadata.json`
- components artifacts: `public/components/code/{normalizedId}.tsx`
- orchestrator: `scripts/build-artifacts-cache.mjs`
- metadata builder: `scripts/build-metadata-cache.mjs`
- components builder: `scripts/build-components-cache.mjs`
- ids filtering is supported across metadata/components/artifacts scripts via `--ids`

Current constraints to evolve:
- components script currently writes one TSX file per normalized pattern id
- no first-class variant identity for image-driven generation yet
- no runtime job queue yet for API/function/MCP-triggered generation requests

## Canonical Artifact Architecture (Near-Term)

1. `public/search-index.json`
purpose: lightweight discovery and id resolution.

2. `public/components/components-metadata.json`
purpose: canonical generated descriptions and pattern metadata.

3. `public/components/code/{patternId}/{variantId}.tsx`
purpose: canonical code artifacts with multi-variant support.

4. `public/components/components-status.json`
purpose: generation status and variant coverage.

5. `public/components/_artifacts-report.json`
purpose: build diagnostics and finalize validation report.

Note:
- Notion cache is moving to a private non-public path and should no longer be treated as public canonical storage.

## Variant Model (New)

Variant identity (deterministic):
- `patternId`
- `imageKey` (selected image url hash or block id)
- `promptVersion`
- `modelId`

Expected behavior:
- one pattern may have `variants: []`
- variant can be skipped when no usable source image is selected
- variant can be regenerated when file is missing or `--force` is used

## Build State Machine (Per Pattern and Variant)

1. Resolve
- load selected pattern ids from `--ids` or derived selection slice
- resolve candidate images from search-index and metadata context
- include explicit user-selected image when provided

2. Plan
- check existing `code/{patternId}/{variantId}.tsx`
- queue only missing variants unless `--force`

3. Generate
- call model with selected image + metadata context
- produce TSX code for each requested variant

4. Validate
- run TSX transpile/syntax validation before write
- mark variant failure with actionable error cause

5. Persist
- write variant artifacts under pattern folder
- update `components-status.json` and report files
- keep metadata ownership in `components-metadata.json`

## API/Function/MCP Trigger Robustness

Build scripts remain the execution engine, but runtime callers should enqueue work, not execute long builds inline.

Recommended flow:
1. API/function/MCP ingress receives ids + optional image selections + prompt instructions.
2. Ingress creates async job payload and dedupe key.
3. Worker executes `npm run build:artifacts -- --ids=...` with normalized args.
4. Worker writes artifacts and status files.
5. Caller polls job status and receives ready variant paths.

Hard requirements:
- idempotent dedupe by `(ids, imageKeys, promptVersion, model)`
- lock to prevent overlapping writes on same pattern
- timeout/retry policy with clear terminal states

## Criticality-Based Phases

### P0.5 - Immediate Simplification (Cost Control)

Scope:
- remove fingerprint as a cache gate in components generation
- use existence check of output TSX as the default skip gate
- keep `--force` as the explicit regeneration switch
- keep writing generated TSX immediately per successful item so partial runs are preserved

Acceptance:
- rerunning the same ids after cancellation skips already generated files
- token spend scales mainly with truly missing files
- behavior is easy to explain to operators: "exists => skip, force => regenerate"

### P0 - Script and Data Model Alignment

Scope:
- replace single-file assumption with variant directory structure
- keep backward compatibility for existing `/components/code/{id}.tsx` consumers during migration
- update finalize checks to validate variant coverage

Acceptance:
- scripts pass for `--ids` scoped runs
- old single-file fallback still resolves until frontend migration completes

### P1 - Front Image-Driven Generation

Scope:
- add frontend action to select one image and request generation
- persist selected image key in variant metadata
- return generated variant path for preview/export

Acceptance:
- user can generate a new variant from a selected image in one flow
- cache hit path returns fast without re-generation

### P2 - Runtime Trigger Integration

Scope:
- add API/function trigger endpoint for artifact jobs
- add MCP-triggered enqueue path (async)
- support instruction-based generation options in job payload

Acceptance:
- API/function/MCP flows can trigger scoped `--ids` builds safely
- concurrent requests do not corrupt artifacts

### P3 - Monetization Readiness

Scope:
- gate export retrieval by entitlement
- keep preview and discovery data available per product policy
- add audit logs for premium export access

Acceptance:
- unauthorized users cannot pull paid export variants
- entitled users get stable retrieval paths

## Testing and Ops Requirements

1. Unit
- variant id determinism
- argument normalization for `--ids` and slices
- parser validation for model responses

2. Integration
- scoped `--ids` runs write expected variant tree
- finalize mode rejects mixed or incomplete snapshots

3. Runtime
- queue job lifecycle: pending/running/succeeded/failed
- duplicate trigger requests collapse to same dedupe job

4. Observability
- report includes per-variant success/failure
- include model and prompt version in status payloads when available

## Human-Readable Runbook (Short)

1. First run:
- generates missing files into `public/components/code`

2. Retry after interruption:
- rerun same command
- existing files are skipped automatically

3. Need refresh:
- run with `--force` for selected ids

4. Need cheap testing:
- run small batches with `--ids` or `--limit`

## Definition of Done

Done when all are true:
- roadmap and scripts both use `components-metadata.json` terminology
- multi-variant code artifacts are supported for one pattern id
- selected-image generation is supported end-to-end
- on-run generation works through robust async API/function/MCP-triggered jobs
- `build:artifacts -- --ids` remains the canonical scoped execution path
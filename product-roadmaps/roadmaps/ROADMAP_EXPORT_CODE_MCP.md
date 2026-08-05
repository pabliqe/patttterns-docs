---
title: Roadmap Export Code MCP
parent: Roadmaps
nav_order: 8
---

# ROADMAP - Export Code + MCP Generation

Status: Proposed
Updated: May 2026

Canonical planning note:
- Cross-cutting MCP data access strategy is centralized in `ROADMAP_MCP_UNIFIED_DATA_ACCESS`.

## Goal

Unify code generation entrypoints so exports can be requested from frontend actions, chatbot flows, and MCP tools while still using the same artifacts pipeline.

## Scope Requested

1. Front action to render/generate code from selected images.
2. Integrated chatbot flow to generate code exports from conversation intent.
3. MCP function to request new components generation from instruction text.

## Product Flows

### Flow A - Front Image Action

User flow:
1. User opens pattern detail page.
2. User selects one image from the pattern context.
3. User clicks "Generate Code".
4. UI requests generation job for `(patternId, imageKey, instruction?)`.
5. UI shows pending state and then renders variant when ready.

Output:
- variant TSX path under `public/components/code/{patternId}/{variantId}.tsx`

### Flow B - Chatbot-Assisted Export

User flow:
1. User asks chatbot for code export from a specific pattern/image intent.
2. Chatbot resolves candidate pattern ids via search tools.
3. Chatbot proxy calls export-generation job endpoint.
4. Chatbot returns generation status and final export links/cards.

### Flow C - MCP Instruction Tool

New MCP tool example:
- `generate_components_export`

Input:
- `ids: string[]`
- `instruction: string`
- `imageKey?: string`
- `limit?: number`
- `force?: boolean`

Behavior:
- enqueue async job only
- return `jobId`, normalized ids, and status URL
- do not run heavy generation inline in edge runtime

## Architecture

Shared execution engine:
- `scripts/build-artifacts-cache.mjs --mode=generate --ids=...`

Runtime components:
1. Ingress API/function endpoint
2. Job store/queue
3. Worker process invoking artifacts scripts
4. Job status endpoint

Data contracts:
- variant identity by `(patternId, imageKey, promptVersion, model)`
- standardized job payload for frontend/chatbot/MCP callers

## Reliability Requirements

1. Idempotency
- dedupe by payload hash
- repeated same request returns same active/completed job

2. Concurrency control
- per-pattern lock to avoid artifact collisions
- bounded global workers

3. Recoverability
- retriable transient failures
- deterministic terminal failure reasons

4. Cache strategy
- if variant exists and fingerprint unchanged, return cache hit immediately
- if cache missing, trigger build on run and return pending state

## Security and Access

1. Generation trigger can be public with rate-limits or auth depending on product phase.
2. Export retrieval should be entitlement-aware in monetized phase.
3. Prompt/instruction and model metadata should be logged for audit/debug.

## Delivery Phases

### P0 - Contracts and Queue

- define job payload and status schema
- implement enqueue + status endpoints
- wire worker to artifacts script with `--ids`

### P1 - Frontend Image Generation

- add image selection UI action
- call enqueue endpoint and render pending/completed states

### P2 - Chatbot Integration

- add chatbot-proxy path for generation jobs
- return export-ready cards once artifacts are available

### P3 - MCP Tooling

- add MCP tool `generate_components_export`
- enforce async job-only behavior

### P4 - Monetization Controls

- entitlement checks on export access
- policy for free preview vs paid variants

## Definition of Done

Done when all are true:
- frontend image-based generation works end-to-end
- chatbot can trigger and surface generated exports
- MCP tool can enqueue instruction-based generation jobs
- all paths converge on the same artifacts pipeline and status files
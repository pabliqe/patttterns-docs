---
title: MCP Unified Data Access
parent: Roadmaps
nav_order: 3
---

# ROADMAP - MCP Unified Data Access (Search + Metadata + Code)

Status: Proposed
Updated: May 2026

## Goal

Make MCP the unified data access layer for pattern discovery and exports, with full access to generated metadata and generated code artifacts beyond search-index-only behavior.

Primary outcome:
- MCP can resolve pattern data from layered sources: discovery index, metadata artifacts, component code artifacts, and optional full page content.

## Why This Exists

Planning is currently split across multiple docs (chatbot MCP, export code MCP, metadata cache, and AI access hardening). This roadmap unifies those plans into one delivery path and one ownership contract.

## Consolidated Inputs

This roadmap consolidates strategy from:
- `ROADMAP_CHATBOT_MCP`
- `ROADMAP_EXPORT_CODE_MCP`
- `ROADMAP_EXPORT_CODE`
- `ROADMAP_PATTERNS_METADATA`
- `ROADMAP_AI_ACCESS_AND_CACHE_SYNC`
- `docs/search-and-mcp/architecture`
- `docs/build-and-deploy/setup/CACHE_PIPLINE`

## Unified Product Contract

### Source tiers

1. Tier A: Discovery (public)
- Source: `public/search-index.json`
- Purpose: fast search and lightweight pattern cards

2. Tier B: Enriched metadata (private-first)
- Source of truth: generated metadata artifacts (current file family under `public/components` during transition)
- Purpose: high-quality descriptions, status, generation metadata, diagnostics

3. Tier C: Generated component code (private-first)
- Source of truth: generated TSX artifacts and variant status
- Purpose: MCP code retrieval and export experiences

4. Tier D: Full content resources (optional)
- Source: build cache for page content
- Purpose: MCP resources/read for rich page context

### MCP access modes

1. Discovery mode (default safe)
- Uses Tier A only
- Compatible with current search-only MCP behavior

2. Enriched mode
- Uses Tier A + Tier B
- Returns metadata-enhanced pattern payloads when metadata artifacts exist

3. Export mode
- Uses Tier A + Tier B + Tier C
- Returns variant availability and gated code payload retrieval

4. Content mode (optional)
- Uses Tier D resources/read APIs for full page content

### Fallback rule

MCP must never hard-fail when higher tiers are absent.

Resolution order per request:
1. Preferred tier for the requested operation
2. Next lower available tier
3. Tier A discovery fallback

## MCP API Plan

### Keep existing tools stable

- `search_patterns`
- `list_categories`
- `get_pattern`

### Add enriched read tools

1. `get_pattern_enriched`
- Input: `id | slug`
- Output: discovery fields + metadata fields when present + source diagnostics (`sourceTier`, `fallbackUsed`)

2. `list_pattern_variants`
- Input: `id | slug`
- Output: available generated variants with status and quality markers

3. `get_pattern_component`
- Input: `id | slug`, optional `variantId`
- Output: code payload (or preview) under entitlement policy

### Add MCP resources endpoints

- `resources/list` for `pattern://` resources
- `resources/read` for:
  - `pattern://{id}/metadata`
  - `pattern://{id}/code/{variantId}`
  - `pattern://{id}/content` (optional full content mode)

### Keep async generation trigger

- `generate_components_export` stays enqueue-only
- Generation execution remains outside edge runtime via worker/job pipeline

## Build and Storage Strategy

### Near-term (transition)

- Preserve current local artifacts workflow:
  - `npm run build:artifacts`
  - `npm run validate:artifacts`
- MCP enriched/export modes can read these artifacts when present.

### Target

1. Introduce private enriched index for MCP/chatbot/server use.
2. Move generated code artifacts to private storage path.
3. Keep public discovery index minimal and stable.

## Security and Entitlement Strategy

1. Anonymous users
- Search + discovery responses
- no raw premium code payloads

2. Authenticated non-entitled users
- metadata-enriched responses
- limited code preview only

3. Entitled users
- full generated code retrieval
- variant export access

## Delivery Phases

### P0 - Canonical Contract and Schema

Scope:
- define one canonical MCP data contract (tiers, fallback, error model)
- add schema/version markers for discovery and enriched sources

Done when:
- one MCP contract doc exists and is referenced by all related roadmaps

### P1 - Enriched Metadata Reads

Scope:
- implement `get_pattern_enriched`
- wire metadata resolver with fallback to discovery index

Done when:
- MCP serves metadata-enriched output when artifacts exist
- MCP returns discovery-only output when artifacts are missing

### P2 - Code Variant Reads

Scope:
- implement `list_pattern_variants`
- implement `get_pattern_component` with entitlement-aware output policy

Done when:
- MCP can list and return generated code variants
- unauthorized requests are safely downgraded

### P3 - Resources Layer

Scope:
- add `resources/list` and `resources/read`
- support metadata, code, and optional full content resources

Done when:
- MCP clients can read pattern resources through standard MCP resources APIs

### P4 - Async Generation Convergence

Scope:
- keep `generate_components_export` as enqueue-only
- ensure frontend/chatbot/MCP all use one job contract and one worker pipeline

Done when:
- all generation paths converge on the same queue and status model

### P5 - Private Storage Hardening

Scope:
- move enriched data and code artifacts to private paths
- keep public discovery index lightweight

Done when:
- MCP enriched/export modes do not depend on publicly reachable raw artifacts

## Observability and Reliability

Required metrics:
- MCP request volume by tool and mode
- fallback rate by source tier
- missing-artifact rate
- generation enqueue success/failure and queue latency
- entitlement deny counts for code retrieval

Operational guards:
- concurrency locks per pattern for write paths
- idempotent dedupe for generation payloads
- explicit terminal states for jobs

## Rollout and Risk Control

1. Feature-flag MCP enriched mode.
2. Enable read tools in shadow mode with diagnostics.
3. Turn on response fields incrementally.
4. Gate code retrieval by entitlement before broad rollout.
5. Keep discovery-only fallback always available.

## Definition of Done

- MCP supports full pattern reads beyond search-index (metadata + code) with stable fallbacks.
- MCP resources/read is available for metadata and code resources.
- Generation triggers remain async and safe.
- Public/private data boundaries match access policy.
- Related roadmap docs reference this file as canonical execution plan.

---
title: AI Access and Cache Sync
parent: Roadmaps
nav_order: 10
---

# ROADMAP - AI Access and Cache Sync

Status: In Progress
Updated: May 2026

Canonical planning note:
- Cross-cutting MCP data access strategy is centralized in `ROADMAP_MCP_UNIFIED_DATA_ACCESS`.

## Why This Roadmap Exists

Current AI features work, but key artifacts are still publicly accessible by direct URL.
This roadmap keeps AI plans aligned with product goals: paywall readiness, static build stability, and no accidental public data exposure.

## Current AI Status (Synced)

### Search and MCP

- MCP is active in production and uses search data from the public search index.
- Site search and MCP both depend on search-index.json semantics.
- MCP local development is intentionally out of scope for now.

### Chatbot

- Chatbot proxy and MCP integration are operating in production mode.
- LLM mode is feature-flagged and can fall back to MCP-only behavior.

### Exported Components Code

- Components code artifacts are currently served from public/components/code.
- This is useful for current UX but incompatible with a future paid export model.

### Notion Content Cache

- Notion cache is currently generated and read from public/.notion-cache.
- It is build-only data and should move to a private non-public path.

## Changes To Make

### P0 - Security and Access Baseline

1. Move Notion cache out of public to a private build cache directory.
2. Add dual-read fallback during migration to avoid static build breaks.
3. Update Netlify cache plugin and CI artifact paths to the new cache directory.
4. Remove legacy public cache path after one successful full deploy cycle.

Success criteria:
- Static export builds pass with zero cache misses.
- No Notion recordMap files are publicly reachable.

### P1 - Search Data Hardening

1. Split search index into:
   - public lightweight index for discovery UX
   - private enriched index for MCP/chatbot/server use
2. Keep normalization behavior identical across search surfaces.
3. Add explicit schema/version marker to both index artifacts.

Success criteria:
- Topbar search continues to work from lightweight public index.
- MCP and chatbot use enriched private source without leaking full data publicly.

### P2 - Components Export Paywall Readiness

1. Move exported code artifacts out of public static hosting.
2. Add authenticated access endpoint for code export retrieval.
3. Keep free preview metadata separated from premium export payloads.
4. Add entitlement-aware access layer for future LemonSqueezy integration.

Success criteria:
- Public users cannot bulk-pull raw code artifact files.
- Paid users can retrieve exports through controlled endpoints.

## Rollout Plan (Low Risk)

1. Introduce private paths and dual-read support.
2. Update build writers and CI/cache restore targets.
3. Deploy and verify production build integrity.
4. Remove old public paths and update roadmap statuses.

## Ownership and Sync Rules

- Keep this roadmap as the source of truth for AI access posture.
- When changing MCP, search index shape, chatbot data sources, or components export delivery, update this file in the same PR.
- Reflect major phase status updates in the Roadmaps hub index.

## Tracking Checklist

- [ ] P0 complete: Notion cache moved to private path
- [ ] P0 complete: dual-read fallback removed after stable deploy
- [ ] P1 complete: split public/private search indexes
- [ ] P1 complete: shared normalization and schema versioning
- [ ] P2 complete: components export behind authenticated endpoint
- [ ] P2 complete: entitlement-aware access controls

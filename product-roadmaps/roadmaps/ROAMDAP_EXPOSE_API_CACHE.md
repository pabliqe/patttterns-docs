---
title: Expose API Cache + MCP Extraction
parent: Roadmaps
nav_order: 9
---

# PRD Prompt — Evaluate MCP/Chatbot Extraction and API Cache Exposure

## Current State Summary

The codebase already consumes cache artifacts in several ways:

- MCP edge function reads `search-index.json` over HTTP
- chatbot proxy calls the MCP endpoint over HTTP
- the main site reads `search-index.json` in client, build, middleware, and layout contexts
- `.notion-cache` and `metadata-cache.json` are build artifacts, not current runtime dependencies
- docs embed loads chatbot assets from the main site domain

## Immediate Risks Before Extraction

- hardcoded MCP and proxy URLs need to become env-configurable
- `search-index.json` needs explicit CORS and cache headers
- MCP has no health endpoint for freshness checks
- proxy allowlists need to include any extracted domains

## Extraction Options to Evaluate

### Option A
One new repo containing both MCP and chatbot.

### Option B
Two repos: one for MCP API and one for chatbot app/widget.

## Required Evaluation Areas

1. affected files inventory across chatbot assets, MCP runtime, cache builders, main-app consumers, deployment config, and docs references
2. architecture choice between single-service and split-service extraction
3. versioned `/api1` contract for search, content-cache, and metadata-cache endpoints
4. phase-based migration plan with rollback at every step
5. estimate model with confidence and critical path
6. testing proving main-site deploys are decoupled from MCP/chatbot deploys

## Preconditions

- add CORS and cache headers for `public/search-index.json`
- convert hardcoded service URLs to env vars
- add MCP health/readiness endpoint
- confirm allowed-origin policy for the extracted domains

## Success Condition

PATTTTERNS.com should no longer depend on MCP directly, while MCP and chatbot deploy independently and continue serving the same cache-backed behavior safely.
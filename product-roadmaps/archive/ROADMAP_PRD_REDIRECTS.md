---
title: ✅ Redirect & Routing Stabilization PRD
parent: Archive
---

# Redirect & Routing Stabilization PRD

## Context

The production site needs to preserve SEO continuity across legacy URLs while reducing runtime usage and build risk.

## Goals

- keep legacy URLs resolving to canonical routes
- stay on a safe static-export path where possible
- prevent malformed redirect artifacts from shipping
- reduce redirect volume over time by improving canonical link emission

## Phases

### Phase 1 — Redirect pipeline hardening
Completed:
- fixed the redirect generator corruption bug
- added redirect validation before writing `_redirects`
- kept warning visibility for rule-count growth

### Phase 2 — Legacy URL normalization
Implemented:
- normalized `.html` legacy URLs
- normalized wrong-prefix numeric pattern URLs to canonical `/patterns/...`
- pending verification through regenerated artifacts

### Phase 3 — Canonical link emission
Pending:
- stop emitting raw Notion page IDs where canonical slugs are known
- reduce long-term redirect growth

### Phase 4 — Deploy workflow optimization
Pending:
- split heavy indexing from regular deploy paths
- favor prebuilt artifacts during constrained build windows

## Success Criteria

- no malformed lines in `public/_redirects`
- known legacy variants redirect correctly
- redirect generation remains deterministic and fails fast when invalid
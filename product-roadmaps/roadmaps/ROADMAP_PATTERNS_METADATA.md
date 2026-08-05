---
title: 🟠 Pattern Metadata Cache
parent: Roadmaps
nav_order: 6
---

# ROADMAP - Pattern Metadata Cache

Status: Phase 2 in progress (Phase 1 completed)  
Updated: May 2026

Canonical planning note:
- Cross-cutting MCP data access strategy is centralized in `ROADMAP_MCP_UNIFIED_DATA_ACCESS`.

## Goal

Build a local, build-time pattern intelligence layer for 400+ patterns that reuses the current Gemini integration, existing Notion props, and safe sync behavior back to Notion.

## Current Direction

- Runtime: Next.js App Router + Node build scripts
- Inputs: Notion API, `public/search-index.json`, `public/.notion-cache/*`
- Existing version stamping already happens in `scripts/build-search-index.mjs`
- Existing Gemini env model already exists in the chatbot server code
- Metadata generation stays as a standalone local build script aligned with current prebuild workflows

## Core Flow

```text
Notion DB rows + search-index.json
  -> resolve canonical description
  -> Gemini metadata extraction (JSON only)
  -> safe Notion sync for Description / Version
  -> public/metadata-cache.json
```

## Cache Contract

- Primary artifact: `public/metadata-cache.json`
- Base pattern fields remain in `public/search-index.json`
- Metadata cache stores AI and sync data keyed by pattern id
- Default sync rule: do not overwrite manual Notion description edits unless explicitly allowed

## Phases

### Phase 1 — Local Metadata Cache + Safe Notion Sync

Completed:
- metadata builder script
- `build:metadata` commands
- env docs
- compact cache artifact
- safe Notion sync for Description and Version
- force/limit controls

### Pipeline Simplification (May 2026)

Decision:
- Metadata keeps ownership of description quality and safe Notion sync.
- Components reuse is now controlled by file existence and force mode, not fingerprint matching.

Why:
- easier to understand and debug
- cheaper reruns when generation is interrupted
- better fit for long runs where successful files are already written

What this roadmap owns from now on:
- keep metadata descriptions stable and human-usable
- keep Notion/search/metadata description parity healthy
- avoid coupling metadata progress to components regeneration gates

### Phase 2 — Visual Interaction Extraction + Feedback Capture

Completed:
- media-aware fallback for Gemini failures
- media block fetching from Notion children
- retry generation with visual context
- private thumbs up/down voting on pattern pages
- persistence of votes to runtime Supabase DB

Remaining:
- reduce remaining failure cases from complex nested media pages
- verify failure count reduction in the next full run

### Phase 2.1 — Description Quality

Focus:
- improve actionable search-ready descriptions
- combine media parsing with Notion props like flows, components, devices, and languages
- prioritize usefulness over tight length limits

Validation:
- dry-run sample builds
- check previously empty descriptions
- rebuild search index and confirm propagation

### Phase 3 — Multi-Framework Snippet Engine

Next:
- generate implementation-ready snippets and mapping hints with durable storage
- extend metadata output without breaking current search/runtime consumers
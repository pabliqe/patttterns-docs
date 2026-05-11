---
title: ✅ Static Login Migration
parent: Roadmaps
nav_order: 7
---

# ROADMAP — Static Export + Login Migration

## Goal

Move PATTTTERNS to static-export-first delivery while preserving login and bookmarks with minimal infrastructure cost.

Public browsing should run from static files only, without runtime Notion calls, while login and bookmark persistence move away from a Next server runtime.

## Why

The Netlify free-tier budget makes public runtime invocations too expensive at scale, so public routes need to remain static-first.

## Completed Phases

### Phase 1 — Static Export Contract
- restored static export as the production contract
- removed dependence on the Next runtime plugin for public delivery

### Phase 2 — Static Root Shell
- removed root-layout server auth and runtime fs dependencies
- kept static navigation and auth session provider mounting compatible with export mode

### Phase 3 — Auth Runtime Decoupling
- introduced static-login mode and a local auth facade
- replaced direct `next-auth/react` dependencies with a client auth seam
- implemented Supabase OAuth client flow and static callback route
- replaced dynamic library and dashboard routes during migration

### Phase 4 — External Auth Provider
- Supabase OAuth now powers auth client-side
- static callback route and auth facade are in place

### Phase 5 — External Bookmark Data Path
- bookmark cloud access abstracted behind client adapters
- Supabase REST + RLS path is active
- anonymous local mode still works unchanged

### Phase 6 — Library Route in Static Architecture
- `/library` works as a static shell hydrated client-side
- owner and public library flows load through cloud helpers

## Next Phase

### Phase 7 — Final Cost Guardrails

Planned:
- instrument Supabase calls per user/session
- define call budgets per MAU
- add opt-in logging around bookmark and library cloud helpers
- remove remaining production debug logs

## Rollout Notes

This roadmap intentionally split delivery-mode migration from auth/data migration so each layer could be validated independently without mixing infrastructure and identity changes in one release.
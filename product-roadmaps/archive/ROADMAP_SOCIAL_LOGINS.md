---
title: ✅ Identity & Persistence Infrastructure
parent: Archive
---

# ROADMAP — Identity & Persistence Infrastructure

Objective: add identity, cloud sync, and future monetization support without breaking the lightweight anonymous experience.

## Principles

- login should be contextual, not intrusive
- anonymous local bookmarks keep working without regression
- local anonymous storage remains capped and is cleared on auth transitions
- each stage ships independently
- auth work should not penalize the public browsing experience

## Progress

| Stage | Status |
|---|---|
| Social Login (Google) | Complete |
| Cloud Sync + Library | Complete |
| GitHub OAuth | Pending — see [spec](../specs/github-oauth-provider-selection) |
| Plan Pro | Pending |

## Architecture Direction

The implemented path uses Supabase Auth client-side instead of the earlier NextAuth-centered ADR because it stays compatible with static export and avoids server auth routes for public delivery.

## Completed Work

### Stage 1 — Social login
- Supabase OAuth client-side flow
- auth facade and provider
- login modal and navbar auth integration
- static callback route
- session restore and bookmark gating

### Stage 2 — Cloud sync + Library
- silent migration of local bookmarks on login
- sync status UI and toast feedback
- `/library` as a static shell hydrated client-side
- owner and public shared library flows

## Remaining Work

### Stage 3 — GitHub OAuth

Superseded by the active spec: [GitHub OAuth — Provider Selection](../specs/github-oauth-provider-selection). The original three bullets below understated the work; the spec is the source of truth.

- create a GitHub OAuth App and enable the provider in Supabase (dashboard-only, not tracked in `supabase/config.toml`)
- make the authorize URL provider-aware — `scopes` and `prompt` are currently Google-specific
- thread provider selection through the auth client, the login modal, and the nine call sites that hardcode `"google"`
- pass the real provider to `sign_in_started` / `sign_in_completed` analytics
- decide and test account linking for same-email Google/GitHub users, and handle GitHub's private-email case
- update callback, ToS, Privacy, and setup-doc copy that names Google as the only provider

### Stage 4 — Plan Pro
- add entitlement model and billing integration
- checkout and webhook flows
- gated premium features and account/dashboard UX

## Note

This roadmap became the foundation for later library, static-login, and sharing work, so it now lives under archive as historical planning context rather than the active implementation source of truth.
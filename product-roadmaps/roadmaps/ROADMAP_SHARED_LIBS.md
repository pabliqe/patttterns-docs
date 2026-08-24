---
title: Shared Libraries & Discovery
parent: Roadmaps
nav_order: 10
---

# ROADMAP — Shared Libraries & Public Discovery

Objective: make public libraries first-class, discoverable, indexable, and compatible with the multi-library roadmap.

Execution spec for canonical URLs, social metadata, JSON-LD/markdown, MCP listing, and dynamic OG: [Public Libraries MCP JSON-LD PRD](../specs/public-libraries-mcp-jsonld-prd).

## Principles

- `/library` without authentication should show a public directory, not a login wall
- zero server function dependency for public pages where possible
- each feature should ship independently
- URL decisions must stay compatible with the multi-library schema migration

## Progress

| Feature | Status |
|---|---|
| OwnerAvatar fallback | Complete |
| View counter | Not started |
| Canonical `/l/{token}` + social JSON-LD | Complete (see [Public Libraries PRD](../specs/public-libraries-mcp-jsonld-prd) Phase 1) |
| Dynamic OG image per library | Complete (see [Public Libraries PRD](../specs/public-libraries-mcp-jsonld-prd) Phase 1) |
| Public directory at `/library` | Not started (see [Public Libraries PRD](../specs/public-libraries-mcp-jsonld-prd) Phase 2) |
| Library cards | Not started |
| Semantic URLs `/library/[username]` | Not started (later alias; canonical `/l/{token}` is shipped) |

## Feature 0 — OwnerAvatar fallback

Completed:
- created reusable `OwnerAvatar` component
- fallback to initials on broken or missing avatar URLs
- replaced raw avatar rendering in library and auth surfaces
- avoided `next/image` because UI fallback requires direct error-driven re-rendering

## Feature 1 — View counter

Plan:
- add `view_count` to library/public profile data
- create a secure increment RPC
- record one view per session per shared library
- expose counts in owner and public views

## Feature 2 — Public directory at `/library`

Plan:
- return public library summaries for anonymous visitors
- likely replace the existing anonymous login wall directly on `/library`
- order results by views or recency
- preserve the owner experience for authenticated users

## Feature 3 — Library cards

Plan:
- reusable `PublicLibraryCard`
- title, description, author, pattern count, and view count
- reuse `OwnerAvatar`
- support empty and skeleton states

## Feature 4 — Semantic URLs

Plan:
- `/library` -> directory
- `/library/[username]` -> default public library
- `/library/[username]/[slug]` -> specific library in multi-library phase
- keep `?token=` URLs working through redirects during migration
- Public Libraries PRD uses `/l/{share_token}` as the canonical path so this username route can alias later without colliding with tokens

## Feature 5 — Dynamic OG + canonical social URLs

Completed:

- canonical share URL `/l/{share_token}` (clipboard + `og:url`)
- always-200 HTML for every UA: owner title/description, JSON-LD Collection/ItemList, `index,follow`
- markdown `Accept: text/markdown` on `/l/{token}`
- per-library 1200×630 PNG from `uink-brand-cli` (`/og/library/{token}.png`)
- runtime sitemap `/sitemap-libraries.xml` (no site rebuild on library save)
- `robots.txt` allows `/l/`; owner `/library` stays `noindex` (static CDN, no Edge)

See [Public Libraries PRD](../specs/public-libraries-mcp-jsonld-prd) Phase 1.

## Dependency

Username `/library/[username]` URLs depend on unique handles and, for multi-library slugs, the `libraries` table migration. Canonical `/l/{share_token}` in the Public Libraries PRD does **not** wait on that migration.
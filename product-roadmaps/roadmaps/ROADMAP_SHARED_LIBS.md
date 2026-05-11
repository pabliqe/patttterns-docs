---
title: Shared Libraries & Discovery
parent: Roadmaps
nav_order: 10
---

# ROADMAP — Shared Libraries & Public Discovery

Objective: make public libraries first-class, discoverable, indexable, and compatible with the multi-library roadmap.

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
| Public directory at `/library` | Not started |
| Library cards | Not started |
| Semantic URLs `/library/[username]` | Not started |
| Dynamic OG image per library | Not started |

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

## Dependency

Semantic URLs depend on the multi-library schema migration that moves library state into a dedicated `libraries` table.
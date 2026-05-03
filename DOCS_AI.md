---
title: Docs IA and AI Context
parent: Home
nav_order: 4
---

# Docs IA and AI Context

This page is the internal source of truth for documentation structure, contribution standards, and AI-assisted doc updates.

## Purpose

- Keep docs consistent as the project grows.
- Reduce duplicate or stale guidance.
- Make it obvious where new information should live.
- Help teammates and AI agents update docs with predictable quality.

## Information Architecture

### Home layer

- Home: project entry and quick links.
- Roadmaps: planning and initiative tracking.
- Specs: PRD and implementation plans.
- Setup and Configuration: operational runbooks.

### Decision rules for placement

- Use Setup for how-to and operational procedures.
- Use Roadmaps for staged plans and status evolution.
- Use Specs for feature-specific execution docs.
- Use Archive only for deprecated strategy context.

## Canonical Files by Topic

- Build and artifacts pipeline: setup/CACHE_PIPLINE
- Deployment process: setup/DEPLOY
- Auth system setup: setup/AUTH_SETUP
- Login lifecycle details: setup/LOGIN_FLOW
- Metadata roadmap and generation flow: roadmaps/ROADMAP_PATTERNS_METADATA

## Authoring Standards

- Start pages with a clear outcome statement.
- Prefer short sections with operational headings.
- Include command examples only when they are currently valid.
- Link to one canonical source rather than copy long blocks.
- Update nearby index pages when adding new docs.

## AI-Assisted Documentation Workflow

1. Identify source of truth in code or existing docs.
2. Summarize intent in one paragraph before details.
3. Add links to related docs and affected scripts/files.
4. Verify no conflicting instructions remain in adjacent pages.
5. Run a quick docs validation pass before merge.

## Change Checklist

- Is this page in the right section?
- Does Home, Roadmaps, or Specs need a new link?
- Are command snippets still executable?
- Are env vars and artifact names aligned with current scripts?
- Is older contradictory text removed or marked legacy?

## Suggested Maintenance Cadence

- Weekly: update active roadmap indexes.
- Per feature merge: update related Setup/Specs links.
- Monthly: prune stale docs and move obsolete plans to Archive.

## Notes for Internal Publishing

- Docs are configured as noindex for public search engines.
- Keep internal-only operational details here rather than product-facing site docs.

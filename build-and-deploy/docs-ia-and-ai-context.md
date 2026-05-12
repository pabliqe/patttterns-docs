---
title: Docs IA and AI Context
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
- Styling: design system and UI implementation conventions.
- Data & Analytics: tracking, storage, analytics environment, and reporting setup.
- Search and MCP: search architecture, chatbot/MCP behavior, and related specs.
- Building and Deploy: setup, runbooks, infrastructure, and delivery workflows.
- Product Roadmaps: planning, specs, active initiatives, and archived strategy context.

### Decision rules for placement

- Use Styling for visual system rules and reusable UI conventions.
- Use Data & Analytics for analytics instrumentation, DB-facing docs, and operational data references.
- Use Search and MCP for search flows, AI/chatbot behavior, and related implementation planning.
- Use Building and Deploy for how-to guides, infrastructure setup, deployment, and maintenance procedures.
- Use Product Roadmaps for staged plans, specs, and historical roadmap context.

## Canonical Files by Topic

- Styling conventions: `DESIGN.md` in the repository root
- Build and artifacts pipeline: `setup/CACHE_PIPLINE`
- Deployment process: `setup/DEPLOY`
- Auth system setup: `setup/AUTH_SETUP`
- Login lifecycle details: `setup/LOGIN_FLOW`
- Search and MCP overview: `search-and-mcp/architecture`
- Metadata roadmap and generation flow: `roadmaps/ROADMAP_PATTERNS_METADATA`

## Authoring Standards

- Start pages with a clear outcome statement.
- Prefer short sections with operational headings.
- Include command examples only when they are currently valid.
- Link to one canonical source rather than copy long blocks.
- Update nearby index pages when adding new docs.
- **Every file in `docs/` must open with Jekyll front-matter.** Minimum: `title`. Add `parent` and `nav_order` when inside a section subfolder. This rule applies to both human-authored and AI-generated docs.

## AI-Assisted Documentation Workflow

1. Identify source of truth in code or existing docs.
2. Summarize intent in one paragraph before details.
3. Add links to related docs and affected scripts/files.
4. Verify no conflicting instructions remain in adjacent pages.
5. Run a quick docs validation pass before merge.

## Change Checklist

- Is this page in the right section?
- Does Home or one of the five category pages need a new link?
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

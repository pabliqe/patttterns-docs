---
title: ✅ Agent Readiness Audit
parent: Archive
nav_order: 1
---

# ROADMAP: Agent Readiness (isitagentready.com Audit)

Audit performed: April 2026

## Summary

PATTTTERNS is a static-export Next.js site with agent-facing capabilities layered on top through static files, Netlify headers, edge functions, and `.well-known` resources.

## Live Capabilities

- MCP server at `/mcp`
- markdown negotiation on `Accept: text/markdown`
- WebMCP browser tools
- agent skills discovery via `/.well-known/agent-skills/index.json`
- discovery chain from homepage headers to API catalog, skills, and MCP card

## Audit Result

Completed:
- link response headers
- content signals in `robots.txt`
- API catalog
- MCP server card
- agent skills discovery index
- markdown negotiation
- WebMCP
- MCP transport endpoint

Skipped:
- OAuth protected resource metadata
- OIDC discovery for agent-facing protected resources

## Phased Work

### Phase 1 — Static Signals
- content signals in `robots.txt`
- RFC 8288 `Link` headers
- `/.well-known/api-catalog`
- MCP server card stub

### Phase 2 — Discovery Metadata
- OAuth metadata when needed
- OIDC discovery stub if agent auth becomes relevant
- agent skills discovery index and hashes

### Phase 3 — Active Agent Support
- markdown negotiation edge behavior
- WebMCP tool registration
- MCP transport endpoint exposing pattern tools

## Decision Log

- `ai-train=no` because the content is curated
- `ai-input=yes` to support retrieval and assistants
- static files were preferred where possible to preserve the static-export delivery model
---
title: Agent Readiness (Draft)
parent: Roadmaps
nav_order: 3
---

# ROADMAP: Agent Readiness (isitagentready.com Audit)
  
Audit performed: April 2026  
Source: https://isitagentready.com  
Target site: https://patttterns.com
  
---
  
## Overview
  
PATTTTERNS is a static-export Next.js site hosted on Netlify. It has no
traditional REST API in production — content is served as static HTML,
with machine-readable artifacts already in place (`llms.txt`, `llms-full.txt`,
`search-index.json`, `sitemap.xml`). Agent readiness improvements are layered
on top of this static delivery model using Netlify headers, edge functions,
and `.well-known` files.
  
---
  
## Status Update — April 20, 2026
  
### New agent-facing features now live
  
**1. MCP server at `/mcp`** — Any MCP-compatible client (Cursor, Claude Desktop, custom agents) can connect directly to patttterns.com as a data source and call:
- `search_patterns` — full-text search over the entire library
- `list_categories` — enumerate all sections
- `get_pattern` — resolve a slug to pattern data
  
**2. Markdown negotiation** — Any HTTP client sending `Accept: text/markdown` to any pattern page gets clean Markdown back instead of HTML. Browsers get HTML as before. The `x-markdown-tokens` response header helps agents budget their context window.
  
**3. WebMCP** — In browsers that support it (Chrome with the WebMCP origin trial), the same 3 tools are exposed via `navigator.modelContext`. An in-browser AI assistant can call `search_patterns` without hitting the server.
  
**4. Agent Skills Discovery** — Agents following the RFC can find SKILL.md files at `/.well-known/agent-skills/index.json` and learn how to use the site before making any requests.
  
**5. Discovery chain** — A well-behaved agent starting from the homepage now has a full path:
```
Homepage Link header
  → /.well-known/api-catalog          (what data resources exist)
  → /.well-known/agent-skills/        (how to use them)
  → /.well-known/mcp/server-card.json → /mcp  (call tools directly)
```
  
### Netlify function limits — no meaningful impact
  
The site uses Edge Functions (not Serverless Functions), which have a far more generous free tier:
  
| Type | Free tier | Used by |
|---|---|---|
| Edge Functions | 3M invocations/month | redirector, markdown-negotiation, mcp |
| Serverless Functions | 125K/month | not used (static export) |
  
Estimated usage at 100K monthly visitors × ~3 pages ≈ 600K total edge invocations — well within the 3M free limit. `markdown-negotiation` fast-paths via `context.next()` for browser requests after a single header check. `/mcp` only fires on direct agent calls.
  
---
  
## Audit Results
  
| Check | Status | Phase |
|---|---|---|
| Link response headers (RFC 8288) | ✅ Done | 1 |
| Content Signals in robots.txt | ✅ Done | 1 |
| API Catalog `/.well-known/api-catalog` (RFC 9727) | ✅ Done | 1 |
| MCP Server Card `/.well-known/mcp/server-card.json` | ✅ Done | 1 |
| Agent Skills Discovery `/.well-known/agent-skills/index.json` | ✅ Done | 2 |
| OAuth Protected Resource Metadata | ⏭ Skipped — `/library` is public, no protected API | — |
| OAuth/OIDC Discovery | ⏭ Skipped — no agent-facing protected resource | — |
| Markdown Negotiation (`Accept: text/markdown`) | ✅ Done | 3 |
| WebMCP (`navigator.modelContext.registerTool`) | ✅ Done | 3 |
| MCP Transport endpoint (`/mcp`) | ✅ Done | 3 |
  
---
  
## Phase 1 — Static Signals (Critical, Zero Runtime Risk)
  
All items are pure static files or Netlify header config. No code changes,
no runtime impact, no auth required.
  
### 1.1 Content Signals in robots.txt
  
**Spec:** https://contentsignals.org/  
**File:** `public/robots.txt`
  
Add `Content-Signal` directives to declare AI usage preferences:
  
```
Content-Signal: ai-train=no, search=yes, ai-input=yes
```
  
- `ai-train=no` — content is curated and should not be used for model training
- `search=yes` — indexing for search is welcome
- `ai-input=yes` — use as context/retrieval for AI queries (consistent with llms.txt)
  
### 1.2 Link Response Headers (RFC 8288)
  
**Spec:** https://www.rfc-editor.org/rfc/rfc8288  
**File:** `netlify.toml`
  
Add `Link` response headers to the homepage pointing agents to key resources:
  
- `rel="api-catalog"` → `/.well-known/api-catalog`
- `rel="describedby"` → `/llms.txt` (LLM manifest)
- `rel="describedby"` → `/llms-full.txt` (full corpus)
  
Also add `Content-Type: application/linkset+json` for the api-catalog path.
  
### 1.3 API Catalog (RFC 9727)
  
**Spec:** https://www.rfc-editor.org/rfc/rfc9727  
**File:** `public/.well-known/api-catalog`
  
Static `application/linkset+json` file describing content discovery endpoints.
Since PATTTTERNS is content-first (no REST API), this catalog describes machine-readable
data resources:
  
- `/llms.txt` — LLM manifest (service-doc)
- `/llms-full.txt` — Full corpus (service-desc analog)
- `/search-index.json` — Search index
- `/sitemap.xml` — Sitemap
  
### 1.4 MCP Server Card Stub
  
**Spec:** https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127  
**File:** `public/.well-known/mcp/server-card.json`
  
Publish the server card now with declared capabilities. The actual MCP transport
endpoint (`/mcp`) is planned for Phase 3 — the card serves as intent declaration
and satisfies the audit check.
  
---
  
## Phase 2 — Discovery Metadata (Medium Complexity)
  
### 2.1 OAuth Protected Resource Metadata (RFC 9728)
  
**File:** `public/.well-known/oauth-protected-resource`
  
Static JSON declaring Google as the authorization server (already used via NextAuth v5).
Points agents to Google's OIDC discovery endpoint.
  
```json
{
  "resource": "https://patttterns.com",
  "authorization_servers": ["https://accounts.google.com"],
  "scopes_supported": ["openid", "email", "profile"]
}
```
  
### 2.2 OAuth/OIDC Discovery
  
**File:** `public/.well-known/openid-configuration`
  
Proxy (or static stub) pointing to Google's OIDC issuer metadata.
Google already publishes `https://accounts.google.com/.well-known/openid-configuration`.
A static stub at this site's well-known path documents the connection.
  
### 2.3 Agent Skills Discovery Index
  
**Spec:** https://github.com/cloudflare/agent-skills-discovery-rfc  
**File:** `public/.well-known/agent-skills/index.json`
  
Requires creating site-specific SKILL.md files for key agent interactions:
- `search-patterns` — how to search the pattern library
- `browse-categories` — how to browse by type (ux-patterns, ui-patterns)
  
Each skill file must be hashed (SHA-256) and listed in the index.
  
---
  
## Phase 3 — Active Agent Support (Complex)
  
### 3.1 Markdown Negotiation
  
**Spec:** https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/  
**Implementation:** Netlify Edge Function
  
Intercept requests with `Accept: text/markdown`, fetch the HTML response,
strip layout/nav, convert body content to Markdown, return with
`Content-Type: text/markdown`. Use a lightweight HTML-to-Markdown converter
(e.g., `turndown`).
  
**Affected routes:** `/`, `/patterns`, `/[type]`, `/patterns/[slug]`
  
### 3.2 WebMCP
  
**Spec:** https://webmachinelearning.github.io/webmcp/  
**Implementation:** Browser-side script injected via `src/app/layout.tsx`
  
Register tools via `navigator.modelContext.registerTool()`:
  
- `search-patterns` — query the search index
- `get-pattern` — fetch a specific pattern by slug
- `list-categories` — return available pattern types
  
Use `AbortController` to unregister on page unload.
  
### 3.3 MCP Server (Transport Endpoint)
  
**Implementation:** Netlify Edge Function at `/mcp`
  
Implement Streamable HTTP MCP transport exposing:
- `search_patterns` tool
- `get_pattern` tool  
- `list_categories` tool
- `patterns://` resource URI scheme
  
---
  
## Decision Log
  
| Decision | Rationale |
|---|---|
| `ai-train=no` | Curated design content; training use would undermine the product |
| `ai-input=yes` | Aligned with existing llms.txt investment |
| Static files over API routes | Site is static export; Netlify serves .well-known directly |
| Phase 3 for markdown | Requires edge compute; non-trivial to test |
| Skip OpenID proxy in Phase 1 | NextAuth handles token flow; agents authenticating directly is not a current use case |
  
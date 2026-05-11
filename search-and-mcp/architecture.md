---
title: Search & MCP Architecture
---

# Search & MCP Architecture

This document covers how pattern search works across three surfaces: the site topbar, the chatbot widget, and the MCP endpoint used by AI agents.

---

## Search index

All three surfaces consume the same pre-built file:

```
public/search-index.json
```

Generated at build time by:

```bash
npm run build:search
# → scripts/build-search-index.mjs
```

Each entry has the shape:

```ts
{
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: "pattern" | "flows" | "components";
  slug: string;       // e.g. /ux-patterns/drag-and-drop
  searchText: string; // concatenated title + description + tags
  coverImage?: string;
}
```

The index is fetched from `https://patttterns.com/search-index.json` at runtime by the MCP edge function, and from `/search-index.json` by the client-side search.

---

## Normalization — the shared rule

All search surfaces apply the same normalization before comparing strings so that user input like `drag drop`, `drag & drop`, and `drag and drop` all match the same patterns.

**Algorithm (4 steps):**

```
1. lowercase
2. replace & → " and "
3. replace all punctuation / non-word chars → " "
4. collapse multiple spaces → single space, trim
```

Then the query is **token-split**: every whitespace-separated token must appear in the target field (AND logic). A single-word query behaves identically to the old `includes()` approach.

### Implementations

| Location | Function | Language |
|---|---|---|
| `netlify/edge-functions/mcp.ts` | `normalize(s)` | TypeScript (Deno) |
| `src/lib/search.ts` | `normalizeQuery(s)` | TypeScript (Node/browser) |

**⚠️ These two functions must stay identical.** They operate on the same index, so drift between them produces inconsistent results across surfaces. When you change one, grep for `normalize` in both files and update the other.

---

## Surface 1 — Site topbar search

- **Entry point:** `src/lib/search.ts` → `searchPatterns(query, options)`
- **Index source:** `/search-index.json` (fetched client-side, cached in memory)
- **Relevance scoring:** weighted — exact title match (100 pts) › title prefix (50) › contains (25) › description (10) › tag match (30/15)
- **Token-split:** yes (as of April 2026)
- **Normalization:** `normalizeQuery()` in `src/lib/search.ts`

---

## Surface 2 — Chatbot widget (MCP mode)

The chatbot widget (`src/chatbot/chatbot.js` / `public/chatbot.js`) sends all queries to:

```
POST https://patttterns.com/.netlify/functions/chatbot-proxy
Body: { "query": "..." }
```

The proxy (`netlify/functions/chatbot-proxy.mts`) calls the MCP edge function internally via `fetchPatterns()`, then optionally passes results to Gemini for an AI answer. The widget receives an SSE stream:

```
data: {"type":"patterns","patterns":[...]}
data: {"type":"delta","text":"..."}   ← streamed Gemini answer
data: {"type":"done"}
```

If `ENABLE_AI_CHAT` is not `"true"` or `GEMINI_API_KEY` is absent, the proxy falls back to MCP-only mode (patterns cards, no AI text).

---

## Surface 3 — MCP endpoint (AI agents / external tools)

```
POST https://patttterns.com/mcp
```

Implements [MCP Streamable HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127) (spec `2025-03-26`). Single-response mode only (no SSE).

### Tools

| Tool | Description |
|---|---|
| `search_patterns` | Full-text search. Args: `query` (required), `limit` (default 10, max 50) |
| `list_categories` | All categories with URL and pattern count |
| `get_pattern` | Single pattern by slug (e.g. `/ux-patterns/drag-and-drop`) |

### Example request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_patterns",
    "arguments": { "query": "drag drop", "limit": 5 }
  }
}
```

### Search logic

- `normalize(query)` applied to the query
- Token-split: all tokens must match at least one of `searchText`, `title`, or `description`
- No relevance scoring — order follows index order (Notion source order)
- Results capped at `limit` (hard max 50)

---

## Chatbot build pipeline

Source files live in `src/chatbot/`:

| File | Purpose |
|---|---|
| `src/chatbot/chatbot.js` | Widget logic (source of truth) |
| `src/chatbot/chatbot.css` | Widget styles (source of truth) |

- `public/chatbot.js` — served by Next.js / Netlify dev
- `docs/assets/js/chatbot.js` — consumed by Jekyll / GH Pages docs site

**Never edit the output files directly.** Edit `src/chatbot/` and rebuild.

---

## Environment variables

| Variable | Required | Effect |
|---|---|---|
| `GEMINI_API_KEY` | No | Enables AI answers in the proxy. Without it, proxy returns MCP results only. |
| `ENABLE_AI_CHAT` | No | Must be `"true"` to activate AI path. Any other value → MCP-only. |

Both must be set in Netlify environment variables for full AI mode. The chatbot widget on docs.patttterns.com requires no environment variables — it calls the production proxy directly.

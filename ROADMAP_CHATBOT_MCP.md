# ROADMAP: PATTTTERNS Chatbot (MCP-backed)

Status: Planning  
Updated: April 2026

---

## Goal

A design pattern assistant embedded on `docs.patttterns.com` and optionally on `patttterns.com` itself. The chatbot uses the existing `/mcp` endpoint as its backend — no new AI infrastructure, no third-party training on private data.

---

## Architecture

```
User types question
  → Chatbot widget (browser JS)
    → POST /mcp  (tools/call → search_patterns)
      → search-index.json (static, ~instant)
        → returns matching patterns + URLs
          → widget formats + renders reply
```

No LLM required for basic search mode. Optionally pipe results through an LLM for natural language answers.

---

## Phases

### Phase 1 — Embedded Search Widget (No LLM)

**What it does:** Accepts a text query, calls `search_patterns` via MCP, renders results as cards with title + description + link.

**Files to create:**
- `docs/assets/js/chatbot.js` — widget logic (vanilla JS, no deps)
- `docs/assets/css/chatbot.scss` — widget styles matching brand
- `docs/_includes/head_custom.html` — injects script + styles

**MCP call pattern:**
```js
const res = await fetch('https://patttterns.com/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_patterns',
      arguments: { query: userInput, limit: 5 }
    }
  })
});
```

**UI:** Floating button (bottom-right), slide-up panel, input + results list. PATTTTERNS blue `#0267FF` accent.

**Effort:** ~1 day  
**Dependencies:** `/mcp` endpoint live (✅ done)

---

### Phase 2 — Natural Language Mode (LLM layer)

**What it does:** Takes search results from Phase 1, sends them + the user question to an LLM API, returns a synthesized answer with citations.

**Options:**
| Provider | Notes |
|---|---|
| OpenAI Responses API | Best quality, streaming support |
| Cloudflare AI Workers | Stays within existing Netlify/CF stack |
| Vercel AI SDK | Easy streaming, but adds Vercel dependency |

**Recommended:** OpenAI with a thin Netlify Function as a proxy (keeps the API key server-side). The function:
1. Receives `{ query, patterns[] }` from the widget
2. Builds a prompt: `"You are a design pattern expert. Based on these patterns: {patterns}. Answer: {query}"`
3. Streams the response back

**Files to create:**
- `netlify/functions/chatbot-proxy.ts` — LLM proxy (serverless function)
- Update `chatbot.js` to use streaming response

**Effort:** ~2 days  
**Dependencies:** Phase 1 complete, OpenAI API key as Netlify secret

---

### Phase 3 — Embed on patttterns.com

**What it does:** Same widget injected into the main site via `src/app/layout.tsx`.

**Considerations:**
- Load lazily (only after interaction) to avoid LCP impact
- Gate LLM calls to avoid abuse (rate limit by IP at the Netlify Function level)
- Show only on pattern pages (`/patterns/*`, `/ux-patterns/*`)

**Effort:** ~0.5 days (reuse Phase 1/2 assets)

---

### Phase 4 — MCP Resources (Pattern content)

**What it does:** Extend the `/mcp` endpoint to serve full pattern page content via `resources/read`, not just search index metadata.

Agents and the chatbot can then answer "what does the user-feedback pattern say?" with actual content, not just a URL.

**Implementation:** Edge function reads from `/public/.notion-cache/{id}.json` (already built by `build:content`).

**Files to update:**
- `netlify/edge-functions/mcp.ts` — add `resources/list` and `resources/read` methods

**Effort:** ~1 day  
**Dependencies:** `.notion-cache` populated (✅ exists)

---

## Widget UX Design

```
┌─────────────────────────────────┐
│  Ask about design patterns…     │  ← input
├─────────────────────────────────┤
│  ● User Feedback                │
│    Ratings, scores or votes…    │
│    patttterns.com/ux-patterns/… │
│                                 │
│  ● Call to Action               │
│    Pricing, sign-up, paywalls…  │
│    patttterns.com/ux-patterns/… │
└─────────────────────────────────┘
```

- Trigger: floating `?` button, bottom-right, brand blue
- Panel: 360px wide, slides up, search-first, no modal overlay
- Results: max 5, each a clickable card
- Keyboard: `Escape` closes, `Enter` submits, arrow keys navigate results
- Empty state: "Try searching for 'onboarding', 'checkout', or 'navigation'"

---

## Decision Log

| Decision | Rationale |
|---|---|
| MCP backend over third-party (Kapa/Inkeep) | No data leaves the site; consistent with agent readiness work |
| Vanilla JS widget | No framework dependency; loads in docs and main site equally |
| Phase 1 first (no LLM) | Instant value, zero ongoing cost, validates UX before adding AI cost |
| Netlify Function proxy for LLM | API key stays server-side; rate limiting easier than edge |
| Extend MCP resources in Phase 4 | Full content already cached; natural extension of existing architecture |

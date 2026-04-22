---
issue_number: 4
issue_title: "Implement Phase 1: Embedded Search Widget (Chatbot MCP)"
repo: "pabliqe/patttterns-next"
labels: [enhancement]
plan_level: "lean"
depth: "medium"
branch_name: "feat/4-chatbot-search-widget"
created_at: "2026-04-21T12:00:00Z"
---

# Implementation Plan: #4 — Implement Phase 1: Embedded Search Widget (Chatbot MCP)

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | create | `docs/_includes/head_custom.html` | Injects chatbot CSS + JS into `<head>` via just-the-docs hook |
| 2 | create | `docs/assets/css/chatbot.scss` | Widget styles (brand tokens, animations, responsive) |
| 3 | create | `docs/assets/js/chatbot.js` | Widget logic (DOM, fetch, keyboard nav, state machine) |

## Codebase Context

- **just-the-docs** theme auto-includes `_includes/head_custom.html` — no config change needed
- MCP response is **double-encoded**: parse `result.content[0].text` as JSON to get `{results, total}`
- Brand tokens in `docs/assets/css/custom.scss`: primary `#0267FF`, border-radius `8px`, focus ring `rgba(#0267FF, 0.12)`
- Fonts (Inter, Epilogue, Geist Mono) already loaded in `custom.scss` — do NOT re-import in `head_custom.html`
- CORS is `*` on `/mcp` edge function — cross-origin calls from `docs.patttterns.com` work without config
- Existing SCSS uses Jekyll front matter (`---` header) to trigger Sass processing — `chatbot.scss` must follow the same pattern
- `docs/_includes/` and `docs/assets/js/` directories do not exist — must be created

## Steps

1. **Create `docs/_includes/head_custom.html`** — add `<link>` to `chatbot.scss` and `<script defer>` to `chatbot.js`
   **Done when:** Jekyll build output includes the chatbot CSS and JS references in `<head>`

2. **Create `docs/assets/css/chatbot.scss`** — Jekyll front matter, brand-consistent styles for: trigger button, panel, input, result cards, empty state, loading spinner, error state, animations (slide-up)
   **Done when:** All widget visual states are styled and match `brand.json` / `custom.scss` tokens

3. **Create `docs/assets/js/chatbot.js`** — inject DOM (floating button + slide-up panel + input + results container), wire click/keyboard events, implement fetch to `/mcp`, parse double-encoded response, render results as cards
   **Done when:** Typing a query and pressing Enter renders result cards from the live `/mcp` endpoint

4. **Implement keyboard navigation** — Escape closes panel, arrow keys navigate results with active index, Enter on focused result opens link
   **Done when:** Full search → navigate → select flow works without mouse

5. **Manual QA** — test on docs site: happy path, empty results, error state, keyboard-only flow, mobile viewport
   **Done when:** All 10 acceptance criteria pass in Chrome and Safari

## Interfaces

```ts
interface McpResponse {
  jsonrpc: string;
  id: number;
  result: {
    content: Array<{ type: string; text: string }>;
  };
}

interface PatternResult {
  title: string;
  description: string;
  url: string;
  type: string;
}
```

## Function Design

| File | Function | Single Concern |
|------|----------|----------------|
| `chatbot.js` | `createWidget()` | Builds and injects DOM elements (button + panel + input + results container) |
| `chatbot.js` | `searchPatterns(query)` | POST to `/mcp`, parse double-encoded response, return `PatternResult[]` |
| `chatbot.js` | `renderResults(results)` | Clears container, creates result cards or empty/error state |
| `chatbot.js` | `setupKeyboardNav()` | Escape close, Enter submit, arrow key navigation with active index tracking |

## Acceptance Criteria (EARS)

- **AC-1** (ubiquitous): The docs site shall display a floating button in the bottom-right corner using brand blue `#0267FF`.
- **AC-2** (event-driven): When the user clicks the floating button, a 360px slide-up panel with a search input shall open.
- **AC-3** (event-driven): When the user types a query and presses Enter, the widget shall POST to `/mcp` with `search_patterns` and the query.
- **AC-4** (event-driven): When results are returned, the widget shall render up to 5 clickable cards with title, description, and link.
- **AC-5** (event-driven): When the user presses Escape, the panel shall close.
- **AC-6** (event-driven): When the user presses arrow keys, the widget shall navigate between result items.
- **AC-7** (event-driven): When no results are found or no query entered, the widget shall show: "Try searching for 'onboarding', 'checkout', or 'navigation'".
- **AC-8** (ubiquitous): The widget shall use vanilla JS only — no framework dependencies.
- **AC-9** (ubiquitous): The widget styles shall match the PATTTTERNS brand (colors, fonts, radius from `custom.scss`).
- **AC-10** [inferred] (unwanted-behavior): If the MCP endpoint returns an error or is unreachable, the widget shall display an error message.

## Out of Scope

- LLM / natural language mode (Phase 2)
- Embedding on `patttterns.com` main site (Phase 3)
- MCP `resources/read` for full pattern content (Phase 4)
- Analytics or usage tracking on widget interactions

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|---------|
| 1 | MCP endpoint unreachable / HTTP error | [inferred] | Show "Something went wrong. Try again." with retry option |
| 2 | Malformed JSON / missing `content[0].text` | [inferred] | Catch parse error, show generic error message |
| 3 | Double-encoded response parsing | [inferred/codebase] | `JSON.parse` envelope, then `JSON.parse` inner text field |
| 4 | Empty results (0 matches) | [from issue] | Show empty state with suggested searches |
| 5 | Empty query submitted | [inferred] | Ignore submit, keep focus on input |
| 6 | Rapid sequential queries | [inferred] | `AbortController` — cancel previous fetch on new submit |
| 7 | Panel closed while fetch in-flight | [inferred] | Abort pending request on panel close |
| 8 | Multiple clicks on trigger button | [inferred] | Toggle open/close |
| 9 | Coexistence with JtD built-in search | [inferred] | Accept coexistence — separate UI, no conflict |
| 10 | Long description overflowing card | [inferred] | CSS `line-clamp` to 2 lines with ellipsis |
| 11 | Font double-loading | [inferred/codebase] | Fonts already in SCSS — do NOT add to `head_custom.html` |

## Done Criteria per Feature

| Feature | Done when ACs pass |
|---------|-------------------|
| Trigger button | AC-1, AC-8, AC-9 |
| Panel open/close | AC-2, AC-5 |
| Search execution | AC-3, AC-8 |
| Results rendering | AC-4, AC-7, AC-9, AC-10 |
| Keyboard navigation | AC-5, AC-6 |

## Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | `/mcp` endpoint latency from docs subdomain | Show loading spinner; `AbortController` timeout at 5s |
| 2 | Jekyll Sass processor may not find `chatbot.scss` | Use Jekyll front matter (`---`) at top, same pattern as `custom.scss` |
| 3 | JtD theme update could override `head_custom.html` behavior | `head_custom.html` is a documented stable hook in just-the-docs |

## Test Strategy

- **Manual (happy path):** Open docs site locally (`bundle exec jekyll serve`), search for "onboarding", verify 5 result cards render with correct links
- **Network error:** Simulate offline with DevTools network throttling, verify error state renders
- **Keyboard-only:** Tab to trigger button → Enter → type query → Enter → ArrowDown × 3 → Enter (opens link) → Escape (closes panel)
- **Responsive:** Test at 375px mobile viewport — panel should adapt width (full-width or max 360px)
- **Cross-browser:** Chrome + Safari minimum

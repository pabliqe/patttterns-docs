---
title: Homepage Search Hero
parent: Product Roadmaps
---

# Homepage Search Hero

Full-bleed, desktop-first hero above **Recent Patterns** on `/`.

## Problems

- The top of the homepage reads as a promo / ad landing instead of a pattern repository.
- No headline or value statement: what PATTTTERNS is, how many patterns exist, what it exports.
- Search is secondary (quiet header field) although it is the primary intent for a 350+ pattern library.

## Solution

- **Value proposition:** eyebrow with real counts (`patternCount`, `categoryCount`), a two-line Epilogue headline with a primary-color accent, and subcopy naming the real stack (React + Tailwind export, CSS-variable theme tokens). No DTCG / Framer claims.
- **Search first:** a large centered `SearchBar size="lg"` (history + autocomplete + Enter-to-`/search`). When `NEXT_PUBLIC_ENABLE_AI_CHAT=true`, a Search / Ask toggle switches Enter to `window.__chatbotAskQuery` (same guest gate as `PatternAskAgentButton`).
- **Repository, not an ad:** floating cards are random pattern and category covers (animated GIFs) picked at build time, each linking to its page.
- **Discovery panel:** left = recent searches (localStorage), falling back to random category chips; right = the 5 latest patterns (same source as the old Recent Patterns module, which the homepage no longer renders) + "View all (N)". Floating covers never repeat those 5.
- The header search field hides while the hero field is in view, and fades back once it scrolls out.

## Files

- `src/lib/notion-cover.ts` — `selectHeroItems` → `searchArtifacts.heroItems`.
- `src/components/HomeHero.tsx` (server) and `src/components/HomeHeroSearch.tsx` (client).
- `src/components/SearchBar.tsx` — `onSubmitQuery`, `suggestions` props.
- `src/lib/chatbot-ask.ts` — shared `askAgentWhenReady` + guest check.
- `src/lib/useHomeHeroSearchVisible.ts` — store read by `Header.tsx`.
- `src/styles/_globals.css`, `src/styles/_keyframes.css` — `.home-hero*` on top of `.library-explorer-bg`, `home-hero-float`.
- Cover loading: search-index keeps original Notion/Giphy URLs. UI cards/hero rewrite Giphy `giphy.gif` → `200w.webp` (still `giphy_s.gif` for search thumbs / reduced motion) and Notion `width`/`quality`. `SpinnerImage` retries the original if a rendition 404s.

## Out of scope

Prompt suggestions, image / screenshot search, new stack integrations, mobile-specific design.

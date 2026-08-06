---
title: Components Generation vs Regenerate Prompting
parent: Specs
nav_order: 21
---

# Components: Generation & Regenerate Prompt Context

**Purpose:** Exact prompt text and request context for (1) first generation (seed) and (2) Netlify regenerate, as implemented in code.  
**Priority:** Rigid, reviewable prompting on **both** paths. They have diverged; this doc is the source of truth for what Gemini actually receives today.

Related: [Components API CDN PRD](components-api-cdn-prd) · [Components Cache Workflow](../../build-and-deploy/components-cache-workflow)

---

## Request envelopes (what Gemini receives)

### A. First generation (seed) — offline cache

| | |
|--|--|
| **Code** | `scripts/build-components-cache.mjs` → `buildGeminiPrompt` + `generateComponentsCacheWithGemini` |
| **Model** | `gemini-2.5-pro` (default), then `gemini-2.5-flash` fallback |
| **Text part** | Full prompt below |
| **Image parts** | Yes — `coverImage` inlined. GIF → up to **5 PNG frames** as multimodal `inlineData` |
| **generationConfig** | `temperature: 0.1`, `topP: 0.4`, `maxOutputTokens: 8192`, `thinkingBudget: 4096` |

```text
contents[0].parts = [
  { text: <PROMPT_A> },
  ...referenceImages[].inlinePart   // 1..N image parts; GIF expands to multiple frames
]
```

### B. Regenerate — Netlify Function (production `/debug`)

| | |
|--|--|
| **Code** | `netlify/functions/lib/components-generate.mts` → `buildRegeneratePrompt` + `generateOnce` |
| **Model** | `gemini-2.5-flash` only |
| **Text part** | Full prompt below |
| **Image parts** | **None by default.** Opt-in: `includeImage: true` or `COMPONENTS_REGENERATE_INCLUDE_IMAGE=1` (single still; no GIF frames). Current UI does not opt in. |
| **generationConfig** | `temperature: 0.1`, `topP: 0.4`, `maxOutputTokens: 8192`, `thinkingBudget: 512` |
| **Baseline code** | Immutable **seed** TSX (not active `vN`), truncated to ~14 000 chars |

```text
contents[0].parts = [
  { text: <PROMPT_B> }
  // optional: + { inlineData: cover still } only if includeImage
]
```

### Direct answers

| Question | Answer |
|----------|--------|
| Do regenerates send the original GIF/image? | **No** on production Netlify regenerate (default). First gen does. |
| Do regenerates send pattern metadata? | **Partial:** `id`, `title`, `slug` from the client row. `description` / `tags` are usually empty because the UI does not send them. No `uxFlows` / `uiCategories`. |
| Is there Gemini response caching? | **No** on the Function. Sameness comes from low temperature + same seed + vague task text. |

---

## PROMPT A — First generation (exact text template)

Source: `buildGeminiPrompt()` in `scripts/build-components-cache.mjs`.

Placeholders:

- `{{THEME_TOKEN_KEYS}}` → keys of local `BASE_COMPONENT_THEME_TOKENS` in that script (see note below)
- `{{IMAGE_HINTS}}` → hostname/path hints derived from cover URL(s), or `- none`
- `{{PATTERN_CONTEXT_JSON}}` → JSON object with fields below

```text
You are an expert design engineer making the most polished user interface.

Technical Constraints & Dependencies:
- FRAMERWORK: MUST use React and Tailwind CSS utilities.
- ICONS: MUST use 'lucide-react'. Do NOT write raw <svg> paths. This is CRITICAL to prevent code truncation.
- MOTION: MUST use 'framer-motion' for heavy animation. Smaller transitions can be achieved with native CSS/JavaScript.
- INTEARCTIVITY: Keep components reactive with animation/transitions to improve their function.
- ONBOARDING: Main function must be highlighted with a floating marker and/or a tooltip.
- STATES: Use lightweight local React state ('useState') for interactive elements.
- IMAGES: If media placeholders are needed, MUST use one placeholder from our CDN:
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-01.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-02.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-03.png
- Keep DOM nesting shallow (<5 levels deep) and mock data minimal (maximum 6 items) to prevent token exhaustion.

Aesthetic & Theme Rules:
- STYLE: Keep clean shadcn/ui style but color using only existing CSS tokens:
  -   {{THEME_TOKEN_KEYS}}
- CSS TOKENS: Do NOT override this tokens.
- NO MOCKUPS: Do NOT mock devices or extra frames.
- RESPONSIVE: Layout MUST adapt to width sizes from 1440px to 320px. Always hide menus and lateral sidebars.
- Accesibility tweaks like contrast, alt, aria-tags and keyboard navigation are a mandatory.

Reference image:
{{IMAGE_HINTS}}

Pattern context JSON:
{{PATTERN_CONTEXT_JSON}}
```

### `{{PATTERN_CONTEXT_JSON}}` shape (1st gen)

```json
{
  "id": "<patternId>",
  "title": "<title>",
  "slug": "<slug>",
  "description": "<from components-metadata.json preferred, else search-index>",
  "tags": ["…"],
  "uxFlows": ["…"],
  "uiCategories": ["…"]
}
```

### `{{THEME_TOKEN_KEYS}}` (1st gen script)

Keys currently interpolated from the **cache script’s** local map (not identical to `src/lib/component-theme-tokens.ts`):

```text
--ui-bg, --ui-surface, --ui-text, --ui-text-muted, --ui-border, --ui-ring,
--ui-accent, --ui-accent-contrast, --ui-success, --ui-success-contrast,
--ui-warning, --ui-warning-contrast, --ui-error, --ui-error-contrast,
--ui-info, --ui-info-contrast, --ui-font-headings, --ui-font-body, --ui-font-code,
--ui-spacing
```

(Script uses Inter-style font strings and **omits** `--ui-text-scale` / `--ui-corners` that exist in `src/lib/component-theme-tokens.ts`.)

### Multimodal context (1st gen only)

Alongside `PROMPT_A`, Gemini also receives **binary image parts** built from `entry.coverImage`:

- Still image → one `inlineData` part  
- GIF → up to **5** extracted PNG frames as separate `inlineData` parts  

There is **no prior TSX** in the 1st-gen prompt. The cover/GIF is the visual ground truth.

### Example filled 1st-gen text (illustrative)

```text
You are an expert design engineer making the most polished user interface.
…
Reference image:
- prod-files-secure.s3.us-west-2.amazonaws.com/….gif

Pattern context JSON:
{
  "id": "e6106c289bca4f51afd989e7eca42f86",
  "title": "25. Apple - Two-factor Auth",
  "slug": "/patterns/25-apple-two-factor-auth",
  "description": "…",
  "tags": ["…"],
  "uxFlows": ["…"],
  "uiCategories": ["…"]
}
```
(+ image frame parts in the same `user` message)

---

## PROMPT B — Netlify regenerate (exact text template)

Source: `designSystemRulesBlock()` + `buildRegeneratePrompt()` in `netlify/functions/lib/components-generate.mts`.

Placeholders:

- `{{THEME_TOKEN_KEYS}}` → Function hardcoded `THEME_TOKEN_KEYS` (includes `--ui-text-scale`, `--ui-corners`)
- `{{PATTERN_CONTEXT_JSON}}` → JSON from generate body (often incomplete)
- `{{SEED_TSX}}` → seed file contents, truncated to `PATTERN_REGENERATE_SEED_MAX_CHARS` (default 14000)

```text
You are an expert design engineer making the most polished user interface.

Technical Constraints & Dependencies:
- FRAMEWORK: MUST use React and Tailwind CSS utilities.
- ICONS: MUST use 'lucide-react'. Do NOT write raw <svg> paths.
- MOTION: MUST use 'framer-motion' for heavy animation.
- STATES: Use lightweight local React state ('useState').
- Keep DOM nesting shallow (<5 levels) and mock data minimal (max 6 items).

Aesthetic & Theme Rules:
- STYLE: Keep clean shadcn/ui style but color using only existing CSS tokens:
  -   {{THEME_TOKEN_KEYS}}
- CSS TOKENS: Do NOT override these tokens.
- NO MOCKUPS: Do NOT mock devices or extra frames.
- RESPONSIVE: Layout MUST adapt from 1440px to 320px.

Task: Regenerate an improved variant of the existing seed component.
Return TSX code only. No markdown fences, no JSON, no explanations.
Preserve the seed's UX intent; improve polish and interaction quality.

Pattern context JSON:
{{PATTERN_CONTEXT_JSON}}

Seed component TSX (immutable baseline):
{{SEED_TSX}}
```

### `{{PATTERN_CONTEXT_JSON}}` shape (Netlify regenerate)

Built in `buildRegeneratePrompt` from `handleGenerate` body:

```json
{
  "id": "<patternId>",
  "title": "<from client row, or empty>",
  "slug": "<from client row, or empty>",
  "description": "<usually empty — UI does not send description>",
  "tags": []
}
```

What `/debug` actually POSTs today (`generateComponentVersion`):

```json
{
  "id": "<patternId>",
  "title": "<row.title>",
  "slug": "<row.slug>",
  "coverImage": "<row.coverImage URL>",
  "imageRole": "primary"
}
```

`coverImage` is stored on the version meta but **not attached as an image part** unless `includeImage: true`.  
`description` / `tags` are **not** in that payload → prompt gets `""` / `[]`.

### `{{THEME_TOKEN_KEYS}}` (Netlify regenerate)

```text
--ui-bg, --ui-surface, --ui-text, --ui-text-muted, --ui-border, --ui-ring,
--ui-accent, --ui-accent-contrast, --ui-success, --ui-success-contrast,
--ui-warning, --ui-warning-contrast, --ui-error, --ui-error-contrast,
--ui-info, --ui-info-contrast, --ui-font-headings, --ui-font-body, --ui-font-code,
--ui-text-scale, --ui-spacing, --ui-corners
```

### Example filled regenerate text (illustrative)

```text
You are an expert design engineer making the most polished user interface.
…
Task: Regenerate an improved variant of the existing seed component.
Return TSX code only. No markdown fences, no JSON, no explanations.
Preserve the seed's UX intent; improve polish and interaction quality.

Pattern context JSON:
{
  "id": "e6106c289bca4f51afd989e7eca42f86",
  "title": "25. Apple - Two-factor Auth",
  "slug": "/patterns/25-apple-two-factor-auth",
  "description": "",
  "tags": []
}

Seed component TSX (immutable baseline):
import React, { useState } from 'react';
…
export default function …
```
(**No** image parts in the default production path.)

---

## Diff: rules present in A but missing from B

Netlify regenerate **drops** these first-gen constraints:

| Dropped from regenerate rules |
|-------------------------------|
| `INTEARCTIVITY` / interactivity line |
| `ONBOARDING` floating marker / tooltip |
| `IMAGES` CDN placeholder URLs |
| “Always hide menus and lateral sidebars” |
| Accessibility (contrast, alt, aria, keyboard) mandate |
| Reference image URL hints section |
| `uxFlows` / `uiCategories` in JSON |
| Multimodal cover / GIF frames |

Regenerate **adds**:

| Added |
|-------|
| Explicit task: “Regenerate an improved variant…” |
| “Return TSX code only…” |
| Full **seed TSX** as baseline |

---

## Local debug regenerate (reference only)

`src/lib/component-generation/regenerate.ts` is closer to PROMPT A’s rule richness (onboarding, placeholders, a11y, hide sidebars) and uses task wording similar to B, plus:

- “Do not invent a totally different pattern.”
- Seed labeled “immutable baseline — use as primary context”
- Tries cover still image when fetchable
- `thinkingBudget: 1536`
- Optional Gemini explicit cache for the design-system **prefix** only

Production `/debug` uses the **Netlify Function** (PROMPT B), not this local module.

---

## Locked intent (for upcoming alignment work)

1. Keep PROMPT A’s rigid design-system contract as the canonical rules block.  
2. Regenerate must use that **same** rules block (not a slimmed fork).  
3. Regenerate must support an explicit `userPrompt` (fix / customize), not only “improve polish.”  
4. Document any intentional regenerate compromise (e.g. still image vs GIF frames, timeout) separately — do not silently drop visual grounding.

---

## Code map

| Prompt / context | File |
|------------------|------|
| PROMPT A + GIF/cover parts | `scripts/build-components-cache.mjs` |
| PROMPT B + Function knobs | `netlify/functions/lib/components-generate.mts` |
| `includeImage` / generate body | `netlify/functions/components-api.mts` |
| `/debug` client payload | `src/components/debug/ComponentsGenerationsTable.tsx`, `src/lib/components-api-client.ts` |
| Local debug regenerate | `src/lib/component-generation/regenerate.ts` |
| Shared theme tokens (app) | `src/lib/component-theme-tokens.ts` |

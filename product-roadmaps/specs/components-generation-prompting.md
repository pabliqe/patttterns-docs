---
title: Components Generation vs Regenerate Prompting
parent: Specs
nav_order: 21
---

# Components: Generation & Regenerate Prompt Context

**Purpose:** Exact prompt text and request context for (1) first generation (seed) and (2) Netlify regenerate, as implemented in code.  
**Priority:** Rigid, reviewable prompting on **both** paths.

**Click-only regenerate quality:** shipped in [PR #32](https://github.com/pabliqe/patttterns-next/pull/32). Plan status: [Click-Only Regenerate Quality (Closed)](click-only-regenerate-quality-plan).

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
| **Code** | `netlify/functions/lib/components-generate.mts` → `buildRegeneratePrompt` + `regenerateFromSeed` |
| **Model** | `gemini-2.5-flash` only |
| **Text part** | XML envelope below (full rigid rules = same contract as A) |
| **Image parts** | **None by default.** Opt-in: `includeImage: true` or `COMPONENTS_REGENERATE_INCLUDE_IMAGE=1` (single still; no GIF frames). Current UI does not opt in. |
| **generationConfig** | `temperature: 0.3`, `topP: 0.7`, `maxOutputTokens: 8192`, `thinkingBudget: 1024`, random `seed` |
| **Baseline code** | **Active** version TSX when present, else immutable **seed** (truncated ~14 000 chars) |
| **Meta enrich** | Server merges body → Blobs version meta → `search-index.json` (description/tags not required from UI) |
| **Near-dup retry** | If output ≈ baseline (Dice ≥ ~0.94) and ≥7s remain, one stronger retry (`temp 0.45`, thinking ≤512, no image) |
| **UI** | Two click-only actions: **Reimagine** vs **Fix UI bugs** (`mode`). No free-text `userPrompt` / viewport params yet |

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
| Do regenerates send pattern metadata? | **Yes, server-enriched:** `id`, `title`, `slug`, `description`, `tags` from body / Blobs / search-index. No `uxFlows` / `uiCategories` yet. |
| Is there Gemini response caching? | **No** on the Function. Mild temp/topP + random seed + near-dup retry reduce near-copies. |
| Extra UI params needed? | **Two click-only actions:** Reimagine vs Fix UI bugs (`mode`). No free-text prompt yet. |

---

## PROMPT A — First generation (exact text template)

Source: `buildGeminiPrompt()` in `scripts/build-components-cache.mjs`.

Placeholders:

- `{{THEME_TOKEN_KEYS}}` → keys of local `BASE_COMPONENT_THEME_TOKENS` in that script
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

Keys currently interpolated from the **cache script’s** local map (not identical to Function / `src/lib/component-theme-tokens.ts`):

```text
--ui-bg, --ui-surface, --ui-text, --ui-text-muted, --ui-border, --ui-ring,
--ui-accent, --ui-accent-contrast, --ui-success, --ui-success-contrast,
--ui-warning, --ui-warning-contrast, --ui-error, --ui-error-contrast,
--ui-info, --ui-info-contrast, --ui-font-headings, --ui-font-body, --ui-font-code,
--ui-spacing
```

(Script uses Inter-style font strings and **omits** `--ui-text-scale` / `--ui-corners` that exist on the Function regenerate path.)

### Multimodal context (1st gen only)

Alongside `PROMPT_A`, Gemini also receives **binary image parts** built from `entry.coverImage`:

- Still image → one `inlineData` part  
- GIF → up to **5** extracted PNG frames as separate `inlineData` parts  

There is **no prior TSX** in the 1st-gen prompt. The cover/GIF is the visual ground truth.

---

## PROMPT B — Netlify regenerate (exact text template)

Source: `designSystemRulesBlock()` + `buildRegeneratePrompt()` in `netlify/functions/lib/components-generate.mts`.

### XML envelope

```text
<DesignSystemRules>
{{FULL_RIGID_RULES}}
</DesignSystemRules>

<PatternContext>
  <id>{{ID}}</id>
  <title>{{TITLE}}</title>
  <slug>{{SLUG}}</slug>
  <description>{{DESCRIPTION}}</description>
  <tags>
    <tag>…</tag>
  </tags>
  <baselineVersionId>{{seed|vN}}</baselineVersionId>
</PatternContext>

<CurrentComponent>
<!-- Active version when present; otherwise immutable seed. Use as baseline. -->
{{BASELINE_TSX}}
</CurrentComponent>

<ModificationRequest>
{{DEFAULT_OR_RETRY_BRIEF}}
</ModificationRequest>
```

### `{{FULL_RIGID_RULES}}` (exact Function text)

```text
You are an expert design engineer making the most polished user interface.

Technical Constraints & Dependencies:
- FRAMEWORK: MUST use React and Tailwind CSS utilities.
- ICONS: MUST use 'lucide-react'. Do NOT write raw <svg> paths. This is CRITICAL to prevent code truncation.
- MOTION: MUST use 'framer-motion' for heavy animation. Smaller transitions can be achieved with native CSS/JavaScript.
- INTERACTIVITY: Keep components reactive with animation/transitions to improve their function.
- ONBOARDING: Main function must be highlighted with a floating marker and/or a tooltip.
- STATES: Use lightweight local React state ('useState') for interactive elements.
- IMAGES: If media placeholders are needed, MUST use one placeholder from our CDN:
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-01.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-02.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-03.png
- Keep DOM nesting shallow (<5 levels deep) and mock data minimal (maximum 6 items) to prevent token exhaustion.

Aesthetic & Theme Rules:
- STYLE: Keep clean shadcn/ui style but color using only existing CSS tokens:
  -   --ui-bg, --ui-surface, --ui-text, --ui-text-muted, --ui-border, --ui-ring, --ui-accent, --ui-accent-contrast, --ui-success, --ui-success-contrast, --ui-warning, --ui-warning-contrast, --ui-error, --ui-error-contrast, --ui-info, --ui-info-contrast, --ui-font-headings, --ui-font-body, --ui-font-code, --ui-text-scale, --ui-spacing, --ui-corners
- CSS TOKENS: Do NOT override these tokens.
- NO MOCKUPS: Do NOT mock devices or extra frames.
- RESPONSIVE: Layout MUST adapt to width sizes from 1440px to 320px. Always hide menus and lateral sidebars.
- Accessibility tweaks like contrast, alt, aria-tags and keyboard navigation are mandatory.
```

### Default `ModificationRequest` — `mode: "reimagine"` (first button)

Joined as one paragraph in code. Sampling: `temperature 0.3`, `topP 0.7`.

```text
Produce a clearly improved variant of the current component — not a near-copy.
Preserve the pattern's UX intent, primary flows, and information architecture.
Do not invent a totally different pattern.
Raise visual polish: spacing rhythm, typography hierarchy, token-consistent color, clearer affordances.
Strengthen interactivity and motion (framer-motion for heavy animation; CSS for small transitions).
Keep onboarding: highlight the main function with a floating marker and/or tooltip.
Hide menus and lateral sidebars; stay responsive from 1440px to 320px.
Return complete TSX only. No markdown fences, no JSON, no explanations.
```

### Default `ModificationRequest` — `mode: "fix"` (“Fix UI bugs” button)

Sampling: `temperature 0.2`, `topP 0.5` (more surgical).

```text
Fix UI bugs and interaction defects in the current component — keep the same overall design and IA.
Do not reimagine the layout or invent a different pattern; surgically repair behavior and polish.
Prioritize: overflow/clipping (text, flex/grid children, scroll containers), stacking/z-index conflicts,
hit targets and hover/focus/active states, sticky/fixed element collisions, and soft natural motion
(reduce janky or overly aggressive animations; prefer subtle framer-motion / CSS transitions).
Also fix: misaligned spacing, truncated labels, broken responsive breakpoints (1440px→320px),
missing disabled/loading states, and a11y gaps (contrast, focus rings, aria, keyboard).
Keep onboarding marker/tooltip on the main action. Hide menus and lateral sidebars.
Return complete TSX only. No markdown fences, no JSON, no explanations.
```

### Retry `ModificationRequest` (near-duplicate only)

Reimagine retry asks for a more distinct variant; fix retry asks for more concrete bug repairs (same IA).

### Baseline + meta (server)

Handled in `netlify/functions/components-api.mts` (`enrichPatternMeta`, `resolveBaselineCode`):

| Input | Source |
|-------|--------|
| Baseline TSX | `activeVersionId` code if readable and ≠ seed, else seed |
| Title / slug / cover | POST body → Blobs version meta → `search-index.json` |
| Description / tags | POST body → `search-index.json` (UI usually omits these) |

`search-index.json` is fetched from site origin (cached ~5 min in the Function instance) when body fields are incomplete.

What `/debug` POSTs today (`generateComponentVersion`):

```json
{
  "id": "<patternId>",
  "title": "<row.title>",
  "slug": "<row.slug>",
  "coverImage": "<row.coverImage URL>",
  "imageRole": "primary",
  "mode": "reimagine"
}
```

`mode` is `"reimagine"` (Reimagine button) or `"fix"` (Fix UI bugs button). Stored on the new version meta.

Generate response extras (in addition to version meta):

```json
{
  "baselineVersionId": "v1",
  "retriedNearDuplicate": false,
  "similarityToBaseline": 0.81
}
```

`coverImage` is stored on the version meta but **not attached as an image part** unless `includeImage: true`.

### Env knobs (regenerate)

| Var | Default | Purpose |
|-----|---------|---------|
| `PATTERN_REGENERATE_THINKING_BUDGET` | `1024` | Thinking tokens |
| `PATTERN_REGENERATE_GEMINI_TIMEOUT_MS` | `22000` | Per Gemini call abort (ignores shared cache timeout if &lt; 15s) |
| `PATTERN_REGENERATE_TEMPERATURE` | `0.3` | First-pass sampling |
| `PATTERN_REGENERATE_TOP_P` | `0.7` | First-pass topP |
| `PATTERN_REGENERATE_RETRY_TEMPERATURE` | `0.45` | Near-dup retry |
| `PATTERN_REGENERATE_NEAR_DUP_SIMILARITY` | `0.94` | Dice threshold |
| `PATTERN_REGENERATE_NEAR_DUP_RETRY` | `1` | Set `0` to disable retry |
| `PATTERN_REGENERATE_SEED_MAX_CHARS` | `14000` | Baseline truncation |
| `PATTERN_COMPONENTS_CACHE_GEMINI_TIMEOUT_MS` | `18000` | Offline cache script Gemini timeout (not used for Function regen if &lt; 15s) |
| `COMPONENTS_REGENERATE_INCLUDE_IMAGE` | off | Attach cover still |

---

## Diff vs earlier slim PROMPT B

| Restored / added | Notes |
|------------------|-------|
| Full rigid rules (onboarding, CDN images, a11y, hide sidebars, interactivity) | Aligned with PROMPT A |
| XML structure | `DesignSystemRules` / `PatternContext` / `CurrentComponent` / `ModificationRequest` |
| Stronger default brief | Explicit “not a near-copy” + polish/motion/onboarding |
| Active baseline | Improves from latest `vN`, not only seed |
| Server meta enrich | Description/tags without UI changes |
| Mild temp/topP + random seed | Reduces identical copies |
| Near-dup retry | One stronger pass when similarity is high |

**Deferred** (new plan if/when needed): free-text `userPrompt`, icon library, viewport params, shared rules module import, multimodal GIF frames on Function.

---

## Local debug regenerate (reference only)

`src/lib/component-generation/regenerate.ts` still uses a flatter prompt (rules + JSON context + seed TSX), not the Function XML envelope. Production `/debug` uses the **Netlify Function** (PROMPT B). Keep Function docs as the source of truth for live regenerates.

---

## Locked intent

1. Keep PROMPT A’s rigid design-system contract as the canonical rules block.  
2. Regenerate uses that **same** rules block (not a slimmed fork).  
3. Click-only regenerate quality ships with Reimagine vs Fix UI bugs (`mode`) and no free-text UI params.  
4. Parameterized regenerate (free-text `userPrompt`, viewport, etc.) remains a later pass — open a **new** plan; do not reopen the deleted “Regen Prompt Params” artifact.  
5. Document intentional compromises (still image vs GIF frames, sync timeout) — do not silently drop visual grounding when we add image opt-in.

---

## Code map

| Prompt / context | File |
|------------------|------|
| PROMPT A + GIF/cover parts | `scripts/build-components-cache.mjs` |
| PROMPT B + Function knobs | `netlify/functions/lib/components-generate.mts` |
| Meta enrich + active baseline | `netlify/functions/components-api.mts` |
| `/debug` client payload | `src/components/debug/ComponentsGenerationsTable.tsx`, `src/lib/components-api-client.ts` |
| Local debug regenerate | `src/lib/component-generation/regenerate.ts` |
| Shared theme tokens (app) | `src/lib/component-theme-tokens.ts` |
| Plan status (closed) | `docs/product-roadmaps/specs/click-only-regenerate-quality-plan.md` |

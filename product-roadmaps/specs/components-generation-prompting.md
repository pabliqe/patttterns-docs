---
title: Components Generation vs Regenerate Prompting
parent: Specs
nav_order: 21
---

# Components: Generation & Regenerate Prompt Context

**Purpose:** Exact prompt text and request context for (1) first generation (seed) and (2) Netlify regenerate, as implemented in code.  
**Priority:** Rigid, reviewable prompting on **both** paths.

**Click-only regenerate quality:** shipped in [PR #32](https://github.com/pabliqe/patttterns-next/pull/32). Plan status: [Click-Only Regenerate Quality (Closed)](click-only-regenerate-quality-plan).

**Export-oriented regenerate prompts (Aug 2026):** Reimagine / Fix UI bugs now ask for named primitive + Preview harness, Preview-scoped onboarding, stronger a11y, `@deps`, optional tag recipes, and **CSS-only motion (no framer-motion)**. Lucide remains required. See [Component Generation Quality PRD](component-generation-quality-prd).

**Shared XML prompts (Aug 2026):** Seed + regenerate + local debug share `src/lib/component-generation/prompt-shared.mjs`. Both paths use the same XML envelope, full Notion `tags` list, and tag-driven `<InteractionRecipe>` when matched.

Related: [Components API CDN PRD](components-api-cdn-prd) · [Components Cache Workflow](../../build-and-deploy/components-cache-workflow)

---

## Request envelopes (what Gemini receives)

### A. First generation (seed) — offline cache

| | |
|--|--|
| **Code** | `scripts/build-components-cache.mjs` → `buildGeminiPrompt` → shared `buildSeedPrompt` |
| **Model** | `gemini-2.5-pro` (default), then `gemini-2.5-flash` fallback |
| **Text part** | XML envelope (same family as regenerate) |
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
| **Code** | `netlify/functions/lib/components-generate.mts` → shared `buildRegeneratePrompt` + `regenerateFromSeed` |
| **Model** | `gemini-2.5-flash` only |
| **Text part** | XML envelope (shared module) |
| **Image parts** | **None by default.** Opt-in: `includeImage: true` or `ENABLE_COMPONENTS_REGENERATE_IMAGE=true` (single still; no GIF frames). Current UI does not opt in. |
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
| Do regenerates send pattern metadata? | **Yes, server-enriched:** `id`, `title`, `slug`, `description`, and **all** `tags` from body / Blobs / search-index. |
| Are `uxFlows` / `uiCategories` sent? | **No separate fields.** Those Notion taxonomies are already in flat `tags` (alongside Devices / System / Language). Both paths send the full tag list. |
| Are interaction recipes on seed? | **Yes** — same `interactionRecipeForTags()` when tags match carousel/modal/tabs/popover. |
| Is there Gemini response caching? | **No** on the Function. Mild temp/topP + random seed + near-dup retry reduce near-copies. |
| Extra UI params needed? | **Two click-only actions:** Reimagine vs Fix UI bugs (`mode`). No free-text prompt yet. |

---

## PROMPT A — First generation (exact text template)

Source: shared `buildSeedPrompt()` in `src/lib/component-generation/prompt-shared.mjs` (called from `buildGeminiPrompt()` in `scripts/build-components-cache.mjs`).

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
    <tag>…</tag>   <!-- full Notion tag set; devices/system/language/UX/UI -->
  </tags>
</PatternContext>

<!-- Optional when tags match (carousel/modal/tabs/popover) -->
<InteractionRecipe>
{{TAG_DRIVEN_RECIPE}}
</InteractionRecipe>

<ReferenceImageHints>
  <hint>…</hint>
</ReferenceImageHints>

<GenerationRequest>
Generate one production-ready React + Tailwind component from PatternContext,
InteractionRecipe (when present), and reference images. Honor Title, Description,
and all Tags… Return complete TSX only…
</GenerationRequest>
```

### Pattern context (1st gen)

- `description` prefers `components-metadata.json`, else search-index
- `tags` = full flat Notion tag list (no `uxFlows` / `uiCategories` split)

### `{{THEME_TOKEN_KEYS}}` (1st gen script)

Keys currently interpolated from the **cache script’s** local `BASE_COMPONENT_THEME_TOKENS` map (may omit `--ui-text-scale` / `--ui-corners` that exist on the Function regenerate default list).

### Multimodal context (1st gen only)

Alongside `PROMPT_A`, Gemini also receives **binary image parts** built from `entry.coverImage` / `entry.images[imageIndex]`:

- Still image → one `inlineData` part
- GIF → **3 PNG stills**: first, middle, last frame (`src/lib/component-generation/reference-images.mjs`)

Shared by `build:metadata`, `build:components`, and regenerate when `includeImage` is on.

There is **no prior TSX** in the 1st-gen prompt. The cover/GIF stills are the visual ground truth.

`search-index` stores ordered Notion **body** images in `images[]` (`coverImage` = `images[0]`). Notion page Cover is unused. Future: `--image-index=1|2` for alternate flow/brand GIFs.

---

## PROMPT B — Netlify regenerate (exact text template)

Source: shared `buildRegeneratePrompt()` in `src/lib/component-generation/prompt-shared.mjs` (wired through `netlify/functions/lib/components-generate.mts`).

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

<!-- Optional when tags match (carousel/modal/tabs/popover) -->
<InteractionRecipe>
{{TAG_DRIVEN_RECIPE}}
</InteractionRecipe>

<CurrentComponent>
<!-- Active version when present; otherwise immutable seed. Use as baseline. -->
{{BASELINE_TSX}}
</CurrentComponent>

<ModificationRequest>
{{DEFAULT_OR_RETRY_BRIEF}}
</ModificationRequest>
```

### `{{FULL_RIGID_RULES}}` (exact shared text)

```text
You are an expert design engineer making the most polished user interface.

Technical Constraints & Dependencies:
- FRAMEWORK: MUST use React and Tailwind CSS utilities.
- ICONS: MUST use 'lucide-react'. Do NOT write raw <svg> paths. This is CRITICAL to prevent code truncation.
- MOTION: Do NOT import or use 'framer-motion'. Use CSS transitions/animations, Tailwind animate-*, or light React state for motion. Honor prefers-reduced-motion.
- INTERACTIVITY: Keep components reactive with animation/transitions to improve their function.
- ONBOARDING: Highlight the main function with a floating marker and/or tooltip in the Preview/default demo harness only. Do not require onboarding tips inside the reusable named primitive.
- STATES: Use lightweight local React state ('useState') for interactive elements.
- IMAGES: If media placeholders are needed, MUST use one placeholder from our CDN:
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-01.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-02.png
  - https://raw.githubusercontent.com/pabliqe/patttterns-cdn/refs/heads/main/placeholder-03.png
- DEPS COMMENT: When lucide-react (or other peers) are imported, include `// @deps lucide-react` near the top. Never depend on framer-motion.
- Keep DOM nesting shallow (<5 levels deep) and mock data minimal (maximum 6 items) to prevent token exhaustion.

Aesthetic & Theme Rules:
- STYLE: Keep clean shadcn/ui style but color using only existing CSS tokens:
  -   --ui-bg, --ui-surface, --ui-text, --ui-text-muted, --ui-border, --ui-ring, --ui-accent, --ui-accent-contrast, --ui-success, --ui-success-contrast, --ui-warning, --ui-warning-contrast, --ui-error, --ui-error-contrast, --ui-info, --ui-info-contrast, --ui-font-headings, --ui-font-body, --ui-font-code, --ui-text-scale, --ui-spacing, --ui-corners
- CSS TOKENS: Do NOT override these tokens. Do not hard-code brand hex colors in UI chrome.
- NO MOCKUPS: Do NOT mock devices or extra frames.
- RESPONSIVE: Layout MUST adapt to width sizes from 1440px to 320px. Always hide menus and lateral sidebars.
- ACCESSIBILITY (mandatory): meaningful alt text; aria-labels on icon-only buttons; keyboard support for the primary interaction; visible focus rings; honor prefers-reduced-motion for autoplay/heavy motion.
```

### Default `ModificationRequest` — `mode: "reimagine"` (first button)

Joined as one paragraph in code. Sampling: `temperature 0.3`, `topP 0.7`.

Reimagine may change interaction mechanics or UI approach when that better serves Title + Description + Tags + InteractionRecipe, but must not invent a different pattern.

### Default `ModificationRequest` — `mode: "fix"` (“Fix UI bugs” button)

Sampling: `temperature 0.2`, `topP 0.5` (more surgical).

Fix must **stick to the current seed/layout** (structure, spacing intent, hierarchy, IA) and surgically repair bugs — no reimagining.

### Retry `ModificationRequest` (near-duplicate only)

Reimagine retry asks for a more distinct interaction/UI approach while keeping Title/Description/Tags/Recipe intent. Fix retry asks for more concrete bug repairs while keeping seed layout exactly.

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
| `ENABLE_COMPONENTS_REGENERATE_IMAGE` | off | Attach cover still |

---

## Diff vs earlier slim PROMPT B

| Restored / added | Notes |
|------------------|-------|
| Full rigid rules (onboarding, CDN images, a11y, hide sidebars, interactivity) | Shared with PROMPT A via `prompt-shared.mjs` |
| XML structure on seed + regenerate | `DesignSystemRules` / `PatternContext` / `InteractionRecipe` / … |
| Full Notion tags (no uxFlows split) | Devices / System / Language / UX / UI in one `<tags>` list |
| Stronger mode briefs | Reimagine = more UI/interaction freedom; Fix = stick to seed/layout |
| Active baseline | Improves from latest `vN`, not only seed |
| Server meta enrich | Description/tags without UI changes |
| Mild temp/topP + random seed | Reduces identical copies |
| Near-dup retry | One stronger pass when similarity is high |

**Deferred** (new plan if/when needed): free-text `userPrompt`, icon library, viewport params, multimodal GIF frames on Function.

---

## Local debug regenerate

`src/lib/component-generation/regenerate.ts` now uses the **same shared XML** `buildRegeneratePrompt` (including mode briefs). Production `/debug` still prefers the **Netlify Function**; local is the longer-timeout fallback.

---

## Locked intent

1. Keep one shared rigid design-system contract in `prompt-shared.mjs`.  
2. Seed and regenerate both use XML envelopes + full Notion tags + optional InteractionRecipe.  
3. Click-only regenerate quality ships with Reimagine vs Fix UI bugs (`mode`) and no free-text UI params.  
4. Reimagine may change interaction/UI approach within Title/Description/Tags/Recipe; Fix sticks to seed/layout.  
5. Parameterized regenerate (free-text `userPrompt`, viewport, etc.) remains a later pass — open a **new** plan; do not reopen the deleted “Regen Prompt Params” artifact.  
6. Document intentional compromises (still image vs GIF frames, sync timeout) — do not silently drop visual grounding when we add image opt-in.

---

## Code map

| Prompt / context | File |
|------------------|------|
| Shared XML prompts / recipes / mode briefs | `src/lib/component-generation/prompt-shared.mjs` |
| PROMPT A + GIF/cover parts | `scripts/build-components-cache.mjs` |
| PROMPT B + Function knobs | `netlify/functions/lib/components-generate.mts` |
| Meta enrich + active baseline | `netlify/functions/components-api.mts` |
| `/debug` client payload | `src/components/debug/ComponentsGenerationsTable.tsx`, `src/lib/components-api-client.ts` |
| Local debug regenerate | `src/lib/component-generation/regenerate.ts` |
| Shared theme tokens (app) | `src/lib/component-theme-tokens.ts` |
| Plan status (closed) | `docs/product-roadmaps/specs/click-only-regenerate-quality-plan.md` |

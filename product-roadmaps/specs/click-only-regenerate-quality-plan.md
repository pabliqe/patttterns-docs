---
title: Click-Only Regenerate Quality (Closed)
parent: Specs
nav_order: 22
---

# Click-Only Regenerate Quality — Plan Status

**Status:** Closed (shipped)  
**PR:** [#32](https://github.com/pabliqe/patttterns-next/pull/32)  
**Canonical prompt contract:** [Components Generation Prompting](components-generation-prompting)

## Verdict

The open Cursor plan **“Regen Prompt Params”** (`regen_prompt_params_bb34a6ba`) mixed two scopes:

1. **Click-only quality** (rigid rules, XML prompt, active baseline, server meta enrich, mild sampling, near-dup retry) — **done**
2. **Parameterized regenerate UI** (`userPrompt`, fix/explore mode, viewport, icon library form on `/debug`) — **not started**; deferred on purpose after scope narrowing

That artifact plan is **closed/deleted**. Do not reopen it as-is. If parameterized regenerate returns, open a **new** plan scoped only to UI + API params.

## Shipped checklist

| Item | State |
|------|--------|
| Align Function regenerate rules with 1st-gen rigid block | Done |
| XML prompt (`DesignSystemRules` / `PatternContext` / `CurrentComponent` / `ModificationRequest`) | Done |
| Stronger default ModificationRequest (no UI prompt) | Done |
| Baseline = active `vN` else seed | Done |
| Server meta enrich (body → Blobs → `search-index.json`) | Done |
| Mild temp/topP + thinkingBudget ~1024 + random seed | Done |
| Near-duplicate retry | Done |
| Update PROMPT B docs | Done |
| `/debug` regenerate form (userPrompt / mode / viewport) | Deferred |
| Shared rules module extracted for cache script + Function | Deferred (rules text aligned; not a shared import yet) |

## Deferred backlog (future plan only)

- `userPrompt` + `mode` (`fix` | `explore`) on `POST op=generate`
- Viewport prompt directives (`desktop` | `mobile-first`)
- Optional `/debug` form UI (Export CTA later)
- Shared design-rules module packaging across Netlify Function + `build-components-cache.mjs`
- Multimodal GIF frames on Function regenerate (timeout-sensitive)

## Code

- `netlify/functions/lib/components-generate.mts`
- `netlify/functions/components-api.mts`
- `docs/product-roadmaps/specs/components-generation-prompting.md`

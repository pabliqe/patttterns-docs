---
title: Component Generation Quality PRD
parent: Specs
nav_order: 21
---

# PRD: Component Generation Quality (Reusable + Robust Regenerates)

**Status:** Proposed  
**Updated:** August 2026  
**Owner:** Product / Platform  
**Related:** [Components API CDN PRD](components-api-cdn-prd), [Authenticated MCP Library PRD](authenticated-mcp-library-prd), [AI metadata/components checklist](../roadmaps/ai-metadata-components-consistency-checklist)

## Executive summary

Improve how Gemini turns pattern screenshots + seed TSX into **visitor-usable demos** and **agent-reusable components**, without a costly full seed rebuild.

Primary delivery surface for this initiative is **`/debug` regenerate** (two actions: **Reimagine** and **Fix UI Bugs**), improved by shared prompts, interaction recipes, and post-gen gates. Seeds stay frozen until those regenerates are proven.

MCP code delivery already works; this PRD hardens generation quality so MCP/export consumers get better artifacts when versions promote to active.

---

## Problem

Seed generation optimizes for **polished screenshot recreation**. That produces strong pattern demos for humans on the site, but weak defaults for:

- Code reuse (full-page shells, marketplace chrome, baked copy)
- Interaction correctness (state bugs, inconsistent navigation models)
- Accessibility beyond superficial `aria-*`
- Consistent `usage_rules` for MCP (e.g. empty `animation_libraries` while Framer is imported)

Prompt copies diverge across batch seed (`build-components-cache.mjs`), local regenerate (`regenerate.ts`), and Netlify slim regenerate (`components-generate.mts`). Validation today is mostly **shape + TypeScript syntax**, not a11y/token/composable-shape quality.

Mass re-seeding every pattern is **expensive and slow**. Quality gains must ship and be validated on the **regenerate path first**.

---

## Goals

1. Keep **two `/debug` regenerate actions** — **Reimagine** and **Fix UI Bugs** — with clearer contracts and better outputs.
2. Make regenerate prompts **shared, testable, and stronger** than today’s single “improve polish” pass.
3. Preserve **visitor usability** in demos (including intentional onboarding tips) while improving **export/MCP reusability** where it matters.
4. Keep **`--ui-*` design tokens** and **CDN image placeholders** (including planned light/dark SVG logos).
5. Add **cheap static quality gates** before promoting a regenerate to active.
6. Validate end-to-end on regenerate **before any batch seed rebuild**.

## Non-goals

- Rebuilding all seeds as part of this initiative (blocked until regenerate is 100% proven).
- Carousel-specific product work (carousel was an MCP smoke test only).
- Redesigning the Components API/CDN storage model (already covered elsewhere).
- Replacing Framer Motion / Lucide as allowed deps (keep; declare them correctly).
- Shipping authenticated MCP Phase 3 in this PRD (consume better code later; don’t block on it).

---

## Product principles (locked decisions)

### Dual audience: demo vs reusable

| Audience | Priority surface | What we optimize for |
|----------|------------------|----------------------|
| **Visitor / preview** | Pattern page preview, `/debug` canvas | Discoverability, “what does this pattern do?”, usable prototype |
| **Adopter / agent** | Export panel, MCP `get_component`, replication prompt | Named primitive, props, tokens, a11y, minimal chrome |

Seeds and **Reimagine** lean visitor. **Fix UI Bugs** (and export-oriented packaging) lean adopter. One codebase can serve both via **named export primitive + default Preview harness**.

### Onboarding tips stay (scoped)

Floating markers / tooltips that highlight the main interaction are **intentional** for visitor prototypes. Keep them for:

- Seed demos
- Reimagine outputs when they improve first-run understanding

Do **not** require them inside the **named reusable export**. Prefer:

```tsx
export function PatternPrimitive(props) { /* clean interaction */ }
export default function Preview() {
  return (
    <PreviewShell showOnboardingTip>
      <PatternPrimitive {...mockProps} />
    </PreviewShell>
  );
}
```

### Chrome policy

Unnecessary **device frames, fake logos, global topbars, and side navs** hurt reuse and token budgets. Trim them from the reusable primitive. Limited contextual chrome may remain in Preview when it clarifies the pattern (e.g. a thin header that frames an ecommerce hero) — Fix UI Bugs should prefer stripping; Reimagine may keep light context.

### Tokens + placeholders stay

- Color/type/spacing via existing `--ui-*` tokens only (no hard-coded brand hex in generated UI chrome).
- Media via CDN placeholders only; extend with **light and dark SVG logo** assets when ready (same placeholder contract).
- Adopters remapping tokens or swapping placeholders is expected and supported.

---

## `/debug` regenerate actions

Keep **both** actions. Wire each to an explicit `regenerateMode` on the components API.

### 1. Reimagine

**Intent:** Creative alternate of the same pattern — better polish, clearer hierarchy, stronger motion — without changing the pattern’s job.

| | |
|--|--|
| **Preserves** | UX intent, IA, tags-driven behavior, token contract, placeholder media |
| **May change** | Layout rhythm, density, motion feel, microcopy framing, light contextual chrome |
| **Must keep** | Visitor-friendly cues when helpful (onboarding tip allowed in Preview) |
| **Must not** | Invent a different pattern; drop a11y below seed; introduce hard-coded colors |

Prompt emphasis: *“Reimagine presentation; preserve interaction model and accessibility baseline.”*

### 2. Fix UI Bugs

**Intent:** Harden the seed for correctness, a11y, and reuse. Prefer boring reliability over visual novelty.

| | |
|--|--|
| **Preserves** | Pattern meaning and primary interaction |
| **Must improve** | Keyboard paths, labels/roles, focus rings, reduced-motion, state correctness, token-only styling |
| **Should improve** | Extract named primitive; move tips/chrome into Preview; declare deps; props for copy/media |
| **Must not** | Gratuitous restyle; new unrelated sections; drop tokens/placeholders |

Prompt emphasis: *“Fix interaction bugs and accessibility gaps; make the named export reusable; keep Preview demo-friendly.”*

### API / UI contract

```ts
type RegenerateMode = "reimagine" | "fix_ui_bugs";
```

- `/debug` generations UI: two buttons (or menu items), not one generic Regenerate.
- `POST` generate payload includes `mode: RegenerateMode`.
- Version metadata stores `mode` (+ model, author) for audit in the generations table.
- Active promotion rules unchanged initially; later optional: prefer `fix_ui_bugs` for MCP “export-ready” badge.

**Note:** If production UI currently exposes a single Regenerate control, this PRD **formalizes** Reimagine + Fix UI Bugs as the target UX; implementation replaces the single action rather than adding a third.

---

## Generation contract improvements

### 1. Single shared prompt module

One source of truth used by:

- Batch seed builder (unchanged behavior until Phase C)
- Local regenerate
- Netlify `components-generate`

Structure:

1. **Design system block** — tokens, Lucide, Framer, placeholders, responsive bounds  
2. **Mode block** — seed | reimagine | fix_ui_bugs  
3. **Recipe block** — optional, from tags / UI category (see below)  
4. **Output shape block** — primitive + Preview  
5. **Context** — pattern JSON + seed TSX (+ optional cover image)

Kill prompt drift (a11y present on seed, missing on Netlify slim path).

### 2. Output shape (regenerate-first)

Required for **Fix UI Bugs**; encouraged for **Reimagine**:

- Named export = pattern primitive (props for slides/items/copy where applicable)
- `export default` = Preview harness only (`min-h-screen` / tips / light context allowed here)
- Header comment deps: `// @deps lucide-react, framer-motion` → populate MCP `usage_rules.animation_libraries`
- No hard-coded hex; tokens only
- Placeholders from CDN list only (plus future light/dark logo SVGs)

### 3. Interaction recipes (tag-driven, not carousel-centric)

Screenshots under-specify behavior. When tags/categories match, inject a short **recipe** (checklist, not a full tutorial).

Examples (illustrative, not a carousel project):

| Signal | Recipe focus |
|--------|----------------|
| Carrousel / slider / swiper | Single index source of truth, safe wraparound, keyboard + labeled controls, pause autoplay on hover/focus, `prefers-reduced-motion` |
| Modal / dialog | Focus trap basics, Escape, labelled title, restore focus |
| Tabs | `tab` / `tabpanel` relationships, arrow keys optional |
| Forms | Label association, error text, disabled submit clarity |

Recipes apply to **both** regenerate modes; Fix UI Bugs treats them as hard requirements, Reimagine as baseline not to regress.

### 4. Onboarding tip rule (refined)

Replace global *“MUST highlight with floating marker”* with:

- **Preview / seed / Reimagine:** onboarding tip **encouraged** when it clarifies the primary control.
- **Named primitive / Fix UI Bugs export path:** tip **must not** be baked into the primitive API; optional Preview wrapper only.

---

## Validation gates (regenerate promote path)

Run before writing/promoting a regenerate version. Prefer fail → **targeted repair pass** (diagnostics in prompt) over silent accept.

| Gate | Purpose |
|------|---------|
| Existing shape + TS syntax | Keep |
| Token lint | Reject `#hex` / `rgb(` in UI chrome (allowlisted CDN URLs OK) |
| Deps detect | Fill `animation_libraries` / peer deps from imports |
| Output shape (Fix UI Bugs) | Named export + default Preview |
| A11y pack | Labels on icon buttons; no click-only `div` primary controls; `alt` on meaningful images; reduced-motion check if `setInterval`/autoplay present |
| Recipe pack | If recipe matched, assert key markers (e.g. keyboard handler present for carousel-tagged patterns) |

**Out of scope for v1:** full axe CI on every pattern, Playwright matrix for all IDs. Optional smoke later for premium-ready.

Netlify regenerate today skips syntax repair — **Fix UI Bugs** path should regain repair (or fail loudly) even under timeout constraints; Reimagine may keep flash-first with clear error UX.

---

## Rollout plan (cost-aware)

### Phase A — Regenerate hardening (no seed rebuild)

**Status: In progress (Aug 2026) — prompting upgraded; gates still open.**

Shipped:

1. Shared export packaging (Phase B) for app/MCP consumers  
2. **Reimagine / Fix UI bugs prompts upgraded** in `netlify/functions/lib/components-generate.mts`:
   - Preview-scoped onboarding tips (visitor demos stay usable)
   - Named primitive + default Preview encouraged (Reimagine) / required when feasible (Fix)
   - Stronger a11y + `prefers-reduced-motion` + `// @deps`
   - Optional `<InteractionRecipe>` from tags (carousel/modal/tabs/popover)
3. Docs: [Components Generation Prompting](components-generation-prompting) updated to match

Still open:

- Static promote gates (token lint, a11y pack, shape lint)
- `/debug` already has two buttons — no UI change needed
- Manual QA on 10–15 IDs after deploy
- Full seed rebuild remains **opt-in later** (Phase C), operator-chosen

**Exit criteria (“100% before seed rebuild”):** unchanged — prove regenerates on a sample set before any fleet `--force` seed run.

### Phase B — Export packaging (optional parallel)

**Status: Partially shipped (August 2026) — usable without seed rebuild.**

Shipped in-app / API (code standards for adopters + agents):

- Shared `src/lib/component-export/*` analyzer: deps, named vs Preview export, required `--ui-*` tokens
- Stronger replication prompt (Copy prompt) with usage-rules JSON + demo-vs-primitive guidance
- Zip export includes `usage-rules.json`, detected `package.json` deps only, integration README, Preview-aware `App.tsx`
- Components API: `GET ?op=active&id=&format=json` returns `{ code, usage_rules, versionId }` for MCP/agent consumers

Still deferred (needs Phase A regenerate / seed shape):

- Components that only have a page-level default export still need Fix UI Bugs / future seeds to emit named primitives
- Optional `export-ready` quality flag when Fix UI Bugs + gates pass
- External Cursor MCP `get_component` should call `format=json` (or equivalent) so `animation_libraries` is no longer empty — wire when MCP server is updated 

### Phase C — Seed prompt alignment (only after Phase A exit)

- Port refined rules into `build-components-cache.mjs`  
- **Incremental** seed regen only (`--ids`, `--promote=changed`), never blind full fleet  
- Onboarding tip remains for seed Preview; chrome policy applied carefully so visitor demos don’t become empty canvases  

### Phase D — Optional quality states

- `draft` / `reviewed` / `export-ready` from existing commercial-asset checklist  
- MCP `active` policy can prefer export-ready when available  

---

## Acceptance criteria

1. `/debug` exposes **Reimagine** and **Fix UI Bugs** with distinct prompts and stored `mode`.  
2. Fix UI Bugs output includes a **reusable named export** and a **Preview default** when feasible.  
3. Reimagine may keep visitor aids (onboarding tip, light context) without requiring them in the named export.  
4. `--ui-*` tokens and CDN placeholders remain mandatory; hard-coded colors fail the gate.  
5. Shared prompt module eliminates seed-vs-Netlify a11y/rule drift for regenerate.  
6. No full-catalog seed rebuild is required to ship Phase A.  
7. Docs updated: this PRD is canonical; checklist links here.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Fix UI Bugs over-strips context and confuses preview visitors | Keep Preview harness; only strip named export |
| Reimagine still drifts into new patterns | Strong “do not invent a different pattern” + seed TSX as primary context |
| Gates too strict → high failure rate | Start with warn+repair; promote hard-fail only for token/a11y blockers |
| Netlify timeout on richer Fix UI Bugs | Flash model + repair loop; fail with actionable error; local debug path for deep fixes |
| Premature seed rebuild wastes budget | Phase A exit criteria are a hard gate; Phase C is opt-in incremental |

---

## Implementation touchpoints (expected)

| Area | Files / surfaces (indicative) |
|------|-------------------------------|
| Shared prompts | New `src/lib/component-generation/prompts/*` (or equivalent), consumed by script + Netlify + local regen |
| API | `components-api` generate op + `components-generate.mts` `mode` |
| Debug UI | `ComponentsGenerationsTable` (or successor): Reimagine / Fix UI Bugs |
| Gates | Shared validators next to `validateGeneratedTsxSyntax` |
| MCP usage_rules | Deps detection when assembling active component payload (server that serves `get_component`) |
| Docs | This PRD; link from specs hub + AI consistency checklist |
| Export packaging | `src/lib/component-export/*`, PatternCodePanel, ArtifactPreviewModal, `components-api` `format=json` |

Exact file list locked at implementation start.

---

## Open questions

1. Should **Reimagine** also enforce named-export shape, or only encourage it?  
   **Default proposal:** encourage in Reimagine; **require** in Fix UI Bugs.  
2. Should MCP `active` auto-prefer latest successful `fix_ui_bugs` over newer Reimagine?  
   **Default proposal:** no change in Phase A (latest active wins); revisit in Phase D.  
3. Light/dark logo SVG URLs — finalize CDN paths before baking into the placeholder allowlist.  

---

## Summary

Ship better components by upgrading **Reimagine** and **Fix UI Bugs** first: shared contracts, dual demo/reuse shape, scoped onboarding tips, kept tokens/placeholders, and static gates. Prove that loop on regenerate. Only then optionally realign seed generation — incrementally, never as a blind full rebuild.

**Export packaging (Phase B)** can ship ahead of regenerate work: analyze active TSX at export time, guide agents toward primitives + tokens + a11y, and attach `usage_rules` even when seeds are still page demos.

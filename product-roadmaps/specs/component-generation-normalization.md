---
title: Component Generation & Normalization Pipeline
parent: Specs
nav_order: 22
---

# Component Generation & Normalization Pipeline

**Purpose:** What happens after Gemini returns text, why we rewrite that text, and how preview/export stay on the same file.  
**Related:** [Generation vs regenerate prompts](components-generation-prompting) · [Components cache workflow](../../build-and-deploy/components-cache-workflow) · [Seeds pipeline](../../build-and-deploy/components-seeds-pipeline)

---

## Mental model

| Stage | Gemini? | Writes a new version? | Same TSX for preview & export? |
|-------|---------|------------------------|--------------------------------|
| **Seed** (`build:components`) | Yes | Canonical `public/components/code/{id}.tsx` | Yes, after normalize |
| **Regenerate** (`/debug` Regenerate) | Yes | New `vN` (history + canonical) | Yes, after normalize |
| **Rebuild** (`/debug` Rebuild) | **No** | New `vN` if file changes; **active** on disk (local) or Blobs (prod) | Yes |
| Preview iframe host CSS / Tailwind token mapping | No | No | Host-only; zip ships the same `tailwind.config.js` + `tokens.css` |

Do **not** morph component TSX only inside the preview iframe. Copy, zip, MCP, and the visualizer must read the stored file.

---

## Flow

```text
Gemini raw text
    │
    ▼
normalizeGeneratedComponentCode()     ← always, before any save
    │  1. Strip markdown fences / prose before first import
    │  2. Strip `use client` (portable TSX, not a Next app)
    │  3. Move React type-only imports (KeyboardEvent, FC, …) to `import type`
    │  4. Lucide: real icon names, `import type` for LucideIcon, fold heroicons/react-icons onto lucide-react
    │  5. Ensure `export default`
    │
    ├─ Seed: optional Gemini syntax-repair if transpileModule fails
    │        (scripts/build-components-cache.mjs). Netlify regen does not repair.
    ├─ Then: validateGeneratedTsxSyntax() — parse/transpile only
    │        (does NOT check that lucide-react named exports exist)
    │
    ▼
Stored TSX  →  preview · copy · zip · MCP
```

**Rebuild** skips Gemini. It loads the clicked version, runs the same normalizer, and:

- if the hash is unchanged → no new version (“already normalized”)
- if it changed → new `vN` with `mode: "rebuild"`, `model: "normalize"`, **promoted to active**

Local: `POST /api/debug/components/[id]/rebuild` (on-disk history + canonical file).  
Production `/debug`: `POST components-api?op=rebuild` (same auth as generate for now) → Blobs `vN` + `activeVersionId`. Seed blob is never overwritten.

If the clicked version is not in Blobs, the Function returns `version_missing` (does not silently rebuild a different baseline).

**Publish to Blobs** (localhost `/debug` row menu) uploads the selected on-disk file. Missing seed → `op=publish` `kind=seed` (same immutability as `put-seed`). Local regenerate/rebuild → new Blobs `vN` + `activeVersionId`. Existing seed blobs are never overwritten. Blobs `vN` may differ from the local version id.

---

## Why we alter model output

The prompt is the **intent** contract (lucide, no framer-motion, tokens). The model is not a compiler.

Mechanical failures we fix in code rather than hoping the next sample is clean:

| Rewrite | Why |
|---------|-----|
| Fence / preamble strip | Gemini wraps TSX in ` ```tsx ` or explains first |
| `"use client"` | Breaks portable preview/export |
| React type-only named imports | `import { KeyboardEvent } from "react"` is valid TS and an ESM crash in the browser |
| Lucide aliases + types + other icon kits | `ListText` / `LucideIcon` as values / `@heroicons` fail native ESM and Vite the same way |

Syntax validation does **not** resolve `lucide-react`. Invalid icon names can still be saved until Rebuild (or a new gen with the lucide rewrite) remaps them (`List as ListText`, unknown → `Circle as Name`).

Host Tailwind spacing/radius/fontSize → `--ui-*` is **not** a TSX rewrite. Preview iframe and export zip must keep that config in lockstep.

---

## Code map

| Piece | File |
|-------|------|
| Normalize pipeline | `src/lib/component-generation/normalize-generated-code.mjs` |
| Lucide / foreign icon rewrite | `src/lib/component-generation/fix-icon-imports.mjs` |
| Seed + syntax repair | `scripts/build-components-cache.mjs` |
| Local / Function regen (calls normalize after Gemini) | `src/lib/component-generation/regenerate.ts`, `netlify/functions/lib/components-generate.mts` |
| Debug Rebuild | `src/app/api/debug/components/[id]/rebuild/route.ts` (local) · `POST ?op=rebuild` in `netlify/functions/components-api.mts` (Blobs) |
| Debug Publish | `POST ?op=publish` — local disk TSX → Blobs seed or new active `vN` |
| Debug UI | `src/components/debug/ComponentsGenerationsTable.tsx` |
| Export host CSS | `src/lib/component-export/package-files.ts` (`tailwind.config.js` + `tokens.css`) |
| Preview host CSS | `src/components/debug/ArtifactComponentPreview.tsx` (`buildPreviewSrcDoc`) |

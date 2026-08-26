---
title: Components Cache Workflow
nav_order: 6
---

# Components Cache Workflow

This guide documents the full workflow for generating pattern components cache artifacts.

For run-history storage, model baseline strategy (`flash` vs `pro`), and promotion flow, see:
- [Components Cache History and Model Baselines](components-cache-history-and-model-baselines)

For how **first generation** prompts differ from **Netlify regenerates** (cover/GIF, metadata, temperature), see:
- [Components Generation vs Regenerate Prompting](../product-roadmaps/specs/components-generation-prompting)

## Goal

Generate one artifact per pattern with executable TSX code export, not JSON recipes.

Output includes:
- `reactTailwind` TSX component code (always present)
- Build report file with totals and statuses

## Script and Commands

Primary script:
- `scripts/build-components-cache.mjs`

Normal path — run the full publish pipeline (includes metadata + components):

```bash
npm run publish:content
```

Low-level commands (targeted use only):
- `npm run build:components`
- `npm run build:components:dry`

Examples:

```bash
npm run build:components -- --limit=5 --force
```

```bash
npm run build:components:dry -- --limit=5 --force
```

## Environment Variables

Recommended variables:
- `PATTERN_COMPONENTS_CACHE_MODEL`
- `PATTERN_COMPONENTS_CACHE_GEMINI_TIMEOUT_MS`
- `PATTERN_COMPONENTS_CACHE_MAX_OUTPUT_TOKENS`
- `PATTERN_COMPONENTS_CACHE_NOTION_DELAY_MS`
- `PATTERN_COMPONENTS_CACHE_SEARCH_INDEX_PATH`
- `PATTERN_COMPONENTS_CACHE_METADATA_CACHE_PATH`
- `PATTERN_COMPONENTS_CACHE_OUTPUT_DIR`
- `PATTERN_COMPONENTS_CACHE_OFFLINE`
- `PATTERN_COMPONENTS_CACHE_SKIP_NOTION_SYNC`

Legacy `PATTERN_EXPORT_*` names are still accepted as fallback.

## Input Sources

The script reads:
- `public/search-index.json`
- `public/components/components-metadata.json`

You can override both paths with env vars.

## Output Location

Default output directory:
- `public/components`

Generated files:
- `public/components/code/<normalizedPatternId>.tsx`
- `public/components/_components-report.json`
- `public/components/components-status.json`

**Publish note (Phase 2 closed):** `npm run build` strips `out/components/code` and `out/components/history` after `next build`. Runtime Export/Preview loads TSX from the Components API/Blobs. Repo cache files remain for local `next dev` and seed upload.

**Seeds pipeline (local → Blobs):** after first-gen, upload with `npm run components:seeds:upload` (optional `--ids=`). Full runbook: [Components Seeds Pipeline](components-seeds-pipeline).

**Prompt contract:** First-gen prompts live in this script; production regenerates use the Netlify Function XML path. Exact templates: [Components Generation Prompting](../product-roadmaps/specs/components-generation-prompting).

History outputs (default on for non-dry runs):
- `public/components/history/<runId>/<normalizedPatternId>.generated.tsx` (generated candidate artifact for each successful pattern)
- `public/components/history/<runId>/<normalizedPatternId>.tsx` (previous canonical backup when overwrite occurs and promotion writes canonical)
- `public/components/history/<runId>/manifest.json`
- `public/components/history/runs.json`

## Promotion Semantics

Successful generations **always write** to `public/components/code/<id>.tsx` by default (`--promote=all`). Omit the flag for normal seed shipping.

`--promote` is only for offline experiments:

- `all` (default): publish successful outputs to canonical files.
- `none`: generate + history only — do not overwrite canonical files.
- `changed`: publish only when generated hash differs from canonical hash.

Additional behavior:
- Notion sync is tied to promotion and runs only for promoted items.
- `manifest.json` tracks both `generatedFile` (candidate artifact path) and `backupFile` (pre-overwrite canonical snapshot when applicable).

## Artifact Shape

Each pattern artifact is a TSX component file.

```tsx
import { useState } from "react";

export default function PatternComponent() {
  const [open, setOpen] = useState(false);
  return <div className="p-6">...</div>;
}
```

## Code Guarantees

The build enforces component-shaped TSX for `reactTailwind`:
- If Gemini returns malformed/truncated JSON, the request is retried with stricter compact prompt constraints.
- If Gemini still fails or returns non-component text after retries, that pattern is marked as failed.
- Generic local placeholder component fallback is intentionally disabled.

## Notion Sync Behavior

Notion sync is disabled by default.

To enable Notion sync:
- Set `PATTERN_COMPONENTS_CACHE_SKIP_NOTION_SYNC=0`
- Ensure `NOTION_API_KEY` and `NOTION_ALL_PATTERNS_DATABASE_ID` are configured

If a Notion property does not exist, script logs a warning and continues.

## Debug Workflow

1. Build only 5 patterns with forced regeneration:

```bash
npm run build:components -- --limit=5 --force
```

2. Build offline (no Gemini call):

```bash
PATTERN_COMPONENTS_CACHE_OFFLINE=1 npm run build:components -- --limit=5 --force
```

3. Dry run without writing artifacts:

```bash
npm run build:components:dry -- --limit=5 --force
```

4. Capture logs to file:

```bash
npm run build:components -- --limit=5 --force 2>&1 | tee /tmp/components-cache-build.log
```

## Typical Log Output

- `[components-cache] [1/5] ok /patterns/...`
- `[components-cache] [x/5] fail /patterns/...: Gemini failed across models ...`
- `[components-cache] done { total, generated, skipped, failed }`

Gemini failures are isolated per-pattern and reported in `_components-report.json`; failed patterns are not replaced by generic local code.

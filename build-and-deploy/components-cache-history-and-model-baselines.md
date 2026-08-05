---
title: Components Cache History and Model Baselines
nav_order: 7
---

# Components Cache History and Model Baselines

This document defines an implementation approach to run a full low-cost `gemini-2.5-flash` pass across all patterns without losing existing higher-quality `gemini-2.5-pro` artifacts.

## Objective

Preserve current canonical components while enabling:
- cheap baseline generation runs,
- full traceability per run/model,
- controlled promotion of selected outputs into canonical files.

## Key Decision

Use immutable run snapshots plus explicit promotion.

Do not use rolling `.bak` files as the primary strategy.

Why:
- `.bak` stores only one previous state and is easily overwritten.
- Immutable snapshots preserve complete lineage by run and model.
- Promotion keeps runtime output stable and intentional.

## Storage Layout

Keep canonical output unchanged:
- `public/components/code/{normalizedId}.tsx`

Add run generated artifacts (one per successful pattern):
- `public/components/history/{runId}/{normalizedId}.generated.tsx`

Add run backups (previous canonical before overwrite when promoted):
- `public/components/history/{runId}/{normalizedId}.tsx`

Add run metadata:
- `public/components/history/{runId}/manifest.json`

Add global history index:
- `public/components/history/runs.json`

## Run Identity

Introduce run id format:
- `{YYYYMMDDTHHmmssZ}`

Examples:
- `20260528T120405Z`
- `20260528T121110Z`

## Implementation Status

Implemented now in `scripts/build-components-cache.mjs`:
- history snapshots are enabled by default on non-dry runs,
- generated candidate artifacts are written for each successful pattern,
- backup snapshots are written only on overwrite,
- per-run manifest is written,
- global runs index is written,
- promotion mode is configurable.

## Script Changes

Target file:
- `scripts/build-components-cache.mjs`

### 1) New CLI Flags

- `--run-id=<id>`: optional explicit run id.
- `--no-history`: opt out of history writes.
- `--promote=<mode>`: `none | all | changed`.
- `--baseline=<name>`: mark run class, e.g. `flash-full`.

Current defaults:
- history on by default for non-dry runs,
- promotion default `all` (preserves current canonical-overwrite behavior).

### 2) Content Hashing

For each generated TSX:
- compute `sha256` of normalized content,
- store hash in per-run `manifest.json`,
- compare hash with canonical file hash.

Promotion rules:
- `none`: never touch canonical file,
- `all`: always overwrite canonical,
- `changed`: overwrite only if hash differs.

### 3) Write Order

For each pattern:
1. Generate code.
2. Validate TSX syntax (existing behavior).
3. Write generated candidate artifact into run history.
4. If canonical will be overwritten, snapshot previous canonical into run history.
5. Optionally promote generated output to canonical path per `--promote`.
6. Record per-pattern status + hashes in run manifest.

This keeps all generated outputs traceable by run while preserving promotion as an explicit canonical publish step.

### 4) Status/Report Compatibility

Keep existing files to avoid breaking consumers:
- `public/components/components-status.json`
- `public/components/_components-report.json`

Extend status payload with optional fields:
- `lastRunId`
- `lastModel`
- `lastHash`
- `promoted` (boolean)

### 5) Notion Sync Safety

When `--promote=none`:
- do not set Notion `Code Status` to `Generated` for canonical state,
- optionally set a separate property (future) like `Code Baseline Flash`.

If no separate property exists, keep current Notion behavior unchanged for now and log that run was history-only.

## New Utility Scripts (Optional but Recommended)

### `scripts/promote-components-run.mjs`

Purpose:
- promote selected artifacts from history run into canonical output.

Flags:
- `--run-id=<id>`
- `--ids=<id1,id2,...>` optional
- `--limit=<n>` optional
- `--dry-run`

### `scripts/diff-components-runs.mjs`

Purpose:
- compare two runs (or run vs canonical) and produce summary.

Output:
- changed ids,
- identical count,
- missing count.

## Commands for Your Primary Goal

### 1) Full cheap baseline (keep current pro canonical intact)

```bash
PATTERN_COMPONENTS_CACHE_MODEL=gemini-2.5-flash npm run build:components -- --force --promote=none --baseline=flash-full
```

Result:
- full flash run saved under history,
- current canonical pro artifacts remain untouched.

### 2) Evaluate differences

Use diff script (once added) to find candidates for promotion.

### 3) Promote selected outputs

```bash
node scripts/promote-components-run.mjs --run-id=<flash-run-id> --ids=<comma-separated-ids>
```

### 4) Regenerate selected with pro and promote changed

```bash
PATTERN_COMPONENTS_CACHE_MODEL=gemini-2.5-pro npm run build:components -- --ids=<comma-separated-ids> --force --promote=changed --baseline=pro-refine
```

## Manifest Shape (Draft)

`public/components/history/{runId}/manifest.json`:

```json
{
  "runId": "20260528T120405Z-flash-components-cache-p2-react-code-only-v6",
  "model": "gemini-2.5-flash",
  "baseline": "flash-full",
  "generatorVersion": "components-cache-p2-react-code-only-v6",
  "generatedAt": "2026-05-28T12:04:05.000Z",
  "counts": {
    "total": 1200,
    "generated": 1160,
    "failed": 40,
    "promoted": 0
  },
  "items": [
    {
      "id": "abc123",
      "generatedFile": "public/components/history/<runId>/abc123.generated.tsx",
      "backupFile": "public/components/history/<runId>/abc123.tsx",
      "canonicalFile": "public/components/code/abc123.tsx",
      "contentHash": "sha256:...",
      "canonicalHashBefore": "sha256:...",
      "canonicalHashAfter": "sha256:...",
      "promoted": false,
      "status": "generated"
    }
  ]
}
```

## Retention Policy

Recommended initial policy:
- keep last 5 flash runs,
- keep last 10 pro runs,
- never auto-delete canonical files,
- prune old history runs only after manifest/index update succeeds.

## Remaining Plan

1. Add promotion utility script.
2. Add run diff utility script.
3. Add optional retention pruning by policy.
4. Extend `/debug/components` selector to include history runs.

## Risks and Mitigations

- Disk growth from snapshots:
  - Mitigation: retention + optional gzip archive for old runs.

- Confusion between baseline and canonical state:
  - Mitigation: explicit `--promote` flag and manifest fields.

- Downstream tooling expecting only canonical directory:
  - Mitigation: keep canonical location and schema unchanged.

## Success Criteria

- A full flash run can complete with `--promote=none` and zero canonical overwrites.
- Existing pro artifacts in `public/components/code` remain unchanged.
- Every generated artifact is traceable to `runId`, model, and hash.
- Promotion from history to canonical can be done deterministically per id.
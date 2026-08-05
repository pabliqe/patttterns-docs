---
title: Cache Fingerprints
nav_order: 7
---

# Cache Fingerprints

This document explains cache invalidation and regeneration behavior for:
- `scripts/build-metadata-cache.mjs`
- `scripts/build-components-cache.mjs`

Fingerprinting is used for components cache invalidation.
Metadata now prioritizes existing descriptions and only uses Gemini when needed.

## Why Fingerprints Exist

Each pattern gets a deterministic hash (`sha256`) from a set of source inputs.

If the hash did not change, the script skips regeneration for that pattern.

If the hash changed, the script regenerates that pattern only.

Note:
- This applies to components cache invalidation.
- Metadata no longer uses fingerprint equality as a skip gate.

## Pipeline Order

`build:artifacts` runs in this order:
1. `build-metadata-cache.mjs`
2. `build-components-cache.mjs`
3. artifacts report finalization

Metadata runs first because it refreshes the shared description cache.
Components can still run independently when description data is incomplete.

### Metadata Processing Logic

Metadata no longer uses fingerprint equality as a hard skip gate.

For each pattern, description resolution follows this order:
1. previous metadata cache description
2. `public/search-index.json` description
3. Notion `Description` property (when available)
4. Gemini generation (only if all previous sources are missing/invalid)

Output file:
- `public/components/components-metadata.json`

## Components Fingerprint

Defined in `buildFingerprint(...)` inside `scripts/build-components-cache.mjs`.

Inputs used in the components fingerprint payload:
- `appVersion`
- `generatorVersion`
- `id`
- `title`
- `slug`
- `tags` (from search index entry)
- `referenceImages` (resolved from search entry image fields)

### Components Skip Logic

Components skips a pattern when:
- `--force` is not set
- previous component artifact exists
- previous `sourceFingerprint` equals current components fingerprint

Otherwise components regenerates that pattern, writes `public/components/code/<id>.tsx`, and updates components status.

## Metadata And Components Independence

Components no longer depend on metadata descriptions for invalidation.

Description context for components is resolved as:
1. metadata description (if valid)
2. search-index description (if valid)
3. empty description (continue using title/tags/image context)

Artifacts finalization now reports components without descriptions as warnings, not hard failures.

## Gemini Cost Implications

- Metadata calls Gemini only when no valid existing description is found from cache/search/Notion.
- Components remains a Gemini code-generation stage.
- Components fingerprint stability keeps component Gemini calls bounded.

If component fingerprints are stable, components are skipped and no new component Gemini call is made for those patterns.

## Limit and Safety Notes

To test safely with a subset:

```bash
npm run build:artifacts -- --limit=3
```

Both metadata and components now honor npm-style limit propagation in the artifacts pipeline, so the subset stays consistent.

## Quick Debug Checklist

1. Check metadata cache source + limit:

```bash
cat public/components/components-metadata.json | jq '.source, .stats'
```

2. Check description source and status for one pattern:

```bash
cat public/components/components-metadata.json | jq '.items[] | select(.id=="343e4bae-3d76-80b4-872a-c0ebf5b4ed4c") | {id, lastProcessedAt, status, description}'
```

3. Check component status fingerprint:

```bash
cat public/components/components-status.json | jq '.items[] | select(.id=="343e4bae3d7680b4872ac0ebf5b4ed4c") | {id, sourceFingerprint, generatedAt, generatorVersion, status}'
```

4. Force one subset regeneration when validating prompt/fingerprint changes:

```bash
npm run build:artifacts -- --limit=3 --force
```

## Expected Behavior Summary

- Metadata always re-evaluates each selected pattern and only generates descriptions when needed.
- Components fingerprint controls component artifact refresh.
- Components and descriptions are independent build concerns.
- Runtime description resolution remains metadata-first with search fallback.

---
title: 🟠 Pattern Metadata Cache
parent: Roadmaps
nav_order: 6
---

# ROADMAP - Pattern Metadata Cache

Status: Phase 2 in progress (Phase 1 completed)
Updated: May 2026
Owner: PATTTTERNS

---

## Goal

Build a local, build-time "pattern intelligence layer" for 400+ patterns that:

1. Uses the current Gemini key integration (`GEMINI_API_KEY`).
2. Runs locally first (GitHub Actions-ready later).
3. Uses the new Notion props already created: `Description`, `VotesUp`, `VotesDown`, `Version`.
4. Syncs safely to Notion without overwriting manual edits by default.

---

## Adapted to Current Stack

- Framework/runtime: Next.js App Router + Node build scripts (`scripts/*.mjs`)
- Current content source: Notion API + `public/search-index.json` + `public/.notion-cache/*`
- Existing version stamping: `scripts/build-search-index.mjs` already updates Notion `Version`
- Existing Gemini secret pattern: `GEMINI_API_KEY` already used in chatbot server code
- Existing retry/backoff baseline: Notion fetch wrappers already in build scripts

Decision: Keep metadata generation as a standalone local build script that reuses the same environment model and JSON artifacts used by existing prebuild workflows.

---

## Architecture Flow (Text Diagram)

```
Notion DB rows (patterns)
  + search-index.json (title/slug/tags/cover/searchText)
    -> Delta check (fingerprint: Notion last_edited_time + text + votes)
      -> Gemini metadata extraction (JSON-only)
        -> Safe Notion sync:
             - Description (guarded, no manual overwrite by default)
             - Version (aligned with package.json on managed updates)
        -> public/pattern-metadata-cache.json (production cache)
          -> Next.js runtime / MCP / future snippet engines
```

---

## Data Schema (Phase 1)

```ts
export interface PatternMetadata {
  id: string;

  sourceFingerprint: string;
  lastProcessedAt: string;
  lastSyncedDescription: string | null;

  notion: {
    lastEditedTime: string | null;
    version: string | null;
    votesUp: number | null;
    votesDown: number | null;
    description: string | null;
  };

  ai: {
    description: string;
    uxContext: string[];
    uiContext: string[];
    interactions: string[];
    uiStates: string[];
    layoutSignals: string[];
    frameworkHints: {
      shadcn: string[];
      mui: string[];
      tailwind: string[];
    };
  };

  sync: {
    dryRun: boolean;
    updatedNotionDescription: boolean;
    updatedNotionVersion: boolean;
    manualDescriptionProtected: boolean;
  };
}

export interface PatternMetadataCache {
  schemaVersion: 2;
  generatedAt: string;
  appVersion: string;
  generatorVersion: string;
  items: PatternMetadata[];
}
```

Note: Base pattern fields (slug/title/type/tags/cover/search text) stay in
`public/search-index.json`. `public/pattern-metadata-cache.json` stores only
AI/sync/delta data keyed by `id`.

---

## Agent Loop (Pseudocode)

```text
load package.json version
load public/search-index.json
load previous public/pattern-metadata-cache.json (if any)
query all rows from NOTION_ALL_PATTERNS_DATABASE_ID

for each pattern in search-index where type=pattern:
  find notion row by id
  read Notion props: Description, VotesUp, VotesDown, Version

  fingerprint = sha256(title, slug, searchText, last_edited_time, description, votes)

  if not force and fingerprint unchanged and appVersion/generatorVersion unchanged:
    keep previous entry
    continue

  ai = Gemini(JSON-only metadata extraction)

  manual_protected = notion.Description exists
                     and overwrite-description flag not enabled
                     and current notion description != last AI-synced description

  if sync mode:
    if description empty OR managed overwrite condition:
      update Notion Description
    if Version differs and pattern was managed this run:
      update Notion Version

  write cache entry

write public/pattern-metadata-cache.json
print stats
```

---

## Output Cache Policy

- Primary production cache: `public/pattern-metadata-cache.json`
- Non-redundant strategy: metadata cache is compact by `id` and is joined with
  `public/search-index.json` when base pattern fields are needed.
- Notion `Description` update policy:
  - Default: do not overwrite manual edits
  - Overwrite modes:
    - `--overwrite-description` (explicit)
    - managed overwrite only when current Notion text exactly matches previously AI-synced text

This keeps the local cache authoritative for build/runtime while still allowing controlled Notion backfill.

---

## Implementation Phases

## Phase 1 - Local Metadata Cache + Safe Notion Sync (Completed)

Objective: ship a local executable script with delta-check + Gemini generation + guarded Notion updates.

Checklist:

- [x] Create metadata builder script (`scripts/build-pattern-metadata-cache.mjs`)
- [x] Add local commands (`npm run build:metadata`, `npm run build:metadata:dry`)
- [x] Add metadata env documentation (`.env.example`)
- [x] Output compact cache artifact (`public/pattern-metadata-cache.json`)
- [x] Implement safe Notion sync for Description and Version
- [x] Implement fingerprint delta-check and force/limit controls

Acceptance criteria:

- [x] Processes pattern rows from existing Notion + search index
- [x] Reads and stores `VotesUp` / `VotesDown`
- [x] Writes `Description` and `Version` only when safe
- [x] Skips unchanged rows using source fingerprint delta-check
- [x] Supports dry-run, force, limit, and explicit overwrite flags

## Phase 2 - Visual Interaction Extraction + Feedback Capture

Objective: reduce generation failures and capture private quality feedback signals.

Planned:

Checklist:

- [x] Add media-aware fallback for Gemini failures
- [x] Fetch media blocks from Notion page children (including column layouts)
- [x] Retry generation with visualContext (GIF/MP4/WebM + captions)
- [x] Add thumbs up/down on pattern detail pages
- [x] Enforce one vote per browser via local store gate
- [x] Persist votes to Notion VotesUp/VotesDown
- [x] Keep counters private in MVP (no public totals)
- [x] Keep heavy vision retries behind failure path to control cost/latency
- [ ] Reduce remaining failure cases from complex nested media pages

Acceptance criteria:

- [x] Votes are saved to Notion with no public score rendering
- [x] New metadata fields do not break existing search index/runtime
- [ ] Gemini failure count decreases in next full run

### PRD Prompt - Description Quality (Phase 2.1)

Objective:

- Increase useful, match-ready descriptions for pattern discovery without changing existing Search/Content cache contracts.

Constraints:

- Keep current working caches unchanged:
  - `public/search-index.json`
  - `public/.notion-cache/*`
- Media parsing remains core signal.
- Notion properties (flows/components/device/language and related taxonomy fields) must complement visual parsing.
- Prioritize value over strict character limits.

Prompt intent:

- Generate descriptions that help Designers, Developers, and Makers quickly decide if a pattern matches their product need.
- Include practical cues: interaction behavior, context fit, implementation hints, and UX tradeoffs when inferable.
- Prefer complete, high-signal summaries over short but vague blurbs.

Input contract to model:

- Visual context (media URLs + captions and animated hints)
- Search/index context (title, slug, tags, search text)
- Notion props context:
  - flows
  - components
  - devices
  - languages
- Existing description context (for repair/improvement)

Acceptance criteria:

- Lower count of empty AI descriptions in metadata cache.
- Lower `geminiFailures` and measurable `geminiRecoveredWithMediaRetry` after full run.
- Failing examples (e.g. `/patterns/404-sidebar-backdrop-menu`) receive non-empty, useful descriptions.
- Search/index consumers show updated descriptions after standard rebuild flow.

Test plan:

- [ ] Dry-run sample: `npm run build:metadata:dry -- --limit=40`
- [ ] Focused verification in `public/pattern-metadata-cache.json` for previously empty IDs
- [ ] Verify descriptions are actionable, not generic labels
- [ ] Sync run: `npm run build:metadata`
- [ ] Propagation check: `npm run build:search`
- [ ] Validate updated descriptions in `public/search-index.json`

## Phase 3 - Multi-Framework Snippet Engine

Objective: generate practical snippets and component mapping hints with durable storage.

Checklist:

- [ ] Add generated snippets: HTML + Tailwind
- [ ] Add generated snippets: React + Tailwind
- [ ] Add generated snippets: MUI + sx
- [ ] Add shadcn component mapping hints
- [ ] Store canonical snippet payload in `public/pattern-metadata-cache.json`
- [ ] Keep Notion snippet storage as summary/hash only (no large code blobs)
- [x] Description output allows verbose, value-first summaries
- [x] Append recognized behavior/interactions when confidence is high

Acceptance criteria:

- [ ] Snippets deterministic enough for repeated builds
- [ ] Cache contains explicit framework blocks per pattern
- [x] Description output includes actionable behavior context when available

## Phase 4 - Build Pipeline Integration + CI

Objective: integrate metadata generation into full build paths and GitHub Actions.

Checklist:

- [ ] Add optional prebuild hook guard (env flag)
- [ ] Add GH Actions workflow for nightly or manual metadata builds
- [ ] Upload artifact + optional commit back to branch

Acceptance criteria:

- [ ] Local and CI paths produce identical cache format
- [ ] Controlled execution to avoid accidental token/cost spikes

## Phase 5 - Feedback Loop & Quality Gates

Objective: close loop with votes and manual edits.

Checklist:

- [ ] Use VotesUp/VotesDown to prioritize reprocessing candidates
- [ ] Add quality scoring and confidence bands
- [ ] Add lock strategy for Notion fields (Lock AI Description) if introduced later

Acceptance criteria:

- [ ] Manual description edits remain stable across builds
- [ ] Low-rated patterns surface for regeneration review

---

## Commands

```bash
# 1) Build search index first (required source)
npm run build:search

# 2) Metadata dry-run (no Notion writes)
npm run build:metadata:dry

# 3) Metadata sync mode (writes when safe)
npm run build:metadata

# 4) Force reprocess first 20 patterns
npm run build:metadata -- --force --limit=20
```

---

## Risks & Mitigations

- Risk: Notion rate limiting (429)
  - Mitigation: retry/backoff + per-request delays + timeout controls
- Risk: Manual description overwrite
  - Mitigation: default protected sync policy + explicit overwrite flag
- Risk: token/cost drift on full rebuilds
  - Mitigation: fingerprint-based delta-check + limit flag for partial runs
- Risk: unstable model output shape
  - Mitigation: JSON-only prompts + strict parsing + fallback to existing text

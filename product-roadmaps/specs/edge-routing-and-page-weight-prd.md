---
title: Edge Routing and Page Weight
parent: Specs
---

# Edge Routing and Page Weight

Reduce static page weight, remove unnecessary edge work, and simplify the routing stack — without breaking any legacy SEO URL inherited from the super.so site.

This spec exists because a local `AbortError` in the Netlify Deno edge runtime turned out to be a symptom of a much larger problem: pattern pages are 3.6 MB, and every page view buffers the whole body inside an edge function. The routing design itself is sound and constraint-driven; the problems are payload size and one ordering bug.

## Measured baseline

All figures measured on 2026-08-29 from a committed `out/` build.

**Correction to the first pass of this spec:** the page originally profiled
(`patterns/169-…`, 3.63 MB) is an outlier, not a representative page. Measured
across all 347 pattern pages, the distribution was:

| Statistic | Size |
| --- | --- |
| min | 0.83 MB |
| median | 0.86 MB |
| max | 3.63 MB |
| pages over 2 MB | 8 of 347 |
| total pattern HTML | 321 MB |

So there were two distinct problems, not one:

1. **Every** pattern page carried ~0.86 MB, of which 94% was inline script. On a
   median page, 190 whole-catalog cover URLs accounted for 294 KB (36% of the
   document) — Notion cover values are signed S3 URLs averaging 1.58 KB each.
   This was the dominant cost, at 347× scale.
2. **8** pages carried an additional ~2.7 MB because they embed an inline
   ALL_PATTERNS gallery, which legitimately serializes a record per sibling.

Other baseline figures:

| Artifact | Size | Note |
| --- | --- | --- |
| `public/.notion-cache/` | 79 MB (373 files) | **copied to `out/` at 91 MB and served publicly** |
| `public/_redirects` | 740 rules | free-tier cap is 1000 |
| `netlify/redirect-data.json` | 67 KB | 369 slugs + 369 ids, loaded once per edge isolate |

Composition of the 1.48 MB cached `recordMap` for the outlier page (1009 blocks):

| Portion | Count | Bytes | Share |
| --- | --- | --- | --- |
| Sibling `page` blocks under ALL_PATTERNS_DB | 342 | 704,348 | 48% |
| `image` blocks | 152 | — | — |
| The page's own direct children | 10 | — | — |
| `collection_query` (full 343-id gallery result set) | — | 13,885 | 1% |

Note that most caches are small (the median pattern's cache holds 3 blocks), so
recordMap pruning was worth 8.8% across the corpus while map scoping was worth
66% per page. The bulk was never the recordMap.

## Findings that answer the open questions

### Why are the pages heavy? Not markdown negotiation.

`markdown-negotiation` is a read-only transform at request time and contributes nothing to build output.

The dominant cause was **unscoped whole-catalog props**. `src/app/patterns/[id]/page.tsx` passed `searchArtifacts.coverMap`, `tagsMap`, `descriptionMap`, and `notionVersionMap` — each keyed by all ~369 patterns — straight into `NotionPageRenderer`, a `"use client"` component. Every entry was therefore serialized into the RSC payload of every prerendered page, even though the client can only ever look up ids linked from that page. Cover values are the expensive part at ~1.58 KB of AWS signature query string each.

A secondary cause is the same serialization boundary applied to the recordMap:

- `src/app/patterns/[id]/page.tsx:231` passes the full `recordMap` to `NotionPageRenderer`.
- `src/components/NotionPageRenderer.tsx:1` is `"use client"`.

Any prop crossing into a client component must be serialized into the RSC flight payload, so the entire 1.48 MB `recordMap` is embedded in every prerendered page — once in the HTML and again in the `.txt` sidecar. `react-notion-x` is client-only, so this is structural, not accidental.

The recordMap is also larger than it needs to be. `scripts/build-content-cache.mjs:147-152` fetches with `fetchCollections: true`, which resolves the parent ALL_PATTERNS_DB gallery query and pulls in **342 sibling pattern pages — 48% of the file** — that this page does not display as page content. `signFileUrls: true` adds ~2 KB of AWS query string per image across 152 image blocks. Nothing is trimmed between disk and the client prop; the only sanitization (`NotionPageRenderer.tsx:371-400`) runs client-side, after serialization, and dropped 0 of 1009 blocks.

### Is markdown negotiation still needed now that MCP is mature? Yes — keep it.

The MCP surface and markdown negotiation do not overlap. All 8 MCP tools (`netlify/edge-functions/mcp.ts:247-395`) return JSON built from `search-index.json`, which contains no Notion block content. `get_pattern` (`mcp.ts:595-603`) returns index metadata only. `llms.txt` (2.1 KB) and `llms-full.txt` (1.5 KB) are navigation manifests with no corpus. The per-route `.txt` files in `out/` are RSC flight payloads, not markdown, and are useless to an agent.

So `curl -H 'Accept: text/markdown' /patterns/<slug>` is currently the **only** way for any client to obtain a pattern's body as text, and it serves agents that cannot open a JSON-RPC MCP session. `public/llms.txt:41` advertises it as a live capability. Dropping it would remove a real, non-duplicated capability and lower the agent-readiness posture tracked in [Agent Readiness](../archive/ROADMAP_AGENTS).

The correct action is to make it cheap, not to remove it. It currently downloads and discards a 3.63 MB document to emit a few KB of markdown, so it benefits more than anything else from the page-weight work below.

### Can `/all-patterns/*` be retired? Yes, with one naming hazard.

Only three references concern the public URL: `scripts/build-redirects.mjs:125` (the generator), `public/_redirects:8` (its generated output), and a redundant block in `src/proxy.ts:199-201` that is almost certainly dead under `output: export`.

**Hazard:** 17 other occurrences of the string `all-patterns` are the `menuGroups` identifier defined at `site.config.mjs:62`, which is the primary key for the ALL_PATTERNS_DB Notion database across the entire content pipeline (search index, metadata cache, content cache, components cache, `/patterns` route, and `parentDatabaseId` on pattern pages). Scope every edit to occurrences containing a slash (`/all-patterns/`). A bare find-and-replace on `all-patterns` breaks the build.

## Non-negotiable invariant: Notion ID URLs keep working

Legacy Notion-ID URLs must continue to resolve for both spellings (32-char hex and dashed UUID). Two independent mechanisms serve them, and **both** must stay green:

| URL shape | Served by | Cost |
| --- | --- | --- |
| `/{32-hex-or-uuid}` (bare, top level) | `redirector.ts:133-137` via `idMap` | zero redirect rules |
| `/patterns/{id}`, `/ux-patterns/{id}`, `/ui-patterns/{id}` | 738 rules in `_redirects` | 738 of the 1000-rule budget |

The folder-scoped paths are in the redirector's `excludedPath`, so the function never sees them — the `_redirects` rules are the only thing serving those, despite the function's header comment claiming otherwise. No task in this spec may reduce coverage of either shape, and W6 adds tests to enforce that.

**Budget note:** the 738 rules grow by two per published pattern. At 369 patterns there is headroom for roughly 126 more before `scripts/build-redirects.mjs:141` errors on the 1000-rule cap. That decision is scoped in W5.

---

## Results (implemented 2026-08-29)

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Median pattern page | 0.86 MB | **0.29 MB** | −66% |
| Min pattern page | 0.83 MB | 0.27 MB | −67% |
| Max pattern page (gallery) | 3.63 MB | 2.87 MB | −21% |
| Total pattern HTML (347 pages) | 321 MB | ~101 MB | −220 MB |
| Total `out/` HTML | — | 181 MB | — |
| Raw Notion cache in `out/` | 91 MB | 0 | removed |
| Redirect rules | 740 | 739 | −1 |
| Production edge response buffering | every compressed response | none | removed |
| Local `GET /` | 18.2 s + `AbortError` | 2.6–4.7 s, HTTP 200 | see W7 |
| Local `GET /patterns/<slug>` | 7.7 s | 1.1–2.3 s | see W7 |

Verification: `npm run build` succeeds; `npx tsc --noEmit` clean; ESLint clean on
all changed files; `npm run validate:redirects` reports 739 rules with 369 bare
`/<id>` and 738 folder-scoped rules covered; `npm run validate:recordmap-prune`
passes all invariants across 373 caches; `npm run validate:page-weight` passes
with the 5 gallery pages auto-detected and exempted.

## W1 — Fix the passthrough ordering bug

Highest value for the lowest risk. `passthroughResponse` buffers the entire response body *before* checking whether the bytes are valid, so it buffers on every compressed response in production — including every ~3.5 MB pattern page — to work around a bug that only occurs in the local CLI.

- [x] Read `netlify/edge-functions/lib/passthrough-response.ts:10-20` and confirm the cheap exit only covers uncompressed responses.
- [x] Gate the buffering on a local-dev signal (e.g. `Netlify-Dev` header or a `NETLIFY_DEV` / `NETLIFY_LOCAL` env check) so production returns the response untouched with no `arrayBuffer()` call.
- [x] Add a short comment recording that the workaround is local-only and why.
- [x] Verify locally that `/chatbot.js` and RSC navigations still render (the original `ERR_CONTENT_DECODING_FAILED` symptoms) — both return 200 with correct content types and decode cleanly.
- [x] Confirm the `AbortError` no longer reproduces — see W7, which turned out to be the actual cause.

## W2 — Cut page weight

The main event. Do these in order; each is independently shippable and measurable.

**W2a — Stop over-fetching the collection.**

- [x] Determine whether the 342 sibling `page` blocks are actually required at render time. `NotionCollection.tsx:406,529` uses `parentDatabaseId`, and the in-page "Related patterns" section is built from DOM anchors (`NotionPageRenderer.tsx:1354`), so sibling *titles* may be resolved from the recordMap. **Verify before removing — do not assume this is free.**
- [x] If unused: add a build-time prune step that drops blocks whose `parent_id` is the ALL_PATTERNS_DB collection id and are not the page itself, plus the `collection_query` gallery result set. Expected saving ~700 KB per page (48%).
- [x] If used: retain them. Verified they **are** used, by two paths — page-mention decorators (react-notion-x emits nothing when the target block is absent, silently deleting the "Related patterns" list) and the inline gallery on 5 pages. The prune is therefore reference-aware: it keeps the page subtree, its ancestors, and every referenced sibling, and skips pages with an inline collection view entirely. `scripts/validate-recordmap-prune.mjs` asserts both invariants across all 373 caches.
- [x] Re-measure a representative page and record before/after in this spec.

**W2b — Stop inlining what is already a static file.**

- [x] **Approach changed after measurement.** A client-fetched recordMap artifact was not needed: profiling showed the recordMap was not the bulk on typical pages (median cache is 3 blocks). The whole-catalog prop maps were. `src/lib/search-artifacts-scope.mjs` narrows `coverMap` / `tagsMap` / `descriptionMap` / `notionVersionMap` to the ids a page can reference — itself, patterns linked from the body by page mention or by href, and the recent-patterns rail — and `src/app/patterns/[id]/page.tsx` passes the scoped maps. This preserves SSR entirely, so no page became a client shell.
- [x] Keep server-rendered HTML intact — confirmed. The `notion-page-wrapper`, `notion-page`, and property-table markup are still server-rendered, and re-running the `markdown-negotiation` transform over the new output yields the same content as before.
- [ ] Optional follow-up: `/patterns` and the category pages still pass full maps because they render every card. They are within budget, but scoping them to their own visible set would cut `patterns.html` (3.69 MB) and the ~2.6–2.8 MB category pages.
- [x] Re-measure both the `.html` and the `.txt` sidecar.

**W2c — Address the signed image URLs.**

- [x] Confirm whether `signFileUrls: true` URLs are still valid at runtime. **They are not, and it does not matter.** The 190 signed cover URLs in `search-index.json` were signed `20260808T151139Z` with `X-Amz-Expires=3600`, so their signatures expired on 2026-08-08. Fetching one anyway returns `302` → `200 image/png`, because the values are `https://www.notion.so/image/<encoded-s3-url>?…` and Notion's image proxy re-signs server-side. So images are not broken, but the ~1.5 KB of AWS signature per URL is inert payload.
- [ ] Optional follow-up: store cover values without the `X-Amz-*` query string, cutting each from ~1.86 KB to ~200 bytes. This would shrink the pages that still carry many covers (`/patterns`, category pages). Needs a deliberate decision plus verification that Notion's proxy accepts the bare form — do not assume it does.

**W2d — Stop publishing the raw Notion cache.**

- [x] `public/.notion-cache/` (79 MB, 373 files) is copied into `out/` at 91 MB and served publicly. Decide whether that is intended.
- [x] Audit a sample for anything non-public: `spaceId`, `collection` schemas, and `notion_user` records. (`notion_user` was empty in the file sampled; confirm across all 373.)
- [x] If unintended, move the cache outside `public/` and read it from the repo root at build time, or strip it from `out/` during the existing post-build step alongside `scripts/strip-components-from-out.mjs`. Note that W2b may deliberately want a *trimmed* subset to remain fetchable — reconcile the two.

## W3 — Retire `/all-patterns/*`

- [x] Remove the rule from `scripts/build-redirects.mjs:125`.
- [x] Regenerate `public/_redirects` and confirm the count drops to 747 and no other rule changed.
- [x] Remove the dead block at `src/proxy.ts:199-201` after confirming `src/proxy.ts` does not execute under `output: export`.
- [x] Update the stale comment at `redirector.ts:20-21` that lists `/all-patterns/*` as handled elsewhere.
- [x] **Do not touch** the `menuGroups` id `"all-patterns"` (`site.config.mjs:62`) or any of its 17 lookups.
- [x] Accept and note the consequence: surviving inbound `/all-patterns/...` links will 404 instead of redirecting.

## W4 — Make markdown negotiation cheaper (keep the capability)

- [x] Return `context.next()` directly for non-markdown requests instead of routing through `passthroughResponse` (`markdown-negotiation.ts:82-83`) — the transform path reads the body anyway, so only the pass-through case pays for nothing.
- [x] Re-verify `Accept: text/markdown` output after W2 — re-ran the transform against the rebuilt HTML and the extracted content is unchanged, because scoping touched only client props, not server-rendered markup.
- [x] `public/llms.txt:41` stays accurate — the capability is unchanged, so no edit needed.
- [x] Leave the in-file `config.path` array as-is — it is what keeps the toml to two `[[edge_functions]]` entries and prevents the Deno `spawn EBADF` class of failure.

## W5 — Routing scope and rule budget

- [ ] Decide on the redirect-rule budget. Option A: leave as-is and accept a ceiling around 126 more patterns. Option B: move the 738 folder+ID rules into the redirector's `idMap` (the code at `redirector.ts:133-137` already handles the shape; it is unreachable only because `/patterns/*` is excluded), freeing 738 rules at the cost of an edge invocation on every pattern page view. Option B is only sane after W1 makes pass-through cheap.
- [x] Fix the header comment at `redirector.ts:10-12`, which documents a "Folder + Notion ID" case that `excludedPath` makes unreachable.
- [ ] After W1, evaluate whether the reactive `excludedPath` additions for large static assets (`search-index.json`, `og-*.png`, `metadata-cache.json`, `pablo.png`) are still needed, or whether the list can shrink back to genuine routing concerns.
- [ ] Consider inverting the redirector's `path` from `/*`-minus-denylist to an explicit allowlist of shapes it handles. Higher risk — sequence last, and only with W6 tests in place.

## W7 — Serve the Notion cache in dev (the real `AbortError` cause)

Added after W1–W6, when the `AbortError` reproduced on the homepage despite the
buffering fix. The dev log gave it away:

```
GET / 200 in 18.2s (next.js: 1966ms, proxy.ts: 67ms, application-code: 16.2s)
```

16.2 s was spent in **application code**, not in the edge function. Before this
change `getBuildCachedNotionPage` read the disk cache only when
`NEXT_PHASE === "phase-production-build"`, so every `next dev` render performed a
live `notionClient.getPage()` with `fetchCollections: true` and
`fetchMissingBlocks: true` (`src/lib/notion.ts:714-727`), on a 10 s timeout with
up to 3 retries. The homepage's Notion page has inline databases, making that
fetch enormous.

The edge `AbortError` was therefore a *symptom*: the Netlify edge invocation
deadline expired while waiting for `context.next()` to return a response that was
16–18 s away. Buffering was a red herring for this particular failure.

- [x] Read the disk cache whenever it exists, in any phase, not just during
  production builds.
- [x] Keep the production build strict: a cache miss still returns null rather
  than falling back to the network, which is what prevents Notion 429 bursts.
- [x] Fall back to a live fetch on cache miss in dev, with a warning.
- [x] Add `NOTION_DEV_LIVE=1` to force live fetches when Notion edits are not yet
  in the cache.
- [x] Side benefit: dev now exercises the same pruned recordMap as production, so
  the W2a prune is actually covered by local testing.

Measured locally after the change:

| Request | Before | After |
| --- | --- | --- |
| `GET /` | 18.2 s (`AbortError` body) | 2.6–4.7 s, HTTP 200 |
| `GET /patterns/<slug>` | 7.7 s | 1.1–2.3 s |
| Pattern page bytes served | 815 KB | 322 KB |

Caveat to document for contributors: dev now renders from
`public/.notion-cache`, so Notion edits do not appear until
`npm run build:content` re-pulls them, or `NOTION_DEV_LIVE=1` is set.

## W6 — Regression guards

Without these, W2 and W3 can silently break legacy SEO.

- [x] Add a test or build assertion covering the invariant above: for a sample of patterns, both ID spellings resolve for the bare `/{id}` form and all three folder-scoped forms.
- [x] Add a page-weight budget check to the build that fails or warns when any page in `out/` exceeds a threshold, so 3.6 MB pages cannot silently return.
- [x] Add an assertion that `_redirects` stays under the 1000-rule cap (extend the existing warning at `scripts/build-redirects.mjs:139-142` into a hard failure).
- [x] Verify `scripts/validate-redirects.mjs` covers the ID cases — extended with `validateNotionIdCoverage()`, which asserts every `idMap` key is a bare 32-hex id (so the edge lookup cannot miss) and that both spellings of every folder-scoped id have a `_redirects` rule.

---

## Acceptance criteria

1. A representative pattern page in `out/` is materially smaller than 3.63 MB, with the target set after W2a measurement.
2. No production request buffers a full response body inside an edge function.
3. Every Notion-ID URL shape in the invariant table still resolves, proven by an automated check rather than manual spot checks.
4. `Accept: text/markdown` still returns usable markdown for pattern pages.
5. `/all-patterns/*` is gone from `_redirects` and the content pipeline still builds — search index, metadata cache, and content cache all regenerate cleanly.
6. `npm run build` and `npm run lint` pass; the bookmarks drawer opens without an `AbortError` locally.

## Verification commands

```bash
# page weight
ls -la out/patterns/169-delete-content-forever-youtube-studio.html
find out -name '*.html' -exec ls -la {} \; | sort -k5 -rn | head -10

# redirect budget and rule shapes
rg -v '^#|^$' public/_redirects | wc -l
rg -c 'all-patterns' public/_redirects

# markdown negotiation still works (local)
curl -s -H 'Accept: text/markdown' http://localhost:8888/patterns/<slug> | head -40

# public share path as an anonymous visitor
node scripts/diagnose-public-share.mjs <share-token>
```

## Risks

- **Pruning the recordMap breaks related patterns or embedded collection views.** The sibling blocks may be load-bearing for title resolution. W2a gates on verification for this reason; do not prune on the assumption that unrendered means unused.
- **W2b regresses SEO or markdown output** if content moves from server-rendered HTML into a client fetch. The markdown transform parses the static HTML, so anything that becomes client-only disappears from markdown *and* from crawlers.
- **Find-and-replace on `all-patterns` breaks the build pipeline** via the `menuGroups` id. Scope to `/all-patterns/`.
- **Removing the `/all-patterns/*` redirect drops live inbound links.** Low volume expected, but irreversible for anyone still linking to the super.so URLs.
- **Signed Notion S3 URLs may already be expiring** in production. W2c may surface a pre-existing image-freshness bug rather than a pure size win.

## Out of scope

- The `next dev` heap growth (7.7 GB after ~19.5 h). Separate process, separate cause; unrelated to the edge runtime.
- The stale `bookmarks_public_select_shared` RLS policy blocking anonymous reads on shared libraries. Tracked separately and diagnosed with `scripts/diagnose-public-share.mjs`.
- Moving `/l/{token}` back onto Edge. It works as a Node Function and matches the OG and sitemap functions; the `EBADF` constraint that forced the move was later solved by collapsing the toml declarations.

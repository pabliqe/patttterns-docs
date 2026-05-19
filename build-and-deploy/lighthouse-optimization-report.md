---
title: Lighthouse Optimization Report
parent: Building and Deploy
nav_order: 6
---

# Lighthouse Optimization Report

Updated: 2026-05-19
Scope: https://patttterns.com/ mobile Lighthouse run (v13)

## Score Snapshot (From Report)

- Performance: 42
- Accessibility: 90
- Best Practices: 58
- SEO: 92

### Core Metrics

- FCP: ~2.5s
- LCP: ~23.5s
- Speed Index: ~10.0s
- TBT: ~900ms
- TTI: ~23.9s
- CLS: ~0.0001

## Critical Findings Summary

- LCP path was blocked by large/late image loading and weak early discovery for above-the-fold media.
- Main thread was overloaded by JS and third-party scripts during early lifecycle.
- Initial document response was slow (~1256ms), amplifying all render delays.
- Page weight was high (~9.2MB total, ~6.4MB images), mostly image payload pressure.
- bfcache was negatively affected by unload behavior.
- SEO had an invalid robots directive (`LLM-Manifest`).
- Accessibility had viewport zoom restrictions and naming/label quality issues.

## Phased Plan (Prioritized)

Use this checklist as the tracking source of truth.

## Phase 1 - Immediate Wins (Completed)

- [x] Defer GA loading from `afterInteractive` to `lazyOnload`.
- [x] Gate Hotjar behind env flag (`NEXT_PUBLIC_ENABLE_HOTJAR`) and defer with `lazyOnload`.
- [x] Replace `beforeunload` cleanup with `pagehide` to reduce bfcache blocking risk.
- [x] Add `preconnect` and `dns-prefetch` for `img.notionusercontent.com`.
- [x] Remove viewport zoom lock (`maximumScale` and `userScalable: false`).
- [x] Remove invalid `LLM-Manifest` directive from `public/robots.txt`.
- [x] Align bookmark button accessible name with visible label (`My Library`).
- [x] Prioritize first gallery card images (`priority`, `loading=eager`, `fetchPriority=high`).
- [x] Trim unused `cover` data from layout navigation payload mapping.

## Phase 2 - LCP and Payload (Highest Remaining Priority)

- [x] Constrain above-the-fold image dimensions at source (prefer responsive variants for Notion covers).
- [x] Ensure the primary hero/first visual image is always eagerly loaded with high priority.
- [x] Add explicit width/height or stable aspect constraints for key visual blocks.
- [ ] Reduce total homepage image bytes (target: <2MB initial viewport budget).
- [x] Verify no lazy-loading is applied to actual LCP candidate elements.

## Phase 3 - JS and Main Thread

- [x] Audit top JS chunks and move non-critical logic behind user interaction or idle callbacks.
- [x] Reduce hydration cost in top navigation and homepage render path.
- [x] Keep third-party scripts route-aware (avoid loading where not needed).
- [ ] Re-check TBT target to <200ms on mobile Lighthouse.

## Phase 4 - Server and Delivery

- [ ] Reduce TTFB for root document (target: <800ms mobile).
- [x] Verify edge/network cache behavior for static artifacts and JSON index files.
- [x] Confirm Brotli/Gzip and long-lived cache headers are correctly applied.
- [ ] Re-check redirect chain and origin latency for homepage and top landing routes.

## Phase 5 - Accessibility and Quality Hardening

- [ ] Fix remaining color contrast issues from Lighthouse accessibility audit.
- [ ] Review icon/button accessible names across header and cards.
- [ ] Validate keyboard and zoom behavior across mobile and desktop.
- [ ] Re-run best-practice checks for third-party cookie and security header posture.

## Validation Protocol (Run Every Phase)

- [ ] Run Lighthouse mobile in a clean Chrome profile (no extensions).
- [ ] Run Lighthouse desktop to track regressions on JS/main-thread.
- [ ] Compare metric deltas for LCP, TBT, TTI, and page weight.
- [ ] Save each run output and update this checklist.

## Targets

- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- LCP: <= 2.5s
- TBT: <= 200ms
- CLS: <= 0.1

## Notes

- Current code updates completed in Phase 1 are already merged in workspace files.
- One existing unrelated TS diagnostic remains for side-effect CSS typing in `src/components/NotionCollection.tsx`.
- 2026-05-19 implementation pass:
	- Header search is now dynamically imported to reduce initial JS parse/hydration.
	- Bookmark drawer is lazy-mounted only when opened.
	- Netlify cache headers were added for `search-index.json` and `metadata-cache.json`.
	- Localhost Lighthouse confirms LCP candidate uses `fetchpriority=high` and is not lazy loaded.

---
title: ROADMAP DEBUG THEME TOKEN EDITOR
---

# ROADMAP DEBUG THEME TOKEN EDITOR

Goal: add token customization controls for artifact preview, with live iframe updates and export-ready token output while preserving front modal UX ownership.

Current direction: theme is global (brand-level), not per component. Token edits are persisted once and reused across all component previews/exports.

## Scope

- Route scope: `/debug/components`
- Front scope: PatternCodePanel modal preview keeps tertiary UI controls while embedding the same Theme panel capability

## Checklist

- [x] Add roadmap and implementation checklist in `/docs`
- [x] Add preview token utility support for runtime overrides
- [x] Add token parser utility to hydrate editor state from CSS text
- [x] Add Palette button trigger in preview toolbar
- [x] Add debug token editor panel in preview UI
- [x] Wire token editor state to iframe `srcDoc` for live updates
- [x] Enable token editor only on `/debug/components`
- [x] Convert debug theme editor layout to lateral split (desktop) and single-panel swap (mobile)
- [x] Add roadmap update for front modal merge strategy
- [x] Persist token edits as global theme profile (localStorage)
- [x] Add token CSS copy/download actions from debug panel
- [x] Wire PatternCodePanel modal theme edits into final export flow contract
- [x] Add PatternCodePanel-controlled Theme button in modal header (tertiary style)
- [x] Add controlled theme panel open state bridge between PatternCodePanel and ArtifactComponentPreview
- [x] Add spacing token (`--ui-spacing`) control to Theme editor and Tailwind preview scale mapping
- [x] Stop relying on per-component token CSS as preview/export source of truth
- [x] Keep iframe mounted during theme edits (no `srcDoc` regeneration on token updates)
- [ ] Add tests for token parse/build helpers and preview state behavior

## Implementation Notes

- The token editor is rendered in parent React UI, not inside the iframe.
- Iframe updates are driven by `postMessage` (`set-theme-css`) and in-place `<style>` replacement.
- `srcDoc` is now bootstrapped once per preview session and does not regenerate on each token edit.
- The editor is opt-in via `showThemeEditorTrigger` on `ArtifactComponentPreview`.
- For front modal integration, PatternCodePanel owns controls/buttons/styles; ArtifactComponentPreview only renders preview + theme panel content.
- Theme persistence is global (`patttterns-components-global-theme-tokens`) and independent of selected component id.

## Risks

- Global theme persistence currently uses localStorage only (no cross-device sync).
- Free-form token text values may allow invalid CSS values; we should add validation hints in a follow-up.

## Next Steps

1. Add integration tests for global token persistence and preview update flow.
2. Optional: delete legacy per-component `.tokens.css` artifacts from `public/components/code` after rollout verification.

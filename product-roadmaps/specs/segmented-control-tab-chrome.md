---
title: Segmented control and tab chrome
parent: Product Roadmaps
nav_order: 42
---

# Segmented control and tab chrome

## Problem

The previewer mixed three ideas on one control: stylesheet preset, Colors panel open, and “tokens differ from Light defaults.” Custom looked selected (or dotted) for Brand edits and for Dark mode, and tapping Custom often did nothing.

## Model

| Control | Role |
|--------|------|
| Sun \| Moon | Light and Dark presets. Dark is **not** Custom. Raised active only. |
| Palette (Custom) | Shown **only** when surface tokens match neither Light nor Dark (or a custom slot is saved). Restores that custom surface set and focuses the Colors tab. |
| Sliders | **Desktop:** toggle Layout ↔ Colors (sidebar always open). **Mobile:** open/close the single sheet. |
| In-panel tabs | **Layout first**, Colors second. Default pane is Layout. |
| Colors list | **Brand** (accent/status, shared) vs **Light / Dark / Custom** surfaces (page/card/text/border/ring). |
| Modified purple dot | Custom = custom surface edits only. Layout = spacing/type edits. Not Dark-vs-Light diffs. |

## Rules

1. Exclusive segmented groups: one raised active (`bg-background` + shadow). No tertiary wash on the grey track.
2. Brand edits never create or select Custom.
3. Dark mode never counts as Custom.
4. Custom does not show/hide the Theme panel.

## Source of truth

- Tokens: `src/lib/toolbar-control-styles.ts` (`TOOLBAR_SEGMENTED*`)
- Preset helpers: `src/lib/component-theme-tokens.ts` (`THEME_MODE_TOKEN_KEYS`, `BRAND_COLOR_TOKEN_KEYS`, `hasCustomThemeSurfaces`)
- Previewer control: `src/components/preview/ThemeModeToggle.tsx`
- Living notes: `DESIGN.md` → Component preview / Theme panel

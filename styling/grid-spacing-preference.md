---
title: Grid Spacing Preference
nav_order: 3
parent: Styling
---

# Grid Spacing Preference

Local preference for pattern and collection gallery gutters. Exposed in the header menus as a single-row control: layout-dashboard icon, **Grid spacing** label, and **S / M / L** micro-tabs on the right (logged-out secondary menu, logged-in avatar menu, and mobile sheet).

## Storage

| Key | Values | Default |
| --- | --- | --- |
| `grid-spacing` (localStorage) | `small` \| `medium` \| `large` | `large` |

Applied as `data-grid-spacing` on `<html>`, which drives the CSS variable `--pattern-grid-gap`.

## Scale

| Preference | &lt; md | md–lg (≥768px) | xl+ (≥1280px) |
| --- | --- | --- | --- |
| Small | `0.25rem` | `0.5rem` | `0.75rem` |
| Medium | `0.375rem` | `0.75rem` | `1rem` |
| Large | `0.5rem` | `1rem` | `1.5rem` |

Large matches the responsive gutters introduced for Recent/Related Patterns and Notion Collections.

## Surfaces that honor the preference

- Recent / Related Patterns masonry (`.notion-related-masonry`)
- Notion Collections gallery grids (`gap-[var(--pattern-grid-gap)]`)

**Not affected:** Library Flow gutters, mobile Related carousel gaps.

## Code

- Preference hook: `src/lib/grid-spacing.ts`
- Bootstrap: `src/components/GridSpacingBootstrap.tsx` (mounted in root layout)
- Menu control: `src/components/GridSpacingToggle.tsx`
- CSS vars: `src/styles/_globals.css`

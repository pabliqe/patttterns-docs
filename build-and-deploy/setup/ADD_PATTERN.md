---
title: Add a Pattern
parent: Setup & Configuration
nav_order: 8
---

# Add a Pattern (CLI / agents)

Create a new row in **ALL_PATTERNS_DB** (the All Patterns Notion database) from a terminal or a Cursor agent.

The script always:

1. Parents the page under ALL_PATTERNS_DB
2. Waits for Notion’s auto **Generated ID** (`Pattern ID`)
3. Sets **Full Title** to `{id}. {title}` — e.g. `415. Live Cursor Chat`
4. Embeds each `--image` URL as a Notion **image** block (Giphy GIFs included)

A new Notion row is not live on [patttterns.com](https://patttterns.com) until you run [publish content](CRON_SETUP).

## Command

```bash
npm run add:pattern -- --title "Live Cursor Chat" --image "https://media0.giphy.com/media/.../giphy.gif"
```

Cursor agents: `/add-pattern` (skill `.cursor/skills/add-pattern`, command `.cursor/commands/add-pattern.md`).

## Flags

| Flag | Required | Notes |
|------|----------|--------|
| `--title` | yes | Name **without** the numeric prefix |
| `--image` | yes | Repeatable. Public HTTPS URL (Giphy, screenshot, etc.) |
| `--description` | no | Notion Description |
| `--device` | no | `Desktop`, `Tablet`, or `Mobile` |
| `--system` | no | e.g. `Web`, `Apple OS` |
| `--language` | no | `English` or `Español` |
| `--ux` | no | UX Flows multi-select |
| `--ui` | no | UI Components multi-select |
| `--cover` | no | External cover URL |
| `--json` | no | Print one JSON object |
| `--dry-run` | no | No write |
| `--force` | no | Allow a duplicate title |
| `--self-test` | no | Title-format unit check (no Notion) |

## Environment

| Var | Role |
|-----|------|
| `NOTION_API_KEY` | Official Notion integration for the **PATTTTERNS site** workspace |
| `ALL_PATTERNS_DB` | Optional override of the database id |
| `NOTION_ALL_PATTERNS_DATABASE_ID` | Same id; used if `ALL_PATTERNS_DB` is unset |
| `site.config.mjs` `all-patterns` | Hard-coded fallback |

Notion MCP chat access is often a different workspace than the published site database. Use this CLI (official API) to write ALL_PATTERNS_DB.

## After create

```bash
npm run publish:content
git add -f public/search-index.json public/.notion-cache/ public/components/
git commit -m "chore: publish notion content"
git push origin main
```

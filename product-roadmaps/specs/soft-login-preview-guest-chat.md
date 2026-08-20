---
title: Soft Login Preview and Guest Chat
parent: Specs
nav_order: 12
---

# Soft Login — Preview + One Free Chat Turn

Status: In progress  
Updated: August 2026

## Goal

Let guests **open** Component Preview and the chat widget. Convert on **export** (copy/download) and on a **second** chat turn. Do not leave Gemini unauthenticated.

## Product gates

| Surface | Guest | Login |
|---|---|---|
| Preview Component button | Opens preview | No |
| Ask our AI agent / chat FAB | Opens widget | No |
| Reload / Theme in preview | Works | No |
| Copy / Download in preview | Blocked | Yes (`component_export`) |
| First chat send (typed or chip) | One Gemini turn | No |
| Second chat send | Blocked | Yes (`chatbot`) |

## Risk analysis (APIs)

### Component preview / TSX

`GET` `components-api` `op=active` / `op=code` is already public. Live preview must load TSX in the browser, so a copy/download login gate is **conversion UX, not DRM**. A determined user can still read the network response. That is accepted: we are not opening a new code API.

Mutating ops (`generate`, `put-seed`, `hide`) stay auth-required.

### Chat / Gemini

The previous main-app policy was JWT-or-nothing. Allowing an unbounded anonymous proxy would expose `GEMINI_BOT_KEY` to scrape-and-spend.

**Must stay server-enforced** in `chatbot-proxy`:

1. Valid Supabase JWT → unlimited (current paid/logged-in path).
2. No JWT on `auth_required` origins → consume **one** guest slot, then `401 auth_required`.
3. Guest slot = signed HttpOnly cookie **and** hashed-IP daily cap in Netlify Blobs.
4. Fail closed: missing signing secret, missing IP, blob errors, or tampered cookies deny Gemini.
5. Quota is consumed only after the body validates (`query` present), so empty POSTs do not burn a slot.
6. Docs / localhost stay `auth_optional` (unchanged embed policy).

Client `localStorage` (`chatbot_guest_used_v1`) only avoids a wasted second request. Clearing it does not grant another Gemini call.

Residual abuse: cookie + IP rotation can still buy a few extra guest turns. The IP cap (default 5/day) is the ceiling, not a perfect bot shield. Do not raise guest messages without watching Gemini spend.

## Files

- `netlify/functions/chatbot-guest-quota.mts`
- `netlify/functions/chatbot-proxy.mts`
- `public/chatbot.js`
- `src/components/ChatbotLoader.tsx`
- `src/components/PatternAskAgentButton.tsx`
- `src/components/PatternExportButton.tsx`
- `src/components/ArtifactPreviewModal.tsx`
- `src/components/LoginModal.tsx`
- `src/lib/auth-modal.ts`

## Env

| Variable | Default | Role |
|---|---|---|
| `CHAT_GUEST_MESSAGES` | `1` | Guest Gemini turns per browser cookie |
| `CHAT_GUEST_IP_DAILY_CAP` | `5` | Hashed-IP daily ceiling |
| `CHAT_GUEST_QUOTA_SECRET` | fallback to server-only keys | HMAC + IP hash |

## Acceptance

- Guest can open preview and chat without the login modal.
- Reload and Theme work while logged out.
- Copy and Download open the login modal and do not write clipboard or files.
- First guest query (chip, input, or Ask our AI agent) streams an answer.
- Second guest query opens login; proxy returns 401 without Gemini.
- Authenticated users are unchanged (unlimited chat, copy/download work).

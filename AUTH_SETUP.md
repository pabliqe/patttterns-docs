---
title: Auth Setup — Supabase OAuth (Static Export)
parent: Setup & Configuration
nav_order: 2
---

# Auth Setup — Supabase OAuth (Static Export)

Current auth architecture: client-side Supabase OAuth with Google provider. No server-side session, no Prisma, no NextAuth runtime.

> **Legacy note:** The old setup used NextAuth v5 + Prisma + `DATABASE_URL`/`DIRECT_URL`/`AUTH_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. All of those are **no longer used** and should be removed from `.env.local` and Netlify env vars.

---

## How it works

1. User clicks "Sign in" → `buildSupabaseOAuthUrl()` constructs a Supabase authorize URL for the Google provider.
2. User completes Google consent → Supabase redirects to `/auth/callback` with tokens in the URL hash.
3. `completeSupabaseOAuthFromUrl()` extracts the access/refresh tokens, fetches the user profile, and stores the session in `localStorage`.
4. `AuthSessionProvider` reads localStorage on mount and provides the session via `useAuth()` context.

Google OAuth credentials are configured **inside Supabase** (Authentication → Providers → Google) — not directly in the app.

---

## Required environment variables

```env
# Supabase project URL — from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase anon key — from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Both are public (`NEXT_PUBLIC_`) — safe to expose in the browser.

### Optional

```env
# Set to "0" to disable login UI entirely (read-only mode). Default: enabled.
NEXT_PUBLIC_STATIC_LOGIN_MODE=

# Bookmark backend: "supabase" | "legacy-api" | unset (auto)
NEXT_PUBLIC_BOOKMARK_SYNC_BACKEND=
```

---

## Supabase setup

### 1. Get the URL and anon key

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project
2. Left sidebar → **Settings → API**
3. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Enable Google OAuth provider

1. Left sidebar → **Authentication → Providers → Google**
2. Toggle **Enable**
3. Paste your **Google Client ID** and **Google Client Secret**  
   (create them in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client IDs)
4. Save

### 3. Add allowed redirect URLs

1. Left sidebar → **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://patttterns.com/auth/callback
   ```

---

## Google Cloud Console — OAuth credentials

You still need a Google OAuth client, but its credentials go into Supabase, not into `.env.local`.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project
2. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://patttterns.com
   ```
5. **Authorized redirect URIs** — use **Supabase's** callback URL (shown in the Supabase Google provider settings):
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
6. Copy the **Client ID** and **Client Secret** → paste them into Supabase (step 2.3 above).

---

## Netlify environment variables

**Site → Site configuration → Environment variables → Add variable**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

No other auth variables are needed.

---

## Test locally

```bash
npm run dev
# Open http://localhost:3000
# Click "Sign in" → redirects to Google → returns to /auth/callback → session stored
```

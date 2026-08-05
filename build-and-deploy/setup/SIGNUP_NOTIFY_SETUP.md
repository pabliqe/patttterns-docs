---
title: Signup Admin Email — Supabase Edge Function
parent: Setup & Configuration
nav_order: 6
---

# Signup Admin Email — Supabase Edge Function

Sends you an email every time a new user signs up (Google OAuth via Supabase Auth).

```
auth.users INSERT
  → handle_new_user() creates public.user_profiles row
  → Database Webhook (INSERT on user_profiles)
  → notify-signup Edge Function
  → Resend API
  → your inbox
```

Code lives in the repo under `supabase/functions/`.

---

## Prerequisites

1. A [Resend](https://resend.com) account and API key
2. A verified sender domain/address in Resend (e.g. `notifications@patttterns.com`)
3. [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally

---

## 1. Run the SQL trigger

In **Supabase Dashboard → SQL Editor**, run:

`docs/queries/SIGNUP_ADMIN_NOTIFY.sql`

This creates a row in `public.user_profiles` for every new `auth.users` row. The Database Webhook fires on that INSERT.

> If `user_profiles` does not exist yet, create it first (see your library-sharing migrations). The trigger only needs a `user_id` column with a unique constraint.

---

## 2. Deploy the Edge Function

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set \
  RESEND_API_KEY=re_... \
  RESEND_FROM_ADDRESS="PATTTTERNS <notifications@yourdomain.com>" \
  ADMIN_NOTIFICATION_EMAIL=you@example.com \
  SIGNUP_WEBHOOK_SECRET=$(openssl rand -hex 32) \
  APP_URL=https://patttterns.com

supabase functions deploy notify-signup
```

Copy the deployed URL — it looks like:

`https://<project-ref>.supabase.co/functions/v1/notify-signup`

---

## 3. Create the Database Webhook

In **Supabase Dashboard → Database → Webhooks → Create a new hook**:

| Field | Value |
|-------|-------|
| Name | `on_user_profile_insert` |
| Table | `public.user_profiles` |
| Events | **Insert** |
| Type | Supabase Edge Functions **or** HTTP Request |
| URL | `https://<project-ref>.supabase.co/functions/v1/notify-signup` |
| HTTP method | `POST` |
| HTTP headers | `Authorization: Bearer <SIGNUP_WEBHOOK_SECRET>` |
| | `Content-Type: application/json` |

Use the same `SIGNUP_WEBHOOK_SECRET` value you set with `supabase secrets set`.

---

## 4. Test

1. Sign in with a new Google account on staging or production.
2. Check **Edge Functions → notify-signup → Logs** in the Supabase dashboard.
3. Confirm the admin email arrived.

To test the function directly (replace placeholders):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/notify-signup" \
  -H "Authorization: Bearer <SIGNUP_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "user_profiles",
    "schema": "public",
    "record": { "user_id": "<existing-user-uuid>", "created_at": "2026-07-10T00:00:00Z" }
  }'
```

---

## Secrets reference

| Secret | Where | Purpose |
|--------|-------|---------|
| `RESEND_API_KEY` | Supabase secrets | Resend API auth |
| `RESEND_FROM_ADDRESS` | Supabase secrets | From header for outbound mail |
| `ADMIN_NOTIFICATION_EMAIL` | Supabase secrets | Your inbox |
| `SIGNUP_WEBHOOK_SECRET` | Supabase secrets + webhook header | Prevents unauthorized calls |
| `APP_URL` | Supabase secrets (optional) | Link in email body |
| `SUPABASE_URL` | Auto-injected | Admin user lookup |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Admin user lookup |

These are **not** Netlify or `NEXT_PUBLIC_*` vars — they stay in Supabase only.

---

## Reusing for other emails (e.g. bookmarks)

The shared helper is `supabase/functions/_shared/resend.ts`. For bookmark digests or share notifications later:

1. Add another function under `supabase/functions/<name>/`
2. Reuse `sendEmail()` from `_shared/resend.ts`
3. Trigger via another Database Webhook, `pg_cron`, or an HTTP call from the app

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| No email, no webhook log | `user_profiles` row not created — run `SIGNUP_ADMIN_NOTIFY.sql` |
| 401 in function logs | Webhook `Authorization` header does not match `SIGNUP_WEBHOOK_SECRET` |
| `skipped: no_email` | OAuth user has no email (rare with Google) |
| Resend 403/422 | Sender domain not verified in Resend |

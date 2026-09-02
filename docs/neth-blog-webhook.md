# Neth blog webhook — receiver setup

Auto-publishing integration: the sending app POSTs each published blog to this
CMS, signed with a shared secret. Implemented in
[`app/api/neth-blog/route.ts`](../app/api/neth-blog/route.ts).

## 1. Run the migration

`database_migrations/add_neth_blog_webhook.sql` in the Supabase SQL editor. It adds:

- `blogs.external_id` / `blogs.external_source` — links an imported post to the
  sender's post id. A partial unique index means re-deliveries and
  `blog.updated` events edit the same row instead of creating duplicates.
  Posts written in the admin panel keep `external_id = NULL` and are unaffected.
- `neth_webhook_deliveries` — one row per delivery attempt: dedupe key, audit
  trail, and stored payload for debugging.

## 2. Set the environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NETH_WEBHOOK_SECRET` | **yes** | — | The signing secret you give the sender. Without it every delivery is refused with 500. |
| `NETH_BLOG_STATUS` | no | `draft` | Set to `published` to put incoming posts live immediately. |
| `NETH_BLOG_AUTHOR` | no | `Techneth` | Byline for imported posts. |
| `NETH_BLOG_CATEGORY` | no | *(none)* | One of the labels in `lib/categories.ts`, if you want imports filed under a category. |
| `NEXT_PUBLIC_SITE_URL` | no | falls back to `NEXT_PUBLIC_APP_URL`, then the payload's `site_url` | Used to build the `url` returned to the sender. |

Generate a secret with `openssl rand -hex 32`. Add it to Vercel (or wherever
this deploys) **and** paste the same value into the sender's "Signing secret"
field.

## 3. Fill in their form

- **Webhook URL** — `https://<this-deployment>/api/neth-blog`
- **Signing secret** — the value of `NETH_WEBHOOK_SECRET`
- **Content format** — HTML (recommended; it keeps self-contained embeds like
  the stat chart intact). Markdown and plain text also work — they are run
  through the same converter the editor's Markdown mode uses, so imported posts
  open as real editable blocks.
- **Site URL** — the public frontend, e.g. `https://techneth.com`

Then use their "ping" test. A `200 {"ok":true,"event":"ping"}` means the URL and
secret are both correct.

## What the receiver does

1. Reads the **raw** body (the signature covers the exact bytes — parsing and
   re-serializing would break it).
2. Recomputes `sha256=` + HMAC-SHA256(secret, `` `${timestamp}.${rawBody}` ``)
   and compares constant-time against `X-Neth-Signature`. Rejects a timestamp
   more than 5 minutes off as a replay.
3. Answers `ping` with 200.
4. Dedupes on `X-Neth-Delivery` — a retried attempt returns the original result
   rather than creating a second post.
5. Upserts `blogs` on `external_id`, sanitizing the body with the same
   server-side policy as admin-authored content (`lib/sanitize/server.ts`).
6. Returns `200 {ok, id, slug, status, url}`.

### Field mapping

| Payload | Column |
| --- | --- |
| `id` (or `blog_id`) | `external_id` |
| `title` | `title` |
| `slug` (or slugified `title`) | `slug` — suffixed `-2`, `-3`… only if another post already holds it |
| `content_html` / `content` / `content_text` per `content_format` | `content` (sanitized HTML) |
| `meta_title` | `seo_title` (falls back to `title`) |
| `meta_description` | `seo_description` + `excerpt` |
| `keyword` + `tags` | `seo_keywords` (merged, de-duplicated) |
| `image_url` | `featured_image` |
| `published_at` | `published_at` (only when importing as published) |

`project_id` and `image_alt` are not stored — there is no column for them. The
full payload is kept in `neth_webhook_deliveries.payload` if you need it later.

## Status codes the sender sees

| Code | When |
| --- | --- |
| 200 | Stored, or a duplicate delivery, or a ping, or a payload with no id/title (retrying can't fix that, so it is recorded as `skipped` rather than looped) |
| 400 | Body is not JSON, or fails schema validation |
| 401 | Bad signature, missing signature, or stale timestamp |
| 500 | `NETH_WEBHOOK_SECRET` unset, or a transient database error — the sender should retry |

## Debugging

```sql
select created_at, event, status, external_id, slug, error
from neth_webhook_deliveries
order by created_at desc
limit 20;
```

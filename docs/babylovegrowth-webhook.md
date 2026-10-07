# Babylovegrowth webhook — receiver setup

Babylovegrowth POSTs each article as JSON when it's generated. This CMS
receives it at [`app/api/babylovegrowth-webhook/route.ts`](../app/api/babylovegrowth-webhook/route.ts)
and imports it into `blogs` (logic in [`lib/babylovegrowth.ts`](../lib/babylovegrowth.ts)).

**No database changes.** Imported posts are marked with columns that already
exist from the Neth webhook: `external_source = 'babylovegrowth'` and
`external_id = 'blg:<their id>'`.

```sql
-- every Babylovegrowth post
select title, slug, status, created_at from blogs
where external_source = 'babylovegrowth' order by created_at desc;
```

## Setup

1. **Generate a token:** `openssl rand -hex 24`
2. **Set it in Vercel** as `BABYLOVEGROWTH_WEBHOOK_TOKEN` (Production + Preview),
   then **redeploy** — env changes only apply to a new deployment.
3. **Check it:** open `https://www.admin.techneth.com/api/babylovegrowth-webhook`
   in a browser → `"token_configured": true`.
4. **In Babylovegrowth's dashboard:**
   - **Webhook URL:** `https://www.admin.techneth.com/api/babylovegrowth-webhook`
   - **Secret token:** the same token as `BABYLOVEGROWTH_WEBHOOK_TOKEN`

   Use the `www.` host — the bare domain 308-redirects, and not every webhook
   sender follows redirects.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `BABYLOVEGROWTH_WEBHOOK_TOKEN` | **yes** | — | Without it every delivery is refused with 500. |
| `BABYLOVEGROWTH_BLOG_STATUS` | no | `draft` | `published` to put imports live immediately. |
| `BABYLOVEGROWTH_BLOG_AUTHOR` | no | `Techneth` | Byline for imported posts. |
| `BABYLOVEGROWTH_BLOG_CATEGORY` | no | *(none)* | A label from `lib/categories.ts`. |

## Authentication

Babylovegrowth sends the dashboard's "Secret token" as
`Authorization: Bearer <token>` on every request. The receiver compares it to
`BABYLOVEGROWTH_WEBHOOK_TOKEN` in constant time; missing or wrong gets 401.
Only the header is accepted — a token in the URL is ignored. Treat the token
like a password: anyone holding it can post articles into the CMS. To rotate,
generate a new one and update it in both Vercel (then redeploy) and their dashboard.

## Responses, and why failures return 500

The article is imported **before** responding:

| Response | When | Babylovegrowth will… |
| --- | --- | --- |
| 200 | Imported, or nothing to do (repeat, edited, trashed, test ping) | stop |
| 401 | Missing / wrong Bearer token | — fix the secret token |
| 400 | Body isn't JSON | — |
| 500 | Database error, or token not configured | retry |

With no table holding the payload, their retry is what guarantees an article
isn't lost on a transient failure. Retries are harmless: posts are keyed on the
article id, so a repeat is recognised as `unchanged`. Import takes well under a
second (≈0.4 s cold for a full real article), inside their 5-second limit.

## What an import does

| Situation | Result |
| --- | --- |
| New article | Created (as a draft by default) |
| Same article delivered again | `unchanged` — no duplicate |
| Article changed at the source | `updated` — status, slug, category, author and publish date are never touched |
| Anyone has edited / published / featured / paired the post in the admin panel | `skipped_edited` — **your version wins**, never overwritten |
| Post is in Trash | `skipped_trashed` — never resurrected |
| Payload has no id, title or content | `skipped_invalid` — its top-level keys are logged |

**How edits are detected:** every admin-panel write records the user in
`updated_by`; the webhook never sets it. So `updated_by` being set means a person
has touched the post. Note this is deliberately conservative — even toggling
"featured" or publishing a draft counts, after which Babylovegrowth updates to
that post stop applying. Clear `updated_by` on a post to let updates flow again.

### Field mapping (checked against real Techneth articles)

| Babylovegrowth | Column |
| --- | --- |
| `id` | `external_id` as `blg:<id>` |
| `title` | `title` |
| `slug` | `slug` — suffixed `-2`, `-3`… only if another post holds it |
| `content_html` (falls back to `content_markdown`) | `content`, sanitized. The leading `<h1>` title and hero image are removed — the post template already renders both |
| `jsonLd`, `faqJsonLd` | appended to `content` as `<script type="application/ld+json">` |
| `meta_description` | `seo_description` and `excerpt` |
| `seedKeyword` + `keywords` | `seo_keywords`, seed keyword first, de-duplicated |
| `hero_image_url` | `featured_image` (hotlinked from their CDN) |
| `languageCode` | `is_english` |

Their docs don't specify the payload envelope; the article is accepted bare or
wrapped in `{ article }` / `{ data }`.

## Debugging

Vercel → Logs, filter `[babylovegrowth]`. One line per delivery:

```
[babylovegrowth] article 942695: created in 412ms
[babylovegrowth] article 942695: unchanged in 96ms
[babylovegrowth] unimportable payload — top-level keys: id, event
```

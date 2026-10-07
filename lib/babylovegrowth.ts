import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeHtmlServer } from '@/lib/sanitize/server';
import { markdownToHtml } from '@/components/admin/live-editor/markdown';
import { splitKeywords } from '@/lib/keywords';
import { slugify, excerptFromHtml } from '@/lib/neth-webhook';

/**
 * Babylovegrowth → blogs, via their webhook (POST /api/babylovegrowth-webhook).
 *
 * They POST the article as JSON each time one is generated. Their docs don't
 * specify the envelope, so the mapping accepts the article bare or wrapped
 * ({ article }, { data }), and the field names match what their API returns
 * for a full article — verified against real Techneth articles.
 *
 * No extra tables or columns: an imported post is marked by
 * external_source = 'babylovegrowth' and external_id = 'blg:<id>' (columns the
 * Neth webhook already added). Processing is idempotent, keyed on that id: a
 * retried or repeated delivery updates the same post or is recognised as
 * unchanged.
 */

export const SOURCE = 'babylovegrowth';

type Json = Record<string, unknown>;

// ── Payload normalisation ───────────────────────────────────────────────────

function str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v).trim();
}

function first(obj: Json, ...keys: string[]): unknown {
    for (const k of keys) {
        const v = obj[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
}

/** The article object, whether sent bare or inside { article } / { data }. */
export function unwrapArticle(body: unknown): Json {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
    const o = body as Json;
    for (const k of ['article', 'data', 'post', 'payload']) {
        if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) return o[k] as Json;
    }
    return o;
}

function isoOrNull(v: unknown): string | null {
    const s = str(v);
    if (!s) return null;
    const n = /^\d+$/.test(s) ? Number(s) * (s.length <= 10 ? 1000 : 1) : NaN;
    const d = new Date(Number.isFinite(n) ? n : s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface Article {
    id: string;
    title: string;
    slug: string;
    updatedAt: string | null;
    publishedAt: string | null;
    contentHtml: string;
    contentMarkdown: string;
    metaTitle: string;
    metaDescription: string;
    heroImageUrl: string;
    jsonLd: unknown;
    faqJsonLd: unknown;
    keywords: string[];
    languageCode: string;
}

export function normalizeArticle(raw: Json): Article {
    const kw = first(raw, 'keywords', 'tags', 'keyword');
    const listed = Array.isArray(kw) ? kw.map(str).filter(Boolean) : splitKeywords(str(kw));
    return {
        id: str(first(raw, 'id', 'article_id', 'articleId', '_id')),
        title: str(first(raw, 'title', 'name')),
        slug: str(raw.slug),
        updatedAt: isoOrNull(first(raw, 'updated_at', 'updatedAt', 'modified_at')),
        publishedAt: isoOrNull(first(raw, 'published_at', 'publishedAt', 'created_at', 'createdAt')),
        contentHtml: str(first(raw, 'content_html', 'contentHtml', 'html')),
        contentMarkdown: str(first(raw, 'content_markdown', 'contentMarkdown', 'markdown')),
        metaTitle: str(first(raw, 'meta_title', 'metaTitle', 'seo_title')),
        metaDescription: str(first(raw, 'meta_description', 'metaDescription', 'description')),
        heroImageUrl: str(first(raw, 'hero_image_url', 'heroImageUrl', 'image_url', 'featured_image')),
        jsonLd: first(raw, 'jsonLd', 'json_ld', 'jsonld', 'schema'),
        faqJsonLd: first(raw, 'faqJsonLd', 'faq_json_ld'),
        // seedKeyword is the article's primary target term — lead with it.
        // splitKeywords de-duplicates case-insensitively.
        keywords: splitKeywords([str(raw.seedKeyword), ...listed].filter(Boolean).join('\n')),
        languageCode: str(first(raw, 'languageCode', 'language_code', 'language', 'lang')).toLowerCase(),
    };
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/** Prefixed so it can never collide with a Neth id in the same unique index. */
export const externalIdFor = (articleId: string) => `blg:${articleId}`;

/** JSON-LD as an inline script, safe to embed (no early `</script>`). */
function jsonLdScript(jsonLd: unknown): string {
    if (!jsonLd) return '';
    let obj: unknown = jsonLd;
    if (typeof jsonLd === 'string') {
        try { obj = JSON.parse(jsonLd); } catch { return ''; } // invalid JSON-LD is worse than none
    }
    const json = JSON.stringify(obj).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Babylovegrowth bodies open with the title as an <h1> and the hero image —
 * both of which the post template already renders (h1.post-title and the
 * featured image), so they'd appear twice, and a second <h1> hurts SEO.
 * Only the LEADING ones are removed; everything after is left alone.
 */
export function stripTemplateDuplicates(html: string, heroUrl: string): string {
    let out = html.trimStart();

    const h1 = out.match(/^<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i);
    if (h1) out = out.slice(h1[0].length);

    if (heroUrl) {
        const img = out.match(/^<p>\s*<img\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/p>\s*/i);
        if (img && img[1].replace(/&amp;/g, '&') === heroUrl) out = out.slice(img[0].length);
    }
    return out;
}

async function buildContent(a: Article): Promise<string> {
    let html = a.contentHtml || (a.contentMarkdown ? markdownToHtml(a.contentMarkdown) : '');
    html = stripTemplateDuplicates(html, a.heroImageUrl);
    // Their Article / FAQ schema rides along in the body so it reaches the live
    // site without frontend changes. Skip if the HTML already carries some.
    if (!/application\/ld\+json/i.test(html)) {
        const scripts = [jsonLdScript(a.jsonLd), jsonLdScript(a.faqJsonLd)].filter(Boolean);
        if (scripts.length) html += `\n${scripts.join('\n')}`;
    }
    return sanitizeHtmlServer(html);
}

/** Their languageCode → this CMS's English/non-English flag. Unknown → English. */
function isEnglish(languageCode: string): boolean {
    return !languageCode || languageCode.startsWith('en');
}

function importStatus(): 'draft' | 'published' {
    return process.env.BABYLOVEGROWTH_BLOG_STATUS === 'published' ? 'published' : 'draft';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureUniqueSlug(supabase: any, desired: string): Promise<string> {
    const base = desired || 'post';
    for (let n = 1; n < 50; n++) {
        const candidate = n === 1 ? base : `${base}-${n}`;
        const { data } = await supabase.from('blogs').select('id').eq('slug', candidate).maybeSingle();
        if (!data) return candidate;
    }
    return `${base}-${Date.now()}`;
}

// ── Processing ──────────────────────────────────────────────────────────────

export type ImportAction =
    | 'created'        // new post
    | 'updated'        // existing import, source content changed
    | 'unchanged'      // repeat / retried delivery of identical content
    | 'skipped_edited' // an editor changed the post in the CMS — their version wins
    | 'skipped_trashed'// the post is in Trash — never resurrect it
    | 'skipped_invalid'; // no id, title or content — nothing importable

export interface ImportResult {
    action: ImportAction;
    articleId: string;
    blogId?: string;
    slug?: string;
    reason?: string;
}

const invalid = (articleId: string, reason: string): ImportResult =>
    ({ action: 'skipped_invalid', articleId, reason });

/**
 * Create or update the blog post for one delivered article.
 * Throws only on unexpected failures (DB errors); everything expected is a result.
 */
export async function importArticle(body: unknown): Promise<ImportResult> {
    const a = normalizeArticle(unwrapArticle(body));
    if (!a.id) return invalid('', 'payload has no article id');
    if (!a.title) return invalid(a.id, 'payload has no title');
    if (!a.contentHtml && !a.contentMarkdown) {
        return invalid(a.id, 'payload has no content_html or content_markdown');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const externalId = externalIdFor(a.id);

    const content = await buildContent(a);
    if (!content.trim()) return invalid(a.id, 'content is empty after sanitizing');
    const seo = {
        excerpt: a.metaDescription || excerptFromHtml(content),
        seo_title: a.metaTitle || a.title,
        seo_description: a.metaDescription || null,
        seo_keywords: a.keywords.length ? a.keywords : null,
        featured_image: a.heroImageUrl || null,
    };

    const { data: existing, error: lookupErr } = await supabase
        .from('blogs')
        .select('id, slug, title, content, deleted_at, updated_by')
        .eq('external_id', externalId)
        .maybeSingle();
    if (lookupErr) throw lookupErr;

    if (existing) {
        if (existing.deleted_at) {
            return { action: 'skipped_trashed', articleId: a.id, blogId: existing.id, slug: existing.slug };
        }
        // Every admin-panel write (edit, publish, feature, pair) records the
        // user in updated_by; this webhook never sets it. So a non-null
        // updated_by means a person has touched the post — their version wins.
        if (existing.updated_by) {
            return { action: 'skipped_edited', articleId: a.id, blogId: existing.id, slug: existing.slug };
        }
        if (existing.title === a.title && existing.content === content) {
            return { action: 'unchanged', articleId: a.id, blogId: existing.id, slug: existing.slug };
        }

        // Deliberately NOT touched: status (don't unpublish a live post),
        // slug (don't break URLs), category, author, published_at.
        const { error } = await supabase.from('blogs').update({
            title: a.title,
            content,
            ...seo,
            updated_at: new Date().toISOString(),
            // updated_by deliberately left null — see the edit check above
        }).eq('id', existing.id);
        if (error) throw error;
        revalidate();
        return { action: 'updated', articleId: a.id, blogId: existing.id, slug: existing.slug };
    }

    const status = importStatus();
    const slug = await ensureUniqueSlug(supabase, slugify(a.slug || a.title));
    const { data: created, error } = await supabase.from('blogs').insert({
        title: a.title,
        slug,
        content,
        ...seo,
        status,
        category: process.env.BABYLOVEGROWTH_BLOG_CATEGORY || null,
        author_name: process.env.BABYLOVEGROWTH_BLOG_AUTHOR || 'Techneth',
        is_english: isEnglish(a.languageCode),
        published_at: status === 'published' ? (a.publishedAt || new Date().toISOString()) : null,
        external_id: externalId,
        external_source: SOURCE,
    }).select('id').single();

    if (error) {
        // A retry raced the original delivery and lost on the unique
        // external_id index — the post exists, which is the outcome we want.
        if (error.code === '23505' && /external_id/.test(error.message || '')) {
            return { action: 'unchanged', articleId: a.id, reason: 'concurrent duplicate delivery' };
        }
        throw error;
    }
    revalidate();
    return { action: 'created', articleId: a.id, blogId: created.id, slug };
}

function revalidate() {
    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag('dashboard-stats', 'default');
}

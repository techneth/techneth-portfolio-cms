import 'server-only';

import crypto from 'crypto';
import { z } from 'zod';
import { markdownToHtml } from '@/components/admin/live-editor/markdown';

/** How far apart the sender's clock and ours may be before we reject (seconds). */
export const MAX_TIMESTAMP_SKEW = 300;

export const NETH_HEADERS = {
    event: 'X-Neth-Event',
    delivery: 'X-Neth-Delivery',
    timestamp: 'X-Neth-Timestamp',
    signature: 'X-Neth-Signature',
} as const;

/**
 * Verify `X-Neth-Signature` against the exact raw request body.
 *
 * The sender signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends
 * `sha256=<hex>`. The body must be the untouched bytes — re-serializing parsed
 * JSON changes whitespace and key order and breaks the digest.
 */
export function verifySignature(
    rawBody: string,
    timestamp: string,
    signature: string,
    secret: string
): { ok: true } | { ok: false; reason: string } {
    if (!signature) return { ok: false, reason: 'missing signature' };
    if (!timestamp) return { ok: false, reason: 'missing timestamp' };

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid timestamp' };
    if (Math.abs(Date.now() / 1000 - ts) > MAX_TIMESTAMP_SKEW) {
        return { ok: false, reason: 'timestamp outside the replay window' };
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on a length mismatch, so compare lengths first —
    // length is not secret, the digest is.
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, reason: 'signature mismatch' };
    }
    return { ok: true };
}

// ── Payload ─────────────────────────────────────────────────────────────────

const looseString = z.union([z.string(), z.number()]).nullish()
    .transform((v) => (v === null || v === undefined ? '' : String(v)));

/**
 * Deliberately permissive: the sender may add keys or omit optional ones, and
 * an unknown extra field must never fail a delivery (it would be retried
 * forever). Only `id` and `title` are genuinely required to store a post.
 */
export const nethPayloadSchema = z.object({
    event: z.string().nullish(),
    id: looseString,
    blog_id: looseString,
    project_id: looseString,
    title: looseString,
    slug: looseString,
    keyword: looseString,
    tags: z.array(z.union([z.string(), z.number()])).nullish(),
    meta_title: looseString,
    meta_description: looseString,
    content_format: looseString,
    content_html: looseString,
    content_text: looseString,
    content: looseString,
    image_url: looseString,
    image_alt: looseString,
    site_url: looseString,
    published_at: looseString,
}).passthrough();

export type NethPayload = z.infer<typeof nethPayloadSchema>;

/** URL-safe slug, matching what the admin panel produces for hand-written posts. */
export function slugify(input: string): string {
    return input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90)
        .replace(/-+$/g, '');
}

/**
 * Resolve the post body to HTML, honouring the sender's `content_format`.
 *
 * HTML is preferred whenever it is present — it is the only format that keeps
 * self-contained embeds (the stat chart) intact. Markdown and plain text are
 * converted with the same converter the editor's Markdown mode uses, so an
 * imported post opens as real editable blocks.
 */
export function resolveContentHtml(p: NethPayload): string {
    const format = (p.content_format || '').toLowerCase();
    const html = (p.content_html || '').trim();
    const text = (p.content_text || '').trim();
    const generic = (p.content || '').trim();

    if (format === 'markdown' || format === 'md') {
        const md = generic || text;
        if (md) return markdownToHtml(md);
        return html;
    }

    if (format === 'text' || format === 'plain' || format === 'plaintext') {
        const body = text || generic;
        if (body) return markdownToHtml(body);
        return html;
    }

    // 'html', empty, or anything unrecognised: take the richest body available.
    if (html) return html;
    if (generic) return /<[a-z][\s\S]*>/i.test(generic) ? generic : markdownToHtml(generic);
    if (text) return markdownToHtml(text);
    return '';
}

/** Plain-text excerpt from rendered HTML, cut on a word boundary. */
export function excerptFromHtml(html: string, max = 200): string {
    const text = html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= max) return text;
    return text.slice(0, text.lastIndexOf(' ', max) > 0 ? text.lastIndexOf(' ', max) : max).trim() + '…';
}

/** Merge `keyword` + `tags` into the seo_keywords array, de-duplicated. */
export function keywordsFrom(p: NethPayload): string[] {
    const all = [p.keyword || '', ...(p.tags || []).map(String)]
        .map((k) => k.trim())
        .filter(Boolean);
    return Array.from(new Set(all));
}

/** ISO timestamp from the payload, falling back to now for missing/invalid values. */
export function publishedAtFrom(p: NethPayload): string {
    const raw = (p.published_at || '').trim();
    if (raw) {
        const numeric = /^\d+$/.test(raw) ? Number(raw) * 1000 : NaN;
        const d = new Date(Number.isFinite(numeric) ? numeric : raw);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return new Date().toISOString();
}

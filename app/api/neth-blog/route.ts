import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeHtmlServer } from '@/lib/sanitize/server';
import {
    NETH_HEADERS,
    verifySignature,
    nethPayloadSchema,
    resolveContentHtml,
    excerptFromHtml,
    keywordsFrom,
    publishedAtFrom,
    slugify,
    type NethPayload,
} from '@/lib/neth-webhook';

// Node runtime: the signature check needs node:crypto, and sanitizing needs jsdom.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Inbound webhook: an external publisher POSTs each published blog here.
 *
 * Contract (their side):
 *   X-Neth-Event      blog.published | blog.updated | ping
 *   X-Neth-Delivery   unique per attempt — dedupe key
 *   X-Neth-Timestamp  unix seconds, part of the signed string
 *   X-Neth-Signature  sha256=<hmac of `${timestamp}.${rawBody}`>
 *
 * Anything other than 2xx marks the publish failed on their side and is
 * retried, so every "we already have this" path must answer 200.
 */

/** Posts land as drafts unless NETH_BLOG_STATUS=published. */
function importStatus(): 'draft' | 'published' {
    return process.env.NETH_BLOG_STATUS === 'published' ? 'published' : 'draft';
}

function publicSiteUrl(payloadSiteUrl: string): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        payloadSiteUrl ||
        ''
    ).replace(/\/+$/, '');
}

/**
 * A slug is unique across all posts, but this post may legitimately already
 * own it (blog.updated). Suffix -2, -3… only when another row holds it.
 */
async function ensureUniqueSlug(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    desired: string,
    ownRowId: string | null
): Promise<string> {
    const base = desired || 'post';
    for (let n = 1; n < 50; n++) {
        const candidate = n === 1 ? base : `${base}-${n}`;
        const { data } = await supabase
            .from('blogs')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle();
        if (!data || data.id === ownRowId) return candidate;
    }
    return `${base}-${Date.now()}`;
}

export async function POST(request: Request) {
    const secret = process.env.NETH_WEBHOOK_SECRET;
    const event = request.headers.get(NETH_HEADERS.event) || '';
    const deliveryId = request.headers.get(NETH_HEADERS.delivery) || '';
    const timestamp = request.headers.get(NETH_HEADERS.timestamp) || '';
    const signature = request.headers.get(NETH_HEADERS.signature) || '';

    if (!secret) {
        // Misconfiguration on our side, not theirs — 500 so they retry after a fix.
        console.error('[neth-blog] NETH_WEBHOOK_SECRET is not set; refusing all deliveries');
        return NextResponse.json({ error: 'Receiver not configured' }, { status: 500 });
    }

    // The raw bytes are what was signed — never re-serialize before verifying.
    const raw = await request.text();

    const verified = verifySignature(raw, timestamp, signature, secret);
    if (!verified.ok) {
        console.warn(`[neth-blog] rejected delivery ${deliveryId || '(none)'}: ${verified.reason}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'Body is not valid JSON' }, { status: 400 });
    }

    const parsed = nethPayloadSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Unexpected payload shape' },
            { status: 400 }
        );
    }
    const p: NethPayload = parsed.data;

    // Connectivity test — verified above, so a 200 here proves the secret matches.
    if (event === 'ping' || p.event === 'ping') {
        return NextResponse.json({ ok: true, event: 'ping' }, { status: 200 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Replay guard: the same attempt id arriving twice must not create a second
    // post. Their retry gets the original result.
    if (deliveryId) {
        const { data: seen } = await supabase
            .from('neth_webhook_deliveries')
            .select('blog_id, slug, status')
            .eq('delivery_id', deliveryId)
            .maybeSingle();
        if (seen) {
            const site = publicSiteUrl(p.site_url);
            return NextResponse.json(
                {
                    ok: true,
                    duplicate: true,
                    id: seen.blog_id,
                    url: seen.slug && site ? `${site}/blog/${seen.slug}` : undefined,
                },
                { status: 200 }
            );
        }
    }

    const externalId = p.id || p.blog_id;
    const title = (p.title || '').trim();

    if (!externalId || !title) {
        // Permanently unprocessable — a retry cannot fix a payload with no id or
        // title, so record it and return 200 rather than looping their queue.
        await supabase.from('neth_webhook_deliveries').insert({
            delivery_id: deliveryId || `no-id-${Date.now()}`,
            event,
            external_id: externalId || null,
            status: 'skipped',
            error: !externalId ? 'payload has no id' : 'payload has no title',
            payload: body,
        });
        return NextResponse.json(
            { ok: false, skipped: true, reason: !externalId ? 'missing id' : 'missing title' },
            { status: 200 }
        );
    }

    try {
        // Existing import? blog.updated and re-deliveries edit the same row.
        const { data: existing } = await supabase
            .from('blogs')
            .select('id, slug')
            .eq('external_id', externalId)
            .maybeSingle();

        const contentHtml = await sanitizeHtmlServer(resolveContentHtml(p));
        const desiredSlug = slugify(p.slug || title);
        const slug = await ensureUniqueSlug(supabase, desiredSlug, existing?.id ?? null);
        const keywords = keywordsFrom(p);
        const status = importStatus();

        const record = {
            title,
            slug,
            excerpt: (p.meta_description || '').trim() || excerptFromHtml(contentHtml),
            content: contentHtml,
            featured_image: (p.image_url || '').trim() || null,
            status,
            seo_title: (p.meta_title || '').trim() || title,
            seo_description: (p.meta_description || '').trim() || null,
            seo_keywords: keywords.length ? keywords : null,
            category: process.env.NETH_BLOG_CATEGORY || null,
            author_name: process.env.NETH_BLOG_AUTHOR || 'Techneth',
            is_english: true,
            external_id: externalId,
            external_source: 'neth',
            published_at: status === 'published' ? publishedAtFrom(p) : null,
            updated_at: new Date().toISOString(),
        };

        let blogId: string;
        if (existing) {
            const { data, error } = await supabase
                .from('blogs')
                .update(record)
                .eq('id', existing.id)
                .select('id')
                .single();
            if (error) throw error;
            blogId = data.id;
        } else {
            const { data, error } = await supabase
                .from('blogs')
                .insert(record)
                .select('id')
                .single();
            if (error) throw error;
            blogId = data.id;
        }

        await supabase.from('neth_webhook_deliveries').insert({
            delivery_id: deliveryId || `${externalId}-${Date.now()}`,
            event,
            external_id: externalId,
            blog_id: blogId,
            slug,
            status: 'processed',
            payload: body,
        });

        revalidatePath('/blogs');
        revalidateTag('blogs', 'default');
        revalidateTag('dashboard-stats', 'default');

        const site = publicSiteUrl(p.site_url);
        return NextResponse.json(
            {
                ok: true,
                id: blogId,
                slug,
                status,
                created: !existing,
                url: site ? `${site}/blog/${slug}` : undefined,
            },
            { status: 200 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[neth-blog] failed to store post:', message);
        await supabase.from('neth_webhook_deliveries').insert({
            delivery_id: deliveryId || `err-${Date.now()}`,
            event,
            external_id: externalId,
            status: 'failed',
            error: message,
            payload: body,
        }).then(() => undefined, () => undefined);
        // 5xx: a transient DB problem should be retried by the sender.
        return NextResponse.json({ error: 'Could not store the post' }, { status: 500 });
    }
}

/** Lets you confirm the endpoint is reachable without a signed request. */
export async function GET() {
    return NextResponse.json({ ok: true, endpoint: 'neth-blog', method: 'POST' });
}

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { importArticle, normalizeArticle, unwrapArticle } from '@/lib/babylovegrowth';

// Node runtime: the token check needs node:crypto, and sanitizing needs jsdom.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Inbound webhook: Babylovegrowth POSTs each article as JSON when it's generated.
 *
 * Their contract is only: HTTPS POST, JSON body, return 200 within 5 seconds
 * (slower may be retried). They don't sign requests, so the URL itself carries
 * a secret — configure theirs as
 *     https://<this deployment>/api/babylovegrowth-webhook?token=<BABYLOVEGROWTH_WEBHOOK_TOKEN>
 *
 * The article is imported BEFORE answering, and only a successful import gets
 * a 200. A failure answers 500 so they retry — with nowhere else to keep the
 * payload, their retry is what guarantees an article isn't lost. Retries (and
 * a slow first response that gets retried) are harmless: import is idempotent,
 * keyed on the article id.
 */

function tokenMatches(request: Request, secret: string): boolean {
    const url = new URL(request.url);
    // Query string is what their form supports; headers too, in case they add it
    const provided =
        url.searchParams.get('token') ||
        request.headers.get('x-webhook-token') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        '';
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    const secret = process.env.BABYLOVEGROWTH_WEBHOOK_TOKEN;
    if (!secret) {
        console.error('[babylovegrowth] BABYLOVEGROWTH_WEBHOOK_TOKEN is not set; refusing deliveries');
        return NextResponse.json({ error: 'Receiver not configured' }, { status: 500 });
    }
    if (!tokenMatches(request, secret)) {
        console.warn('[babylovegrowth] rejected delivery: missing or wrong token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = JSON.parse(await request.text());
    } catch {
        return NextResponse.json({ error: 'Body is not valid JSON' }, { status: 400 });
    }

    const started = Date.now();
    try {
        const result = await importArticle(body);
        console.log(
            `[babylovegrowth] article ${result.articleId || '?'}: ${result.action}` +
            `${result.reason ? ` (${result.reason})` : ''} in ${Date.now() - started}ms`
        );
        if (result.action === 'skipped_invalid') {
            // Their docs don't pin down the payload shape, so log its top-level
            // keys (not values) — enough to fix the mapping if it ever misses.
            const keys = Object.keys(unwrapArticle(body)).join(', ') || '(none)';
            console.warn(`[babylovegrowth] unimportable payload — top-level keys: ${keys}`);
        }
        // 200 for every outcome a retry can't change (including skips), so a
        // test ping or an edited post doesn't get retried forever
        return NextResponse.json({ ok: true, ...result }, { status: 200 });
    } catch (err) {
        // Supabase errors are plain { message, code } objects, not Error
        // instances — String(err) would log "[object Object]"
        const e = err as { message?: string; code?: string } | null;
        const message = e?.message ? `${e.message}${e.code ? ` (${e.code})` : ''}` : String(err);
        const articleId = normalizeArticle(unwrapArticle(body)).id || '?';
        console.error(`[babylovegrowth] import failed for article ${articleId}: ${message}`);
        // 5xx so Babylovegrowth retries — the payload isn't stored anywhere else
        return NextResponse.json({ error: 'Could not import the article' }, { status: 500 });
    }
}

/** Health check: is the endpoint deployed, and can it see its token? (Never reveals the token.) */
export async function GET() {
    return NextResponse.json({
        ok: true,
        endpoint: 'babylovegrowth-webhook',
        method: 'POST',
        token_configured: !!process.env.BABYLOVEGROWTH_WEBHOOK_TOKEN,
        import_status: process.env.BABYLOVEGROWTH_BLOG_STATUS === 'published' ? 'published' : 'draft',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    });
}

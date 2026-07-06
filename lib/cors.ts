import { NextRequest } from 'next/server';

/**
 * Origins allowed to call this backend's API from a browser.
 *
 * Add production frontends here. Extra origins can be supplied via the
 * ALLOWED_ORIGINS env var (comma-separated) without a code change, e.g.
 *   ALLOWED_ORIGINS=https://staging.techneth.com,https://preview.example.com
 */
const STATIC_ALLOWED_ORIGINS = [
    'https://techneth.com',
    'https://www.techneth.com',
    'https://techneth-portfolio.vercel.app',
];

const ENV_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Allow localhost during development only.
const DEV_ALLOWED_ORIGINS =
    process.env.NODE_ENV === 'development'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : [];

export const ALLOWED_ORIGINS = [
    ...STATIC_ALLOWED_ORIGINS,
    ...ENV_ALLOWED_ORIGINS,
    ...DEV_ALLOWED_ORIGINS,
];

/**
 * Returns true when the request should be allowed to reach the API.
 *
 * - Requests from an allow-listed Origin are allowed (cross-origin frontends).
 * - Same-origin requests (Origin host === request host) are allowed. This
 *   covers the admin panel, which is served from this same deployment.
 * - Requests with no Origin header (server-to-server, direct navigation,
 *   same-origin GETs) are allowed here; sensitive routes still enforce their
 *   own auth via getCurrentUser().
 */
export function isOriginAllowed(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return true;

    if (ALLOWED_ORIGINS.includes(origin)) return true;

    try {
        const originHost = new URL(origin).host;
        const requestHost = request.headers.get('host');
        if (requestHost && originHost === requestHost) return true;
    } catch {
        // Malformed Origin header -> treat as not allowed.
    }

    return false;
}

/**
 * Builds CORS response headers, reflecting the Origin only when it is
 * explicitly allow-listed. Never emits a wildcard.
 */
export function buildCorsHeaders(request: NextRequest): Headers {
    const headers = new Headers();
    const origin = request.headers.get('origin');

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set(
            'Access-Control-Allow-Methods',
            'GET,DELETE,PATCH,POST,PUT,OPTIONS'
        );
        headers.set(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
        );
        headers.set('Access-Control-Max-Age', '86400');
    }

    // Responses vary by Origin so caches don't leak one origin's headers to another.
    headers.set('Vary', 'Origin');
    return headers;
}

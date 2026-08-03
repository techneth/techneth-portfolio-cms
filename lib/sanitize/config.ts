/**
 * Shared HTML sanitization policy for admin-authored content.
 *
 * Used on the client (Quill editor "Insert HTML" / HTML source mode) for
 * immediate feedback, and on the server (blog / case-study actions) as the
 * hard security boundary. Keep both in sync by only editing this file.
 */

import type { Config, DOMPurify } from 'dompurify';

/** Hosts allowed inside <iframe src>. Anything else is stripped. */
export const ALLOWED_IFRAME_HOSTS = [
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'www.google.com',        // Google Maps embeds
    'open.spotify.com',
    'codepen.io',
];

export const SANITIZE_CONFIG: Config = {
    ALLOWED_TAGS: [
        // Structure
        'p', 'div', 'span', 'section', 'article', 'header', 'footer', 'aside', 'main',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'br',
        // Text formatting
        'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small',
        'sup', 'sub', 'abbr', 'cite', 'q', 'kbd', 'samp', 'var', 'time',
        // Lists
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // Quotes & code
        'blockquote', 'pre', 'code',
        // Media
        'img', 'figure', 'figcaption', 'picture', 'source',
        'video', 'audio', 'track', 'iframe',
        // Links
        'a',
        // Tables
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        // Misc
        'details', 'summary',
        // Admin-authored custom blocks may ship their own CSS/JS. This is an
        // intentional trust decision: only authenticated staff can write
        // content (server actions enforce roles). Scripts are further
        // constrained by the hook below (inline or https src only).
        'style', 'script',
    ],
    ALLOWED_ATTR: [
        'href', 'target', 'rel', 'title',
        'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'poster',
        'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload',
        'allow', 'allowfullscreen', 'frameborder',
        'class', 'id', 'style', 'dir', 'lang',
        'colspan', 'rowspan', 'scope', 'span',
        'datetime', 'cite', 'start', 'reversed', 'type', 'open',
        'defer', 'async', 'media',
        'data-*',
    ],
    // Forbid form/embedding vectors. NOTE: style/script are deliberately NOT
    // forbidden — admins may add custom CSS/JS blocks (see ALLOWED_TAGS).
    FORBID_TAGS: ['form', 'input', 'button', 'select', 'textarea', 'object', 'embed', 'base', 'link', 'meta'],
    FORBID_ATTR: ['formaction', 'xlink:href'],
    ALLOW_DATA_ATTR: true,
    // Keeps content of removed tags (e.g. text inside an unknown wrapper)
    KEEP_CONTENT: true,
    // Without this, the HTML parser hoists leading <style>/<script> tags into
    // <head> and they silently disappear from the sanitized body.
    FORCE_BODY: true,
};

/**
 * Attach shared hooks to a DOMPurify instance (client or server):
 *  - iframes: only https URLs on the embed-host allowlist survive
 *  - links: external links get rel="noopener noreferrer"
 * Safe to call multiple times on the same instance.
 */
export function applySanitizeHooks(purify: DOMPurify) {
    purify.removeHook('afterSanitizeAttributes');
    purify.addHook('afterSanitizeAttributes', (node: Element) => {
        const tag = node.tagName?.toLowerCase();

        if (tag === 'iframe') {
            const src = node.getAttribute('src') || '';
            let allowed = false;
            try {
                const url = new URL(src);
                allowed = url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.includes(url.hostname);
            } catch {
                allowed = false;
            }
            if (!allowed) {
                node.parentNode?.removeChild(node);
                return;
            }
            // Sandbox embeds: scripts may run inside the frame but it cannot
            // touch the parent page or navigate it.
            node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        }

        if (tag === 'a' && node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }

        // Scripts: inline is allowed (admin-authored); external sources must
        // be https. Anything else (http, data:, blob:, javascript:) is removed.
        if (tag === 'script') {
            const src = node.getAttribute('src');
            if (src) {
                let ok = false;
                try {
                    ok = new URL(src).protocol === 'https:';
                } catch {
                    ok = false;
                }
                if (!ok) node.parentNode?.removeChild(node);
            }
        }
    });
}

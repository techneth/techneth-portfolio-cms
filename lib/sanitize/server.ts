import 'server-only';

import type { DOMPurify, WindowLike } from 'dompurify';
import { SANITIZE_CONFIG, applySanitizeHooks } from './config';

let purifierPromise: Promise<DOMPurify> | null = null;

async function getPurifier(): Promise<DOMPurify> {
    if (!purifierPromise) {
        purifierPromise = (async () => {
            const [{ JSDOM }, { default: createDOMPurify }] = await Promise.all([
                import('jsdom'),
                import('dompurify'),
            ]);
            const window = new JSDOM('').window;
            const purify = createDOMPurify(window as unknown as WindowLike);
            applySanitizeHooks(purify);
            return purify;
        })();
    }
    return purifierPromise;
}

/**
 * Server-side HTML sanitization — the hard security boundary for all
 * admin-authored content before it reaches the database. Same policy as the
 * client (lib/sanitize/config.ts).
 */
export async function sanitizeHtmlServer(dirty: string): Promise<string> {
    if (!dirty) return '';
    const purify = await getPurifier();
    return purify.sanitize(dirty, SANITIZE_CONFIG);
}

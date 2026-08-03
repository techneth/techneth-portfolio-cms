'use client';

import DOMPurify from 'dompurify';
import { SANITIZE_CONFIG, applySanitizeHooks } from './config';

let hooksApplied = false;

/**
 * Sanitize admin-authored HTML in the browser (editor-side, for immediate
 * feedback). The server actions re-sanitize on save — that is the real
 * security boundary; this keeps the editor preview honest.
 */
export function sanitizeHtmlClient(dirty: string): string {
    if (!dirty) return '';
    if (!hooksApplied) {
        applySanitizeHooks(DOMPurify);
        hooksApplied = true;
    }
    return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

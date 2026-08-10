'use client';

import { useEffect, useRef } from 'react';

const PREFIX = 'tn-draft:';

export interface StoredDraft<T> {
    savedAt: number;
    value: T;
}

/** Read a saved draft for `key`, or null if none / unreadable. */
export function readFormDraft<T>(key: string): StoredDraft<T> | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.savedAt === 'number' && 'value' in parsed) {
            return parsed as StoredDraft<T>;
        }
        return null;
    } catch {
        return null;
    }
}

/** Delete the saved draft for `key`. Call after a successful save. */
export function clearFormDraft(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(PREFIX + key);
    } catch {
        /* ignore quota / privacy-mode errors */
    }
}

/**
 * Debounced autosave of `value` to localStorage under `key`, so unsaved work
 * survives a refresh, accidental tab close, or a failed server save.
 *
 * Autosave is skipped while `enabled` is false (e.g. before an edit page has
 * hydrated its server data, or while a create form is still empty). Note:
 * blob: image URLs cannot be restored after a reload — draft persistence
 * protects text/HTML content and field values, not not-yet-uploaded images.
 */
export function useFormDraft<T>(
    key: string,
    value: T,
    opts?: { enabled?: boolean; debounceMs?: number }
): void {
    const { enabled = true, debounceMs = 800 } = opts || {};
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!enabled) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            try {
                window.localStorage.setItem(
                    PREFIX + key,
                    JSON.stringify({ savedAt: Date.now(), value })
                );
            } catch {
                /* ignore quota / privacy-mode errors */
            }
        }, debounceMs);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [key, value, enabled, debounceMs]);
}

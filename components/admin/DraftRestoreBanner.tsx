'use client';

import { RotateCcw, X } from 'lucide-react';

/**
 * Non-blocking banner shown when a locally-saved draft is found that differs
 * from the loaded/empty form. Lets the author recover unsaved work after a
 * refresh, accidental close, or a failed save.
 */
export default function DraftRestoreBanner({
    savedAt,
    onRestore,
    onDiscard,
}: {
    savedAt: number;
    onRestore: () => void;
    onDiscard: () => void;
}) {
    let when: string;
    try {
        when = new Date(savedAt).toLocaleString();
    } catch {
        when = 'a previous session';
    }

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
                <RotateCcw size={16} className="flex-shrink-0" />
                <span>
                    Unsaved changes recovered from <strong>{when}</strong>. Restore them?
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onRestore}
                    className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                >
                    Restore
                </button>
                <button
                    type="button"
                    onClick={onDiscard}
                    className="rounded p-1.5 text-amber-700 transition-colors hover:text-amber-900"
                    aria-label="Discard recovered draft"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

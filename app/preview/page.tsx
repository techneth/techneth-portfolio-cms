'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { buildPreviewDoc, readingTime } from '@/lib/preview-template';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';

interface PreviewPayload {
    kind: 'content';
    title: string;
    content: string;
}

/**
 * Standalone live-preview page, opened in its own tab from the editor.
 * Receives content over a BroadcastChannel as the admin types, and patches
 * the preview document in place (no reloads → no flicker).
 */
export default function LivePreviewPage() {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [doc, setDoc] = useState<string | null>(null);
    const docBuiltRef = useRef(false);
    const latestRef = useRef<PreviewPayload | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    /** Patch the already-loaded iframe document with fresh content. */
    const applyUpdate = useCallback((payload: PreviewPayload) => {
        const frameDoc = frameRef.current?.contentDocument;
        const body = frameDoc?.querySelector('.post-body');
        if (!frameDoc || !body) return;
        const clean = sanitizeHtmlClient(payload.content || '');
        body.innerHTML = clean || '<p style="color:#9ca3af">No content yet…</p>';
        // innerHTML-injected scripts are inert — replace with live clones
        body.querySelectorAll('script').forEach((old) => {
            const fresh = frameDoc.createElement('script');
            for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
            fresh.textContent = old.textContent;
            old.replaceWith(fresh);
        });
        const titleEl = frameDoc.querySelector('.post-title');
        if (titleEl) titleEl.textContent = payload.title || 'Untitled post';
        const minutesEl = frameDoc.querySelector('[data-minutes]');
        if (minutesEl) minutesEl.textContent = `${readingTime(clean)} min read`;
        setLastUpdate(new Date());
    }, []);

    useEffect(() => {
        document.title = 'Live Preview — Techneth Admin';
        const channel = new BroadcastChannel('tn-live-preview');
        channel.onmessage = (e: MessageEvent) => {
            const payload = e.data as PreviewPayload;
            if (payload?.kind !== 'content') return;
            latestRef.current = payload;
            if (!docBuiltRef.current) {
                // First payload: build the full document once
                docBuiltRef.current = true;
                setDoc(buildPreviewDoc({
                    type: 'blog',
                    title: payload.title,
                    content: sanitizeHtmlClient(payload.content || ''),
                    compact: true,
                }));
                setLastUpdate(new Date());
            } else {
                applyUpdate(payload);
            }
        };
        // Ask the editor tab for the current content
        channel.postMessage({ kind: 'hello' });
        return () => channel.close();
    }, [applyUpdate]);

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
                <span className="text-sm text-gray-300">
                    Live preview — updates as you type in the editor tab
                </span>
                <span className="text-xs text-gray-500">
                    {lastUpdate
                        ? `Updated ${lastUpdate.toLocaleTimeString()}`
                        : 'Waiting for the editor…'}
                </span>
            </div>
            {doc ? (
                <iframe
                    ref={frameRef}
                    title="Live blog preview"
                    srcDoc={doc}
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={() => latestRef.current && applyUpdate(latestRef.current)}
                    className="flex-1 w-full bg-white"
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <RefreshCw size={28} className="animate-spin" />
                    <p className="text-sm">Waiting for content from the editor…</p>
                    <p className="text-xs text-gray-500 max-w-sm text-center">
                        Keep the editor tab open and click “Live Preview” there if this
                        page doesn’t connect within a few seconds.
                    </p>
                </div>
            )}
        </div>
    );
}

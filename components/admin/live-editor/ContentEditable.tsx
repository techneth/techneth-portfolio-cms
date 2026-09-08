'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
    html: string;
    onChange: (html: string) => void;
    className?: string;
    placeholder?: string;
    tagName?: keyof React.JSX.IntrinsicElements;
    style?: React.CSSProperties;
}

/**
 * Uncontrolled contentEditable that plays nicely with React: the DOM is the
 * source of truth while focused (so the caret never jumps), and external
 * updates (undo, block moves) sync in only when the element is not focused.
 * Commits on input (debounced) and on blur.
 *
 * IMPORTANT: this element deliberately has NO children and NO
 * dangerouslySetInnerHTML. React compares dangerouslySetInnerHTML by object
 * identity, not by the __html string — a fresh `{ __html }` literal each render
 * makes React rewrite innerHTML on every single commit. That wipes whatever the
 * user has typed since mount (and, when the string does change, collapses the
 * caret to the start). Seeding the DOM ourselves in the effect below keeps
 * React out of it entirely; all syncing happens here, and never while focused.
 */
export default function ContentEditable({ html, onChange, className, placeholder, tagName = 'div', style }: Props) {
    const ref = useRef<HTMLElement | null>(null);
    const lastEmitted = useRef(html);
    const pendingExternal = useRef<string | null>(null);
    const seeded = useRef(false);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // First run: put the initial markup in place ourselves.
        if (!seeded.current) {
            seeded.current = true;
            if (el.innerHTML !== html) el.innerHTML = html;
            lastEmitted.current = html;
            return;
        }

        if (html === lastEmitted.current) return; // our own change coming back
        if (document.activeElement === el) {
            // Never fight the caret — replay the update once the user leaves
            pendingExternal.current = html;
            return;
        }
        pendingExternal.current = null;
        if (el.innerHTML !== html) el.innerHTML = html;
        lastEmitted.current = html;
    }, [html]);

    const commit = () => {
        const el = ref.current;
        if (!el) return;
        if (el.innerHTML !== lastEmitted.current) {
            lastEmitted.current = el.innerHTML;
            onChange(el.innerHTML);
        }
    };

    const handleInput = () => {
        pendingExternal.current = null; // the user's own edit wins
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(commit, 400);
    };

    const handleBlur = () => {
        if (debounce.current) clearTimeout(debounce.current);
        commit();
        const el = ref.current;
        const external = pendingExternal.current;
        pendingExternal.current = null;
        if (el && external !== null && el.innerHTML !== external) {
            el.innerHTML = external;
            lastEmitted.current = external;
        }
    };

    // Paste as plain text: keeps foreign styles/markup out of the block model
    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        e.preventDefault();
        document.execCommand('insertText', false, text);
        handleInput();
    };

    useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

    return React.createElement(tagName, {
        ref,
        className: `tn-ce ${className || ''}`,
        style,
        contentEditable: true,
        suppressContentEditableWarning: true,
        'data-placeholder': placeholder || '',
        onInput: handleInput,
        onBlur: handleBlur,
        onPaste: handlePaste,
    });
}

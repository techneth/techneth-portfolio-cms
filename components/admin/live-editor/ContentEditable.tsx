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
 */
export default function ContentEditable({ html, onChange, className, placeholder, tagName = 'div', style }: Props) {
    const ref = useRef<HTMLElement | null>(null);
    const lastEmitted = useRef(html);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (document.activeElement === el) return; // never fight the caret
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
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(commit, 400);
    };

    const handleBlur = () => {
        if (debounce.current) clearTimeout(debounce.current);
        commit();
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
        dangerouslySetInnerHTML: { __html: html },
    });
}

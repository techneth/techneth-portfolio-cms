'use client';

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Bold, Italic, Heading1, Heading2, Heading3, Quote, List, ListOrdered, ListTodo,
    Link2, Image as ImageIcon, Code, SquareCode, Table as TableIcon, Minus,
    Strikethrough, PenLine, Columns2, Eye,
} from 'lucide-react';
import { markdownToHtml } from './markdown';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';

interface Props {
    value: string;
    onChange: (md: string) => void;
    /** Stage an image file and give back a URL to reference in the markdown. */
    onImageFile?: (file: File) => string;
}

type View = 'write' | 'split' | 'preview';

/** A toolbar action: what to put around, or in front of, the selection. */
type Action =
    | { kind: 'wrap'; before: string; after: string; placeholder: string }
    | {
        kind: 'lines';
        prefix: string | ((i: number) => string);
        placeholder: string;
        /** Competing prefixes to strip first, so H2→H3 replaces instead of stacking. */
        strip?: RegExp;
    }
    | { kind: 'block'; text: string; /** Caret offset into `text` after inserting. */ caret?: number };

// Prefixes that are mutually exclusive with one another
const HEADING_PREFIX = /^#{1,6}[ \t]+/;
const LIST_PREFIX = /^[-*+][ \t]+(?:\[[ xX]\][ \t]+)?|^\d+[.)][ \t]+/;

const ACTIONS: {
    key: string; title: string; icon: React.ReactNode; shortcut?: string;
    action: Action; group?: boolean;
}[] = [
        { key: 'h1', title: 'Heading 1', icon: <Heading1 size={15} />, action: { kind: 'lines', prefix: '# ', placeholder: 'Heading', strip: HEADING_PREFIX } },
        { key: 'h2', title: 'Heading 2', icon: <Heading2 size={15} />, action: { kind: 'lines', prefix: '## ', placeholder: 'Heading', strip: HEADING_PREFIX } },
        { key: 'h3', title: 'Heading 3', icon: <Heading3 size={15} />, action: { kind: 'lines', prefix: '### ', placeholder: 'Heading', strip: HEADING_PREFIX } },

        { key: 'bold', title: 'Bold (Cmd/Ctrl+B)', shortcut: 'b', icon: <Bold size={15} />, group: true, action: { kind: 'wrap', before: '**', after: '**', placeholder: 'bold text' } },
        { key: 'italic', title: 'Italic (Cmd/Ctrl+I)', shortcut: 'i', icon: <Italic size={15} />, action: { kind: 'wrap', before: '*', after: '*', placeholder: 'italic text' } },
        { key: 'strike', title: 'Strikethrough', icon: <Strikethrough size={15} />, action: { kind: 'wrap', before: '~~', after: '~~', placeholder: 'struck text' } },
        { key: 'code', title: 'Inline code', icon: <Code size={15} />, action: { kind: 'wrap', before: '`', after: '`', placeholder: 'code' } },

        { key: 'link', title: 'Link (Cmd/Ctrl+K)', shortcut: 'k', icon: <Link2 size={15} />, group: true, action: { kind: 'wrap', before: '[', after: '](https://)', placeholder: 'link text' } },

        { key: 'ul', title: 'Bulleted list', icon: <List size={15} />, group: true, action: { kind: 'lines', prefix: '- ', placeholder: 'List item', strip: LIST_PREFIX } },
        { key: 'ol', title: 'Numbered list', icon: <ListOrdered size={15} />, action: { kind: 'lines', prefix: (i) => `${i + 1}. `, placeholder: 'List item', strip: LIST_PREFIX } },
        { key: 'task', title: 'Task list', icon: <ListTodo size={15} />, action: { kind: 'lines', prefix: '- [ ] ', placeholder: 'To do', strip: LIST_PREFIX } },
        { key: 'quote', title: 'Quote', icon: <Quote size={15} />, action: { kind: 'lines', prefix: '> ', placeholder: 'Quoted text' } },

        { key: 'codeblock', title: 'Code block', icon: <SquareCode size={15} />, group: true, action: { kind: 'block', text: '```\ncode\n```', caret: 4 } },
        { key: 'table', title: 'Table', icon: <TableIcon size={15} />, action: { kind: 'block', text: '| Column | Column |\n| --- | --- |\n| Cell | Cell |' } },
        { key: 'hr', title: 'Divider', icon: <Minus size={15} />, action: { kind: 'block', text: '---' } },
    ];

/**
 * A conventional markdown editor: textarea + formatting toolbar + live preview.
 *
 * Deliberately not EasyMDE/SimpleMDE (both are in package.json from the old
 * Quill setup): they bundle CodeMirror 5 and their own preview renderer, which
 * would disagree with the converter the rest of this editor uses. Rendering the
 * preview through the same markdownToHtml means what you see here is exactly
 * what "Apply Markdown" turns into blocks.
 */
export default function MarkdownPane({ value, onChange, onImageFile }: Props) {
    const taRef = useRef<HTMLTextAreaElement | null>(null);
    const [view, setView] = useState<View>('split');
    // Selection to restore after a toolbar edit re-renders the textarea
    const pendingSel = useRef<[number, number] | null>(null);

    useLayoutEffect(() => {
        const sel = pendingSel.current;
        const ta = taRef.current;
        if (!sel || !ta) return;
        pendingSel.current = null;
        ta.focus();
        ta.setSelectionRange(sel[0], sel[1]);
    });

    const preview = useMemo(
        () => sanitizeHtmlClient(markdownToHtml(value)),
        [value]
    );

    const words = useMemo(
        () => (value.trim() ? value.trim().split(/\s+/).length : 0),
        [value]
    );

    /** Replace [start,end) with `text`, then select `selectFrom..selectTo`. */
    const splice = useCallback((start: number, end: number, text: string, selFrom: number, selTo: number) => {
        const next = value.slice(0, start) + text + value.slice(end);
        pendingSel.current = [selFrom, selTo];
        onChange(next);
    }, [value, onChange]);

    const apply = useCallback((action: Action) => {
        const ta = taRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = value.slice(start, end);

        if (action.kind === 'wrap') {
            const { before, after, placeholder } = action;

            // Toggle off, case 1: the markers sit just outside the selection
            // (what you get right after clicking Bold once).
            const outerStart = start - before.length;
            if (
                value.slice(outerStart, start) === before &&
                value.slice(end, end + after.length) === after
            ) {
                splice(outerStart, end + after.length, selected, outerStart, outerStart + selected.length);
                return;
            }

            // Toggle off, case 2: the user selected the markers too.
            if (
                selected.length >= before.length + after.length &&
                selected.startsWith(before) && selected.endsWith(after)
            ) {
                const inner = selected.slice(before.length, selected.length - after.length);
                splice(start, end, inner, start, start + inner.length);
                return;
            }

            const body = selected || placeholder;
            splice(start, end, before + body + after, start + before.length, start + before.length + body.length);
            return;
        }

        if (action.kind === 'lines') {
            // Expand the selection to whole lines so prefixes land correctly
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const lineEndIdx = value.indexOf('\n', end);
            const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
            const chunk = value.slice(lineStart, lineEnd) || action.placeholder;
            const lines = chunk.split('\n');
            const prefixOf = (i: number) => (typeof action.prefix === 'function' ? action.prefix(i) : action.prefix);
            // Every line already carries this exact prefix → remove it (toggle)
            const allPrefixed = lines.every((l, i) => l.startsWith(prefixOf(i)));
            const next = lines
                .map((l, i) => {
                    if (allPrefixed) return l.slice(prefixOf(i).length);
                    // Drop a competing prefix first: H2 → H3 replaces, bullets
                    // → numbers replaces, rather than stacking markers up.
                    const bare = action.strip ? l.replace(action.strip, '') : l;
                    return prefixOf(i) + bare;
                })
                .join('\n');
            splice(lineStart, lineEnd, next, lineStart, lineStart + next.length);
            return;
        }

        // Standalone block: drop it on its own lines
        const lead = start === 0 || value[start - 1] === '\n' ? '' : '\n\n';
        const trail = value[end] === undefined || value[end] === '\n' ? '' : '\n\n';
        const text = lead + action.text + trail;
        // caret lands inside the block (a code fence) when the action asks for it
        const caret = action.caret === undefined
            ? start + text.length
            : start + lead.length + action.caret;
        const caretEnd = action.caret === undefined
            ? caret
            : caret + (action.text.slice(action.caret).split('\n')[0]?.length ?? 0);
        splice(start, end, text, caret, caretEnd);
    }, [value, splice]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const ta = taRef.current;
        if (!ta) return;

        // Tab indents rather than leaving the field — this is a code-ish editor
        if (e.key === 'Tab') {
            e.preventDefault();
            const { selectionStart: s, selectionEnd: en } = ta;
            splice(s, en, '  ', s + 2, s + 2);
            return;
        }

        if (e.key === 'Enter') {
            // Continue a list on the next line, the way every markdown editor does
            const s = ta.selectionStart;
            if (s !== ta.selectionEnd) return;
            const lineStart = value.lastIndexOf('\n', s - 1) + 1;
            const line = value.slice(lineStart, s);
            const m = line.match(/^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/);
            if (!m) return;
            e.preventDefault();
            if (!m[4]) {
                // Empty item — end the list instead of adding another bullet
                splice(lineStart, s, '', lineStart, lineStart);
                return;
            }
            const marker = m[2] ? `${m[2]} ` : `${Number(m[3]) + 1}. `;
            const insert = `\n${m[1]}${marker}`;
            splice(s, s, insert, s + insert.length, s + insert.length);
            return;
        }

        if (!(e.metaKey || e.ctrlKey)) return;
        const hit = ACTIONS.find((a) => a.shortcut === e.key.toLowerCase());
        if (hit) {
            e.preventDefault();
            apply(hit.action);
        }
    };

    /** Dropped or pasted images become markdown image syntax at the caret. */
    const insertImage = useCallback((file: File) => {
        const ta = taRef.current;
        if (!ta || !onImageFile) return;
        const src = onImageFile(file);
        const alt = file.name.replace(/\.[^.]+$/, '');
        const md = `![${alt}](${src})`;
        const s = ta.selectionStart;
        splice(s, ta.selectionEnd, md, s + md.length, s + md.length);
    }, [onImageFile, splice]);

    const showWrite = view !== 'preview';
    const showPreview = view !== 'write';

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-gray-50 flex-wrap">
                {ACTIONS.map((a) => (
                    <React.Fragment key={a.key}>
                        {a.group && <span className="w-px h-5 bg-gray-300 mx-1" aria-hidden />}
                        <button
                            type="button"
                            title={a.title}
                            onMouseDown={(e) => e.preventDefault()} // keep the textarea selection
                            onClick={() => apply(a.action)}
                            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-[#008F84] transition-colors"
                        >
                            {a.icon}
                        </button>
                    </React.Fragment>
                ))}
                {onImageFile && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        title="Insert an image (or drop one on the editor)"
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = () => { const f = input.files?.[0]; if (f) insertImage(f); };
                            input.click();
                        }}
                        className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-[#008F84] transition-colors"
                    >
                        <ImageIcon size={15} />
                    </button>
                )}

                <div className="ml-auto flex items-center gap-0.5">
                    {([
                        ['write', 'Write', <PenLine key="w" size={14} />],
                        ['split', 'Split', <Columns2 key="s" size={14} />],
                        ['preview', 'Preview', <Eye key="p" size={14} />],
                    ] as const).map(([key, label, icon]) => (
                        <button
                            key={key}
                            type="button"
                            title={`${label} view`}
                            onClick={() => setView(key as View)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${view === key ? 'bg-[#00A99D] text-white' : 'text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {icon}
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor / preview */}
            <div className={showWrite && showPreview ? 'grid grid-cols-1 md:grid-cols-2 divide-x' : ''}>
                {showWrite && (
                    <textarea
                        ref={taRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        onDragOver={(e) => { if (onImageFile) e.preventDefault(); }}
                        onDrop={(e) => {
                            const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith('image/'));
                            if (!file || !onImageFile) return;
                            e.preventDefault();
                            insertImage(file);
                        }}
                        spellCheck
                        placeholder={'# Your heading\n\nWrite markdown here — the toolbar and Cmd/Ctrl+B, I, K all work.\n\n- a bullet\n- another\n\n> a quote'}
                        className="w-full h-[30rem] p-4 font-mono text-sm leading-relaxed text-gray-800 focus:outline-none resize-y"
                    />
                )}
                {showPreview && (
                    <div className="h-[30rem] overflow-y-auto p-4 bg-white">
                        {preview.trim() ? (
                            <div className="tn-md-preview" dangerouslySetInnerHTML={{ __html: preview }} />
                        ) : (
                            <p className="text-sm text-gray-400 italic">Nothing to preview yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between px-3 py-1 border-t bg-gray-50 text-[11px] text-gray-500">
                <span>Markdown · **bold** · *italic* · # heading · - list · [link](url) · ![alt](img) · ```code```</span>
                <span>{words} {words === 1 ? 'word' : 'words'}</span>
            </div>
        </div>
    );
}

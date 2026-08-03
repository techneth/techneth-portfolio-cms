'use client';

import React from 'react';
import { ImageIcon, Plus, Minus } from 'lucide-react';
import { Block } from './types';
import ContentEditable from './ContentEditable';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';

export interface BlockProps {
    block: Block;
    update: (partial: Partial<Block>) => void;
    /** Ask the page to stage a file and give back a preview URL */
    onImageFile: (file: File) => string;
    defaultAlt: string;
}

const ALIGN_STYLE = (a?: string): React.CSSProperties =>
    a ? { textAlign: a as React.CSSProperties['textAlign'] } : {};

function HeadingBlock({ block, update }: BlockProps) {
    const level = Math.min(6, Math.max(1, block.level || 2));
    const tag = `h${level}` as keyof React.JSX.IntrinsicElements;
    return (
        <ContentEditable
            tagName={tag}
            html={block.content || ''}
            onChange={(content) => update({ content })}
            placeholder="Heading"
            style={ALIGN_STYLE(block.align)}
        />
    );
}

function ParagraphBlock({ block, update }: BlockProps) {
    return (
        <ContentEditable
            tagName="p"
            html={block.content || ''}
            onChange={(content) => update({ content })}
            placeholder="Write something… (Ctrl/Cmd+B bold, +I italic)"
            style={ALIGN_STYLE(block.align)}
        />
    );
}

function QuoteBlock({ block, update }: BlockProps) {
    return (
        <blockquote>
            <ContentEditable
                html={block.content || ''}
                onChange={(content) => update({ content })}
                placeholder="Quote"
            />
        </blockquote>
    );
}

function ListBlock({ block, update }: BlockProps) {
    const items = block.items || [''];
    const Tag = (block.ordered ? 'ol' : 'ul') as 'ol';
    const setItem = (idx: number, html: string) => {
        const next = [...items];
        next[idx] = html;
        update({ items: next });
    };
    return (
        <div>
            <Tag>
                {items.map((item, idx) => (
                    <li key={`${block.id}-${idx}`} className="relative group/item">
                        <ContentEditable html={item} onChange={(h) => setItem(idx, h)} placeholder="List item" />
                        <button
                            type="button"
                            onClick={() => update({ items: items.length > 1 ? items.filter((_, i) => i !== idx) : [''] })}
                            className="absolute -left-6 top-1 hidden group-hover/item:block text-gray-300 hover:text-red-500"
                            title="Remove item"
                        >
                            <Minus size={12} />
                        </button>
                    </li>
                ))}
            </Tag>
            <button
                type="button"
                onClick={() => update({ items: [...items, ''] })}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#008F84] mt-1"
            >
                <Plus size={12} /> Add item
            </button>
        </div>
    );
}

function ImageBlock({ block, update, onImageFile, defaultAlt }: BlockProps) {
    const pick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.click();
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const src = onImageFile(file);
            update({ src, alt: block.alt || defaultAlt });
        };
    };
    if (!block.src) {
        return (
            <button
                type="button"
                onClick={pick}
                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
            >
                <ImageIcon size={22} />
                <span className="text-sm">Click to choose an image (or drop a file on the canvas)</span>
            </button>
        );
    }
    return (
        <div style={ALIGN_STYLE(block.align)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.src} alt={block.alt || ''} className="max-w-full rounded-lg inline-block" />
            {!block.alt && (
                <div className="mt-1 text-[11px] text-amber-600">No alt text — set it in the properties panel for SEO.</div>
            )}
        </div>
    );
}

function ButtonBlock({ block }: BlockProps) {
    return (
        <div style={ALIGN_STYLE(block.align)}>
            <span
                className="inline-block font-bold text-white px-7 py-3 rounded-full select-none"
                style={{ background: block.color || '#009487' }}
            >
                {block.text || 'Button'}
            </span>
            <div className="text-[11px] text-gray-400 mt-1">→ {block.link || 'no link set'} (edit in properties)</div>
        </div>
    );
}

function TableBlock({ block, update }: BlockProps) {
    const cells = block.cells || [['']];
    const setCell = (r: number, c: number, html: string) => {
        const next = cells.map((row) => [...row]);
        next[r][c] = html;
        update({ cells: next });
    };
    const cols = cells[0]?.length || 1;
    return (
        <div>
            <table className="tn-table w-full border-collapse">
                <tbody>
                    {cells.map((row, r) => (
                        <tr key={`${block.id}-r${r}`}>
                            {row.map((cell, c) => {
                                const isHeader = block.headerRow && r === 0;
                                return (
                                    <td
                                        key={`${block.id}-r${r}c${c}`}
                                        className={`border border-gray-300 p-0 align-top ${isHeader ? 'bg-[#009487]/10 font-semibold' : ''}`}
                                    >
                                        <ContentEditable
                                            html={cell}
                                            onChange={(h) => setCell(r, c, h)}
                                            className="px-3 py-2 min-w-[60px]"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex gap-2 mt-1.5 text-xs">
                <button type="button" className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded" onClick={() => update({ cells: [...cells, Array(cols).fill('')] })}>+ Row</button>
                <button type="button" className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded" onClick={() => update({ cells: cells.map((r) => [...r, '']) })}>+ Col</button>
                <button type="button" className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded" disabled={cells.length <= 1} onClick={() => update({ cells: cells.slice(0, -1) })}>− Row</button>
                <button type="button" className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded" disabled={cols <= 1} onClick={() => update({ cells: cells.map((r) => r.slice(0, -1)) })}>− Col</button>
            </div>
        </div>
    );
}

function HtmlBlock({ block }: BlockProps) {
    const clean = sanitizeHtmlClient(block.html || '');
    if (!clean.trim()) {
        return <div className="text-sm text-gray-400 italic py-4 text-center">Empty HTML block — add markup in the properties panel.</div>;
    }
    // Scripts stay inert here (innerHTML); they run in Preview and on the live site
    return <div className="tn-html-render" dangerouslySetInnerHTML={{ __html: clean }} />;
}

function DividerBlock() {
    return <hr className="border-t border-gray-300 my-2" />;
}

export function BlockRenderer(props: BlockProps) {
    switch (props.block.type) {
        case 'heading': return <HeadingBlock {...props} />;
        case 'paragraph': return <ParagraphBlock {...props} />;
        case 'quote': return <QuoteBlock {...props} />;
        case 'list': return <ListBlock {...props} />;
        case 'image': return <ImageBlock {...props} />;
        case 'button': return <ButtonBlock {...props} />;
        case 'table': return <TableBlock {...props} />;
        case 'html': return <HtmlBlock {...props} />;
        case 'divider': return <DividerBlock />;
    }
}

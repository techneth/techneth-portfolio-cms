'use client';

import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2 } from 'lucide-react';
import { Block, Align } from './types';

interface PanelProps {
    block: Block | null;
    update: (partial: Partial<Block>) => void;
    onDelete: () => void;
    onReplaceImage: () => void;
}

const ALIGN_OPTIONS: { value: Align; icon: React.ReactNode; label: string }[] = [
    { value: '', icon: <AlignLeft size={14} />, label: 'Left' },
    { value: 'center', icon: <AlignCenter size={14} />, label: 'Center' },
    { value: 'right', icon: <AlignRight size={14} />, label: 'Right' },
    { value: 'justify', icon: <AlignJustify size={14} />, label: 'Justify' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]';

export default function PropertiesPanel({ block, update, onDelete, onReplaceImage }: PanelProps) {
    if (!block) {
        return (
            <div className="w-56 shrink-0 border-l bg-gray-50 p-3 text-xs text-gray-400">
                Select a block to edit its properties. Drag blocks by their handle to rearrange.
            </div>
        );
    }

    const alignPicker = (
        <Field label="Alignment">
            <div className="flex gap-1">
                {ALIGN_OPTIONS.map((o) => (
                    <button
                        key={o.value || 'left'}
                        type="button"
                        onClick={() => update({ align: o.value })}
                        className={`p-1.5 rounded border ${(block.align || '') === o.value ? 'bg-[#00A99D] text-white border-[#00A99D]' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        title={o.label}
                    >
                        {o.icon}
                    </button>
                ))}
            </div>
        </Field>
    );

    return (
        <div className="w-56 shrink-0 border-l bg-gray-50 p-3 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 capitalize">{block.type}</span>
                <button type="button" onClick={onDelete} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete block">
                    <Trash2 size={14} />
                </button>
            </div>

            {block.type === 'heading' && (
                <>
                    <Field label="Level">
                        <select value={block.level || 2} onChange={(e) => update({ level: Number(e.target.value) })} className={inputCls}>
                            {[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>H{l}</option>)}
                        </select>
                    </Field>
                    {alignPicker}
                </>
            )}

            {block.type === 'paragraph' && alignPicker}

            {block.type === 'list' && (
                <Field label="Style">
                    <div className="flex gap-1">
                        <button type="button" onClick={() => update({ ordered: false })} className={`flex-1 px-2 py-1.5 text-xs rounded border ${!block.ordered ? 'bg-[#00A99D] text-white border-[#00A99D]' : 'text-gray-500 border-gray-200'}`}>Bullets</button>
                        <button type="button" onClick={() => update({ ordered: true })} className={`flex-1 px-2 py-1.5 text-xs rounded border ${block.ordered ? 'bg-[#00A99D] text-white border-[#00A99D]' : 'text-gray-500 border-gray-200'}`}>Numbered</button>
                    </div>
                </Field>
            )}

            {block.type === 'image' && (
                <>
                    <Field label="Alt text (SEO)">
                        <input type="text" value={block.alt || ''} onChange={(e) => update({ alt: e.target.value })} className={inputCls} placeholder="Describe the image" />
                    </Field>
                    {alignPicker}
                    <button type="button" onClick={onReplaceImage} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100">
                        Replace image…
                    </button>
                </>
            )}

            {block.type === 'button' && (
                <>
                    <Field label="Text">
                        <input type="text" value={block.text || ''} onChange={(e) => update({ text: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Link">
                        <input type="text" value={block.link || ''} onChange={(e) => update({ link: e.target.value })} className={inputCls} placeholder="https://…" />
                    </Field>
                    <Field label="Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={block.color || '#009487'} onChange={(e) => update({ color: e.target.value })} className="h-8 w-10 border border-gray-300 rounded cursor-pointer" />
                            <span className="text-xs text-gray-500 font-mono">{block.color || '#009487'}</span>
                        </div>
                    </Field>
                    {alignPicker}
                </>
            )}

            {block.type === 'table' && (
                <Field label="Header row">
                    <button
                        type="button"
                        onClick={() => update({ headerRow: !block.headerRow })}
                        className={`w-full px-2 py-1.5 text-xs rounded border ${block.headerRow ? 'bg-[#00A99D] text-white border-[#00A99D]' : 'text-gray-500 border-gray-200'}`}
                    >
                        {block.headerRow ? 'First row is a header' : 'No header row'}
                    </button>
                </Field>
            )}

            {block.type === 'html' && (
                <Field label="HTML (styles & scripts allowed)">
                    <textarea
                        value={block.html || ''}
                        onChange={(e) => update({ html: e.target.value })}
                        rows={14}
                        spellCheck={false}
                        className={`${inputCls} font-mono text-xs resize-y`}
                        placeholder={'<style>…</style>\n<div>…</div>\n<script>…</script>'}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                        Scripts stay inactive while editing; they run in Preview and on the
                        live site. Unsafe code is stripped on save.
                    </p>
                </Field>
            )}
        </div>
    );
}

'use client';

import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { PALETTE_TILES } from './BlockSidebar';
import { SECTION_TEMPLATES } from './templates';

interface InsertMenuProps {
    /** Called with the block type ("heading", "tpl:cta", "columns", …) */
    onPick: (type: string) => void;
}

/**
 * Compact picker shown by the "+" buttons above/below a block — the click
 * alternative to dragging tiles from the sidebar.
 */
export default function InsertMenu({ onPick }: InsertMenuProps) {
    const item = (type: string, label: string, icon: React.ReactNode) => (
        <button
            key={type}
            type="button"
            data-insert-item={type}
            onClick={(e) => { e.stopPropagation(); onPick(type); }}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-700 rounded hover:bg-[#00A99D]/10 hover:text-[#008F84] text-left"
        >
            <span className="text-gray-400 shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );

    return (
        <div
            className="w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-2"
            onClick={(e) => e.stopPropagation()}
        >
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 pb-1">Blocks</p>
            <div className="grid grid-cols-3 gap-0.5">
                {PALETTE_TILES.map((t) => item(t.type, t.label, t.icon))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-2 pb-1">Sections</p>
            <div className="grid grid-cols-3 gap-0.5">
                {SECTION_TEMPLATES.map((tpl) => item(`tpl:${tpl.key}`, tpl.label, <LayoutTemplate size={14} />))}
            </div>
        </div>
    );
}

'use client';

import React from 'react';
import {
    Heading1, Pilcrow, List, Quote, ImageIcon, MousePointerClick,
    Table, Minus, Code, Columns2, LayoutTemplate,
} from 'lucide-react';
import { SECTION_TEMPLATES } from './templates';
import { DND_BLOCK_TYPE } from './DropZones';

interface SidebarProps {
    onDragStateChange: (active: boolean) => void;
    /** Click-to-append fallback for non-drag users */
    onQuickAdd: (blockType: string) => void;
}

export const PALETTE_TILES: { type: string; label: string; icon: React.ReactNode }[] = [
    { type: 'heading', label: 'Heading', icon: <Heading1 size={16} /> },
    { type: 'paragraph', label: 'Text', icon: <Pilcrow size={16} /> },
    { type: 'list', label: 'List', icon: <List size={16} /> },
    { type: 'quote', label: 'Quote', icon: <Quote size={16} /> },
    { type: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
    { type: 'button', label: 'Button', icon: <MousePointerClick size={16} /> },
    { type: 'table', label: 'Table', icon: <Table size={16} /> },
    { type: 'divider', label: 'Divider', icon: <Minus size={16} /> },
    { type: 'html', label: 'HTML', icon: <Code size={16} /> },
    { type: 'columns', label: '2 Columns', icon: <Columns2 size={16} /> },
];

export default function BlockSidebar({ onDragStateChange, onQuickAdd }: SidebarProps) {
    const tile = (type: string, label: string, icon: React.ReactNode) => (
        <button
            key={type}
            type="button"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData(DND_BLOCK_TYPE, type);
                e.dataTransfer.effectAllowed = 'copy';
                onDragStateChange(true);
            }}
            onDragEnd={() => onDragStateChange(false)}
            onClick={() => onQuickAdd(type)}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
            title={`${label} — drag into the canvas, or click to add at the end`}
        >
            <span className="text-gray-400">{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="w-40 shrink-0 space-y-1.5 overflow-y-auto p-2 bg-gray-50 border-r">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-1">Blocks</p>
            {PALETTE_TILES.map((t) => tile(t.type, t.label, t.icon))}
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-3">Sections</p>
            {SECTION_TEMPLATES.map((tpl) => tile(`tpl:${tpl.key}`, tpl.label, <LayoutTemplate size={16} />))}
        </div>
    );
}

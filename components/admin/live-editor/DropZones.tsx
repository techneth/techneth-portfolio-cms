'use client';

import React, { useState } from 'react';

/**
 * Drop payload contract (dataTransfer string keys):
 *  - "blockType"        → insert a NEW block of that type ("tpl:key" for templates)
 *  - "existingBlockId"  → MOVE the block with that id here
 *  - OS files           → image files become image blocks
 * getData() is only readable in onDrop, so zones show a generic affordance
 * during dragover and branch on drop.
 */
export interface DropPayload {
    blockType?: string;
    existingBlockId?: string;
    files?: File[];
}

/**
 * dataTransfer keys — MUST be lowercase: the HTML5 DnD spec lowercases custom
 * format names, so a camelCase key never matches what `dataTransfer.types`
 * reports in a real browser.
 */
export const DND_BLOCK_TYPE = 'blocktype';
export const DND_EXISTING_BLOCK = 'existingblockid';

/** True when a drag carries editor data (or image files). */
export function hasEditorDragData(e: React.DragEvent): boolean {
    const types = Array.from(e.dataTransfer.types).map((t) => t.toLowerCase());
    return types.includes(DND_BLOCK_TYPE) || types.includes(DND_EXISTING_BLOCK) || types.includes('files');
}

/** Read the drop payload off a drag event (shared by zones and block targets). */
export function readDropPayload(e: React.DragEvent): DropPayload | null {
    const existingBlockId = e.dataTransfer.getData(DND_EXISTING_BLOCK);
    if (existingBlockId) return { existingBlockId };
    const blockType = e.dataTransfer.getData(DND_BLOCK_TYPE);
    if (blockType) return { blockType };
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) return { files };
    return null;
}

interface ZoneProps {
    /** Any drag in flight — zones expand from a thin line to an easy target */
    dragActive: boolean;
    onDropPayload: (payload: DropPayload) => void;
    horizontal?: boolean;
}

export function DropZone({ dragActive, onDropPayload, horizontal }: ZoneProps) {
    const [over, setOver] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const payload = readDropPayload(e);
        if (payload) onDropPayload(payload);
    };

    const base = horizontal
        ? (dragActive ? 'w-8' : 'w-1')
        : (dragActive ? 'h-8' : 'h-1');

    return (
        <div
            data-dropzone
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={handleDrop}
            className={`${base} shrink-0 transition-all rounded flex items-center justify-center
                ${dragActive ? 'outline-dashed outline-1 outline-gray-300 m-0.5' : ''}
                ${over ? 'bg-[#00A99D]/20 outline outline-2 outline-[#00A99D] ring-2 ring-[#00A99D]/30' : ''}`}
        >
            {dragActive && over && (
                <span className="text-[10px] font-semibold text-[#008F84] pointer-events-none select-none">Drop here</span>
            )}
        </div>
    );
}

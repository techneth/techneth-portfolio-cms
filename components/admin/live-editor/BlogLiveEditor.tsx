'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Trash2, ExternalLink, FileCode2, Undo2, Plus } from 'lucide-react';
import { Block, Row, MoveTarget, makeBlock, makeRow, makeCol, uid, BlockType } from './types';
import { parseHtmlToRows, assembleRowsToHtml } from './htmlRoundTrip';
import { SECTION_TEMPLATES } from './templates';
import { BlockRenderer } from './blocks';
import { DropZone, DropPayload, readDropPayload, hasEditorDragData, DND_EXISTING_BLOCK, DND_BLOCK_TYPE } from './DropZones';
import BlockSidebar from './BlockSidebar';
import PropertiesPanel from './PropertiesPanel';
import InsertMenu from './InsertMenu';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';

const HISTORY_CAP = 50;

interface EditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onImageSelect?: (file: File) => string;
    seoKeywords?: string[];
    onValidationCheck?: (warnings: string[]) => void;
    contentTitle?: string;
}

function toAltSlug(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function BlogLiveEditor({
    value,
    onChange,
    onImageSelect,
    contentTitle,
}: EditorProps) {
    const [mounted, setMounted] = useState(false);
    const [rows, setRows] = useState<Row[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    // Open "+ add above/below" picker: which block and which side
    const [insertMenu, setInsertMenu] = useState<{ blockId: string; pos: 'before' | 'after' } | null>(null);
    const [htmlMode, setHtmlMode] = useState(false);
    const [htmlDraft, setHtmlDraft] = useState('');
    const [liveBroadcast, setLiveBroadcast] = useState(false);

    const historyRef = useRef<Row[][]>([]);
    const lastEmittedRef = useRef<string>('');
    const rowsRef = useRef<Row[]>(rows);
    rowsRef.current = rows;
    const contentTitleRef = useRef(contentTitle);
    contentTitleRef.current = contentTitle;
    const onImageSelectRef = useRef(onImageSelect);
    onImageSelectRef.current = onImageSelect;
    const previewChannelRef = useRef<BroadcastChannel | null>(null);

    // ── Load / external sync ────────────────────────────────────────────────
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        if (value === lastEmittedRef.current) return;
        // External change (initial load, edit-page data arrival): re-parse
        const parsed = parseHtmlToRows(value || '');
        rowsRef.current = parsed;
        setRows(parsed);
        lastEmittedRef.current = value || '';
    }, [value, mounted]);

    // ── Mutation core: snapshot → apply → emit ──────────────────────────────
    const emit = useCallback((next: Row[]) => {
        const html = assembleRowsToHtml(next);
        lastEmittedRef.current = html;
        onChange(html);
    }, [onChange]);

    // NOTE: state is computed OUTSIDE the setRows updater. Updater functions
    // run during render (twice in dev StrictMode), so side effects there —
    // especially emit() → parent setState — cause "cannot update while
    // rendering" errors and flaky inserts. rowsRef is kept current so several
    // mutations in one tick compose correctly.
    const lastCoalesceKeyRef = useRef<string | null>(null);
    const mutate = useCallback((fn: (draft: Row[]) => Row[], coalesceKey?: string) => {
        const prev = rowsRef.current;
        if (!coalesceKey || coalesceKey !== lastCoalesceKeyRef.current) {
            historyRef.current.push(structuredClone(prev));
            if (historyRef.current.length > HISTORY_CAP) historyRef.current.shift();
        }
        lastCoalesceKeyRef.current = coalesceKey ?? null;
        const next = fn(structuredClone(prev));
        rowsRef.current = next;
        setRows(next);
        emit(next);
    }, [emit]);

    const undo = useCallback(() => {
        const snapshot = historyRef.current.pop();
        if (!snapshot) return;
        lastCoalesceKeyRef.current = null;
        rowsRef.current = snapshot;
        setRows(snapshot);
        emit(snapshot);
    }, [emit]);

    // Cmd/Ctrl+Z — but never while typing in a field (native text undo wins)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
            e.preventDefault();
            undo();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [undo]);

    // ── Tree helpers ─────────────────────────────────────────────────────────
    const removeBlock = (draft: Row[], blockId: string): Block | null => {
        let removed: Block | null = null;
        for (const row of draft) {
            for (const col of row.cols) {
                const idx = col.blocks.findIndex((b) => b.id === blockId);
                if (idx >= 0) {
                    removed = col.blocks.splice(idx, 1)[0];
                    break;
                }
            }
            if (removed) break;
        }
        // Prune rows whose every column is empty
        for (let i = draft.length - 1; i >= 0; i--) {
            if (draft[i].cols.every((c) => c.blocks.length === 0)) draft.splice(i, 1);
        }
        return removed;
    };

    const insertAt = (draft: Row[], blocks: Block[], target: MoveTarget) => {
        if (target.kind === 'newRow') {
            const idx = Math.min(Math.max(target.afterRowIdx, 0), draft.length);
            draft.splice(idx, 0, ...blocks.map((b) => makeRow([b])));
        } else {
            const row = draft.find((r) => r.id === target.rowId);
            const col = row?.cols.find((c) => c.id === target.colId);
            if (col) {
                const idx = Math.min(Math.max(target.beforeBlockIdx, 0), col.blocks.length);
                col.blocks.splice(idx, 0, ...blocks);
            } else {
                draft.push(...blocks.map((b) => makeRow([b])));
            }
        }
    };

    // ── Payload resolution (shared by all drop zones) ───────────────────────
    const blocksFromPayload = (payload: DropPayload): Block[] | 'columns' | null => {
        if (payload.files?.length) {
            const slug = contentTitleRef.current ? toAltSlug(contentTitleRef.current) : 'image';
            return payload.files.map((file) => {
                const src = onImageSelectRef.current ? onImageSelectRef.current(file) : URL.createObjectURL(file);
                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                return { ...makeBlock('image'), src, alt: `techneth ${slug} .${ext}` };
            });
        }
        const type = payload.blockType;
        if (!type) return null;
        if (type === 'columns') return 'columns';
        if (type.startsWith('tpl:')) {
            const tpl = SECTION_TEMPLATES.find((t) => t.key === type.slice(4));
            return tpl ? [{ ...makeBlock('html'), html: tpl.html }] : null;
        }
        return [makeBlock(type as BlockType)];
    };

    const handleDrop = (payload: DropPayload, target: MoveTarget) => {
        setDragActive(false);
        if (payload.existingBlockId) {
            const id = payload.existingBlockId;
            mutate((draft) => {
                // Locate the block before removal — removal shifts indices
                let origColId: string | null = null;
                let origIdx = -1;
                for (const row of draft) {
                    for (const col of row.cols) {
                        const i = col.blocks.findIndex((b) => b.id === id);
                        if (i >= 0) { origColId = col.id; origIdx = i; }
                    }
                }
                // Dropping right next to itself is a no-op
                if (target.kind === 'col' && target.colId === origColId
                    && (target.beforeBlockIdx === origIdx || target.beforeBlockIdx === origIdx + 1)) {
                    return draft;
                }
                // Anchor row targets by id so pruning can't skew the index
                const anchorRowId = target.kind === 'newRow' ? (draft[target.afterRowIdx]?.id ?? null) : null;

                const moved = removeBlock(draft, id);
                if (!moved) return draft;

                let resolved: MoveTarget = target;
                if (target.kind === 'newRow') {
                    const idx = anchorRowId ? draft.findIndex((r) => r.id === anchorRowId) : draft.length;
                    resolved = { kind: 'newRow', afterRowIdx: idx < 0 ? draft.length : idx };
                } else if (target.colId === origColId && target.beforeBlockIdx > origIdx) {
                    resolved = { ...target, beforeBlockIdx: target.beforeBlockIdx - 1 };
                }
                insertAt(draft, [moved], resolved);
                return draft;
            });
            return;
        }
        const resolved = blocksFromPayload(payload);
        if (!resolved) return;
        if (resolved === 'columns') {
            // A columns layout is always a new row — when dropped on/next to a
            // block, place it after (or before) that block's row.
            mutate((draft) => {
                let idx = draft.length;
                if (target.kind === 'newRow') {
                    idx = Math.min(target.afterRowIdx, draft.length);
                } else {
                    const rowIdx = draft.findIndex((r) => r.id === target.rowId);
                    if (rowIdx >= 0) idx = target.beforeBlockIdx === 0 ? rowIdx : rowIdx + 1;
                }
                draft.splice(idx, 0, { id: uid(), cols: [makeCol(), makeCol()] });
                return draft;
            });
            return;
        }
        mutate((draft) => { insertAt(draft, resolved, target); return draft; });
        if (resolved.length === 1) setSelectedId(resolved[0].id);
    };

    const quickAdd = (type: string) => {
        handleDrop({ blockType: type }, { kind: 'newRow', afterRowIdx: rowsRef.current.length });
    };

    const updateBlock = (blockId: string, partial: Partial<Block>) => {
        // Coalesce rapid same-field edits (typing in a text/property field)
        // into one undo step instead of one per keystroke
        const coalesceKey = `${blockId}:${Object.keys(partial).sort().join(',')}`;
        mutate((draft) => {
            for (const row of draft) {
                for (const col of row.cols) {
                    const b = col.blocks.find((x) => x.id === blockId);
                    if (b) Object.assign(b, partial);
                }
            }
            return draft;
        }, coalesceKey);
    };

    const deleteBlock = (blockId: string) => {
        mutate((draft) => { removeBlock(draft, blockId); return draft; });
        if (selectedId === blockId) setSelectedId(null);
    };

    const selectedBlock: Block | null = (() => {
        for (const row of rows) for (const col of row.cols) {
            const b = col.blocks.find((x) => x.id === selectedId);
            if (b) return b;
        }
        return null;
    })();

    const replaceSelectedImage = () => {
        if (!selectedBlock || selectedBlock.type !== 'image') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.click();
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const src = onImageSelectRef.current ? onImageSelectRef.current(file) : URL.createObjectURL(file);
            updateBlock(selectedBlock.id, { src });
        };
    };

    // ── Live preview tab (BroadcastChannel) ─────────────────────────────────
    const sendPreviewUpdate = useCallback(() => {
        previewChannelRef.current?.postMessage({
            kind: 'content',
            title: contentTitleRef.current || 'Untitled post',
            content: sanitizeHtmlClient(assembleRowsToHtml(rowsRef.current)),
        });
    }, []);

    const openLivePreview = () => {
        if (!previewChannelRef.current) {
            previewChannelRef.current = new BroadcastChannel('tn-live-preview');
            previewChannelRef.current.onmessage = (e: MessageEvent) => {
                if (e.data?.kind === 'hello') sendPreviewUpdate();
            };
        }
        setLiveBroadcast(true);
        window.open('/preview', 'tn-live-preview-tab');
        sendPreviewUpdate();
    };

    useEffect(() => {
        if (!liveBroadcast) return;
        const t = setTimeout(sendPreviewUpdate, 400);
        return () => clearTimeout(t);
    }, [rows, contentTitle, liveBroadcast, sendPreviewUpdate]);

    useEffect(() => () => previewChannelRef.current?.close(), []);

    // ── HTML source mode ─────────────────────────────────────────────────────
    const enterHtmlMode = () => {
        setHtmlDraft(assembleRowsToHtml(rowsRef.current));
        setHtmlMode(true);
    };
    const applyHtmlMode = () => {
        mutate(() => parseHtmlToRows(sanitizeHtmlClient(htmlDraft)));
        setHtmlMode(false);
    };

    if (!mounted) {
        return <div className="h-96 bg-gray-50 border rounded-lg animate-pulse" />;
    }

    const defaultAlt = contentTitle ? `techneth ${toAltSlug(contentTitle)}` : 'techneth image';

    // ── Render ───────────────────────────────────────────────────────────────
    const renderBlockShell = (block: Block, rowId: string, colId: string, blockIdx: number) => (
        <BlockShell
            key={block.id}
            block={block}
            selected={selectedId === block.id}
            onSelect={() => setSelectedId(block.id)}
            onDelete={() => deleteBlock(block.id)}
            onDragStateChange={setDragActive}
            onDropAt={(payload, pos) => handleDrop(payload, {
                kind: 'col',
                rowId,
                colId,
                beforeBlockIdx: pos === 'before' ? blockIdx : blockIdx + 1,
            })}
            insertMenuPos={insertMenu?.blockId === block.id ? insertMenu.pos : null}
            onToggleInsertMenu={(pos) => setInsertMenu((cur) =>
                cur?.blockId === block.id && cur.pos === pos ? null : { blockId: block.id, pos })}
            onPickInsert={(type, pos) => {
                setInsertMenu(null);
                handleDrop({ blockType: type }, {
                    kind: 'col',
                    rowId,
                    colId,
                    beforeBlockIdx: pos === 'before' ? blockIdx : blockIdx + 1,
                });
            }}
        >
            <BlockRenderer
                block={block}
                update={(partial) => updateBlock(block.id, partial)}
                onImageFile={(file) => (onImageSelectRef.current ? onImageSelectRef.current(file) : URL.createObjectURL(file))}
                defaultAlt={defaultAlt}
            />
        </BlockShell>
    );

    return (
        <div className="bg-white rounded-lg overflow-hidden border">
            {/* Topbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-wrap gap-y-1">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => (htmlMode ? applyHtmlMode() : enterHtmlMode())}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${htmlMode ? 'bg-[#00A99D] text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                        title={htmlMode ? 'Apply the HTML and return to blocks' : 'Edit the whole document as HTML'}
                    >
                        <FileCode2 size={15} />
                        <span>{htmlMode ? 'Apply HTML' : 'HTML'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={undo}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        title="Undo (Cmd/Ctrl+Z)"
                    >
                        <Undo2 size={15} />
                        <span>Undo</span>
                    </button>
                </div>
                <button
                    type="button"
                    onClick={openLivePreview}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${liveBroadcast ? 'bg-[#0F245B] text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                    title="Open a live sample preview in a separate tab — it updates as you edit"
                >
                    <ExternalLink size={15} />
                    <span>{liveBroadcast ? 'Live Preview ↗ (on)' : 'Live Preview ↗'}</span>
                </button>
            </div>

            {htmlMode ? (
                <div>
                    <textarea
                        value={htmlDraft}
                        onChange={(e) => setHtmlDraft(e.target.value)}
                        spellCheck={false}
                        className="w-full h-[30rem] p-4 font-mono text-sm text-gray-800 focus:outline-none resize-y"
                    />
                    <div className="px-3 py-2 border-t bg-amber-50 text-xs text-amber-800">
                        Click “Apply HTML” to load this markup back into the block editor.
                        Markup the blocks don’t model (custom divs, styles, scripts) is kept
                        verbatim as HTML blocks.
                    </div>
                </div>
            ) : (
                <div className="flex" style={{ minHeight: '30rem' }}>
                    <BlockSidebar onDragStateChange={setDragActive} onQuickAdd={quickAdd} />

                    {/* Canvas */}
                    <div
                        className="tn-canvas flex-1 min-w-0 overflow-y-auto max-h-[70vh] p-5"
                        onClick={() => { setSelectedId(null); setInsertMenu(null); }}
                        onClickCapture={(e) => {
                            // Links inside rendered blocks (CTA, sections, paragraphs)
                            // must not navigate the admin away while editing
                            if ((e.target as HTMLElement).closest?.('a')) e.preventDefault();
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            // Fallback: drops on canvas whitespace append at the end
                            e.preventDefault();
                            const existingBlockId = e.dataTransfer.getData(DND_EXISTING_BLOCK);
                            const blockType = e.dataTransfer.getData(DND_BLOCK_TYPE);
                            const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
                            if (existingBlockId || blockType || files.length) {
                                handleDrop(
                                    existingBlockId ? { existingBlockId } : blockType ? { blockType } : { files },
                                    { kind: 'newRow', afterRowIdx: rowsRef.current.length }
                                );
                            }
                        }}
                    >
                        <DropZone dragActive={dragActive} onDropPayload={(p) => handleDrop(p, { kind: 'newRow', afterRowIdx: 0 })} />
                        {rows.length === 0 && (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center text-gray-400 text-sm">
                                Drag blocks from the left, or click one to add it.
                            </div>
                        )}
                        {rows.map((row, rowIdx) => (
                            <React.Fragment key={row.id}>
                                <div
                                    className={row.cols.length > 1 ? 'grid gap-3' : ''}
                                    style={row.cols.length > 1 ? { gridTemplateColumns: `repeat(${row.cols.length}, 1fr)` } : undefined}
                                >
                                    {row.cols.map((col) => (
                                        <div key={col.id} className={row.cols.length > 1 ? 'border border-dashed border-gray-200 rounded-lg p-1.5 min-h-[3rem]' : ''}>
                                            <DropZone dragActive={dragActive} onDropPayload={(p) => handleDrop(p, { kind: 'col', rowId: row.id, colId: col.id, beforeBlockIdx: 0 })} />
                                            {col.blocks.map((block, blockIdx) => (
                                                <React.Fragment key={block.id}>
                                                    {renderBlockShell(block, row.id, col.id, blockIdx)}
                                                    <DropZone dragActive={dragActive} onDropPayload={(p) => handleDrop(p, { kind: 'col', rowId: row.id, colId: col.id, beforeBlockIdx: blockIdx + 1 })} />
                                                </React.Fragment>
                                            ))}
                                            {col.blocks.length === 0 && (
                                                <div className="text-center text-[11px] text-gray-300 py-3 select-none">empty column — drop a block</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <DropZone dragActive={dragActive} onDropPayload={(p) => handleDrop(p, { kind: 'newRow', afterRowIdx: rowIdx + 1 })} />
                            </React.Fragment>
                        ))}
                    </div>

                    <PropertiesPanel
                        block={selectedBlock}
                        update={(partial) => selectedBlock && updateBlock(selectedBlock.id, partial)}
                        onDelete={() => selectedBlock && deleteBlock(selectedBlock.id)}
                        onReplaceImage={replaceSelectedImage}
                    />
                </div>
            )}
        </div>
    );
}

// ── Block shell: selection ring, drag handle, delete, drop target ───────────
function BlockShell({
    block, selected, onSelect, onDelete, onDragStateChange, onDropAt,
    insertMenuPos, onToggleInsertMenu, onPickInsert, children,
}: {
    block: Block;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onDragStateChange: (active: boolean) => void;
    onDropAt: (payload: DropPayload, pos: 'before' | 'after') => void;
    insertMenuPos: 'before' | 'after' | null;
    onToggleInsertMenu: (pos: 'before' | 'after') => void;
    onPickInsert: (type: string, pos: 'before' | 'after') => void;
    children: React.ReactNode;
}) {
    // draggable only while the handle is pressed, so text selection inside
    // contentEditable children keeps working
    const [dragEnabled, setDragEnabled] = useState(false);
    // Where a hovering drag would land relative to this block
    const [dropPos, setDropPos] = useState<'before' | 'after' | null>(null);

    const isOurDrag = hasEditorDragData;

    const posFromEvent = (e: React.DragEvent): 'before' | 'after' => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    };

    return (
        <div
            data-block-id={block.id}
            draggable={dragEnabled}
            onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData(DND_EXISTING_BLOCK, block.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStateChange(true);
            }}
            onDragEnd={() => { setDragEnabled(false); onDragStateChange(false); }}
            onDragOver={(e) => {
                // The whole block is a drop target: top half inserts above,
                // bottom half below. Leave native text drags alone.
                if (!isOurDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                setDropPos(posFromEvent(e));
            }}
            onDragLeave={() => setDropPos(null)}
            onDrop={(e) => {
                if (!isOurDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                const pos = dropPos ?? posFromEvent(e);
                setDropPos(null);
                const payload = readDropPayload(e);
                if (payload) {
                    // Dropping a block onto itself is meaningless
                    if (payload.existingBlockId === block.id) return;
                    onDropAt(payload, pos);
                }
            }}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`relative group rounded-md transition-shadow px-8 py-1 -mx-1 ${selected
                ? 'ring-2 ring-[#00A99D]'
                : 'hover:ring-1 hover:ring-gray-200'}`}
        >
            {dropPos && (
                <div
                    className={`absolute left-0 right-0 h-1 rounded bg-[#00A99D] pointer-events-none z-10 ${dropPos === 'before' ? 'top-0' : 'bottom-0'}`}
                />
            )}
            {/* "+" add-above / add-below buttons (click alternative to dragging) */}
            {(['before', 'after'] as const).map((pos) => (
                <React.Fragment key={pos}>
                    <button
                        type="button"
                        data-insert-btn={pos}
                        onClick={(e) => { e.stopPropagation(); onToggleInsertMenu(pos); }}
                        className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-5 h-5 rounded-full bg-[#00A99D] text-white shadow hover:bg-[#008F84] transition-opacity
                            ${pos === 'before' ? '-top-2.5' : '-bottom-2.5'}
                            ${selected || insertMenuPos ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={pos === 'before' ? 'Add a block above' : 'Add a block below'}
                    >
                        <Plus size={13} />
                    </button>
                    {insertMenuPos === pos && (
                        <div className={`absolute left-1/2 -translate-x-1/2 z-30 ${pos === 'before' ? 'top-3' : 'bottom-3'}`}>
                            <InsertMenu onPick={(type) => onPickInsert(type, pos)} />
                        </div>
                    )}
                </React.Fragment>
            ))}
            <span
                data-drag-handle
                onMouseDown={() => setDragEnabled(true)}
                onMouseUp={() => setDragEnabled(false)}
                className={`absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#008F84] hover:bg-[#00A99D]/10 ${selected ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                title="Drag to move this block"
            >
                <GripVertical size={14} />
            </span>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className={`absolute right-1 top-1 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 ${selected ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                title="Delete block"
            >
                <Trash2 size={13} />
            </button>
            {children}
        </div>
    );
}

/**
 * Block-based editor data model: a document is Row[] → Col[] → Block[].
 *
 * Block is a FLAT interface (not a discriminated union) so
 * updateBlock(id, partial) stays easy to type — per-type fields are optional
 * and scoped by `type` inside the block components.
 */

export type BlockType =
    | 'heading'
    | 'paragraph'
    | 'list'
    | 'quote'
    | 'image'
    | 'button'
    | 'table'
    | 'divider'
    | 'html';

export type Align = '' | 'center' | 'right' | 'justify';

export interface Block {
    id: string;
    type: BlockType;
    /** heading */
    level?: number;
    /** heading | paragraph | quote — inline HTML */
    content?: string;
    /** heading | paragraph */
    align?: Align;
    /** list */
    ordered?: boolean;
    items?: string[];
    /** image */
    src?: string;
    alt?: string;
    /** button */
    text?: string;
    link?: string;
    color?: string;
    /** table — cell inline HTML, cells[row][col] */
    cells?: string[][];
    headerRow?: boolean;
    /** html — raw sanitized HTML (also the fallback for unmodeled markup) */
    html?: string;
}

export interface Col {
    id: string;
    blocks: Block[];
}

export interface Row {
    id: string;
    cols: Col[];
}

/** Where a moved/new block lands. */
export type MoveTarget =
    | { kind: 'newRow'; afterRowIdx: number }
    | { kind: 'col'; rowId: string; colId: string; beforeBlockIdx: number };

let counter = 0;
export function uid(): string {
    counter += 1;
    return `b${Date.now().toString(36)}${counter.toString(36)}`;
}

export function makeBlock(type: BlockType): Block {
    const base: Block = { id: uid(), type };
    switch (type) {
        case 'heading': return { ...base, level: 2, content: 'Heading', align: '' };
        case 'paragraph': return { ...base, content: '', align: '' };
        case 'list': return { ...base, ordered: false, items: ['First item', 'Second item'] };
        case 'quote': return { ...base, content: 'Quote goes here.' };
        case 'image': return { ...base, src: '', alt: '' };
        case 'button': return { ...base, text: "Let's Talk", link: 'https://www.techneth.com/contact', color: '#009487' };
        case 'table': return {
            ...base,
            headerRow: true,
            cells: [
                ['Header 1', 'Header 2', 'Header 3'],
                ['', '', ''],
                ['', '', ''],
            ],
        };
        case 'divider': return base;
        case 'html': return { ...base, html: '' };
    }
}

export function makeCol(blocks: Block[] = []): Col {
    return { id: uid(), blocks };
}

export function makeRow(blocks: Block[] = [], colCount = 1): Row {
    if (colCount <= 1) return { id: uid(), cols: [makeCol(blocks)] };
    return { id: uid(), cols: Array.from({ length: colCount }, () => makeCol()) };
}

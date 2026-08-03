/**
 * HTML ⇄ Row/Col/Block round trip.
 *
 * Load: parseHtmlToRows(html) turns stored blog HTML into the block tree.
 * Unknown or complex markup becomes an `html` block holding the markup
 * verbatim, so anything the editor does not model survives a round trip.
 *
 * Save: assembleRowsToHtml(rows) serializes back to the same HTML dialect the
 * previous editor produced (ql-align-* classes, .ql-html-section wrappers),
 * so the frontend integration contract is unchanged.
 */

import { Block, Row, Col, Align, uid, makeCol } from './types';

const ALIGN_CLASS: Record<Exclude<Align, ''>, string> = {
    center: 'ql-align-center',
    right: 'ql-align-right',
    justify: 'ql-align-justify',
};

function alignFromEl(el: Element): Align {
    if (el.classList.contains('ql-align-center')) return 'center';
    if (el.classList.contains('ql-align-right')) return 'right';
    if (el.classList.contains('ql-align-justify')) return 'justify';
    return '';
}

function alignClassAttr(align?: Align): string {
    return align ? ` class="${ALIGN_CLASS[align]}"` : '';
}

/** True when a <p> is really just an image (Quill's image markup). */
function soleImage(el: Element): HTMLImageElement | null {
    const meaningful = Array.from(el.childNodes).filter(
        (n) => !(n.nodeType === 3 && !n.textContent?.trim())
    );
    if (meaningful.length === 1 && (meaningful[0] as Element).tagName === 'IMG') {
        return meaningful[0] as HTMLImageElement;
    }
    return null;
}

/** True when a <p> is just a techneth button link. */
function soleButton(el: Element): HTMLAnchorElement | null {
    const meaningful = Array.from(el.childNodes).filter(
        (n) => !(n.nodeType === 3 && !n.textContent?.trim())
    );
    const first = meaningful[0] as Element | undefined;
    if (meaningful.length === 1 && first?.tagName === 'A' && first.classList.contains('tn-btn')) {
        return first as HTMLAnchorElement;
    }
    return null;
}

function blockFromElement(el: Element): Block | null {
    const tag = el.tagName;

    if (/^H[1-6]$/.test(tag)) {
        return { id: uid(), type: 'heading', level: Number(tag[1]), content: el.innerHTML, align: alignFromEl(el) };
    }

    if (tag === 'P') {
        const img = soleImage(el);
        if (img) {
            return { id: uid(), type: 'image', src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '', align: alignFromEl(el) };
        }
        const btn = soleButton(el);
        if (btn) {
            return {
                id: uid(), type: 'button',
                text: btn.textContent || 'Button',
                link: btn.getAttribute('href') || '',
                color: btn.style.background || '#009487',
                align: alignFromEl(el),
            };
        }
        const inner = el.innerHTML.trim();
        if (!inner || inner === '<br>') return null; // skip Quill blank-line artifacts
        return { id: uid(), type: 'paragraph', content: el.innerHTML, align: alignFromEl(el) };
    }

    if (tag === 'IMG') {
        return { id: uid(), type: 'image', src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '', align: '' };
    }

    if (tag === 'UL' || tag === 'OL') {
        const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => li.innerHTML);
        return { id: uid(), type: 'list', ordered: tag === 'OL', items: items.length ? items : [''] };
    }

    if (tag === 'BLOCKQUOTE') {
        return { id: uid(), type: 'quote', content: el.innerHTML };
    }

    if (tag === 'HR') {
        return { id: uid(), type: 'divider' };
    }

    if (tag === 'TABLE') {
        const trs = Array.from(el.querySelectorAll('tr'));
        if (trs.length === 0) return { id: uid(), type: 'html', html: el.outerHTML };
        // Bail to verbatim HTML if the table uses spans the grid model can't hold
        const hasSpans = !!el.querySelector('[colspan],[rowspan]');
        if (hasSpans) return { id: uid(), type: 'html', html: el.outerHTML };
        const headerRow = !!el.querySelector('thead') || !!trs[0].querySelector('th');
        const cells = trs.map((tr) => Array.from(tr.children).map((cell) => cell.innerHTML));
        const width = Math.max(...cells.map((r) => r.length));
        cells.forEach((r) => { while (r.length < width) r.push(''); });
        return { id: uid(), type: 'table', headerRow, cells };
    }

    if (el.classList.contains('ql-html-section')) {
        return { id: uid(), type: 'html', html: el.innerHTML };
    }

    // Everything else (style, script, iframe, pre, custom divs…) is preserved verbatim
    return { id: uid(), type: 'html', html: el.outerHTML };
}

export function parseHtmlToRows(html: string): Row[] {
    const rows: Row[] = [];
    if (typeof window === 'undefined') return rows;
    const doc = new DOMParser().parseFromString(html || '', 'text/html');

    for (const node of Array.from(doc.body.childNodes)) {
        if (node.nodeType === 3) {
            const text = node.textContent?.trim();
            if (text) rows.push({ id: uid(), cols: [makeCol([{ id: uid(), type: 'paragraph', content: text, align: '' }])] });
            continue;
        }
        if (node.nodeType !== 1) continue;
        const el = node as Element;

        // Multi-column layout row
        if (el.classList.contains('tn-row')) {
            const cols: Col[] = Array.from(el.querySelectorAll(':scope > .tn-col')).map((colEl) => {
                const blocks: Block[] = [];
                for (const child of Array.from(colEl.children)) {
                    const b = blockFromElement(child);
                    if (b) blocks.push(b);
                }
                return makeCol(blocks);
            });
            if (cols.length > 0) {
                rows.push({ id: uid(), cols });
                continue;
            }
        }

        const block = blockFromElement(el);
        if (block) rows.push({ id: uid(), cols: [makeCol([block])] });
    }
    return rows;
}

function serializeBlock(b: Block): string {
    switch (b.type) {
        case 'heading': {
            const level = Math.min(6, Math.max(1, b.level || 2));
            return `<h${level}${alignClassAttr(b.align)}>${b.content || ''}</h${level}>`;
        }
        case 'paragraph': {
            if (!(b.content || '').trim()) return '';
            return `<p${alignClassAttr(b.align)}>${b.content}</p>`;
        }
        case 'list': {
            const tag = b.ordered ? 'ol' : 'ul';
            const items = (b.items || []).map((i) => `<li>${i}</li>`).join('');
            return `<${tag}>${items}</${tag}>`;
        }
        case 'quote':
            return `<blockquote>${b.content || ''}</blockquote>`;
        case 'image': {
            if (!b.src) return '';
            const alt = (b.alt || '').replace(/"/g, '&quot;');
            const src = (b.src || '').replace(/"/g, '&quot;');
            return `<p${alignClassAttr(b.align)}><img src="${src}" alt="${alt}"></p>`;
        }
        case 'button': {
            const href = (b.link || '#').replace(/"/g, '&quot;');
            const color = b.color || '#009487';
            const text = b.text || 'Button';
            return `<p${alignClassAttr(b.align)}><a class="tn-btn" href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-weight:700;padding:12px 28px;border-radius:9999px;text-decoration:none;">${text}</a></p>`;
        }
        case 'divider':
            return '<hr>';
        case 'table': {
            const cells = b.cells || [];
            if (cells.length === 0) return '';
            let out = '<table>';
            let bodyRows = cells;
            if (b.headerRow) {
                out += `<thead><tr>${cells[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
                bodyRows = cells.slice(1);
            }
            out += `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
            return out;
        }
        case 'html':
            if (!(b.html || '').trim()) return '';
            return `<div class="ql-html-section" data-html-section="true">${b.html}</div>`;
    }
}

export function assembleRowsToHtml(rows: Row[]): string {
    const parts: string[] = [];
    for (const row of rows) {
        const nonEmptyCols = row.cols;
        if (nonEmptyCols.length <= 1) {
            for (const block of (nonEmptyCols[0]?.blocks || [])) {
                const s = serializeBlock(block);
                if (s) parts.push(s);
            }
        } else {
            const colsHtml = nonEmptyCols.map((col) => {
                const inner = col.blocks.map(serializeBlock).filter(Boolean).join('\n');
                return `<div class="tn-col">${inner}</div>`;
            }).join('');
            parts.push(`<div class="tn-row" style="display:grid;grid-template-columns:repeat(${nonEmptyCols.length},1fr);gap:16px;margin:16px 0;">${colsHtml}</div>`);
        }
    }
    return parts.join('\n');
}

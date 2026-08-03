'use client'

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Code, FileCode2, Eye, Table, Trash2, ImageIcon, Megaphone, GripVertical, LayoutTemplate, ChevronDown, ExternalLink } from 'lucide-react';
import Modal from './Modal';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';

// 1. CSS is safe to import at the top
import 'react-quill-new/dist/quill.snow.css';

// 2. Import the component dynamically, forwarding a ref so we can reach the
//    Quill instance (needed for inserting HTML at the cursor position).
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    const Wrapped = ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
    return Wrapped;
}, {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-50 border rounded-lg animate-pulse" />,
});

/**
 * Prepare table HTML for Quill. Quill's table blots only understand
 * <table><tbody><tr><td> — <th> cells get merged into one, and whitespace
 * between structural tags turns into stray "&nbsp;" artifacts. Normalizing
 * before the HTML reaches Quill keeps tables intact.
 *
 * Tables inside HTML sections (.ql-html-section) are left untouched — those
 * blocks are stored verbatim and never parsed by Quill.
 */
function normalizeTableHtmlForQuill(html: string): string {
    if (!html || !/<(table|th|thead|tfoot)[\s>]/i.test(html)) return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('table').forEach((table) => {
        if (table.closest('.ql-html-section')) return;

        // th → td, keeping header emphasis as <strong>
        table.querySelectorAll('th').forEach((th) => {
            const td = doc.createElement('td');
            for (const attr of Array.from(th.attributes)) td.setAttribute(attr.name, attr.value);
            const strong = doc.createElement('strong');
            while (th.firstChild) strong.appendChild(th.firstChild);
            td.appendChild(strong);
            th.replaceWith(td);
        });

        // Flatten thead/tbody/tfoot into a single tbody, rows in document order
        const rows = Array.from(table.querySelectorAll('tr'));
        const tbody = doc.createElement('tbody');
        rows.forEach((tr) => tbody.appendChild(tr));
        while (table.firstChild) table.removeChild(table.firstChild);
        table.appendChild(tbody);

        // Drop whitespace-only text nodes between structural tags
        table.querySelectorAll('tbody, tr').forEach((el) => {
            Array.from(el.childNodes).forEach((n) => {
                if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) el.removeChild(n);
            });
        });

        // Trim whitespace padding inside each cell
        table.querySelectorAll('td').forEach((td) => {
            if (td.firstChild?.nodeType === Node.TEXT_NODE) {
                td.firstChild.textContent = (td.firstChild.textContent || '').trimStart();
            }
            if (td.lastChild?.nodeType === Node.TEXT_NODE) {
                td.lastChild.textContent = (td.lastChild.textContent || '').trimEnd();
            }
        });
    });
    return doc.body.innerHTML;
}

/** Ready-made call-to-action block, styled after techneth.com. Inserted as an
 *  HTML section so it stays click-editable. */
const CTA_TEMPLATE = `<div class="tn-cta" style="background:#0F245B;border-radius:12px;padding:32px 24px;text-align:center;margin:16px 0;">
  <h3 style="color:#ffffff;font-size:1.5rem;font-weight:800;margin:0 0 8px;">Ready to start your next project?</h3>
  <p style="color:#c7d2fe;margin:0 0 20px;">Tell us about your idea — we build web, mobile and AI products that scale.</p>
  <a href="https://www.techneth.com/contact" style="display:inline-block;background:#009487;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:9999px;text-decoration:none;">Let&rsquo;s Talk</a>
</div>`;

/** Drag-and-drop mime types used by the block palette / section reordering */
const DND_BLOCK = 'application/x-tn-block';
const DND_SECTION_MOVE = 'application/x-tn-section-move';
const DND_TABLE_MOVE = 'application/x-tn-table-move';

/** Ready-made content sections (inline-styled → no frontend CSS needed).
 *  All are inserted as HTML sections: click to edit, drag to move. */
const SECTION_TEMPLATES: { key: string; label: string; html: string }[] = [
    {
        key: 'takeaways',
        label: 'Key Takeaways',
        html: `<div class="tn-takeaways" style="background:rgba(0,148,135,0.06);border:1px solid rgba(0,148,135,0.25);border-radius:12px;padding:24px;margin:16px 0;">
  <h3 style="color:#0F245B;font-weight:800;margin:0 0 12px;font-size:1.15rem;">Key Takeaways</h3>
  <ul style="margin:0;padding-left:20px;color:#1f2937;">
    <li style="margin-bottom:8px;">First key point of the article.</li>
    <li style="margin-bottom:8px;">Second key point of the article.</li>
    <li>Third key point of the article.</li>
  </ul>
</div>`,
    },
    {
        key: 'faq',
        label: 'FAQ',
        html: `<div class="tn-faq" style="margin:16px 0;">
  <h3 style="color:#0F245B;font-weight:800;margin:0 0 12px;font-size:1.25rem;">Frequently Asked Questions</h3>
  <details style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
    <summary style="font-weight:600;color:#0F245B;cursor:pointer;">First question goes here?</summary>
    <p style="margin:10px 0 0;color:#4b5563;">Answer to the first question.</p>
  </details>
  <details style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
    <summary style="font-weight:600;color:#0F245B;cursor:pointer;">Second question goes here?</summary>
    <p style="margin:10px 0 0;color:#4b5563;">Answer to the second question.</p>
  </details>
</div>`,
    },
    {
        key: 'proscons',
        label: 'Pros & Cons',
        html: `<div class="tn-proscons" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:16px 0;">
  <div style="background:rgba(0,148,135,0.06);border-radius:10px;padding:18px;">
    <h4 style="color:#008F84;font-weight:800;margin:0 0 10px;">Pros</h4>
    <ul style="margin:0;padding-left:18px;color:#1f2937;"><li style="margin-bottom:6px;">Advantage one</li><li>Advantage two</li></ul>
  </div>
  <div style="background:#FEF2F2;border-radius:10px;padding:18px;">
    <h4 style="color:#B91C1C;font-weight:800;margin:0 0 10px;">Cons</h4>
    <ul style="margin:0;padding-left:18px;color:#1f2937;"><li style="margin-bottom:6px;">Drawback one</li><li>Drawback two</li></ul>
  </div>
</div>`,
    },
    {
        key: 'stats',
        label: 'Stats Row',
        html: `<div class="tn-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0;text-align:center;">
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">150+</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Projects delivered</div></div>
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">98%</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Client satisfaction</div></div>
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">10y</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Experience</div></div>
</div>`,
    },
    {
        key: 'testimonial',
        label: 'Testimonial',
        html: `<div class="tn-quote" style="background:#F9F9F9;border-left:4px solid #009487;border-radius:0 10px 10px 0;padding:22px 24px;margin:16px 0;">
  <p style="margin:0;color:#374151;font-style:italic;font-size:1.05rem;">&ldquo;Quote from a happy client goes here.&rdquo;</p>
  <p style="margin:12px 0 0;color:#0F245B;font-weight:700;">&mdash; Client Name, Company</p>
</div>`,
    },
];

/** Convert a title to a human-readable slug for use in alt tags */
function toAltSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function QuillEditor({
    value,
    onChange,
    placeholder,
    onImageSelect,
    seoKeywords = [],
    onValidationCheck,
    contentTitle,
}: any) {
    // --- THE HYDRATION FIX ---
    const [mounted, setMounted] = useState(false);
    // Custom blots must be registered before the editor parses any content
    // (edit pages may load existing HTML sections)
    const [quillReady, setQuillReady] = useState(false);

    // 'visual' = Quill rich text editor, 'html' = raw HTML source editing
    const [mode, setMode] = useState<'visual' | 'html'>('visual');
    const [htmlSource, setHtmlSource] = useState('');

    // HTML modal: null = closed, { editingIndex: null } = inserting new,
    // { editingIndex: n } = editing the HTML section embed at position n
    const [htmlModal, setHtmlModal] = useState<{ editingIndex: number | null } | null>(null);
    const [htmlSnippet, setHtmlSnippet] = useState('');

    // Image alt-text modal: index of the image embed + current alt value
    const [altModal, setAltModal] = useState<{ index: number; alt: string } | null>(null);

    // Whether the cursor is currently inside a table (shows table controls)
    const [inTable, setInTable] = useState(false);
    // Floating "move table" grip position (relative to the editor wrapper)
    const [tableGrip, setTableGrip] = useState<{ top: number; left: number } | null>(null);
    // Ready-made sections dropdown
    const [showSectionsMenu, setShowSectionsMenu] = useState(false);
    // Live preview runs on a separate /preview tab, fed over a
    // BroadcastChannel — keeps the editor layout untouched and flicker-free.
    const [liveBroadcast, setLiveBroadcast] = useState(false);
    const previewChannelRef = useRef<BroadcastChannel | null>(null);
    // Latest editor state, readable from channel callbacks
    const valueRef = useRef(value);
    const htmlSourceRef = useRef(htmlSource);
    const modeRef = useRef(mode);
    valueRef.current = value;
    htmlSourceRef.current = htmlSource;
    modeRef.current = mode;

    const quillRef = useRef<any>(null);
    const quillStaticRef = useRef<any>(null);
    // Where a palette drop should insert (overrides cursor position)
    const pendingInsertIndexRef = useRef<number | null>(null);
    // Source index of the HTML section currently being drag-reordered
    const moveSectionFromRef = useRef<number | null>(null);
    // The native Quill table under the cursor + its range while being moved
    const activeTableNodeRef = useRef<HTMLElement | null>(null);
    const moveTableRef = useRef<{ index: number; length: number } | null>(null);
    const editorWrapRef = useRef<HTMLDivElement | null>(null);

    // Keep the latest onImageSelect / contentTitle in a ref so the memoised
    // handler closure always sees the current values without needing to be
    // recreated (which would reset the editor).
    const onImageSelectRef = useRef(onImageSelect);
    const contentTitleRef = useRef(contentTitle);
    useEffect(() => { onImageSelectRef.current = onImageSelect; }, [onImageSelect]);
    useEffect(() => { contentTitleRef.current = contentTitle; }, [contentTitle]);

    useEffect(() => {
        setMounted(true);

        // 3. Register Quill formats ONLY after mounting on client
        const initQuill = async () => {
            let Quill;
            try {
                const mod = await import('quill');
                Quill = mod.default || mod;
            } catch (e) {
                console.error("Failed to import quill directly", e);
                const mod = await import('react-quill-new');
                Quill = (mod as any).Quill || (mod.default as any).Quill;
            }

            if (!Quill) {
                console.warn('Could not find Quill export');
                return;
            }
            quillStaticRef.current = Quill;

            const Image = Quill.import('formats/image') as any;
            if (Image && !Image.sanitize.__patched) {
                const originalSanitize = Image.sanitize;
                Image.sanitize = function (url: string) {
                    if (!url) return '';
                    const protocol = url.slice(0, url.indexOf(':'));
                    return (['http', 'https', 'data', 'blob'].indexOf(protocol) > -1)
                        ? url : originalSanitize.call(Image, url);
                };
                Image.sanitize.__patched = true;
                Quill.register(Image, true);
            }

            // Register the HTML section blot: an atomic block that stores
            // sanitized raw HTML verbatim (Quill never parses its contents,
            // so complex markup like colspan/thead/custom divs survives).
            if (!(Quill as any).__htmlSectionRegistered) {
                const BlockEmbed = Quill.import('blots/block/embed') as any;
                class HtmlSectionBlot extends BlockEmbed {
                    static blotName = 'html-section';
                    static tagName = 'DIV';
                    static className = 'ql-html-section';
                    static create(value: string) {
                        const node = super.create() as HTMLElement;
                        node.innerHTML = sanitizeHtmlClient(value || '');
                        node.setAttribute('contenteditable', 'false');
                        node.setAttribute('data-html-section', 'true');
                        // Sections are drag-reorderable within the editor.
                        // ('draggable' is stripped by the server sanitizer on
                        // save and re-added here on every load.)
                        node.setAttribute('draggable', 'true');
                        return node;
                    }
                    static value(node: HTMLElement) {
                        return node.innerHTML;
                    }
                }
                Quill.register(HtmlSectionBlot, true);
                (Quill as any).__htmlSectionRegistered = true;
            }

            setQuillReady(true);
        };

        initQuill();
    }, []);

    /**
     * Custom image handler referenced by the toolbar.
     * `this` inside the handler is the Quill Toolbar module, so `this.quill`
     * gives direct access to the editor instance — no React ref needed.
     */
    const imageHandler = useCallback(function (this: any) {
        const quill = this.quill;
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;

            const currentOnImageSelect = onImageSelectRef.current;
            const blobUrl = currentOnImageSelect ? currentOnImageSelect(file) : URL.createObjectURL(file);

            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const titleSlug = contentTitleRef.current ? toAltSlug(contentTitleRef.current) : 'image';
            const altText = `techneth ${titleSlug} .${ext}`;

            if (quill) {
                const range = quill.getSelection(true);
                const index = range ? range.index : quill.getLength();
                quill.insertEmbed(index, 'image', blobUrl, 'user');
                // Persist the default alt through the image format so it
                // lands in the delta (and therefore in the saved HTML)
                quill.formatText(index, 1, 'alt', altText, 'user');
                quill.setSelection(index + 1, 0);
            }
        };
    }, []); // stable — reads latest values through refs

    // 4. Memoize modules to prevent re-renders
    const modules = useMemo(() => ({
        table: true,
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler,
            },
        }
    }), [imageHandler]);

    const closeHtmlModal = () => {
        setHtmlModal(null);
        setHtmlSnippet('');
        pendingInsertIndexRef.current = null;
    };

    /** Resolve a Quill document index from viewport coordinates (drop point). */
    const indexFromPoint = (editor: any, x: number, y: number): number => {
        const QuillStatic = quillStaticRef.current;
        let node: globalThis.Node | null = null;
        let offset = 0;
        const doc = document as any;
        if (doc.caretRangeFromPoint) {
            const r = doc.caretRangeFromPoint(x, y);
            node = r?.startContainer ?? null;
            offset = r?.startOffset ?? 0;
        } else if (doc.caretPositionFromPoint) {
            const p = doc.caretPositionFromPoint(x, y);
            node = p?.offsetNode ?? null;
            offset = p?.offset ?? 0;
        }
        if (!node || !QuillStatic || !editor.root.contains(node)) return editor.getLength();
        try {
            const blot = QuillStatic.find(node, true);
            if (!blot || blot === editor.scroll) return editor.getLength();
            return editor.getIndex(blot) + (node.nodeType === globalThis.Node.TEXT_NODE ? offset : 0);
        } catch {
            return editor.getLength();
        }
    };

    /** Where new content should go: pending drop position, else the cursor. */
    const resolveInsertIndex = (editor: any): number => {
        if (pendingInsertIndexRef.current != null) {
            const i = Math.min(pendingInsertIndexRef.current, editor.getLength());
            pendingInsertIndexRef.current = null;
            return i;
        }
        const range = editor.getSelection(true);
        return range ? range.index : editor.getLength();
    };

    /** Insert image files at a document index (used by drops and the palette). */
    const insertImageFilesAt = (files: File[], index: number) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor || files.length === 0) return;
        let i = Math.min(index, editor.getLength());
        for (const file of files) {
            const currentOnImageSelect = onImageSelectRef.current;
            const blobUrl = currentOnImageSelect ? currentOnImageSelect(file) : URL.createObjectURL(file);
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const titleSlug = contentTitleRef.current ? toAltSlug(contentTitleRef.current) : 'image';
            editor.insertEmbed(i, 'image', blobUrl, 'user');
            editor.formatText(i, 1, 'alt', `techneth ${titleSlug} .${ext}`, 'user');
            i += 1;
        }
        editor.setSelection(i, 0);
    };

    /** Open a file picker and insert the chosen image at the given index. */
    const pickImageAt = (index: number) => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = () => {
            const file = input.files?.[0];
            if (file) insertImageFilesAt([file], index);
        };
    };

    /** Insert any HTML-section template (CTA, FAQ, takeaways, …). */
    const insertSectionTemplateAt = (html: string, index: number) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const i = Math.min(index, editor.getLength());
        editor.insertEmbed(i, 'html-section', html, 'user');
        editor.setSelection(i + 1, 0, 'silent');
    };

    /** Insert the ready-made CTA block (an editable HTML section). */
    const insertCtaAt = (index: number) => insertSectionTemplateAt(CTA_TEMPLATE, index);

    const cursorIndex = (): number => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return 0;
        const range = editor.getSelection(true);
        return range ? range.index : editor.getLength();
    };

    /** Dragging an existing HTML section: remember which one is moving. */
    const handleDragStart = (e: React.DragEvent) => {
        if (mode !== 'visual') return;
        const editor = quillRef.current?.getEditor?.();
        const QuillStatic = quillStaticRef.current;
        const section = (e.target as HTMLElement).closest?.('.ql-html-section');
        if (!editor || !QuillStatic || !section || !editor.root.contains(section)) return;
        const blot = QuillStatic.find(section);
        if (!blot) return;
        moveSectionFromRef.current = editor.getIndex(blot);
        e.dataTransfer.setData(DND_SECTION_MOVE, '1');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (mode !== 'visual') return;
        const types = Array.from(e.dataTransfer.types);
        if (types.includes(DND_BLOCK) || types.includes(DND_SECTION_MOVE) || types.includes(DND_TABLE_MOVE) || types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = (types.includes(DND_SECTION_MOVE) || types.includes(DND_TABLE_MOVE)) ? 'move' : 'copy';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        if (mode !== 'visual') return;
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const types = Array.from(e.dataTransfer.types);
        const dropIndex = indexFromPoint(editor, e.clientX, e.clientY);

        // Reorder an existing HTML section
        if (types.includes(DND_SECTION_MOVE)) {
            e.preventDefault();
            const from = moveSectionFromRef.current;
            moveSectionFromRef.current = null;
            if (from == null || dropIndex === from || dropIndex === from + 1) return;
            const delta = editor.getContents(from, 1);
            const val = delta?.ops?.[0]?.insert?.['html-section'];
            if (typeof val !== 'string') return;
            editor.deleteText(from, 1, 'user');
            const target = dropIndex > from ? dropIndex - 1 : dropIndex;
            editor.insertEmbed(target, 'html-section', val, 'user');
            editor.setSelection(target + 1, 0, 'silent');
            return;
        }

        // Reorder a native Quill table (dragged via its floating grip)
        if (types.includes(DND_TABLE_MOVE)) {
            e.preventDefault();
            const mv = moveTableRef.current;
            moveTableRef.current = null;
            if (!mv) return;
            const { index, length } = mv;
            // Ignore drops inside the table's own range
            if (dropIndex >= index && dropIndex <= index + length) return;
            const Delta = quillStaticRef.current?.import?.('delta');
            if (!Delta) return;
            const slice = editor.getContents(index, length);
            editor.deleteText(index, length, 'user');
            const target = dropIndex > index ? dropIndex - length : dropIndex;
            editor.updateContents(new Delta().retain(target).concat(slice), 'user');
            editor.setSelection(target, 0, 'silent');
            setTableGrip(null);
            setInTable(false);
            activeTableNodeRef.current = null;
            return;
        }

        // Palette block dropped in
        if (types.includes(DND_BLOCK)) {
            e.preventDefault();
            const kind = e.dataTransfer.getData(DND_BLOCK);
            if (kind === 'html') {
                pendingInsertIndexRef.current = dropIndex;
                setHtmlSnippet('');
                setHtmlModal({ editingIndex: null });
            } else if (kind === 'cta') {
                insertCtaAt(dropIndex);
            } else if (kind === 'image') {
                pickImageAt(dropIndex);
            } else if (kind.startsWith('tpl:')) {
                const tpl = SECTION_TEMPLATES.find((t) => t.key === kind.slice(4));
                if (tpl) insertSectionTemplateAt(tpl.html, dropIndex);
            }
            return;
        }

        // OS files dropped straight into the editor
        const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length > 0) {
            e.preventDefault();
            insertImageFilesAt(files, dropIndex);
        }
    };

    /** Insert or update an HTML section embed (markup preserved verbatim). */
    const applyHtmlSection = () => {
        const clean = sanitizeHtmlClient(htmlSnippet);
        const editor = quillRef.current?.getEditor?.();
        if (!editor || !clean.trim()) {
            closeHtmlModal();
            return;
        }
        if (htmlModal?.editingIndex != null) {
            editor.deleteText(htmlModal.editingIndex, 1, 'user');
            editor.insertEmbed(htmlModal.editingIndex, 'html-section', clean, 'user');
            editor.setSelection(htmlModal.editingIndex + 1, 0, 'silent');
        } else {
            const index = resolveInsertIndex(editor);
            editor.insertEmbed(index, 'html-section', clean, 'user');
            editor.setSelection(index + 1, 0, 'silent');
        }
        closeHtmlModal();
    };

    /** Convert the snippet into regular editor content (editable inline). */
    const insertAsEditorContent = () => {
        const clean = normalizeTableHtmlForQuill(sanitizeHtmlClient(htmlSnippet));
        const editor = quillRef.current?.getEditor?.();
        if (editor && clean.trim()) {
            const index = resolveInsertIndex(editor);
            // Content is sanitized above — this only bypasses Quill's Delta
            // conversion, not our security policy.
            editor.clipboard.dangerouslyPasteHTML(index, clean, 'user');
            editor.setSelection(editor.getLength(), 0);
        }
        closeHtmlModal();
    };

    /** Remove the HTML section currently being edited. */
    const deleteHtmlSection = () => {
        const editor = quillRef.current?.getEditor?.();
        if (editor && htmlModal?.editingIndex != null) {
            editor.deleteText(htmlModal.editingIndex, 1, 'user');
        }
        closeHtmlModal();
    };

    /** Persist the alt text through Quill's image format so it saves. */
    const applyAltText = () => {
        const editor = quillRef.current?.getEditor?.();
        if (editor && altModal) {
            editor.formatText(altModal.index, 1, 'alt', altModal.alt, 'user');
        }
        setAltModal(null);
    };

    /**
     * Click delegation over the editor: clicking an HTML section opens it for
     * HTML re-editing; clicking an image opens the alt-text editor.
     */
    const handleEditorClick = (e: React.MouseEvent) => {
        if (mode !== 'visual') return;
        const editor = quillRef.current?.getEditor?.();
        const QuillStatic = quillStaticRef.current;
        if (!editor || !QuillStatic) return;
        const target = e.target as HTMLElement;

        const section = target.closest?.('.ql-html-section');
        if (section && editor.root.contains(section)) {
            const blot = QuillStatic.find(section);
            if (blot) {
                setHtmlSnippet((section as HTMLElement).innerHTML);
                setHtmlModal({ editingIndex: editor.getIndex(blot) });
            }
            return;
        }

        if (target.tagName === 'IMG' && editor.root.contains(target)) {
            const blot = QuillStatic.find(target);
            if (blot) {
                setAltModal({
                    index: editor.getIndex(blot),
                    alt: target.getAttribute('alt') || '',
                });
            }
        }
    };

    /** Switch between the visual editor and raw HTML source editing. */
    const switchMode = (next: 'visual' | 'html') => {
        if (next === mode) return;
        if (next === 'html') {
            setHtmlSource(value || '');
            setMode('html');
        } else {
            // Sanitize before handing back to Quill so nothing unsafe ever
            // reaches the visual editor's DOM.
            const clean = normalizeTableHtmlForQuill(sanitizeHtmlClient(htmlSource));
            onChange(clean);
            setMode('visual');
        }
    };

    /** Run a Quill table-module operation at the current selection. */
    const tableOp = (op: 'insert' | 'row' | 'column' | 'deleteRow' | 'deleteColumn' | 'deleteTable') => {
        const editor = quillRef.current?.getEditor?.();
        const tableModule = editor?.getModule('table');
        if (!editor || !tableModule) return;
        editor.focus();
        editor.getSelection(true);
        switch (op) {
            case 'insert': tableModule.insertTable(3, 3); break;
            case 'row': tableModule.insertRowBelow(); break;
            case 'column': tableModule.insertColumnRight(); break;
            case 'deleteRow': tableModule.deleteRow(); break;
            case 'deleteColumn': tableModule.deleteColumn(); break;
            case 'deleteTable': tableModule.deleteTable(); break;
        }
    };

    /** Position the floating "move table" grip over a table node (or hide). */
    const positionGripFor = (tableNode: HTMLElement | null) => {
        if (!tableNode || !editorWrapRef.current || !tableNode.isConnected) {
            setTableGrip(null);
            return;
        }
        const wrapRect = editorWrapRef.current.getBoundingClientRect();
        const tableRect = tableNode.getBoundingClientRect();
        setTableGrip({
            top: tableRect.top - wrapRect.top - 14,
            left: tableRect.left - wrapRect.left,
        });
    };

    /** Track whether the cursor is inside a table to toggle the table controls
     *  and position the floating "move table" grip. */
    const handleSelectionChange = (range: any) => {
        const editor = quillRef.current?.getEditor?.();
        const tableModule = editor?.getModule('table');
        if (!editor || !tableModule || !range) return;
        try {
            const [table] = tableModule.getTable(range);
            setInTable(!!table);
            const tableNode: HTMLElement | null = table?.domNode ?? null;
            if (tableNode) {
                activeTableNodeRef.current = tableNode;
                positionGripFor(tableNode);
            }
        } catch {
            setInTable(false);
        }
    };

    /** Hovering any table also reveals the grip — no click required. */
    const handleEditorMouseOver = (e: React.MouseEvent) => {
        if (mode !== 'visual') return;
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const table = (e.target as HTMLElement).closest?.('table');
        if (table && editor.root.contains(table) && !table.closest('.ql-html-section')) {
            activeTableNodeRef.current = table as HTMLElement;
            positionGripFor(table as HTMLElement);
        }
    };

    // Keep the grip pinned to its table while the editor scrolls or the
    // window resizes; hide it when the table leaves the document.
    useEffect(() => {
        if (mode !== 'visual' || !quillReady) return;
        let cancelled = false;
        let cleanup: (() => void) | null = null;
        const attach = (tries = 0) => {
            const editor = quillRef.current?.getEditor?.();
            if (cancelled) return;
            if (!editor) {
                if (tries < 20) setTimeout(() => attach(tries + 1), 100);
                return;
            }
            const reposition = () => positionGripFor(activeTableNodeRef.current);
            editor.root.addEventListener('scroll', reposition, { passive: true });
            window.addEventListener('resize', reposition);
            editor.on('text-change', reposition);
            cleanup = () => {
                editor.root.removeEventListener('scroll', reposition);
                window.removeEventListener('resize', reposition);
                editor.off('text-change', reposition);
            };
        };
        attach();
        return () => {
            cancelled = true;
            cleanup?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, quillReady]);

    /** Send the current (sanitized) content to the /preview tab. */
    const sendPreviewUpdate = useCallback(() => {
        const channel = previewChannelRef.current;
        if (!channel) return;
        const raw = modeRef.current === 'html' ? htmlSourceRef.current : valueRef.current;
        channel.postMessage({
            kind: 'content',
            title: contentTitleRef.current || 'Untitled post',
            content: sanitizeHtmlClient(raw || ''),
        });
    }, []);

    /** Open (or focus) the /preview tab and start broadcasting edits to it. */
    const openLivePreview = () => {
        if (!previewChannelRef.current) {
            previewChannelRef.current = new BroadcastChannel('tn-live-preview');
            // The preview tab says hello when it opens — reply with content
            previewChannelRef.current.onmessage = (e: MessageEvent) => {
                if (e.data?.kind === 'hello') sendPreviewUpdate();
            };
        }
        setLiveBroadcast(true);
        window.open('/preview', 'tn-live-preview-tab');
        sendPreviewUpdate();
    };

    // Debounced broadcast of edits to the preview tab
    useEffect(() => {
        if (!liveBroadcast) return;
        const t = setTimeout(sendPreviewUpdate, 400);
        return () => clearTimeout(t);
    }, [value, htmlSource, mode, contentTitle, liveBroadcast, sendPreviewUpdate]);

    // Close the channel when the editor unmounts
    useEffect(() => () => { previewChannelRef.current?.close(); }, []);

    /** Start dragging the table currently under the cursor (via its grip). */
    const handleTableDragStart = (e: React.DragEvent) => {
        const editor = quillRef.current?.getEditor?.();
        const QuillStatic = quillStaticRef.current;
        const tableNode = activeTableNodeRef.current;
        if (!editor || !QuillStatic || !tableNode) return;
        const blot = QuillStatic.find(tableNode);
        if (!blot) return;
        try {
            moveTableRef.current = { index: editor.getIndex(blot), length: blot.length() };
            e.dataTransfer.setData(DND_TABLE_MOVE, '1');
            e.dataTransfer.effectAllowed = 'move';
        } catch {
            moveTableRef.current = null;
        }
    };

    // Stored content may contain <th>/<thead> (authored in HTML mode) — Quill
    // can't represent those, so normalize before the visual editor parses it.
    // Idempotent: Quill's own output passes through unchanged.
    const visualValue = useMemo(
        () => (mode === 'visual' ? normalizeTableHtmlForQuill(value || '') : value),
        [value, mode]
    );

    // --- HYDRATION GUARD ---
    if (!mounted || !quillReady) {
        return (
            <div className="h-96 bg-gray-50 border rounded-lg flex items-center justify-center text-gray-400">
                Loading editor...
            </div>
        );
    }

    const isEditingSection = htmlModal?.editingIndex != null;

    return (
        <div className="bg-white rounded-lg overflow-hidden border">
            {/* Editor mode bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-wrap gap-y-1">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => switchMode('visual')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${mode === 'visual'
                            ? 'bg-[#00A99D] text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Eye size={15} />
                        <span>Visual</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode('html')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${mode === 'html'
                            ? 'bg-[#00A99D] text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <FileCode2 size={15} />
                        <span>HTML</span>
                    </button>
                    <span className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                        type="button"
                        onClick={openLivePreview}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${liveBroadcast
                            ? 'bg-[#0F245B] text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                        title="Open a live sample preview of this post in a separate tab — it updates as you type"
                    >
                        <ExternalLink size={15} />
                        <span>{liveBroadcast ? 'Live Preview ↗ (on)' : 'Live Preview ↗'}</span>
                    </button>
                </div>
                {mode === 'visual' && (
                    <div className="flex items-center gap-1">
                        {inTable ? (
                            <>
                                <button type="button" onClick={() => tableOp('row')} className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Add row below">
                                    + Row
                                </button>
                                <button type="button" onClick={() => tableOp('column')} className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Add column right">
                                    + Col
                                </button>
                                <button type="button" onClick={() => tableOp('deleteRow')} className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Delete current row">
                                    − Row
                                </button>
                                <button type="button" onClick={() => tableOp('deleteColumn')} className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Delete current column">
                                    − Col
                                </button>
                                <button type="button" onClick={() => tableOp('deleteTable')} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete table">
                                    <Trash2 size={15} />
                                </button>
                                <span className="w-px h-5 bg-gray-300 mx-1" />
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => tableOp('insert')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                title="Insert a 3×3 table at the cursor"
                            >
                                <Table size={15} />
                                <span>Table</span>
                            </button>
                        )}
                        <span className="w-px h-5 bg-gray-300 mx-1" />
                        {/* Block palette — click to insert at cursor, or drag into the editor */}
                        <span className="hidden lg:inline text-[11px] text-gray-400 mr-1 select-none">Click or drag:</span>
                        <button
                            type="button"
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData(DND_BLOCK, 'image'); e.dataTransfer.effectAllowed = 'copy'; }}
                            onClick={() => pickImageAt(cursorIndex())}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded cursor-grab active:cursor-grabbing hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
                            title="Image — click to insert at cursor, or drag into the editor"
                        >
                            <GripVertical size={12} className="text-gray-300" />
                            <ImageIcon size={14} />
                            <span>Image</span>
                        </button>
                        <button
                            type="button"
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData(DND_BLOCK, 'cta'); e.dataTransfer.effectAllowed = 'copy'; }}
                            onClick={() => insertCtaAt(cursorIndex())}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded cursor-grab active:cursor-grabbing hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
                            title="Call-to-action block — click to insert at cursor, or drag into the editor"
                        >
                            <GripVertical size={12} className="text-gray-300" />
                            <Megaphone size={14} />
                            <span>CTA</span>
                        </button>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowSectionsMenu((v) => !v)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
                                title="Ready-made sections — click or drag one into the editor"
                            >
                                <LayoutTemplate size={14} />
                                <span>Sections</span>
                                <ChevronDown size={13} className={`transition-transform ${showSectionsMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showSectionsMenu && (
                                <div
                                    className="absolute right-0 top-full mt-1 z-30 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                                    onMouseLeave={() => setShowSectionsMenu(false)}
                                >
                                    {SECTION_TEMPLATES.map((tpl) => (
                                        <button
                                            key={tpl.key}
                                            type="button"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData(DND_BLOCK, `tpl:${tpl.key}`);
                                                e.dataTransfer.effectAllowed = 'copy';
                                                setShowSectionsMenu(false);
                                            }}
                                            onClick={() => {
                                                insertSectionTemplateAt(tpl.html, cursorIndex());
                                                setShowSectionsMenu(false);
                                            }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-[#00A99D]/10 hover:text-[#008F84] cursor-grab active:cursor-grabbing"
                                            title={`${tpl.label} — click to insert at cursor, or drag into the editor`}
                                        >
                                            <GripVertical size={12} className="text-gray-300 shrink-0" />
                                            {tpl.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData(DND_BLOCK, 'html'); e.dataTransfer.effectAllowed = 'copy'; }}
                            onClick={() => { setHtmlSnippet(''); setHtmlModal({ editingIndex: null }); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded cursor-grab active:cursor-grabbing hover:border-[#00A99D] hover:text-[#008F84] transition-colors"
                            title="HTML section — click to insert at cursor, or drag into the editor"
                        >
                            <GripVertical size={12} className="text-gray-300" />
                            <Code size={14} />
                            <span>HTML</span>
                        </button>
                    </div>
                )}
            </div>

            {mode === 'visual' ? (
                <div
                    ref={editorWrapRef}
                    className="relative"
                    onClick={handleEditorClick}
                    onMouseOver={handleEditorMouseOver}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <ReactQuill
                        forwardedRef={quillRef}
                        theme="snow"
                        value={visualValue}
                        onChange={onChange}
                        onChangeSelection={handleSelectionChange}
                        modules={modules}
                        placeholder={placeholder || 'Write your content...'}
                        className="h-96 mb-12"
                    />
                    {tableGrip && (
                        <button
                            type="button"
                            draggable
                            onDragStart={handleTableDragStart}
                            style={{ top: tableGrip.top, left: tableGrip.left }}
                            className="absolute z-10 flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-[#00A99D] rounded shadow cursor-grab active:cursor-grabbing select-none"
                            title="Drag to move this table"
                        >
                            <GripVertical size={11} />
                            Move table
                        </button>
                    )}
                </div>
            ) : (
                <div>
                    <textarea
                        value={htmlSource}
                        onChange={(e) => {
                            setHtmlSource(e.target.value);
                            onChange(e.target.value);
                        }}
                        spellCheck={false}
                        className="w-full h-[27rem] p-4 font-mono text-sm text-gray-800 focus:outline-none resize-y"
                        placeholder="<p>Paste or write your full HTML content here…</p>"
                    />
                    <div className="px-3 py-2 border-t bg-amber-50 text-xs text-amber-800">
                        &lt;style&gt; and &lt;script&gt; tags are kept (external scripts must be https);
                        inline event handlers, forms and unlisted iframes are stripped on save.
                        Tip: in Visual mode, use the HTML palette button to add sections that keep
                        their markup exactly and stay editable as HTML.
                    </div>
                </div>
            )}

            {/* Insert / edit HTML section modal */}
            <Modal
                isOpen={htmlModal !== null}
                onClose={closeHtmlModal}
                title={isEditingSection ? 'Edit HTML Section' : 'Insert HTML'}
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4">
                    <textarea
                        value={htmlSnippet}
                        onChange={(e) => setHtmlSnippet(e.target.value)}
                        rows={12}
                        spellCheck={false}
                        autoFocus
                        className="w-full p-3 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        placeholder={'<style>\n  .my-section h3 { color: #0F245B; }\n</style>\n<div class="my-section">\n  <h3>Custom block</h3>\n</div>\n<script>\n  document.querySelector(".my-section")?.addEventListener("click", () => {});\n</script>'}
                    />
                    <p className="text-xs text-gray-500">
                        {isEditingSection
                            ? 'This block is stored as raw HTML — edit it here and click Update. You can include <style> and <script> tags; scripts stay inactive while editing and run in Preview and on the live site. External scripts must be https. Tip: scope CSS selectors to your own class names so they don’t restyle the rest of the page.'
                            : 'An HTML section keeps your markup exactly as written — including its own <style> and <script> — and can be re-edited as HTML by clicking it. Drag its handle to move it. Scripts stay inactive while editing and run in Preview and on the live site.'}
                    </p>
                    <div className="flex flex-wrap justify-between gap-3">
                        <div>
                            {isEditingSection && (
                                <button
                                    type="button"
                                    onClick={deleteHtmlSection}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 size={15} />
                                    <span>Delete Section</span>
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={closeHtmlModal}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            {!isEditingSection && (
                                <button
                                    type="button"
                                    onClick={insertAsEditorContent}
                                    className="px-4 py-2 text-sm border border-[#00A99D] text-[#008F84] rounded hover:bg-[#00A99D]/10 transition-colors"
                                    title="Converts the markup into normal editor content (editable inline, but complex layouts may be simplified)"
                                >
                                    Convert to Editor Content
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={applyHtmlSection}
                                className="px-4 py-2 text-sm bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                            >
                                {isEditingSection ? 'Update Section' : 'Insert as HTML Section'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Image alt text modal */}
            <Modal
                isOpen={altModal !== null}
                onClose={() => setAltModal(null)}
                title="Image Alt Text"
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <ImageIcon size={20} className="text-[#00A99D] mt-2 shrink-0" />
                        <input
                            type="text"
                            value={altModal?.alt || ''}
                            onChange={(e) => setAltModal(altModal ? { ...altModal, alt: e.target.value } : null)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyAltText())}
                            autoFocus
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                            placeholder="Describe the image for SEO and accessibility"
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Good alt text describes what the image shows and can include a relevant
                        keyword. It is used by search engines and screen readers.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setAltModal(null)}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={applyAltText}
                            className="px-4 py-2 text-sm bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                        >
                            Save Alt Text
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

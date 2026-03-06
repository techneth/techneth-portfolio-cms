'use client'

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// 1. CSS is safe to import at the top
import 'react-quill-new/dist/quill.snow.css';

// 2. Import the component dynamically
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-50 border rounded-lg animate-pulse" />,
});

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

    // Keep the latest onImageSelect / contentTitle in a ref so the memoised
    // handler closure always sees the current values without needing to be
    // recreated (which would reset the editor).
    const onImageSelectRef = useRef(onImageSelect);
    const contentTitleRef = useRef(contentTitle);
    useEffect(() => { onImageSelectRef.current = onImageSelect; }, [onImageSelect]);
    useEffect(() => { contentTitleRef.current = contentTitle; }, [contentTitle]);

    useEffect(() => {
        setMounted(true);

        // 3. Register Quill Modules ONLY after mounting on client
        const initQuill = async () => {
            const { Quill } = await import('react-quill-new');

            if (!Quill.imports['formats/image']) {
                const Image = Quill.import('formats/image') as any;
                const originalSanitize = Image.sanitize;
                Image.sanitize = function (url: string) {
                    if (!url) return '';
                    const protocol = url.slice(0, url.indexOf(':'));
                    return (['http', 'https', 'data', 'blob'].indexOf(protocol) > -1)
                        ? url : originalSanitize(url);
                };
                Quill.register(Image, true);
            }
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
                quill.insertEmbed(range.index, 'image', blobUrl, 'user');
                // Set the alt attribute on the just-inserted <img>
                const [leaf] = quill.getLeaf(range.index);
                if (leaf?.domNode?.tagName === 'IMG') {
                    leaf.domNode.setAttribute('alt', altText);
                }
                quill.setSelection(range.index + 1, 0);
            }
        };
    }, []); // stable — reads latest values through refs

    // 4. Memoize modules to prevent re-renders
    const modules = useMemo(() => ({
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

    // --- HYDRATION GUARD ---
    if (!mounted) {
        return (
            <div className="h-96 bg-gray-50 border rounded-lg flex items-center justify-center text-gray-400">
                Loading editor...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg overflow-hidden border">
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                placeholder={placeholder || 'Write your content...'}
                className="h-96 mb-12"
            />
        </div>
    );
}
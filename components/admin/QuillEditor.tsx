'use client'

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 1. CSS is safe to import at the top
import 'react-quill-new/dist/quill.snow.css';

// 2. Import the component dynamically
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-50 border rounded-lg animate-pulse" />
});

export default function QuillEditor({
    value,
    onChange,
    placeholder,
    onImageSelect,
    seoKeywords = [],
    onValidationCheck
}: any) {
    // --- THE HYDRATION FIX ---
    // This state ensures the "real" editor only renders AFTER the initial hydration
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // 3. Register Quill Modules ONLY after mounting on client
        const initQuill = async () => {
            const { Quill } = await import('react-quill-new');

            // Check if already registered to prevent HMR errors
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
        }
    }), []);

    // --- HYDRATION GUARD ---
    // If we are on the server or the very first client render, 
    // return a skeleton that matches the server's output exactly.
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
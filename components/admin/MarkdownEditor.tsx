'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'easymde/dist/easymde.min.css';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
    const options = useMemo(() => ({
        spellChecker: false,
        placeholder: placeholder || 'Write your content in Markdown...',
        autofocus: false,
        autosave: {
            enabled: true,
            uniqueId: 'markdown-editor',
            delay: 1000,
        },
        toolbar: [
            'bold',
            'italic',
            'heading',
            '|',
            'quote',
            'unordered-list',
            'ordered-list',
            '|',
            'link',
            'image',
            '|',
            'preview',
            'side-by-side',
            'fullscreen',
            '|',
            'guide',
        ],
        status: ['lines', 'words'],
    }), [placeholder]);

    return (
        <div className="markdown-editor-wrapper">
            <SimpleMDE
                value={value}
                onChange={onChange}
                options={options as any}
            />
        </div>
    );
}

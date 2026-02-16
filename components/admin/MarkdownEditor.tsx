import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'easymde/dist/easymde.min.css';
import { Image, AlignLeft, AlignCenter, AlignRight, Maximize } from 'lucide-react';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onImageSelect?: (file: File) => string; // Returns preview URL
}

export default function MarkdownEditor({
    value,
    onChange,
    placeholder,
    onImageSelect
}: MarkdownEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ url: string, alt: string } | null>(null);
    const simpleMdeRef = useRef<any>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageSelect) return;

        // Use parent provided handler to get preview URL
        const previewUrl = onImageSelect(file);

        setPendingImage({ url: previewUrl, alt: file.name });
        setShowPositionModal(true);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const insertImage = (position: 'left' | 'right' | 'center' | 'full') => {
        if (!pendingImage || !simpleMdeRef.current) return;

        let imageCode = '';

        switch (position) {
            case 'left':
                imageCode = `<img src="${pendingImage.url}" align="left" width="300" style="margin-right: 20px; margin-bottom: 20px;" alt="${pendingImage.alt}" />`;
                break;
            case 'right':
                imageCode = `<img src="${pendingImage.url}" align="right" width="300" style="margin-left: 20px; margin-bottom: 20px;" alt="${pendingImage.alt}" />`;
                break;
            case 'center':
                imageCode = `<div style="text-align: center; margin: 20px 0;">\n    <img src="${pendingImage.url}" style="max-width: 100%; height: auto;" alt="${pendingImage.alt}" />\n</div>`;
                break;
            case 'full':
                imageCode = `<img src="${pendingImage.url}" style="width: 100%; height: auto; margin: 20px 0;" alt="${pendingImage.alt}" />`;
                break;
        }

        const cm = simpleMdeRef.current.codemirror;
        const doc = cm.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(`\n${imageCode}\n`, cursor);

        setPendingImage(null);
        setShowPositionModal(false);
    };

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
            onImageSelect ? {
                name: 'custom-image',
                action: () => fileInputRef.current?.click(),
                className: 'fa fa-picture-o',
                title: 'Insert Image',
            } : 'image',
            '|',
            'preview',
            'side-by-side',
            'fullscreen',
            '|',
            'guide',
        ],
        status: ['lines', 'words'],
    }), [placeholder, onImageSelect]);

    return (
        <div className="markdown-editor-wrapper relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
            />

            <SimpleMDE
                getMdeInstance={(instance) => {
                    simpleMdeRef.current = instance;
                }}
                value={value}
                onChange={onChange}
                options={options as any}
            />

            {/* Position Modal */}
            {showPositionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Choose Image Position</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => insertImage('left')}
                                className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition-colors"
                            >
                                <AlignLeft size={24} className="mb-2" />
                                <span>Left</span>
                            </button>
                            <button
                                onClick={() => insertImage('center')}
                                className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition-colors"
                            >
                                <AlignCenter size={24} className="mb-2" />
                                <span>Center</span>
                            </button>
                            <button
                                onClick={() => insertImage('right')}
                                className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition-colors"
                            >
                                <AlignRight size={24} className="mb-2" />
                                <span>Right</span>
                            </button>
                            <button
                                onClick={() => insertImage('full')}
                                className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition-colors"
                            >
                                <Maximize size={24} className="mb-2" />
                                <span>Full Width</span>
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowPositionModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

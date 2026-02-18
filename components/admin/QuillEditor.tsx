import { useMemo, useRef, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AlignLeft, AlignCenter, AlignRight, Maximize } from 'lucide-react';
// @ts-ignore
import ImageResize from '@mgreminger/quill-image-resize-module';

// --- QUIL CONFIGURATION ---

// 1. Allow 'style' attribute on image tags
// This allows <img style="float: left"> to be preserved
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Image = Quill.import('formats/image') as any;
const sanitize = Image.sanitize;

// Override sanitize to explicitly allow blob: protocols 
// (Quill by default might strip them depending on version/config)
Image.sanitize = function (url: string) {
    if (!url) return '';
    const protocol = url.slice(0, url.indexOf(':'));
    // Allow http, https, data, and blob
    if (['http', 'https', 'data', 'blob'].indexOf(protocol) > -1) {
        return url;
    }
    // Fallback to strict/default behavior
    return sanitize(url);
};

// Register custom attributor for style
// This tells Quill to look for and preserve the 'style' attribute on inline blots (like image)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Parchment = Quill.import('parchment') as any;
const StyleAttributor = new Parchment.Attributor('style', 'style', {
    scope: Parchment.Scope.INLINE_BLOT
});
Quill.register(StyleAttributor, true);
Quill.register(Image, true);
Quill.register('modules/imageResize', ImageResize);


interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onImageSelect?: (file: File) => string; // Returns preview URL
}

export default function QuillEditor({
    value,
    onChange,
    placeholder,
    onImageSelect
}: MarkdownEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const quillRef = useRef<ReactQuill>(null);
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ url: string, alt: string } | null>(null);

    const modules = useMemo(() => ({
        imageResize: {
            // Options: handleStyles, displayStyles, etc.
            // We can customize handles here if needed
            modules: ['Resize', 'DisplaySize'] // Only show resize handles and size display
        },
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
                image: () => {
                    if (onImageSelect) {
                        fileInputRef.current?.click();
                    } else {
                        // Default Quill behavior
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tooltip = (quillRef.current?.getEditor() as any).theme.tooltip;
                        const originalSave = tooltip.save;
                        const originalHide = tooltip.hide;

                        tooltip.save = () => {
                            const range = quillRef.current?.getEditor().getSelection(true);
                            const value = tooltip.textbox.value;
                            if (value && range) {
                                quillRef.current?.getEditor().insertEmbed(range.index, 'image', value, 'user');
                            }
                            tooltip.save = originalSave;
                            tooltip.hide = originalHide;
                            tooltip.hide();
                        };
                        tooltip.show();
                        tooltip.textbox.focus();
                    }
                }
            }
        }
    }), [onImageSelect]);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageSelect) return;

        const previewUrl = onImageSelect(file);

        setPendingImage({ url: previewUrl, alt: file.name });
        setShowPositionModal(true);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const insertImage = (position: 'left' | 'right' | 'center' | 'full') => {
        if (!pendingImage || !quillRef.current) return;

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true);
        if (!range) return;

        let imageHtml = '';

        // Construct HTML:
        // Important: style attribute is now allowed by our custom registration
        switch (position) {
            case 'left':
                imageHtml = `<img src="${pendingImage.url}" alt="${pendingImage.alt}" style="float: left; margin-right: 20px; margin-bottom: 20px; max-width: 50%;" />`;
                break;
            case 'right':
                imageHtml = `<img src="${pendingImage.url}" alt="${pendingImage.alt}" style="float: right; margin-left: 20px; margin-bottom: 20px; max-width: 50%;" />`;
                break;
            case 'center':
                // Note: Div wrapper might be split by Quill block logic, but often works for block level
                imageHtml = `<div style="text-align: center; margin: 20px 0;"><img src="${pendingImage.url}" alt="${pendingImage.alt}" style="max-width: 100%; height: auto; display: inline-block;" /></div>`;
                break;
            case 'full':
                imageHtml = `<img src="${pendingImage.url}" alt="${pendingImage.alt}" style="display: block; width: 100%; height: auto; margin: 20px 0;" />`;
                break;
        }

        editor.clipboard.dangerouslyPasteHTML(range.index, imageHtml);
        editor.setSelection(range.index + 1);

        setPendingImage(null);
        setShowPositionModal(false);
    };

    return (
        <div className="markdown-editor-wrapper relative text-black">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
            />

            <div className="bg-white rounded-lg overflow-hidden">
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    placeholder={placeholder || 'Write your content...'}
                    className="h-96 mb-12"
                />
            </div>

            {/* Position Modal */}
            {showPositionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl text-gray-800">
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

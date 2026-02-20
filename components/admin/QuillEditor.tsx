import { useMemo, useRef, useState, useEffect } from 'react';
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

// Register custom icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icons = Quill.import('ui/icons') as any;
Icons['cta-button'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ql-stroke"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

// Register custom attributor for class (to allow btn-primary on links)
const ClassAttributor = new Parchment.Attributor('class', 'class', {
    scope: Parchment.Scope.INLINE_BLOT
});
Quill.register(ClassAttributor, true);

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
    seoKeywords?: string[];
    onValidationCheck?: (warnings: string[]) => void;
}

export default function QuillEditor({
    value,
    onChange,
    placeholder,
    onImageSelect,
    seoKeywords = [],
    onValidationCheck
}: MarkdownEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const quillRef = useRef<ReactQuill>(null);
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [showButtonModal, setShowButtonModal] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ url: string, alt: string } | null>(null);
    const [buttonData, setButtonData] = useState({ text: '', url: '' });

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
                ['clean'],
                ['cta-button'] // Custom button
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
                },
                'cta-button': () => {
                    setButtonData({ text: '', url: '' });
                    setShowButtonModal(true);
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

    const insertButton = () => {
        if (!buttonData.text || !buttonData.url || !quillRef.current) return;

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true);
        if (!range) return;

        // Create button HTML
        const buttonHtml = `<a href="${buttonData.url}" class="btn-primary" style="display: inline-block; padding: 10px 20px; background-color: #00A99D; color: white; text-decoration: none; border-radius: 4px; margin: 5px 0;">${buttonData.text}</a>&nbsp;`;

        editor.clipboard.dangerouslyPasteHTML(range.index, buttonHtml);
        editor.setSelection(range.index + 1); // Move cursor after button

        setShowButtonModal(false);
    };


    // --- VALIDATION LOGIC ---
    useEffect(() => {
        if (!onValidationCheck) return;

        validateContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, JSON.stringify(seoKeywords)]);

    // Use a ref to store the last warnings to prevent infinite loops
    // if the warnings haven't actually changed.
    const lastWarningsRef = useRef<string>('');

    const validateContent = () => {
        if (!onValidationCheck) return;

        const warnings: string[] = [];
        const div = document.createElement('div');
        div.innerHTML = value;
        let text = div.textContent || '';

        // Normalize non-breaking spaces to regular spaces
        text = text.replace(/\u00A0/g, ' ');

        // 1. Spacing check
        if (text.includes('  ')) {
            warnings.push('Content contains double spaces. Please use single spaces.');
        }

        // 2. SEO Keyword Check (First 100 words)
        if (seoKeywords && seoKeywords.length > 0) {
            const first100Words = text.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
            const missingKeywords = seoKeywords.filter(keyword =>
                !first100Words.includes(keyword.toLowerCase())
            );

            if (missingKeywords.length > 0) {
                warnings.push(`Missing SEO keyword(s) in first 100 words: ${missingKeywords.join(', ')}`);
            }
        }

        // 3. Sentence Length Check (> 20 words)
        // Split by punctuation: . ! ? to get segments.
        // This handles sentences even if they don't end in punctuation (e.g. headers, list items, or end of text)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const longSentences = sentences.filter(sentence => {
            const wordCount = sentence.trim().split(/\s+/).length;
            return wordCount > 20;
        });

        if (longSentences.length > 0) {
            warnings.push(`Found ${longSentences.length} sentence(s) exceeding 20 words.`);
        }

        // 4. Paragraph Length Check (> 3 sentences)
        // We'll iterate over block tags
        const paragraphs = div.querySelectorAll('p, li, blockquote');
        let longParagraphsCount = 0;
        let singleWordParagraphsCount = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paragraphs.forEach((p: any) => {
            const pText = p.textContent || '';
            const pSentences = pText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);

            if (pSentences.length > 3) {
                longParagraphsCount++;
            }
            // Check single word: split by space, if length is 1 and text is not empty.
            // Also ensure it's not just a symbol or number if needed, but simple check is fine.
            if (pText.trim().split(/\s+/).length === 1 && pText.trim().length > 0) {
                singleWordParagraphsCount++;
            }
        });

        if (longParagraphsCount > 0) {
            warnings.push(`Found ${longParagraphsCount} paragraph(s) exceeding 3 sentences.`);
        }
        if (singleWordParagraphsCount > 0) {
            warnings.push(`Found ${singleWordParagraphsCount} single-word paragraph(s).`);
        }

        // 5. Hierarchy Check (H1 in body, H nesting)
        const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let h1Found = false;
        let lastLevel = 0;
        let hierarchyIssue = false;

        headings.forEach(heading => {
            const tagName = heading.tagName.toLowerCase();
            const level = parseInt(tagName.replace('h', ''));

            if (level === 1) {
                h1Found = true;
            }

            if (lastLevel > 0 && level > lastLevel + 1) {
                hierarchyIssue = true;
            }
            lastLevel = level;
        });

        if (h1Found) {
            warnings.push('Content contains H1 tag. H1 should only be used for the page title.');
        }
        if (hierarchyIssue) {
            warnings.push('Heading hierarchy skipped a level (e.g., H2 to H4).');
        }

        const warningsString = JSON.stringify(warnings);
        if (warningsString !== lastWarningsRef.current) {
            lastWarningsRef.current = warningsString;
            onValidationCheck(warnings);
        }
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm sm:w-96 shadow-xl text-gray-800">
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

            {/* CTA Button Modal */}
            {showButtonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl text-gray-800">
                        <h3 className="text-lg font-bold mb-4">Insert Call to Action Button</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Button Text
                                </label>
                                <input
                                    type="text"
                                    value={buttonData.text}
                                    onChange={(e) => setButtonData({ ...buttonData, text: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                    placeholder="e.g., Get Started"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Button Link (URL)
                                </label>
                                <input
                                    type="text"
                                    value={buttonData.url}
                                    onChange={(e) => setButtonData({ ...buttonData, url: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowButtonModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={insertButton}
                                className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                            >
                                Insert Button
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useMemo, useRef, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AlignLeft, AlignCenter, AlignRight, Maximize } from 'lucide-react';
// @ts-ignore
import ImageResize from '@mgreminger/quill-image-resize-module';

// --- QUILL CONFIGURATION ---

const Image = Quill.import('formats/image') as any;
const sanitize = Image.sanitize;

Image.sanitize = function (url: string) {
    if (!url) return '';
    const protocol = url.slice(0, url.indexOf(':'));
    if (['http', 'https', 'data', 'blob'].indexOf(protocol) > -1) {
        return url;
    }
    return sanitize(url);
};

const Parchment = Quill.import('parchment') as any;
const Icons = Quill.import('ui/icons') as any;
Icons['cta-button'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ql-stroke"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

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
    onImageSelect?: (file: File) => string;
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

    // --- AUTO-BLOCKQUOTE LOGIC ---
    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const handleTextChange = (delta: any, oldDelta: any, source: string) => {
            if (source !== 'user') return;

            // Check if the last operation was inserting a double quote
            const lastOp = delta.ops[delta.ops.length - 1];
            if (lastOp && lastOp.insert === '"') {
                const range = quill.getSelection();
                if (!range) return;

                const currentIndex = range.index;
                const text = quill.getText();

                // Get text before the quote we just typed
                const textBefore = text.substring(0, currentIndex - 1);
                const openingQuoteIndex = textBefore.lastIndexOf('"');

                // If an opening quote exists and there is text between them
                if (openingQuoteIndex !== -1 && (currentIndex - 1) > openingQuoteIndex) {
                    const quoteLength = (currentIndex - 1) - openingQuoteIndex;

                    // 1. Remove the closing quote
                    quill.deleteText(currentIndex - 1, 1);
                    // 2. Remove the opening quote
                    quill.deleteText(openingQuoteIndex, 1);

                    // 3. Apply blockquote format to the line
                    // Note: -1 because we removed the opening quote character
                    quill.formatLine(openingQuoteIndex, quoteLength - 1, 'blockquote', true);

                    // 4. Move cursor to the end of the new blockquote
                    quill.setSelection(openingQuoteIndex + quoteLength, 0);
                }
            }
        };

        quill.on('text-change', handleTextChange);
        return () => {
            quill.off('text-change', handleTextChange);
        };
    }, []);

    const modules = useMemo(() => ({
        imageResize: {
            modules: ['Resize', 'DisplaySize']
        },
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean'],
                ['cta-button']
            ],
            handlers: {
                image: () => {
                    if (onImageSelect) {
                        fileInputRef.current?.click();
                    } else {
                        const tooltip = (quillRef.current?.getEditor() as any).theme.tooltip;
                        const originalSave = tooltip.save;
                        const originalHide = tooltip.hide;

                        tooltip.save = () => {
                            const range = quillRef.current?.getEditor().getSelection(true);
                            const val = tooltip.textbox.value;
                            if (val && range) {
                                quillRef.current?.getEditor().insertEmbed(range.index, 'image', val, 'user');
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
        switch (position) {
            case 'left':
                imageHtml = `<img src="${pendingImage.url}" alt="${pendingImage.alt}" style="float: left; margin-right: 20px; margin-bottom: 20px; max-width: 50%;" />`;
                break;
            case 'right':
                imageHtml = `<img src="${pendingImage.url}" alt="${pendingImage.alt}" style="float: right; margin-left: 20px; margin-bottom: 20px; max-width: 50%;" />`;
                break;
            case 'center':
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

        const buttonHtml = `<a href="${buttonData.url}" class="btn-primary" style="display: inline-block; padding: 10px 20px; background-color: #00A99D; color: white; text-decoration: none; border-radius: 4px; margin: 5px 0;">${buttonData.text}</a>&nbsp;`;
        editor.clipboard.dangerouslyPasteHTML(range.index, buttonHtml);
        editor.setSelection(range.index + 1);
        setShowButtonModal(false);
    };

    // --- VALIDATION LOGIC ---
    useEffect(() => {
        if (!onValidationCheck) return;
        validateContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, JSON.stringify(seoKeywords)]);

    const lastWarningsRef = useRef<string>('');

    const validateContent = () => {
        if (!onValidationCheck) return;
        const warnings: string[] = [];
        const div = document.createElement('div');
        div.innerHTML = value;
        let text = div.textContent || '';
        text = text.replace(/\u00A0/g, ' ');

        if (text.includes('  ')) {
            warnings.push('Content contains double spaces. Please use single spaces.');
        }

        if (seoKeywords && seoKeywords.length > 0) {
            const first100Words = text.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
            const missingKeywords = seoKeywords.filter(keyword =>
                !first100Words.includes(keyword.toLowerCase())
            );
            if (missingKeywords.length > 0) {
                warnings.push(`Missing SEO keyword(s) in first 100 words: ${missingKeywords.join(', ')}`);
            }
        }

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const longSentences = sentences.filter(sentence => sentence.trim().split(/\s+/).length > 20);
        if (longSentences.length > 0) {
            warnings.push(`Found ${longSentences.length} sentence(s) exceeding 20 words.`);
        }

        const paragraphs = div.querySelectorAll('p, li, blockquote');
        let longParagraphsCount = 0;
        let singleWordParagraphsCount = 0;

        paragraphs.forEach((p: any) => {
            const pText = p.textContent || '';
            const pSentences = pText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
            if (pSentences.length > 3) longParagraphsCount++;
            if (pText.trim().split(/\s+/).length === 1 && pText.trim().length > 0) singleWordParagraphsCount++;
        });

        if (longParagraphsCount > 0) warnings.push(`Found ${longParagraphsCount} paragraph(s) exceeding 3 sentences.`);
        if (singleWordParagraphsCount > 0) warnings.push(`Found ${singleWordParagraphsCount} single-word paragraph(s).`);

        const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let h1Found = false;
        let lastLevel = 0;
        let hierarchyIssue = false;

        headings.forEach(heading => {
            const level = parseInt(heading.tagName.toLowerCase().replace('h', ''));
            if (level === 1) h1Found = true;
            if (lastLevel > 0 && level > lastLevel + 1) hierarchyIssue = true;
            lastLevel = level;
        });

        if (h1Found) warnings.push('Content contains H1 tag. H1 should only be used for the page title.');
        if (hierarchyIssue) warnings.push('Heading hierarchy skipped a level (e.g., H2 to H4).');

        const warningsString = JSON.stringify(warnings);
        if (warningsString !== lastWarningsRef.current) {
            lastWarningsRef.current = warningsString;
            onValidationCheck(warnings);
        }
    };

    return (
        <div className="markdown-editor-wrapper relative text-black">
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
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

            {showPositionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl text-gray-800">
                        <h3 className="text-lg font-bold mb-4">Choose Image Position</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => insertImage('left')} className="flex flex-col items-center p-4 border rounded hover:bg-gray-50"><AlignLeft size={24} className="mb-2" /><span>Left</span></button>
                            <button onClick={() => insertImage('center')} className="flex flex-col items-center p-4 border rounded hover:bg-gray-50"><AlignCenter size={24} className="mb-2" /><span>Center</span></button>
                            <button onClick={() => insertImage('right')} className="flex flex-col items-center p-4 border rounded hover:bg-gray-50"><AlignRight size={24} className="mb-2" /><span>Right</span></button>
                            <button onClick={() => insertImage('full')} className="flex flex-col items-center p-4 border rounded hover:bg-gray-50"><Maximize size={24} className="mb-2" /><span>Full</span></button>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={() => setShowPositionModal(false)} className="text-gray-600">Cancel</button></div>
                    </div>
                </div>
            )}

            {showButtonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl text-gray-800">
                        <h3 className="text-lg font-bold mb-4">Insert Call to Action Button</h3>
                        <div className="space-y-4">
                            <input type="text" value={buttonData.text} onChange={(e) => setButtonData({ ...buttonData, text: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Button Text" />
                            <input type="text" value={buttonData.url} onChange={(e) => setButtonData({ ...buttonData, url: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="https://..." />
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setShowButtonModal(false)} className="text-gray-600">Cancel</button>
                            <button onClick={insertButton} className="px-4 py-2 bg-[#00A99D] text-white rounded">Insert Button</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
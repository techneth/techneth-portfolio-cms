'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Monitor, Smartphone } from 'lucide-react';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';
import { buildPreviewDoc } from '@/lib/preview-template';

interface ContentPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'blog' | 'case-study';
    title: string;
    content: string;
    category?: string;
    authorName?: string;
    excerpt?: string;
    featuredImage?: string;
    /** Case studies only */
    clientName?: string;
    industry?: string;
}

/**
 * Full-screen preview of how the post will look on techneth.com.
 * Rendered in a sandboxed iframe: the content's own CSS and JavaScript run
 * exactly as they will on the live site, without touching the admin UI.
 */
export default function ContentPreview(props: ContentPreviewProps) {
    const { isOpen, onClose } = props;
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const srcDoc = useMemo(() => {
        if (!isOpen) return '';
        return buildPreviewDoc({
            ...props,
            content: sanitizeHtmlClient(props.content || ''),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, props.type, props.title, props.content, props.category, props.authorName,
        props.excerpt, props.featuredImage, props.clientName, props.industry]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-gray-900">
            {/* Admin preview bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
                <span className="text-sm text-gray-300">
                    Preview — approximation of techneth.com ({props.type === 'blog' ? 'blog post' : 'case study'})
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDevice('desktop')}
                        className={`p-2 rounded transition-colors ${device === 'desktop' ? 'bg-[#00A99D] text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Desktop preview"
                    >
                        <Monitor size={17} />
                    </button>
                    <button
                        onClick={() => setDevice('mobile')}
                        className={`p-2 rounded transition-colors ${device === 'mobile' ? 'bg-[#00A99D] text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Mobile preview"
                    >
                        <Smartphone size={17} />
                    </button>
                    <span className="w-px h-5 bg-gray-700 mx-1" />
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded transition-colors"
                        title="Close preview (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Isolated site viewport */}
            <div className="flex-1 flex justify-center overflow-hidden bg-gray-800 p-0">
                <div className={`h-full transition-all ${device === 'mobile' ? 'w-[390px] py-4' : 'w-full'}`}>
                    <iframe
                        title="Content preview"
                        srcDoc={srcDoc}
                        sandbox="allow-scripts allow-same-origin"
                        className={`w-full h-full bg-white ${device === 'mobile' ? 'rounded-xl shadow-2xl' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
}

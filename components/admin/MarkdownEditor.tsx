import dynamic from 'next/dynamic';

// Block-based live editor (drag & drop). Client-only: it uses DOMParser and
// the native HTML5 Drag and Drop API.
const BlogLiveEditor = dynamic(() => import('./live-editor/BlogLiveEditor'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 rounded animate-pulse" />,
});

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onImageSelect?: (file: File) => string;
    seoKeywords?: string[];
    onValidationCheck?: (warnings: string[]) => void;
    /** Used to set the alt tag on inserted images: "techneth [title] .ext" */
    contentTitle?: string;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
    return <BlogLiveEditor {...props} />;
}
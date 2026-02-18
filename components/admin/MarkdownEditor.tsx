import dynamic from 'next/dynamic';

// Dynamic import for QuillEditor to avoid SSR issues with Quill/Document
const QuillEditor = dynamic(() => import('./QuillEditor'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 rounded animate-pulse" />
});

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onImageSelect?: (file: File) => string;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
    return <QuillEditor {...props} />;
}
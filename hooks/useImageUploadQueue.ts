import { useRef } from 'react';
import { StorageBucket } from '@/lib/supabase/storage';
import { uploadFile } from '@/app/(admin)/actions/upload';

/** Convert an arbitrary string to a URL-safe slug */
export function toSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function useImageUploadQueue() {
    // Use a ref so the map persists across renders without causing re-renders
    const pendingImages = useRef<Map<string, File>>(new Map());

    /**
     * Register a file and return a blob URL for immediate preview in the editor.
     * The actual upload happens only when uploadImages() is called at save time.
     */
    const addImage = (file: File): string => {
        const url = URL.createObjectURL(file);
        pendingImages.current.set(url, file);
        return url;
    };

    /**
     * Upload all pending images that appear in `content`, replace their blob URLs
     * with the real Supabase Storage public URLs, and return the updated content.
     *
     * @param content   - HTML/markdown content that may contain blob URLs
     * @param bucket    - Supabase storage bucket name
     * @param basePath  - Folder path inside the bucket
     * @param nameSlug  - Human-readable slug used for SEO-friendly file names
     */
    const uploadImages = async (
        content: string,
        bucket: StorageBucket,
        basePath: string,
        nameSlug?: string
    ): Promise<string> => {
        const blobsToUpload: { blobUrl: string; file: File }[] = [];

        for (const [blobUrl, file] of pendingImages.current.entries()) {
            if (content.includes(blobUrl)) {
                blobsToUpload.push({ blobUrl, file });
            }
        }

        if (blobsToUpload.length === 0) return content;

        const baseSlug = nameSlug ? toSlug(nameSlug) : 'image';

        // Upload all pending images in parallel
        const uploadResults = await Promise.all(
            blobsToUpload.map(async ({ blobUrl, file }, index) => {
                const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
                // e.g. "my-blog-post-1.jpg", "my-blog-post-2.jpg"
                const fileName = `${baseSlug}-${index + 1}.${fileExt}`;
                const filePath = `${basePath}/${fileName}`;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('bucket', bucket);
                formData.append('path', filePath);

                const publicUrl = await uploadFile(formData);
                return { blobUrl, publicUrl };
            })
        );

        // Replace blob URLs with permanent public URLs in content
        let newContent = content;
        for (const { blobUrl, publicUrl } of uploadResults) {
            newContent = newContent.replaceAll(blobUrl, publicUrl);
        }

        return newContent;
    };

    /**
     * Revoke all blob URLs and clear the queue. Call this after a successful save
     * to free browser memory.
     */
    const clearQueue = () => {
        for (const blobUrl of pendingImages.current.keys()) {
            URL.revokeObjectURL(blobUrl);
        }
        pendingImages.current.clear();
    };

    return { addImage, uploadImages, clearQueue };
}

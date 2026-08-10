import { useRef } from 'react';
import { StorageBucket, uploadImageDirect } from '@/lib/supabase/storage';

/** Convert an arbitrary string to a URL-safe slug */
export function toSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Short, collision-resistant token used to make each uploaded file name unique.
 * Without this, index-based names (image-1, image-2, …) collide across draft
 * re-saves and edits and — combined with Supabase `upsert: true` — silently
 * overwrite previously uploaded images (duplicates / vanishing images).
 */
function uniqueToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().slice(0, 8);
    }
    return Math.random().toString(36).slice(2, 10);
}

export function useImageUploadQueue() {
    // Use a ref so the map persists across renders without causing re-renders.
    // Each blob URL maps to its File plus a stable unique token minted at add time.
    const pendingImages = useRef<Map<string, { file: File; token: string }>>(new Map());

    /**
     * Register a file and return a blob URL for immediate preview in the editor.
     * The actual upload happens only when uploadImages() is called at save time.
     */
    const addImage = (file: File): string => {
        const url = URL.createObjectURL(file);
        pendingImages.current.set(url, { file, token: uniqueToken() });
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
        const blobsToUpload: { blobUrl: string; file: File; token: string }[] = [];

        for (const [blobUrl, { file, token }] of pendingImages.current.entries()) {
            if (content.includes(blobUrl)) {
                blobsToUpload.push({ blobUrl, file, token });
            }
        }

        if (blobsToUpload.length === 0) return content;

        const baseSlug = nameSlug ? toSlug(nameSlug) : 'image';

        // Upload all pending images in parallel
        const uploadResults = await Promise.all(
            blobsToUpload.map(async ({ blobUrl, file, token }) => {
                const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
                // Unique per image (e.g. "my-blog-post-a1b2c3d4.jpg") so a re-save
                // or edit never overwrites a previously uploaded file at the same path.
                const fileName = `${baseSlug}-${token}.${fileExt}`;
                const filePath = `${basePath}/${fileName}`;

                const publicUrl = await uploadImageDirect(bucket, filePath, file);
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

import { useState } from 'react';
import { uploadImage, getImageUrl, StorageBucket } from '@/lib/supabase/storage';
import { v4 as uuidv4 } from 'uuid';

export function useImageUploadQueue() {
    const [pendingImages, setPendingImages] = useState<Record<string, File>>({});

    const addImage = (file: File): string => {
        const url = URL.createObjectURL(file);
        setPendingImages(prev => ({ ...prev, [url]: file }));
        return url;
    };

    const uploadImages = async (content: string, bucket: StorageBucket, basePath: string) => {
        // Find distinct blob URLs in content that need uploading
        const blobsToUpload: { blobUrl: string; file: File }[] = [];

        for (const [blobUrl, file] of Object.entries(pendingImages)) {
            if (content.includes(blobUrl)) {
                blobsToUpload.push({ blobUrl, file });
            }
        }

        if (blobsToUpload.length === 0) return content;

        // Upload images in parallel
        const uploadResults = await Promise.all(
            blobsToUpload.map(async ({ blobUrl, file }) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${basePath}/${fileName}`;

                try {
                    await uploadImage(bucket, filePath, file);
                    const publicUrl = getImageUrl(bucket, filePath);
                    return { blobUrl, publicUrl };
                } catch (error) {
                    console.error(`Failed to upload image ${file.name}:`, error);
                    throw error;
                }
            })
        );

        // Replace blob URLs with public URLs in content
        let newContent = content;
        for (const { blobUrl, publicUrl } of uploadResults) {
            newContent = newContent.replaceAll(blobUrl, publicUrl);
        }

        // Cleanup uploaded blobs from state to free memory (optional, but good practice)
        // We'll keep them for now in case of error retry, but ideally should clear.

        return newContent;
    };

    return { addImage, uploadImages };
}

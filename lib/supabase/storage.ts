import { createClient } from './client';
import { createSignedUploadUrl } from '@/app/(admin)/actions/upload';

export type StorageBucket = 'blogs' | 'case_studies';

/**
 * Upload an image DIRECTLY from the browser to Supabase Storage using a
 * short-lived signed upload URL minted by a server action.
 *
 * The file bytes go straight to Supabase (browser → storage) and never pass
 * through a Next.js Server Action, so they are not subject to the serverless
 * request-body size limit. Returns the final public URL.
 */
export async function uploadImageDirect(
    bucket: StorageBucket,
    path: string,
    file: File
): Promise<string> {
    const { path: signedPath, token, publicUrl } = await createSignedUploadUrl(bucket, path);

    const supabase = createClient();
    const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(signedPath, token, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || undefined,
        });

    if (error) {
        console.error('Direct signed-URL upload failed:', error);
        throw error;
    }

    return publicUrl;
}

/**
 * Upload an image to Supabase storage
 */
export async function uploadImage(
    bucket: StorageBucket,
    path: string,
    file: File
): Promise<{ path: string; fullPath: string } | null> {
    const supabase = createClient();

    // Sanitize path to ensure safe URL construction
    const sanitizedPath = path.replace(/[^a-zA-Z0-9\/._-]/g, '_');

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(sanitizedPath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Error uploading image:', error);
        throw error;
    }

    return data;
}

/**
 * Get public URL for an image
 */
export function getImageUrl(bucket: StorageBucket, path: string): string {
    const supabase = createClient();
    // Sanitize path to ensure consistency
    const sanitizedPath = path.replace(/[^a-zA-Z0-9\/._-]/g, '_');
    const { data } = supabase.storage.from(bucket).getPublicUrl(sanitizedPath);
    return data.publicUrl;
}

/**
 * Delete an image from storage
 */
export async function deleteImage(bucket: StorageBucket, path: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}

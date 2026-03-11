'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadFile(formData: FormData) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check permissions - Editors and up can upload
    if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'editor') {
        throw new Error('Forbidden');
    }

    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string;

    if (!file || !bucket || !path) {
        throw new Error('Missing required fields');
    }

    // Validate bucket
    if (!['blogs', 'case_studies'].includes(bucket)) {
        throw new Error('Invalid bucket');
    }

    const supabase = createAdminClient() as SupabaseClient<any>;

    // Sanitize path (basic check)
    const sanitizedPath = path.replace(/[^a-zA-Z0-9\/._-]/g, '_');

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(sanitizedPath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Server-side upload error:', error);
        throw new Error(error.message);
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(sanitizedPath);

    return publicUrl;
}

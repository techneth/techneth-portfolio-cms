'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

export interface BlogFormData {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image: string;
    status: 'draft' | 'published';
    seo_title: string;
    seo_description: string;
    seo_keywords: string[];
    category: string;
    featured?: boolean;
    is_english: boolean;
    author_name?: string;
    pair_id?: string | null;
}

export async function createBlog(formData: BlogFormData) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'blog')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('blogs')
        .insert({
            ...formData,
            author_id: user.id,
            author_name: formData.author_name || user.name,
            created_by: user.id,
            updated_by: user.id,
            published_at: formData.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

    if (error) throw error;

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'create',
        resourceType: 'blog',
        resourceId: data.id,
        resourceTitle: data.title,
    });

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return data;
}

/** Create an English + Dutch blog post together, automatically linked as a pair. */
export async function createBlogPair(enForm: BlogFormData, nlForm: BlogFormData) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'blog')) throw new Error('Unauthorized');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Insert English post first
    const { data: enData, error: enError } = await supabase
        .from('blogs')
        .insert({ ...enForm, is_english: true, author_id: user.id, author_name: enForm.author_name || user.name, created_by: user.id, updated_by: user.id, published_at: enForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (enError) throw enError;

    // Insert Dutch post, pair_id → English post id
    const { data: nlData, error: nlError } = await supabase
        .from('blogs')
        .insert({ ...nlForm, is_english: false, author_id: user.id, author_name: nlForm.author_name || user.name, created_by: user.id, updated_by: user.id, pair_id: enData.id, published_at: nlForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (nlError) throw nlError;

    // Also set pair_id on the English post (self-anchored)
    await supabase.from('blogs').update({ pair_id: enData.id }).eq('id', enData.id);

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return { en: enData, nl: nlData };
}

/** Link two existing blogs as a translation pair. Both get the same pair_id. */
export async function linkBlogPair(idA: string, idB: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;
    const sharedPairId = idA; // Use one post's own ID as the shared pair_id

    const { error } = await supabase
        .from('blogs')
        .update({ pair_id: sharedPairId, updated_by: user.id })
        .in('id', [idA, idB]);

    if (error) throw error;
    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
}

/** Remove the translation pairing from both posts. */
export async function unlinkBlogPair(idA: string, idB: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { error } = await supabase
        .from('blogs')
        .update({ pair_id: null, updated_by: user.id })
        .in('id', [idA, idB]);

    if (error) throw error;
    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
}

export async function updateBlog(id: string, formData: BlogFormData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get existing blog to check ownership
    const { data: existingBlog } = await supabase
        .from('blogs')
        .select('id, created_by, published_at')
        .eq('id', id)
        .single();

    if (!existingBlog) throw new Error('Blog not found');

    if (!canPerformAction(user, 'update', 'blog', existingBlog.created_by)) {
        throw new Error('Forbidden');
    }

    // Use admin client to bypass RLS for updates (since we already checked permissions)
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    const { data, error } = await adminClient
        .from('blogs')
        .update({
            ...formData,
            updated_by: user.id,
            published_at: formData.status === 'published' && !existingBlog.published_at
                ? new Date().toISOString()
                : existingBlog.published_at,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'blog',
        resourceId: data.id,
        resourceTitle: data.title,
    });

    revalidatePath('/blogs');
    revalidatePath(`/blogs/${id}/edit`);
    revalidateTag('blogs', 'default');
    revalidateTag(`blog-${id}`, 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return data;
}

export async function deleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get blog to check ownership and get title for logging
    const { data: blog } = await supabase
        .from('blogs')
        .select('id, title, created_by')
        .eq('id', id)
        .single();

    if (!blog) throw new Error('Blog not found');

    if (!canPerformAction(user, 'delete', 'blog', blog.created_by)) {
        throw new Error('Forbidden');
    }

    // Soft delete
    const { error } = await supabase
        .from('blogs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'blog',
        resourceId: id,
        resourceTitle: blog.title,
        changes: { deleted_at: { before: null, after: 'now' } }
    });

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag(`blog-${id}`, 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
}

export async function toggleFeaturedBlog(id: string, featured: boolean) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get blog to check ownership and get title for logging
    const { data: blog } = await supabase
        .from('blogs')
        .select('id, title, created_by')
        .eq('id', id)
        .single();

    if (!blog) throw new Error('Blog not found');

    if (!canPerformAction(user, 'update', 'blog', blog.created_by)) {
        throw new Error('Forbidden');
    }

    // Use admin client to bypass RLS for updates
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    const { data, error } = await adminClient
        .from('blogs')
        .update({
            featured,
            updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'blog',
        resourceId: id,
        resourceTitle: blog.title,
        changes: { featured: { before: !featured, after: featured } }
    });

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag(`blog-${id}`, 'default');
    return data;
}

export async function restoreBlog(id: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('blogs')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'blog',
        resourceId: id,
        resourceTitle: data.title,
        changes: { deleted_at: { before: 'timestamp', after: null } }
    });

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag(`blog-${id}`, 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return data;
}

export async function permanentlyDeleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') throw new Error('Unauthorized');

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    // Get the blog first to delete its assets
    const { data: blog, error: fetchError } = await adminClient
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

    if (!fetchError && blog) {
        // Extract image paths to delete
        const bucket = 'blogs';
        const pathsToDelete: string[] = [];
        const textToSearch = `${blog.featured_image || ''} ${blog.content || ''}`;
        const bucketPrefix = `/storage/v1/object/public/${bucket}/`;

        // Match anything after the bucket prefix until a quote, space, or bracket
        const regex = new RegExp(`${bucketPrefix}([^"\\'\\s<>]+)`, 'g');

        let match;
        while ((match = regex.exec(textToSearch)) !== null) {
            if (match[1]) {
                const pathSegments = match[1].split('?')[0];
                pathsToDelete.push(decodeURIComponent(pathSegments));
            }
        }

        const uniquePaths = [...new Set(pathsToDelete)];
        if (uniquePaths.length > 0) {
            const { error: storageError } = await adminClient.storage
                .from(bucket)
                .remove(uniquePaths);

            if (storageError) {
                console.error('Failed to delete storage assets:', storageError);
            }
        }
    }

    const { error } = await adminClient
        .from('blogs')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'blog',
        resourceId: id,
        resourceTitle: 'Permanently Deleted Blog',
    });

    revalidatePath('/blogs');
    revalidateTag('blogs', 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
}

export async function getBlogs(filters?: {
    status?: string;
    search?: string;
    deleted?: boolean;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Build a stable cache key from the filters
    const cacheKey = [
        'blogs-list',
        filters?.status ?? 'all',
        filters?.search ?? '',
        filters?.deleted ? 'trash' : 'active',
        user.role, // Different roles may see different data
    ];

    const fetchBlogs = unstable_cache(
        async () => {
            let query = supabase
                .from('blogs')
                .select('id, title, slug, author_name, status, category, featured, is_english, pair_id, created_at, created_by, deleted_at')
                .order('created_at', { ascending: false });

            if (filters?.deleted) {
                if (user.role !== 'super_admin') return [];
                query = query.not('deleted_at', 'is', null);
            } else {
                query = query.is('deleted_at', null);
            }

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) {
                // pair_id column may not exist yet — fall back without it
                const fallbackQuery = supabase
                    .from('blogs')
                    .select('id, title, slug, author_name, status, category, featured, is_english, created_at, created_by, deleted_at')
                    .order('created_at', { ascending: false });
                if (filters?.deleted) fallbackQuery.not('deleted_at', 'is', null);
                else fallbackQuery.is('deleted_at', null);
                if (filters?.status) fallbackQuery.eq('status', filters.status);
                if (filters?.search) fallbackQuery.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
                const { data: fbData, error: fbError } = await fallbackQuery;
                if (fbError) throw fbError;
                return (fbData ?? []).map((b: any) => ({ ...b, pair_id: null }));
            }
            return data ?? [];
        },
        cacheKey,
        { tags: ['blogs'], revalidate: 60 }
    );

    return fetchBlogs();
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ...

export async function getBlog(id: string): Promise<Database['public']['Tables']['blogs']['Row']> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchBlog = unstable_cache(
        async () => {
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Blog not found');

            return data;
        },
        [`blog-${id}`],
        { tags: [`blog-${id}`, 'blogs'], revalidate: 300 }
    );

    return fetchBlog() as Promise<Database['public']['Tables']['blogs']['Row']>;
}

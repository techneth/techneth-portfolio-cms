'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { sanitizeHtmlServer } from '@/lib/sanitize/server';
import { revalidatePath, updateTag } from 'next/cache';

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
            content: await sanitizeHtmlServer(formData.content),
            author_id: user.id,
            author_name: formData.author_name || user.name,
            created_by: user.id,
            updated_by: user.id,
            published_at: formData.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

    if (error) {
        // Duplicate slug — return a clear message (thrown errors are redacted in prod).
        if (error.code === '23505') {
            return { error: `A blog with the slug "${formData.slug}" already exists (it may be in Trash — permanently delete it there to reuse the slug), or choose a different slug.` };
        }
        throw error;
    }

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
    updateTag('blogs');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return { data };
}

/** Create an English + Dutch blog post together, automatically linked as a pair. */
export async function createBlogPair(enForm: BlogFormData, nlForm: BlogFormData) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'blog')) throw new Error('Unauthorized');

    if (enForm.slug === nlForm.slug) {
        throw new Error(`Both versions have the same slug "${enForm.slug}". The Dutch version needs a different slug (e.g. "${enForm.slug}-nl").`);
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Insert English post first
    const { data: enData, error: enError } = await supabase
        .from('blogs')
        .insert({ ...enForm, content: await sanitizeHtmlServer(enForm.content), is_english: true, author_id: user.id, author_name: enForm.author_name || user.name, created_by: user.id, updated_by: user.id, published_at: enForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (enError) {
        if (enError.code === '23505') throw new Error(`A blog with slug "${enForm.slug}" already exists. Please use a different slug for the English version.`);
        throw enError;
    }

    // Insert Dutch post, pair_id → English post id
    const { data: nlData, error: nlError } = await supabase
        .from('blogs')
        .insert({ ...nlForm, content: await sanitizeHtmlServer(nlForm.content), is_english: false, author_id: user.id, author_name: nlForm.author_name || user.name, created_by: user.id, updated_by: user.id, pair_id: enData.id, published_at: nlForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (nlError) {
        // Roll back the EN post to avoid orphaned records
        await supabase.from('blogs').delete().eq('id', enData.id);
        if (nlError.code === '23505') throw new Error(`A blog with slug "${nlForm.slug}" already exists. Please use a different slug for the Dutch version.`);
        throw nlError;
    }

    // Also set pair_id on the English post (self-anchored)
    await supabase.from('blogs').update({ pair_id: enData.id }).eq('id', enData.id);

    revalidatePath('/blogs');
    updateTag('blogs');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
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
    updateTag('blogs');
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
    updateTag('blogs');
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
            content: await sanitizeHtmlServer(formData.content),
            updated_by: user.id,
            published_at: formData.status === 'published' && !existingBlog.published_at
                ? new Date().toISOString()
                : existingBlog.published_at,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        // Duplicate slug — return a clear message (thrown errors are redacted in prod).
        if (error.code === '23505') {
            return { error: `Another blog already uses the slug "${formData.slug}" (it may be in Trash — permanently delete it there to reuse the slug), or choose a different slug.` };
        }
        throw error;
    }

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
    updateTag('blogs');
    updateTag(`blog-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return { data };
}

export async function deleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get blog to check ownership and get title for logging
    const { data: blog } = await supabase
        .from('blogs')
        .select('id, title, slug, created_by')
        .eq('id', id)
        .single();

    if (!blog) throw new Error('Blog not found');

    if (!canPerformAction(user, 'delete', 'blog', blog.created_by)) {
        throw new Error('Forbidden');
    }

    // Soft delete, and free the slug (unique constraint applies to trashed rows
    // too). Reclaimed on restore (see restoreBlog).
    const freedSlug = blog.slug ? `${blog.slug}--del-${Date.now().toString(36)}` : blog.slug;
    const { error } = await supabase
        .from('blogs')
        .update({ deleted_at: new Date().toISOString(), slug: freedSlug })
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
    updateTag('blogs');
    updateTag(`blog-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
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
    updateTag('blogs');
    updateTag(`blog-${id}`);
    return data;
}

export async function restoreBlog(id: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'blog')) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Try to reclaim the original slug (stripped of the "--del-*" marker) if no
    // active blog is using it; otherwise keep the current one.
    const { data: existing } = await supabase
        .from('blogs')
        .select('id, slug')
        .eq('id', id)
        .single();

    let restoreSlug: string | undefined = existing?.slug ?? undefined;
    if (restoreSlug) {
        const base = restoreSlug.replace(/--del-[a-z0-9]+$/, '');
        if (base && base !== restoreSlug) {
            const { data: clash } = await supabase
                .from('blogs')
                .select('id')
                .eq('slug', base)
                .is('deleted_at', null)
                .maybeSingle();
            if (!clash) restoreSlug = base;
        }
    }

    const { data, error } = await supabase
        .from('blogs')
        .update({ deleted_at: null, ...(restoreSlug ? { slug: restoreSlug } : {}) })
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
    updateTag('blogs');
    updateTag(`blog-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

export async function permanentlyDeleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'delete', 'blog')) throw new Error('Unauthorized');

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
    updateTag('blogs');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
}

export async function getBlogs(filters?: {
    status?: string;
    search?: string;
    deleted?: boolean;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // NOTE: not wrapped in unstable_cache — the cookie-backed Supabase client
    // cannot run inside a cache scope in Next 16 (throws "used cookies inside a
    // function cached with unstable_cache", seen as a Server Components render
    // error on save). Admin reads must be fresh (read-your-own-writes) anyway.
    let query = supabase
        .from('blogs')
        .select('id, title, slug, author_name, status, category, featured, is_english, pair_id, created_at, created_by, deleted_at')
        .order('created_at', { ascending: false });

    if (filters?.deleted) {
        if (!canPerformAction(user, 'delete', 'blog')) return [];
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
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ...

export async function getBlog(id: string): Promise<Database['public']['Tables']['blogs']['Row']> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Not cached: see the note in getBlogs — cookie-backed client can't run
    // inside unstable_cache in Next 16.
    const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Blog not found');

    return data as Database['public']['Tables']['blogs']['Row'];
}

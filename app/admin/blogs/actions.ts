'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

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
            author_name: user.name,
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

    revalidatePath('/admin/blogs');
    return data;
}

export async function updateBlog(id: string, formData: BlogFormData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get existing blog to check ownership
    const { data: existingBlog } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

    if (!existingBlog) throw new Error('Blog not found');

    if (!canPerformAction(user, 'update', 'blog', existingBlog.created_by)) {
        throw new Error('Forbidden');
    }

    const { data, error } = await supabase
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

    revalidatePath('/admin/blogs');
    revalidatePath(`/admin/blogs/${id}/edit`);
    return data;
}

export async function deleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get blog to check ownership and get title for logging
    const { data: blog } = await supabase
        .from('blogs')
        .select('*')
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

    revalidatePath('/admin/blogs');
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

    revalidatePath('/admin/blogs');
    return data;
}

export async function permanentlyDeleteBlog(id: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { error } = await supabase
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

    revalidatePath('/admin/blogs');
}

export async function getBlogs(filters?: {
    status?: string;
    search?: string;
    deleted?: boolean;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    let query = supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

    // Handle deleted items filter
    if (filters?.deleted) {
        if (user.role !== 'super_admin') {
            return []; // Only super admins can see deleted items
        }
        query = query.not('deleted_at', 'is', null);
    } else {
        // Default behavior: show only non-deleted items
        query = query.is('deleted_at', null);
    }

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Editors can only see their own blogs
    if (user.role === 'editor') {
        query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ...

export async function getBlog(id: string): Promise<Database['public']['Tables']['blogs']['Row']> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Blog not found');

    // Editors can only view their own blogs
    if (user.role === 'editor' && data.created_by !== user.id) {
        throw new Error('Forbidden');
    }

    return data as Database['public']['Tables']['blogs']['Row'];
}

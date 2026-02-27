'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

export interface CaseStudyFormData {
    title: string;
    slug: string;
    client_name: string;
    industry: string;
    excerpt: string;
    content: string;
    featured_image: string;
    technologies: string[];
    results: Record<string, any>;
    status: 'draft' | 'published';
    featured: boolean;
    seo_title: string;
    seo_description: string;
}

export async function createCaseStudy(formData: CaseStudyFormData) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'case_study')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('case_studies')
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

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'create',
        resourceType: 'case_study',
        resourceId: data.id,
        resourceTitle: data.title,
    });

    revalidatePath('/case-studies');
    return data;
}

export async function updateCaseStudy(id: string, formData: CaseStudyFormData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existing } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .single();

    if (!existing) throw new Error('Case study not found');

    if (!canPerformAction(user, 'update', 'case_study', existing.created_by)) {
        throw new Error('Forbidden');
    }

    // Use admin client to bypass RLS for updates (since we already checked permissions)
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    const { data, error } = await adminClient
        .from('case_studies')
        .update({
            ...formData,
            updated_by: user.id,
            published_at: formData.status === 'published' && !existing.published_at
                ? new Date().toISOString()
                : existing.published_at,
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
        resourceType: 'case_study',
        resourceId: data.id,
        resourceTitle: data.title,
    });

    revalidatePath('/case-studies');
    return data;
}

export async function deleteCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get case study for ownership check
    const { data: caseStudy } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .single();

    if (!caseStudy) throw new Error('Case study not found');

    if (!canPerformAction(user, 'delete', 'case_study', caseStudy.created_by)) {
        throw new Error('Forbidden');
    }

    // Soft delete
    const { error } = await supabase
        .from('case_studies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'case_study',
        resourceId: id,
        resourceTitle: caseStudy.title,
        changes: { deleted_at: { before: null, after: 'now' } }
    });

    revalidatePath('/case-studies');
}

export async function restoreCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('case_studies')
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
        resourceType: 'case_study',
        resourceId: id,
        resourceTitle: data.title,
        changes: { deleted_at: { before: 'timestamp', after: null } }
    });

    revalidatePath('/case-studies');
    return data;
}

export async function permanentlyDeleteCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get the case study first to delete its assets
    const { data: caseStudy, error: fetchError } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .single();

    if (!fetchError && caseStudy) {
        // Extract image paths to delete
        const bucket = 'case_studies';
        const pathsToDelete: string[] = [];
        const textToSearch = `${caseStudy.featured_image || ''} ${caseStudy.content || ''}`;
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
            const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove(uniquePaths);

            if (storageError) {
                console.error('Failed to delete storage assets:', storageError);
            }
        }
    }

    const { error } = await supabase
        .from('case_studies')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'case_study',
        resourceId: id,
        resourceTitle: 'Permanently Deleted Case Study',
    });

    revalidatePath('/case-studies');
}

export async function toggleFeaturedCaseStudy(id: string, featured: boolean) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get case study to check ownership and title
    const { data: caseStudy } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .single();

    if (!caseStudy) throw new Error('Case study not found');

    if (!canPerformAction(user, 'update', 'case_study', caseStudy.created_by)) {
        throw new Error('Forbidden');
    }

    // Use admin client to bypass RLS for updates
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    const { data, error } = await adminClient
        .from('case_studies')
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
        resourceType: 'case_study',
        resourceId: id,
        resourceTitle: caseStudy.title,
        changes: { featured: { before: !featured, after: featured } }
    });

    revalidatePath('/case-studies');
    return data;
}

export async function getCaseStudies(filters?: {
    status?: string;
    search?: string;
    deleted?: boolean;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    let query = supabase
        .from('case_studies')
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
        query = query.or(`title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
    }

    // Editors can now see all case studies to collaborate
    // if (user.role === 'editor') {
    //     query = query.eq('created_by', user.id);
    // }

    const { data, error } = await query;

    if (error) throw error;

    return data;
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ... other imports

export async function getCaseStudy(id: string): Promise<Database['public']['Tables']['case_studies']['Row']> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Case study not found');

    // Editors can view all case studies
    // if (user.role === 'editor' && data.created_by !== user.id) {
    //     throw new Error('Forbidden');
    // }

    return data as Database['public']['Tables']['case_studies']['Row'];
}

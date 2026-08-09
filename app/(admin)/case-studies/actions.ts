'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { sanitizeHtmlServer } from '@/lib/sanitize/server';
import { revalidatePath, updateTag, unstable_cache } from 'next/cache';

/** A single headline metric on the teal "results at a glance" band. */
export interface CaseStudyMetric {
    value: string;
    label: string;
    detail?: string;
}

/** One phase in the "process, phase by phase" section. */
export interface CaseStudyPhase {
    title: string;
    description?: string;
    points?: string[];
    image?: string;
}

/** A product highlight rendered as an alternating image/text row. */
export interface CaseStudyFeature {
    title: string;
    description?: string;
    image?: string;
    image_alt?: string;
}

/** A gallery slide. `span` controls the slide width in the carousel. */
export interface CaseStudyGalleryImage {
    url: string;
    caption?: string;
    alt?: string;
    span?: 'full' | 'half' | 'third';
}

/** A colour swatch in the visual-identity palette. */
export interface CaseStudyColorSwatch {
    hex: string;
    name?: string;
}

export interface CaseStudyFormData {
    title: string;
    slug: string;
    category: string;
    client_name: string;
    industry: string;
    excerpt: string;
    content: string;
    featured_image: string;
    technologies: string[];
    keywords: string[];
    results: Record<string, any>;
    status: 'draft' | 'published';
    featured: boolean;
    seo_title: string;
    seo_description: string;
    is_english: boolean;
    pair_id?: string | null;

    // ── Narrative fields (all optional; each block is skipped when empty) ──
    // 2.1 Project facts
    subtitle?: string;
    hero_image?: string;
    client_logo?: string;
    client_location?: string;
    timeline?: string;
    project_year?: string;
    platforms?: string[];
    services?: string[];
    industries?: string[];
    live_url?: string;
    // 2.2 Statement blocks
    mission?: string;
    mission_image?: string;
    vision?: string;
    vision_image?: string;
    goals?: string[];
    // 2.3 Narrative
    challenge?: string;
    challenge_points?: string[];
    challenge_image?: string;
    solution?: string;
    solution_points?: string[];
    solution_image?: string;
    outcome?: string;
    outcome_image?: string;
    // 2.4 / 2.5 / 2.7 / 2.8 structured lists
    metrics?: CaseStudyMetric[];
    phases?: CaseStudyPhase[];
    features?: CaseStudyFeature[];
    gallery_images?: CaseStudyGalleryImage[];
    // 2.6 Technology and visual identity
    technologies_note?: string;
    technologies_image?: string;
    typography?: string[];
    color_palette?: CaseStudyColorSwatch[];
    identity_note?: string;
    identity_image?: string;
    // 2.9 Client quote
    testimonial_quote?: string;
    testimonial_author?: string;
    testimonial_role?: string;
    testimonial_avatar?: string;
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
            content: await sanitizeHtmlServer(formData.content),
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
    updateTag('case-studies');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

/** Create an English + Dutch case study together, automatically linked as a pair. */
export async function createCaseStudyPair(enForm: CaseStudyFormData, nlForm: CaseStudyFormData) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'case_study')) throw new Error('Unauthorized');

    if (enForm.slug === nlForm.slug) {
        throw new Error(`Both versions have the same slug "${enForm.slug}". The Dutch version needs a different slug (e.g. "${enForm.slug}-nl").`);
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: enData, error: enError } = await supabase
        .from('case_studies')
        .insert({ ...enForm, content: await sanitizeHtmlServer(enForm.content), is_english: true, author_id: user.id, author_name: user.name, created_by: user.id, updated_by: user.id, published_at: enForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (enError) {
        if (enError.code === '23505') throw new Error(`A case study with slug "${enForm.slug}" already exists. Please use a different slug for the English version.`);
        throw enError;
    }

    const { data: nlData, error: nlError } = await supabase
        .from('case_studies')
        .insert({ ...nlForm, content: await sanitizeHtmlServer(nlForm.content), is_english: false, author_id: user.id, author_name: user.name, created_by: user.id, updated_by: user.id, pair_id: enData.id, published_at: nlForm.status === 'published' ? new Date().toISOString() : null })
        .select().single();
    if (nlError) {
        // Roll back the EN post to avoid orphaned records
        await supabase.from('case_studies').delete().eq('id', enData.id);
        if (nlError.code === '23505') throw new Error(`A case study with slug "${nlForm.slug}" already exists. Please use a different slug for the Dutch version.`);
        throw nlError;
    }

    await supabase.from('case_studies').update({ pair_id: enData.id }).eq('id', enData.id);

    revalidatePath('/case-studies');
    updateTag('case-studies');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return { en: enData, nl: nlData };
}

/** Link two existing case studies as a translation pair. Both get the same pair_id. */
export async function linkCaseStudyPair(idA: string, idB: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { error } = await supabase
        .from('case_studies')
        .update({ pair_id: idA, updated_by: user.id })
        .in('id', [idA, idB]);

    if (error) throw error;
    revalidatePath('/case-studies');
    updateTag('case-studies');
}

/** Remove the translation pairing from both posts. */
export async function unlinkCaseStudyPair(idA: string, idB: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { error } = await supabase
        .from('case_studies')
        .update({ pair_id: null, updated_by: user.id })
        .in('id', [idA, idB]);

    if (error) throw error;
    revalidatePath('/case-studies');
    updateTag('case-studies');
}

export async function updateCaseStudy(id: string, formData: CaseStudyFormData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existing } = await supabase
        .from('case_studies')
        .select('id, created_by, published_at')
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
            content: await sanitizeHtmlServer(formData.content),
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
    updateTag('case-studies');
    updateTag(`case-study-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

export async function deleteCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get case study for ownership check
    const { data: caseStudy } = await supabase
        .from('case_studies')
        .select('id, title, created_by')
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
    updateTag('case-studies');
    updateTag(`case-study-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
}

export async function restoreCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'case_study')) throw new Error('Unauthorized');

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
    updateTag('case-studies');
    updateTag(`case-study-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

export async function permanentlyDeleteCaseStudy(id: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'delete', 'case_study')) throw new Error('Unauthorized');

    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient() as SupabaseClient<any>;

    // Get the case study first to delete its assets
    const { data: caseStudy, error: fetchError } = await adminClient
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
            const { error: storageError } = await adminClient.storage
                .from(bucket)
                .remove(uniquePaths);

            if (storageError) {
                console.error('Failed to delete storage assets:', storageError);
            }
        }
    }

    const { error } = await adminClient
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
    updateTag('case-studies');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
}

export async function toggleFeaturedCaseStudy(id: string, featured: boolean) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get case study to check ownership and title
    const { data: caseStudy } = await supabase
        .from('case_studies')
        .select('id, title, created_by')
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
    updateTag('case-studies');
    updateTag(`case-study-${id}`);
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

    const cacheKey = [
        'case-studies-list',
        filters?.status ?? 'all',
        filters?.search ?? '',
        filters?.deleted ? 'trash' : 'active',
        user.role,
    ];

    const fetchCaseStudies = unstable_cache(
        async () => {
            let query = supabase
                .from('case_studies')
                .select('id, title, slug, category, client_name, industry, status, featured, is_english, pair_id, created_at, created_by, deleted_at')
                .order('created_at', { ascending: false });

            if (filters?.deleted) {
                if (!canPerformAction(user, 'delete', 'case_study')) return [];
                query = query.not('deleted_at', 'is', null);
            } else {
                query = query.is('deleted_at', null);
            }

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) {
                // pair_id column may not exist yet — fall back without it
                const fallbackQuery = supabase
                    .from('case_studies')
                    .select('id, title, slug, category, client_name, industry, status, featured, is_english, created_at, created_by, deleted_at')
                    .order('created_at', { ascending: false });
                if (filters?.deleted) fallbackQuery.not('deleted_at', 'is', null);
                else fallbackQuery.is('deleted_at', null);
                if (filters?.status) fallbackQuery.eq('status', filters.status);
                if (filters?.search) fallbackQuery.or(`title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
                const { data: fbData, error: fbError } = await fallbackQuery;
                if (fbError) throw fbError;
                return (fbData ?? []).map((cs: any) => ({ ...cs, pair_id: null }));
            }
            return data ?? [];
        },
        cacheKey,
        { tags: ['case-studies'], revalidate: 60 }
    );

    return fetchCaseStudies();
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ... other imports

export async function getCaseStudy(id: string): Promise<Database['public']['Tables']['case_studies']['Row']> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchCaseStudy = unstable_cache(
        async () => {
            const { data, error } = await supabase
                .from('case_studies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Case study not found');

            return data;
        },
        [`case-study-${id}`],
        { tags: [`case-study-${id}`, 'case-studies'], revalidate: 300 }
    );

    return fetchCaseStudy() as Promise<Database['public']['Tables']['case_studies']['Row']>;
}

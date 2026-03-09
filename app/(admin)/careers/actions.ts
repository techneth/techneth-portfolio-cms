'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Job {
    id: string;
    title: string;
    department: string;
    location: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_level: 'entry' | 'mid' | 'senior' | 'lead' | null;
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    salary_range: string | null;
    is_remote: boolean;
    is_active: boolean;
    application_deadline: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateJobData {
    title: string;
    department: string;
    location: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_level?: 'entry' | 'mid' | 'senior' | 'lead';
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    salary_range?: string;
    is_remote: boolean;
    application_deadline?: string;
}

export interface UpdateJobData extends Partial<CreateJobData> {
    is_active?: boolean;
}

export async function getJobs(filters?: {
    department?: string;
    location?: string;
    employment_type?: string;
    is_active?: boolean;
}): Promise<Job[]> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'careers')) {
        throw new Error('Unauthorized - Only admins can view jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const cacheKey = [
        'jobs-list',
        filters?.department ?? 'all',
        filters?.location ?? 'all',
        filters?.employment_type ?? 'all',
        filters?.is_active !== undefined ? String(filters.is_active) : 'all',
    ];

    const fetchJobs = unstable_cache(
        async () => {
            let query = supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters?.department) query = query.eq('department', filters.department);
            if (filters?.location) query = query.eq('location', filters.location);
            if (filters?.employment_type) query = query.eq('employment_type', filters.employment_type);
            if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as Job[];
        },
        cacheKey,
        { tags: ['jobs'], revalidate: 300 }
    );

    return fetchJobs();
}

export async function getJob(id: string): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'careers')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchJob = unstable_cache(
        async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) throw new Error('Job not found');
            return data as Job;
        },
        [`job-${id}`],
        { tags: [`job-${id}`, 'jobs'], revalidate: 300 }
    );

    return fetchJob();
}

export async function createJob(jobData: CreateJobData): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'careers')) {
        throw new Error('Unauthorized - Only admins can create jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: newJob, error } = await supabase
        .from('jobs')
        .insert({
            ...jobData,
            created_by: user.id,
            is_active: true,
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
        resourceType: 'job',
        resourceId: newJob.id,
        resourceTitle: `Job: ${newJob.title}`,
        changes: {
            title: newJob.title,
            department: newJob.department,
            location: newJob.location,
            employment_type: newJob.employment_type,
        },
    });

    revalidatePath('/careers');
    revalidateTag('jobs', 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return newJob;
}

export async function updateJob(id: string, updates: UpdateJobData): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized - Only admins can update jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get existing job for logging changes
    const { data: existingJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

    if (!existingJob) {
        throw new Error('Job not found');
    }

    const { data: updatedJob, error } = await supabase
        .from('jobs')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // Track changes for activity log
    const changes: any = {};
    const fieldsToTrack = ['title', 'department', 'location', 'employment_type', 'is_active', 'description'];

    fieldsToTrack.forEach(field => {
        if (updates[field as keyof UpdateJobData] !== undefined &&
            updates[field as keyof UpdateJobData] !== existingJob[field]) {
            changes[field] = {
                before: existingJob[field],
                after: updates[field as keyof UpdateJobData]
            };
        }
    });

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'job',
        resourceId: id,
        resourceTitle: `Job: ${updatedJob.title}`,
        changes,
    });

    revalidatePath('/careers');
    revalidateTag('jobs', 'default');
    revalidateTag(`job-${id}`, 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return updatedJob;
}

export async function toggleJobStatus(id: string): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: job } = await supabase
        .from('jobs')
        .select('is_active')
        .eq('id', id)
        .single();

    if (!job) {
        throw new Error('Job not found');
    }

    return updateJob(id, { is_active: !job.is_active });
}

export async function deleteJob(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'delete', 'careers')) {
        throw new Error('Unauthorized - Only admins can delete jobs');
    }

    // Soft delete by setting is_active to false
    await updateJob(id, { is_active: false });
}

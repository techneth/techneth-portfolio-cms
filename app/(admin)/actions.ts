'use server';

import { createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardStats {
    publishedBlogs: number;
    draftBlogs: number;
    publishedCaseStudies: number;
    unreadContacts: number;
    activeJobs: number;
    totalJobs: number;
    pendingUsers: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get stats from the dashboard_stats view
    const { data: stats } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single();

    // Get pending users count directly
    const { count: pendingUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    if (!stats) {
        return {
            publishedBlogs: 0,
            draftBlogs: 0,
            publishedCaseStudies: 0,
            unreadContacts: 0,
            activeJobs: 0,
            totalJobs: 0,
            pendingUsers: 0,
        };
    }

    return {
        publishedBlogs: stats.published_blogs || 0,
        draftBlogs: stats.draft_blogs || 0,
        publishedCaseStudies: stats.published_case_studies || 0,
        unreadContacts: stats.unread_contacts || 0,
        activeJobs: stats.active_jobs || 0,
        totalJobs: stats.total_jobs || 0,
        pendingUsers: pendingUsers || 0,
    };
}

export async function getRecentActivity(limit: number = 5) {
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    return data || [];
}

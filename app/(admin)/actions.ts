'use server';

import { createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

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

    const fetchStats = unstable_cache(
        async () => {
            const [{ data: stats }, { count: pendingUsers }] = await Promise.all([
                supabase.from('dashboard_stats').select('*').single(),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            ]);

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
        },
        ['dashboard-stats'],
        { tags: ['dashboard-stats'], revalidate: 300 }
    );

    return fetchStats();
}

export async function getRecentActivity(limit: number = 5) {
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchActivity = unstable_cache(
        async () => {
            const { data } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            return data || [];
        },
        [`activity-logs-${limit}`],
        { tags: ['activity-logs'], revalidate: 60 }
    );

    return fetchActivity();
}

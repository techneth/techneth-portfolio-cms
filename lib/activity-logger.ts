import { createServerClient } from './supabase/server';
import { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

interface ActivityLogData {
    userId: string;
    userName: string;
    userRole: string;
    actionType: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'read';
    resourceType: 'blog' | 'case_study' | 'contact' | 'user' | 'settings' | 'other';
    resourceId?: string;
    resourceTitle?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log user activity to activity_logs table
 */
export async function logActivity(data: ActivityLogData): Promise<void> {
    try {
        const supabase = (await createServerClient()) as SupabaseClient<any>;

        const { error } = await supabase
            .from('activity_logs')
            .insert({
                user_id: data.userId,
                user_name: data.userName,
                user_role: data.userRole,
                action_type: data.actionType,
                resource_type: data.resourceType,
                resource_id: data.resourceId,
                resource_title: data.resourceTitle,
                changes: data.changes,
                ip_address: data.ipAddress,
                user_agent: data.userAgent,
            });

        if (error) {
            console.error('Failed to log activity:', error);
            // Don't throw - logging failures shouldn't break the main operation
        }
    } catch (error) {
        console.error('Activity logging error:', error);
        // Silently fail to prevent disrupting user operations
    }
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(filters?: {
    userId?: string;
    actionType?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
    }

    if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
        throw error;
    }

    return { data: data || [], count: count || 0 };
}

/**
 * Create a changes object for update actions
 */
export function createChangesObject(
    before: Record<string, any>,
    after: Record<string, any>
): Record<string, { before: any; after: any }> {
    const changes: Record<string, { before: any; after: any }> = {};

    // Find changed fields
    for (const key in after) {
        if (before[key] !== after[key]) {
            changes[key] = {
                before: before[key],
                after: after[key],
            };
        }
    }

    return changes;
}

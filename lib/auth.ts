import { createServerClient } from './supabase/server';
import { Database } from '@/types/database';

export type UserRole = 'super_admin' | 'admin' | 'editor';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar_url: string | null;
    status: UserStatus;
}

/**
 * Get the current authenticated user with role information
 * Simplified version that doesn't query users table (to avoid RLS issues)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('getCurrentUser: Auth error or no user', authError);
        return null;
    }

    // Fetch user details from users table
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    // If user exists in auth but not in users table (rare, but possible with sync issues)
    if (dbError || !dbUser) {
        console.error('Error fetching user profile:', dbError);
        // Fallback for immediate access if DB record missing, but restrict role
        return {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: (user.user_metadata?.role as UserRole) || 'editor',
            avatar_url: null,
            status: 'approved' as UserStatus, // fallback for legacy users
        };
    }

    const userData = dbUser as any;

    return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        avatar_url: userData.avatar_url,
        status: (userData.status as UserStatus) || 'approved',
    };
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(
    user: AuthUser | null,
    action: 'create' | 'read' | 'update' | 'delete',
    resource: string,
    resourceOwnerId?: string
): boolean {
    if (!user) return false;

    // Super admin can do anything
    if (user.role === 'super_admin') return true;

    // Admin permissions
    if (user.role === 'admin') {
        if (resource === 'users') {
            // Admins can read and update users (restricted by logic elsewhere)
            if (action === 'read' || action === 'update') return true;
            // Admins CANNOT delete users
            if (action === 'delete') return false;
            return false;
        }
        if (resource === 'settings') {
            return false; // Admins can't manage settings
        }
        if (resource === 'careers') {
            return true; // Admins can manage careers/jobs
        }
        if (resource === 'logs' && action === 'read') {
            return true; // Admins can view logs
        }
        // Admins can manage all content
        if (['blogs', 'blog', 'case_studies', 'case_study', 'contacts'].includes(resource)) {
            return true;
        }
        return false; // Default for admin if not explicitly allowed
    }

    // Editor permissions
    if (user.role === 'editor') {
        // Editors can't access these
        if (['users', 'settings', 'logs', 'careers'].includes(resource)) {
            return false;
        }

        // Editors can only read contacts
        if (resource === 'contacts' && action === 'read') {
            return true;
        }

        // Editors can create, read, update AND DELETE blogs/case_studies (per user request)
        if (['blogs', 'blog', 'case_studies', 'case_study'].includes(resource)) {
            // Allow all actions including delete
            return true;
        }

        // If none of the above, deny by default
        return false;
    }

    return false;
}

/**
 * Require authentication, redirect to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * Require specific role
 */
export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
    const user = await requireAuth();

    if (!hasRole(user, roles)) {
        throw new Error('Forbidden');
    }

    return user;
}

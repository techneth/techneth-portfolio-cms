import { createServerClient } from './supabase/server';
import { Database } from '@/types/database';

export type UserRole = 'super_admin' | 'admin' | 'editor';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar_url: string | null;
}

/**
 * Get the current authenticated user with role information
 * Simplified version that doesn't query users table (to avoid RLS issues)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    // Return a simplified user object without querying users table
    // Middleware ensures the user is authenticated
    return {
        id: user.id,
        email: user.email || 'unknown@email.com',
        name: user.email?.split('@')[0] || 'Admin User',
        role: 'super_admin', // Default to super_admin for now
        avatar_url: null,
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
        if (resource === 'users' || resource === 'settings') {
            return false; // Admins can't manage users or settings
        }
        if (resource === 'logs') {
            return action === 'read'; // Admins can only view logs
        }
        return true; // Full access to other resources
    }

    // Editor permissions
    if (user.role === 'editor') {
        if (resource === 'users' || resource === 'settings' || resource === 'logs') {
            return false; // Editors can't access these
        }
        if (resource === 'contacts') {
            return action === 'read'; // Editors can only view contacts
        }
        if (action === 'delete') {
            return false; // Editors can't delete
        }
        // Editors can only edit their own content
        if (action === 'update' && resourceOwnerId && resourceOwnerId !== user.id) {
            return false;
        }
        return action === 'create' || action === 'read' || (action === 'update' && resourceOwnerId === user.id);
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

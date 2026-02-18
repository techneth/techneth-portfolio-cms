'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction, UserRole, UserStatus } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    avatar_url: string | null;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    is_active?: boolean;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    role?: UserRole;
    is_active?: boolean;
    avatar_url?: string;
}

export async function getUsers(filters?: { role?: string; is_active?: boolean; status?: string }): Promise<User[]> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'users')) {
        throw new Error('Unauthorized - Only super admins can view users');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.role) {
        query = query.eq('role', filters.role);
    }

    if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
    }

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
}

export async function createUser(userData: CreateUserData): Promise<User> {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canPerformAction(currentUser, 'create', 'users')) {
        throw new Error('Unauthorized - Only super admins can create users');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Check if email already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', userData.email)
        .single();

    if (existingUser) {
        throw new Error('Email already exists');
    }

    // Import admin client
    const { createAdminClient } = await import('@/lib/supabase/server');

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please add it to your .env.local file from Supabase Dashboard → Project Settings → API');
    }

    const adminClient = createAdminClient();

    // Create auth user with password directly
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
            name: userData.name,
            role: userData.role,
        }
    });

    if (authError || !authUser.user) {
        console.error('Auth invitation error:', authError);
        throw new Error(`Failed to invite user: ${authError?.message || 'Unknown error'}. Check that your SUPABASE_SERVICE_ROLE_KEY is valid and email settings are configured in Supabase.`);
    }

    // Create user record in users table — super admin creates are immediately approved
    const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
            id: authUser.user.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: 'approved',
            is_active: userData.is_active !== false,
        })
        .select()
        .single();

    if (userError) {
        // Rollback: delete auth user if users table insert fails
        await adminClient.auth.admin.deleteUser(authUser.user.id);
        throw new Error(userError.message);
    }

    // Log activity
    await logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        actionType: 'create',
        resourceType: 'user',
        resourceId: newUser.id,
        resourceTitle: `User: ${newUser.email}`,
        changes: {
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            is_active: newUser.is_active,
        },
    });

    revalidatePath('/admin/users');
    return newUser;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const user = await getCurrentUser();
    return user?.role || null;
}

export async function approveUser(userId: string, role: UserRole = 'editor'): Promise<User> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
        throw new Error('Unauthorized - Only super admins can approve users');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError || !existingUser) {
        throw new Error('User not found');
    }

    if (existingUser.status !== 'pending') {
        throw new Error('User is not in pending status');
    }

    // Un-ban in Supabase Auth and confirm email
    const { createAdminClient } = await import('@/lib/supabase/server');
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createAdminClient();
        await adminClient.auth.admin.updateUserById(userId, {
            ban_duration: 'none',
            email_confirm: true,
            user_metadata: {
                name: existingUser.name,
                role,
            },
        });
    }

    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
            status: 'approved',
            role,
            is_active: true,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) throw updateError;

    await logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        actionType: 'update',
        resourceType: 'user',
        resourceId: userId,
        resourceTitle: `User: ${updatedUser.email}`,
        changes: {
            status: { before: 'pending', after: 'approved' },
            role: { before: existingUser.role, after: role },
            is_active: { before: false, after: true },
        },
    });

    revalidatePath('/admin/users');
    return updatedUser;
}

export async function rejectUser(userId: string): Promise<User> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
        throw new Error('Unauthorized - Only super admins can reject users');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError || !existingUser) {
        throw new Error('User not found');
    }

    // Ban in Supabase Auth so they can't log in
    const { createAdminClient } = await import('@/lib/supabase/server');
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createAdminClient();
        await adminClient.auth.admin.updateUserById(userId, {
            ban_duration: '876000h', // ~100 years
        });
    }

    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
            status: 'rejected',
            is_active: false,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) throw updateError;

    await logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        actionType: 'update',
        resourceType: 'user',
        resourceId: userId,
        resourceTitle: `User: ${updatedUser.email}`,
        changes: {
            status: { before: existingUser.status, after: 'rejected' },
        },
    });

    revalidatePath('/admin/users');
    return updatedUser;
}

export async function updateUser(userId: string, updates: UpdateUserData): Promise<User> {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canPerformAction(currentUser, 'update', 'users')) {
        throw new Error('Unauthorized - Only super admins can update users');
    }

    // Prevent self-demotion
    if (userId === currentUser.id && updates.role && updates.role !== 'super_admin') {
        throw new Error('You cannot demote yourself from super admin');
    }

    // Prevent self-deactivation
    if (userId === currentUser.id && updates.is_active === false) {
        throw new Error('You cannot deactivate yourself');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get current user data
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError || !existingUser) {
        throw new Error('User not found');
    }

    // Enforce Admin restrictions: Can only manage Editors
    if (currentUser.role === 'admin') {
        if (existingUser.role !== 'editor') {
            throw new Error('Admins can only manage editors');
        }

        // If admin tries to change role (e.g. promote editor to admin), block it
        if (updates.role && updates.role !== 'editor') {
            throw new Error('Admins cannot change user roles');
        }
    }

    // Check if trying to demote last super admin
    if (updates.role && existingUser.role === 'super_admin' && updates.role !== 'super_admin') {
        const { data: superAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'super_admin')
            .eq('is_active', true);

        if (superAdmins && superAdmins.length <= 1) {
            throw new Error('Cannot demote the last super admin');
        }
    }

    // Check if trying to deactivate last super admin
    if (updates.is_active === false && existingUser.role === 'super_admin') {
        const { data: activeSuperAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'super_admin')
            .eq('is_active', true);

        if (activeSuperAdmins && activeSuperAdmins.length <= 1) {
            throw new Error('Cannot deactivate the last super admin');
        }
    }

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== existingUser.email) {
        const { data: emailExists } = await supabase
            .from('users')
            .select('id')
            .eq('email', updates.email)
            .single();

        if (emailExists) {
            throw new Error('Email already exists');
        }
    }

    // Sync changes with Supabase Auth
    const { createAdminClient } = await import('@/lib/supabase/server');
    // Check key availability
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY missing - Auth sync skipped');
    } else {
        const adminClient = createAdminClient();

        const authAttributes: any = {};

        if (updates.email && updates.email !== existingUser.email) {
            authAttributes.email = updates.email;
            authAttributes.email_confirm = true; // Auto-confirm email change
        }

        // Prepare metadata update if name or role changes
        if ((updates.name && updates.name !== existingUser.name) ||
            (updates.role && updates.role !== existingUser.role)) {
            authAttributes.user_metadata = {
                name: updates.name || existingUser.name,
                role: updates.role || existingUser.role,
            };
        }

        // Handle activation/ban status
        if (updates.is_active !== undefined && updates.is_active !== existingUser.is_active) {
            if (updates.is_active) {
                authAttributes.ban_duration = 'none';
            } else {
                authAttributes.ban_duration = '876000h'; // ~100 years
            }
        }

        if (Object.keys(authAttributes).length > 0) {
            const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authAttributes);

            if (authUpdateError) {
                console.error('Failed to sync auth user:', authUpdateError);
                throw new Error(`Failed to update auth user: ${authUpdateError.message}`);
            }
        }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) throw updateError;

    // Track changes for activity log
    const changes: any = {};
    if (updates.name && updates.name !== existingUser.name) {
        changes.name = { before: existingUser.name, after: updates.name };
    }
    if (updates.email && updates.email !== existingUser.email) {
        changes.email = { before: existingUser.email, after: updates.email };
    }
    if (updates.role && updates.role !== existingUser.role) {
        changes.role = { before: existingUser.role, after: updates.role };
    }
    if (updates.is_active !== undefined && updates.is_active !== existingUser.is_active) {
        changes.is_active = { before: existingUser.is_active, after: updates.is_active };
    }

    // Log activity
    await logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        actionType: 'update',
        resourceType: 'user',
        resourceId: userId,
        resourceTitle: `User: ${updatedUser.email}`,
        changes,
    });

    revalidatePath('/admin/users');
    return updatedUser;
}

export async function toggleUserStatus(userId: string): Promise<User> {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canPerformAction(currentUser, 'update', 'users')) {
        throw new Error('Unauthorized - Only super admins can toggle user status');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get current user
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (!existingUser) {
        throw new Error('User not found');
    }

    const newStatus = !existingUser.is_active;

    return updateUser(userId, { is_active: newStatus });
}

export async function deleteUser(userId: string): Promise<void> {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canPerformAction(currentUser, 'delete', 'users')) {
        throw new Error('Unauthorized - Only super admins can delete users');
    }

    // Cannot delete yourself
    if (userId === currentUser.id) {
        throw new Error('You cannot delete yourself');
    }

    // Hard delete using admin client
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
        throw new Error(error.message);
    }

    // Log activity
    await logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        actionType: 'delete',
        resourceType: 'user',
        resourceId: userId,
        resourceTitle: `User: ${userId}`,
        changes: { deleted: true },
    });

    revalidatePath('/admin/users');
}

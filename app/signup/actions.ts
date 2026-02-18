'use server';

import { createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export async function signupAction(name: string, email: string, password: string): Promise<{ error?: string; success?: boolean }> {
    if (!name || !email || !password) {
        return { error: 'Please fill in all required fields.' };
    }

    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters.' };
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Check if email already exists in users table
    const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

    if (existingUser) {
        return { error: 'An account with this email already exists.' };
    }

    // Create Supabase Auth user (email NOT confirmed yet — they can't log in until approved)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                role: 'editor',
            },
            // Don't redirect — we handle everything server-side
            emailRedirectTo: undefined,
        },
    });

    if (authError) {
        console.error('Signup auth error:', authError);
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: 'Signup failed. Please try again.' };
    }

    // Insert into users table with status: pending
    // Note: The user is now authenticated via the signUp call above,
    // so auth.uid() = authData.user.id, satisfying the RLS policy.
    const { error: insertError } = await supabase
        .from('users')
        .insert({
            id: authData.user.id,
            name,
            email,
            role: 'editor',
            status: 'pending',
            is_active: false,
        });

    if (insertError) {
        console.error('Signup insert error:', insertError);
        // Try to clean up the auth user if DB insert fails
        const { createAdminClient } = await import('@/lib/supabase/server');
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const adminClient = createAdminClient();
            await adminClient.auth.admin.deleteUser(authData.user.id);
        }
        return { error: 'Failed to create account. Please try again.' };
    }

    // Sign out immediately — they need super admin approval before accessing admin
    await supabase.auth.signOut();

    return { success: true };
}

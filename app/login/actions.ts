'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export async function loginAction(email: string, password: string) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch (error) {
                        // Cookie setting might fail in middleware, ignore
                    }
                },
            },
        }
    );

    console.log('Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Login error:', JSON.stringify(error, null, 2));
        return { error: error.message };
    }

    if (!data.user) {
        console.error('Login failed: No user data returned', JSON.stringify(data, null, 2));
        return { error: 'Login failed: Server returned no user' };
    }

    console.log('Login successful for user:', data.user.id);

    // Check user status in the users table
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('status, is_active')
        .eq('id', data.user.id)
        .single();

    if (dbError || !dbUser) {
        // User exists in auth but not in users table — treat as pending
        await supabase.auth.signOut();
        return { error: 'Your account is not yet set up. Please contact an administrator.' };
    }

    const status = dbUser.status || 'approved'; // fallback for legacy users without status

    if (status === 'pending') {
        // Don't sign them out — redirect to pending page
        redirect('/pending');
    }

    if (status === 'rejected') {
        // Sign them out and show error
        await supabase.auth.signOut();
        return { error: 'Your account request has been rejected. Please contact an administrator.' };
    }

    // status === 'approved' — stamp last_login then redirect
    await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

    redirect('/');
}

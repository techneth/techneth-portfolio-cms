import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If Supabase not configured, redirect admin routes to setup page
    if (!supabaseUrl || !supabaseKey ||
        supabaseUrl.includes('your-') || supabaseKey.includes('your-')) {
        if (request.nextUrl.pathname.startsWith('/admin') ||
            request.nextUrl.pathname === '/login') {
            return NextResponse.redirect(new URL('/setup', request.url));
        }
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    console.log('🔵 Middleware - Request path:', path);
    console.log('🔵 Middleware - User from getUser():', user?.id || 'null');

    // Public routes — always accessible
    if (path === '/signup') {
        // If already authenticated and approved, redirect to admin
        if (user) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        return response;
    }

    // Check if user is trying to access admin routes
    if (path.startsWith('/admin')) {
        if (!user) {
            console.log('🔴 Middleware: No user, redirecting to /login');
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Check user status in DB to gate pending/rejected users
        const { data: dbUser } = await supabase
            .from('users')
            .select('status')
            .eq('id', user.id)
            .single();

        const status = dbUser?.status || 'approved';

        if (status === 'pending') {
            console.log('🟡 Middleware: User is pending, redirecting to /pending');
            return NextResponse.redirect(new URL('/pending', request.url));
        }

        if (status === 'rejected') {
            console.log('🔴 Middleware: User is rejected, redirecting to /login');
            return NextResponse.redirect(new URL('/login', request.url));
        }

        console.log('✅ Middleware: User authenticated and approved, allowing access to:', path);
    }

    // Handle /pending page
    if (path === '/pending') {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        // If user is approved, redirect to admin
        const { data: dbUser } = await supabase
            .from('users')
            .select('status')
            .eq('id', user.id)
            .single();

        const status = dbUser?.status || 'approved';
        if (status === 'approved') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    // If user is authenticated and trying to access login page, redirect to admin
    if (path === '/login' && user) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/login', '/signup', '/pending'],
};

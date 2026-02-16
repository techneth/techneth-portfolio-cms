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

    console.log('🔵 Middleware - Request path:', request.nextUrl.pathname);
    console.log('🔵 Middleware - User from getUser():', user?.id || 'null');

    // Check if user is trying to access admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // If not authenticated, redirect to login
        if (!user) {
            console.log('🔴 Middleware: No user, redirecting to /login');
            return NextResponse.redirect(new URL('/login', request.url));
        }

        console.log('✅ Middleware: User authenticated, allowing access to:', request.nextUrl.pathname);
        // User is authenticated, allow access
        // Note: Role-based checks can be done in the actual page components
    }

    // If user is authenticated and trying to access login page, redirect to admin
    if (request.nextUrl.pathname === '/login' && user) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/login'],
};

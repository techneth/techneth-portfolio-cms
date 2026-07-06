import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildCorsHeaders, isOriginAllowed } from '@/lib/cors';

export async function middleware(request: NextRequest) {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const path = request.nextUrl.pathname;

    // ---- API routes: enforce Origin allow-list + CORS ----
    if (path.startsWith('/api')) {
        const corsHeaders = buildCorsHeaders(request);

        // Block cross-origin requests from sites that are not allow-listed.
        if (!isOriginAllowed(request)) {
            return NextResponse.json(
                { error: 'Origin not allowed' },
                { status: 403, headers: corsHeaders }
            );
        }

        // Answer CORS preflight without touching the route handler.
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: corsHeaders });
        }

        // Allowed request: continue to the route, attaching CORS headers.
        const apiResponse = NextResponse.next({
            request: { headers: request.headers },
        });
        corsHeaders.forEach((value, key) => apiResponse.headers.set(key, value));
        return apiResponse;
    }


    // If Supabase not configured, redirect all routes to setup page except setup itself
    if (!supabaseUrl || !supabaseKey ||
        supabaseUrl.includes('your-') || supabaseKey.includes('your-')) {
        if (path !== '/setup') {
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

    console.log('🔵 Middleware - Request path:', path);
    console.log('🔵 Middleware - User from getUser():', user?.id || 'null');

    // Public routes handling
    if (path === '/signup') {
        if (user) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return response;
    }

    if (path === '/login') {
        if (user) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return response;
    }

    if (path === '/pending') {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        const { data: dbUser } = await supabase
            .from('users')
            .select('status')
            .eq('id', user.id)
            .single();

        const status = dbUser?.status || 'approved';
        if (status === 'approved') {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return response;
    }

    if (path === '/setup') {
        return response;
    }

    // Protected Routes (Everything else)
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
    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

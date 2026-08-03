import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const subscribeSchema = z.object({
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    name: z.string().trim().max(120).optional(),
    source: z.string().trim().max(60).optional(),
});

/**
 * Public endpoint the frontend newsletter form posts to.
 * CORS/origin allow-listing is enforced by the middleware for all /api routes.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = subscribeSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Invalid request' },
                { status: 400 }
            );
        }

        const { email, name, source } = parsed.data;
        const supabase: any = createAdminClient();

        const ip_address =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const user_agent = request.headers.get('user-agent') || null;

        const { data: existing } = await supabase
            .from('newsletter_subscribers')
            .select('id, status')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'active') {
                // Idempotent: already subscribed is a success from the user's view.
                return NextResponse.json(
                    { success: true, message: 'You are already subscribed.' },
                    { status: 200 }
                );
            }

            // Re-activate a previously unsubscribed address.
            const { error } = await supabase
                .from('newsletter_subscribers')
                .update({
                    status: 'active',
                    name: name || undefined,
                    source: source || 'website',
                    subscribed_at: new Date().toISOString(),
                    unsubscribed_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

            if (error) throw error;

            revalidateTag('newsletter-subscribers', 'default');
            return NextResponse.json(
                { success: true, message: 'Welcome back! You are subscribed again.' },
                { status: 200 }
            );
        }

        const { error } = await supabase.from('newsletter_subscribers').insert([
            {
                email,
                name: name || null,
                source: source || 'website',
                ip_address,
                user_agent,
            },
        ]);

        if (error) throw error;

        revalidateTag('newsletter-subscribers', 'default');
        return NextResponse.json(
            { success: true, message: 'Thanks for subscribing to the Techneth newsletter!' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe. Please try again later.' },
            { status: 500 }
        );
    }
}

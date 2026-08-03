import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getNewsletterLogoUrl } from '@/lib/newsletter/template';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribeByToken(token: string): Promise<'ok' | 'not_found'> {
    const supabase: any = createAdminClient();

    const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('id, status')
        .eq('unsubscribe_token', token)
        .maybeSingle();

    if (!subscriber) return 'not_found';

    if (subscriber.status !== 'unsubscribed') {
        await supabase
            .from('newsletter_subscribers')
            .update({
                status: 'unsubscribed',
                unsubscribed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', subscriber.id);

        revalidateTag('newsletter-subscribers', 'default');
    }

    return 'ok';
}

function resultPage(title: string, message: string): NextResponse {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — Techneth</title>
<style>
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(15,36,91,0.1); padding: 48px 40px; max-width: 440px; text-align: center; margin: 16px; }
  .logo { margin-bottom: 24px; }
  .logo img { width: 180px; max-width: 80%; height: auto; }
  h1 { font-size: 20px; color: #0F245B; margin: 0 0 12px; }
  p { color: #6B7280; line-height: 1.6; margin: 0 0 24px; }
  a.btn { display: inline-block; background: #009487; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo"><img src="${getNewsletterLogoUrl()}" alt="Techneth" /></div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="https://techneth.com">Back to techneth.com</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

/** Unsubscribe link clicked from the email footer. */
export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get('token') || '';

    if (!UUID_RE.test(token)) {
        return resultPage(
            'Invalid unsubscribe link',
            'This unsubscribe link is invalid or incomplete. Please use the link from the bottom of a newsletter email.'
        );
    }

    try {
        const result = await unsubscribeByToken(token);
        if (result === 'not_found') {
            return resultPage(
                'Link not recognized',
                'We could not find a subscription for this link. You may have already been removed from the list.'
            );
        }
        return resultPage(
            'You have been unsubscribed',
            'You will no longer receive the Techneth newsletter. We are sorry to see you go — you can re-subscribe on our website at any time.'
        );
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        return resultPage(
            'Something went wrong',
            'We could not process your request right now. Please try again in a few minutes.'
        );
    }
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post header target). */
export async function POST(request: Request) {
    const token = new URL(request.url).searchParams.get('token') || '';

    if (!UUID_RE.test(token)) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    try {
        await unsubscribeByToken(token);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Newsletter one-click unsubscribe error:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}

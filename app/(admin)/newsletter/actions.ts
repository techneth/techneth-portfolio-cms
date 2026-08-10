'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { sanitizeHtmlServer } from '@/lib/sanitize/server';
import { renderNewsletterHtml, htmlToPlainText } from '@/lib/newsletter/template';
import {
    getResendClient,
    getNewsletterConfig,
    formatFromAddress,
    buildUnsubscribeUrl,
    RESEND_BATCH_SIZE,
    BATCH_DELAY_MS,
    sleep,
    NewsletterConfig,
    DEFAULT_NEWSLETTER_CONFIG,
} from '@/lib/newsletter/resend';
import { revalidatePath, updateTag } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface Subscriber {
    id: string;
    email: string;
    name: string | null;
    status: 'active' | 'unsubscribed';
    source: string | null;
    subscribed_at: string;
    unsubscribed_at: string | null;
    created_at: string;
}

export interface Campaign {
    id: string;
    subject: string;
    preheader: string | null;
    content_html: string;
    status: 'draft' | 'sending' | 'sent' | 'failed';
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    error_message: string | null;
    sent_at: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
}

async function requireNewsletterAccess(
    action: 'create' | 'read' | 'update' | 'delete'
) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, action, 'newsletter')) {
        throw new Error('Unauthorized');
    }
    return user;
}

// ============================================================
// Subscribers
// ============================================================

export async function getSubscribers(filters?: { status?: string }): Promise<Subscriber[]> {
    await requireNewsletterAccess('read');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Not cached: cookie-backed Supabase client can't run inside unstable_cache
    // in Next 16 (throws on cache miss after a save). Admin reads stay fresh.
    let query = supabase
        .from('newsletter_subscribers')
        .select('id, email, name, status, source, subscribed_at, unsubscribed_at, created_at')
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Subscriber[];
}

const addSubscriberSchema = z.object({
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    name: z.string().trim().max(120).optional(),
});

export async function addSubscriber(email: string, name?: string) {
    const user = await requireNewsletterAccess('create');

    const parsed = addSubscriberSchema.safeParse({ email, name });
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid email');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('id, status')
        .eq('email', parsed.data.email)
        .maybeSingle();

    if (existing) {
        if (existing.status === 'active') {
            throw new Error('This email is already subscribed');
        }
        const { error } = await supabase
            .from('newsletter_subscribers')
            .update({
                status: 'active',
                name: parsed.data.name || null,
                source: 'admin',
                subscribed_at: new Date().toISOString(),
                unsubscribed_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('newsletter_subscribers').insert([
            { email: parsed.data.email, name: parsed.data.name || null, source: 'admin' },
        ]);
        if (error) throw error;
    }

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'create',
        resourceType: 'newsletter',
        resourceTitle: `Added subscriber ${parsed.data.email}`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-subscribers');
    return { success: true };
}

export async function setSubscriberStatus(id: string, status: 'active' | 'unsubscribed') {
    const user = await requireNewsletterAccess('update');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('email, status')
        .eq('id', id)
        .single();

    if (!subscriber) throw new Error('Subscriber not found');

    const { error } = await supabase
        .from('newsletter_subscribers')
        .update({
            status,
            unsubscribed_at: status === 'unsubscribed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Set ${subscriber.email} to ${status}`,
        changes: { status: { before: subscriber.status, after: status } },
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-subscribers');
    return { success: true };
}

export async function deleteSubscriber(id: string) {
    const user = await requireNewsletterAccess('delete');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('id', id)
        .single();

    if (!subscriber) throw new Error('Subscriber not found');

    const adminClient = createAdminClient() as SupabaseClient<any>;
    const { error } = await adminClient
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Deleted subscriber ${subscriber.email}`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-subscribers');
    return { success: true };
}

/** Returns all subscribers as a CSV string for download in the browser. */
export async function exportSubscribersCsv(): Promise<string> {
    await requireNewsletterAccess('read');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('email, name, status, source, subscribed_at, unsubscribed_at')
        .order('created_at', { ascending: false });

    if (error) throw error;

    const escapeCsv = (value: string | null) => {
        const v = value ?? '';
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    };

    const header = 'email,name,status,source,subscribed_at,unsubscribed_at';
    const rows = (data || []).map((s: any) =>
        [s.email, s.name, s.status, s.source, s.subscribed_at, s.unsubscribed_at]
            .map(escapeCsv)
            .join(',')
    );

    return [header, ...rows].join('\n');
}

// ============================================================
// Campaigns
// ============================================================

export async function getCampaigns(): Promise<Campaign[]> {
    await requireNewsletterAccess('read');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Not cached: see getSubscribers.
    const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign> {
    await requireNewsletterAccess('read');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Campaign;
}

const campaignSchema = z.object({
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    preheader: z.string().trim().max(200).optional(),
    contentHtml: z.string().min(1, 'Email content is required'),
});

export async function createCampaign(input: {
    subject: string;
    preheader?: string;
    contentHtml: string;
}): Promise<Campaign> {
    const user = await requireNewsletterAccess('create');

    const parsed = campaignSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid campaign');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;
    const cleanHtml = await sanitizeHtmlServer(parsed.data.contentHtml);

    const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert([
            {
                subject: parsed.data.subject,
                preheader: parsed.data.preheader || null,
                content_html: cleanHtml,
                created_by: user.id,
                created_by_name: user.name,
            },
        ])
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'create',
        resourceType: 'newsletter',
        resourceId: data.id,
        resourceTitle: `Created campaign "${parsed.data.subject}"`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-campaigns');
    return data as Campaign;
}

export async function updateCampaign(
    id: string,
    input: { subject: string; preheader?: string; contentHtml: string }
): Promise<Campaign> {
    const user = await requireNewsletterAccess('update');

    const parsed = campaignSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid campaign');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: campaign } = await supabase
        .from('newsletter_campaigns')
        .select('status, subject')
        .eq('id', id)
        .single();

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'sending') throw new Error('Campaign is currently sending');
    if (campaign.status === 'sent') throw new Error('Sent campaigns cannot be edited — duplicate it instead');

    const cleanHtml = await sanitizeHtmlServer(parsed.data.contentHtml);

    const { data, error } = await supabase
        .from('newsletter_campaigns')
        .update({
            subject: parsed.data.subject,
            preheader: parsed.data.preheader || null,
            content_html: cleanHtml,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Updated campaign "${parsed.data.subject}"`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-campaigns');
    return data as Campaign;
}

export async function deleteCampaign(id: string) {
    const user = await requireNewsletterAccess('delete');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: campaign } = await supabase
        .from('newsletter_campaigns')
        .select('subject, status')
        .eq('id', id)
        .single();

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'sending') throw new Error('Cannot delete a campaign while it is sending');

    const adminClient = createAdminClient() as SupabaseClient<any>;
    const { error } = await adminClient
        .from('newsletter_campaigns')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Deleted campaign "${campaign.subject}"`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-campaigns');
    return { success: true };
}

export async function duplicateCampaign(id: string): Promise<Campaign> {
    const user = await requireNewsletterAccess('create');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: source, error: fetchError } = await supabase
        .from('newsletter_campaigns')
        .select('subject, preheader, content_html')
        .eq('id', id)
        .single();

    if (fetchError || !source) throw new Error('Campaign not found');

    const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert([
            {
                subject: `Copy of ${source.subject}`,
                preheader: source.preheader,
                content_html: source.content_html,
                created_by: user.id,
                created_by_name: user.name,
            },
        ])
        .select()
        .single();

    if (error) throw error;

    revalidatePath('/newsletter');
    updateTag('newsletter-campaigns');
    return data as Campaign;
}

// ============================================================
// Sending
// ============================================================

/** Send a single test email of the campaign to the given address. */
export async function sendTestEmail(id: string, toEmail: string) {
    const user = await requireNewsletterAccess('update');

    const parsedEmail = z.string().trim().toLowerCase().email().safeParse(toEmail);
    if (!parsedEmail.success) throw new Error('Please provide a valid email address');

    const supabase = (await createServerClient()) as SupabaseClient<any>;
    const { data: campaign } = await supabase
        .from('newsletter_campaigns')
        .select('subject, preheader, content_html')
        .eq('id', id)
        .single();

    if (!campaign) throw new Error('Campaign not found');

    const resend = getResendClient();
    const config = await getNewsletterConfig();

    const html = renderNewsletterHtml({
        subject: `[TEST] ${campaign.subject}`,
        preheader: campaign.preheader || undefined,
        contentHtml: campaign.content_html,
        unsubscribeUrl: 'https://techneth.com',
        recipientEmail: parsedEmail.data,
    });

    const { error } = await resend.emails.send({
        from: formatFromAddress(config),
        to: [parsedEmail.data],
        replyTo: config.replyTo,
        subject: `[TEST] ${campaign.subject}`,
        html,
        text: htmlToPlainText(campaign.content_html),
    });

    if (error) throw new Error(`Resend error: ${error.message}`);

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Sent test email of "${campaign.subject}" to ${parsedEmail.data}`,
    });

    return { success: true };
}

/**
 * Send the campaign to every active subscriber via Resend's batch API.
 * Emails are personalized with a per-subscriber unsubscribe link and
 * RFC 8058 one-click unsubscribe headers. Progress is written back to the
 * campaign row after every batch so the admin UI can poll it.
 */
export async function sendCampaign(id: string) {
    const user = await requireNewsletterAccess('update');

    const adminClient = createAdminClient() as SupabaseClient<any>;

    const { data: campaign } = await adminClient
        .from('newsletter_campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'sending') throw new Error('This campaign is already sending');
    if (campaign.status === 'sent') throw new Error('This campaign has already been sent');
    if (!campaign.content_html?.trim()) throw new Error('Campaign content is empty');

    // Validate configuration before flipping any state.
    const resend = getResendClient();
    const config = await getNewsletterConfig();
    const from = formatFromAddress(config);
    const text = htmlToPlainText(campaign.content_html);

    // Fetch ALL active subscribers (Supabase caps selects at 1000 rows,
    // so page through).
    const PAGE = 1000;
    const subscribers: { id: string; email: string; unsubscribe_token: string }[] = [];
    for (let fromRow = 0; ; fromRow += PAGE) {
        const { data, error } = await adminClient
            .from('newsletter_subscribers')
            .select('id, email, unsubscribe_token')
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .range(fromRow, fromRow + PAGE - 1);

        if (error) throw error;
        subscribers.push(...(data || []));
        if (!data || data.length < PAGE) break;
    }

    if (subscribers.length === 0) {
        throw new Error('There are no active subscribers to send to');
    }

    await adminClient
        .from('newsletter_campaigns')
        .update({
            status: 'sending',
            recipient_count: subscribers.length,
            sent_count: 0,
            failed_count: 0,
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;

    for (let i = 0; i < subscribers.length; i += RESEND_BATCH_SIZE) {
        const chunk = subscribers.slice(i, i + RESEND_BATCH_SIZE);

        const batch = chunk.map((subscriber) => {
            const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsubscribe_token);
            return {
                from,
                to: [subscriber.email],
                replyTo: config.replyTo,
                subject: campaign.subject,
                html: renderNewsletterHtml({
                    subject: campaign.subject,
                    preheader: campaign.preheader || undefined,
                    contentHtml: campaign.content_html,
                    unsubscribeUrl,
                    recipientEmail: subscriber.email,
                }),
                text: `${text}\n\nUnsubscribe: ${unsubscribeUrl}`,
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            };
        });

        try {
            const { error } = await resend.batch.send(batch, {
                idempotencyKey: `newsletter/${id}/${i}`,
            });

            if (error) {
                failedCount += chunk.length;
                lastError = error.message;
                console.error(`Newsletter batch ${i / RESEND_BATCH_SIZE + 1} failed:`, error);
            } else {
                sentCount += chunk.length;
            }
        } catch (err: any) {
            failedCount += chunk.length;
            lastError = err?.message || 'Unknown send error';
            console.error(`Newsletter batch ${i / RESEND_BATCH_SIZE + 1} threw:`, err);
        }

        // Persist progress so the UI can show it while sending.
        await adminClient
            .from('newsletter_campaigns')
            .update({
                sent_count: sentCount,
                failed_count: failedCount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (i + RESEND_BATCH_SIZE < subscribers.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    const finalStatus = sentCount > 0 ? 'sent' : 'failed';

    await adminClient
        .from('newsletter_campaigns')
        .update({
            status: finalStatus,
            sent_count: sentCount,
            failed_count: failedCount,
            error_message: lastError,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'newsletter',
        resourceId: id,
        resourceTitle: `Sent campaign "${campaign.subject}" to ${sentCount} subscriber${sentCount === 1 ? '' : 's'}${failedCount ? ` (${failedCount} failed)` : ''}`,
    });

    revalidatePath('/newsletter');
    updateTag('newsletter-campaigns');
    updateTag('activity-logs');

    if (finalStatus === 'failed') {
        throw new Error(lastError || 'All batches failed to send');
    }

    return { success: true, sent: sentCount, failed: failedCount };
}

// ============================================================
// Sender settings
// ============================================================

export async function getNewsletterSettings(): Promise<NewsletterConfig & { apiKeyConfigured: boolean }> {
    await requireNewsletterAccess('read');
    const config = await getNewsletterConfig();
    return { ...config, apiKeyConfigured: Boolean(process.env.RESEND_API_KEY) };
}

const settingsSchema = z.object({
    fromName: z.string().trim().min(1).max(80),
    fromEmail: z.string().trim().toLowerCase().email(),
    replyTo: z.string().trim().toLowerCase().email(),
});

export async function updateNewsletterSettings(input: NewsletterConfig) {
    const user = await requireNewsletterAccess('update');

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid settings');
    }

    const adminClient = createAdminClient() as SupabaseClient<any>;
    const { error } = await adminClient
        .from('settings')
        .upsert({
            key: 'newsletter_config',
            value: { ...DEFAULT_NEWSLETTER_CONFIG, ...parsed.data },
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        });

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'newsletter',
        resourceTitle: 'Updated newsletter sender settings',
    });

    revalidatePath('/newsletter');
    return { success: true };
}

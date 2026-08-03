import 'server-only';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

/** Resend batch endpoint accepts at most 100 emails per call. */
export const RESEND_BATCH_SIZE = 100;

/** Pause between batch calls to stay under Resend's rate limit (5 req/s). */
export const BATCH_DELAY_MS = 600;

export interface NewsletterConfig {
    fromName: string;
    fromEmail: string;
    replyTo: string;
}

export const DEFAULT_NEWSLETTER_CONFIG: NewsletterConfig = {
    fromName: 'Techneth',
    fromEmail: 'newsletter@techneth.com',
    replyTo: 'info@techneth.com',
};

export function getResendClient(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error(
            'RESEND_API_KEY is not configured. Add it to .env.local to enable newsletter sending.'
        );
    }
    return new Resend(apiKey);
}

/**
 * Sender configuration, stored in the settings table under `newsletter_config`
 * so it can be changed from the admin panel without a deploy. Falls back to
 * sensible defaults when unset.
 */
export async function getNewsletterConfig(): Promise<NewsletterConfig> {
    const supabase = createAdminClient() as SupabaseClient<any>;
    const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'newsletter_config')
        .single();

    return { ...DEFAULT_NEWSLETTER_CONFIG, ...(data?.value || {}) };
}

export function formatFromAddress(config: NewsletterConfig): string {
    return `${config.fromName} <${config.fromEmail}>`;
}

/**
 * Base URL used to build unsubscribe links embedded in outgoing emails.
 * Prefers the explicit env var; falls back to the production backend.
 */
export function getNewsletterBaseUrl(): string {
    return (
        process.env.NEWSLETTER_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'https://admin.techneth.com'
    );
}

export function buildUnsubscribeUrl(token: string): string {
    return `${getNewsletterBaseUrl()}/api/newsletter/unsubscribe?token=${token}`;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

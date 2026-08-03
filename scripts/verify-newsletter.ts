/**
 * One-off newsletter verification script.
 *
 * 1. Uploads public/techneth.png to the public `blogs` storage bucket
 *    (branding/techneth-logo.png) so emails can reference it.
 * 2. Adds/re-activates a subscriber.
 * 3. Sends a real branded newsletter email through Resend to that address.
 *
 * Run: npx tsx scripts/verify-newsletter.ts [email]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { renderNewsletterHtml, htmlToPlainText } from '../lib/newsletter/template';

const ROOT = resolve(__dirname, '..');

// Load .env.local into process.env (no dotenv dependency in this repo)
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}

const TARGET_EMAIL = process.argv[2] || 'fahad@techneth.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const LOGO_PATH = 'branding/techneth-logo.png';
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/blogs/${LOGO_PATH}`;

async function main() {
    const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // ---- 1. Host the logo on the public bucket ----
    const logoFile = readFileSync(resolve(ROOT, 'public/techneth.png'));
    const { error: uploadError } = await supabase.storage
        .from('blogs')
        .upload(LOGO_PATH, logoFile, { contentType: 'image/png', upsert: true });
    if (uploadError) {
        console.error('❌ Logo upload failed:', uploadError.message);
    } else {
        const check = await fetch(LOGO_URL);
        console.log(check.ok ? `✅ Logo hosted: ${LOGO_URL}` : `❌ Logo URL not readable (${check.status})`);
    }

    // ---- 2. Add subscriber ----
    let unsubscribeToken: string | null = null;
    const { data: existing, error: lookupError } = await supabase
        .from('newsletter_subscribers')
        .select('id, status, unsubscribe_token')
        .eq('email', TARGET_EMAIL)
        .maybeSingle();

    if (lookupError) {
        console.error(`❌ Subscriber table error: ${lookupError.message}`);
        console.error('   → Has database_migrations/create_newsletter_tables.sql been run in Supabase?');
    } else if (existing) {
        if (existing.status !== 'active') {
            await supabase
                .from('newsletter_subscribers')
                .update({ status: 'active', unsubscribed_at: null, subscribed_at: new Date().toISOString() })
                .eq('id', existing.id);
        }
        unsubscribeToken = existing.unsubscribe_token;
        console.log(`✅ Subscriber ${TARGET_EMAIL} already exists (now active)`);
    } else {
        const { data: created, error: insertError } = await supabase
            .from('newsletter_subscribers')
            .insert([{ email: TARGET_EMAIL, name: 'Fahad', source: 'admin' }])
            .select('unsubscribe_token')
            .single();
        if (insertError) {
            console.error('❌ Failed to add subscriber:', insertError.message);
        } else {
            unsubscribeToken = created.unsubscribe_token;
            console.log(`✅ Subscriber added: ${TARGET_EMAIL}`);
        }
    }

    // ---- 3. Send verification email ----
    const unsubscribeUrl = unsubscribeToken
        ? `${process.env.NEWSLETTER_BASE_URL || 'https://admin.techneth.com'}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
        : 'https://techneth.com';

    const contentHtml = `
      <h2>Newsletter system is live 🎉</h2>
      <p>Hi Fahad,</p>
      <p>This is a verification email from the new <strong>Techneth newsletter system</strong>, sent through Resend from the admin backend.</p>
      <p>It confirms:</p>
      <ul>
        <li>The Resend API key works and emails are delivered</li>
        <li>The branded template renders with the official logo</li>
        <li>Per-subscriber unsubscribe links are generated</li>
      </ul>
      <p style="text-align:center;"><a class="tn-btn" href="https://techneth.com">Visit techneth.com</a></p>
    `;

    const html = renderNewsletterHtml({
        subject: 'Techneth Newsletter — verification email',
        preheader: 'Your newsletter system is up and running.',
        contentHtml,
        unsubscribeUrl,
        recipientEmail: TARGET_EMAIL,
        logoUrl: LOGO_URL,
    });

    const senders = ['Techneth <newsletter@techneth.com>', 'Techneth <onboarding@resend.dev>'];
    for (const from of senders) {
        const { data, error } = await resend.emails.send({
            from,
            to: [TARGET_EMAIL],
            subject: 'Techneth Newsletter — verification email',
            html,
            text: htmlToPlainText(contentHtml) + `\n\nUnsubscribe: ${unsubscribeUrl}`,
            headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        });
        if (!error) {
            console.log(`✅ Email sent to ${TARGET_EMAIL} from "${from}" (id: ${data?.id})`);
            return;
        }
        console.error(`❌ Send from "${from}" failed: ${error.message}`);
    }
    process.exitCode = 1;
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exitCode = 1;
});

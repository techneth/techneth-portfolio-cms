'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath, updateTag, unstable_cache } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import path from 'path';

export async function getContacts(filters?: { status?: string }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const cacheKey = ['contacts-list', filters?.status ?? 'all'];

    const fetchContacts = unstable_cache(
        async () => {
            let query = supabase
                .from('contact_submissions')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        cacheKey,
        { tags: ['contacts'], revalidate: 60 }
    );

    return fetchContacts();
}

export async function getContact(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchContact = unstable_cache(
        async () => {
            const { data, error } = await supabase
                .from('contact_submissions')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        },
        [`contact-${id}`],
        { tags: [`contact-${id}`, 'contacts'], revalidate: 120 }
    );

    return fetchContact();
}

export async function updateContactStatus(
    id: string,
    status: 'unread' | 'read' | 'replied' | 'archived'
) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'contact')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: contact } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (!contact) throw new Error('Contact not found');

    const updateData: any = { status };

    if (status === 'replied') {
        // Additional logic for generating automated notes or other stuff if needed
    }

    const { data, error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'contact',
        resourceId: id,
        resourceTitle: contact.subject || `Message from ${contact.name}`,
        changes: { status: { before: contact.status, after: status } },
    });

    revalidatePath('/contacts');
    updateTag('contacts');
    updateTag(`contact-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

export async function addInternalNote(id: string, note: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'contact')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: contact } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (!contact) throw new Error('Contact not found');

    const existingNotes = contact.internal_notes || '';
    const newNote = `[${new Date().toISOString()}] ${user.name}: ${note}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;

    const { data, error } = await supabase
        .from('contact_submissions')
        .update({ internal_notes: updatedNotes })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'contact',
        resourceId: id,
        resourceTitle: `Added note to ${contact.name}'s message`,
    });

    revalidatePath('/contacts');
    updateTag('contacts');
    updateTag(`contact-${id}`);
    return data;
}

export async function replyToContact(id: string, subject: string, message: string) {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'contact')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: contact } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (!contact) throw new Error('Contact not found');

    // Fetch SMTP configuration from the database
    const { data: smtpData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'smtp_config')
        .single();

    let smtpConfig = smtpData?.value;

    // Fallback to hardcoded defaults if not configured
    if (!smtpConfig) {
        smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'dev.techneth@gmail.com',
                pass: 'vunm bmbt msju xkqd',
            },
            fromEmail: '"No Reply Techneth" <dev.techneth@gmail.com>'
        };
    }

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
    });

    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #fffbfbff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #000307ff; padding: 20px; text-align: center;">
            <img src="cid:technethlogo" alt="Techneth Logo" style="max-height: 40px;" />
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Hi ${contact.name},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                ${message.replace(/\n/g, '<br>')}
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #555; margin-top: 30px;">
                Best regards,<br/>
                <strong>${user.name}</strong><br/>
                The Techneth Team
            </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} Techneth. All rights reserved.<br/>
            <a href="https://techneth.com" style="color: #0056b3; text-decoration: none;">www.techneth.com</a>
        </div>
    </div>
    `;

    const mailOptions = {
        from: smtpConfig.fromEmail || '"No Reply Techneth" <dev.techneth@gmail.com>',
        to: contact.email,
        cc: 'rahat@techneth.com',
        bcc: 'fahad@techneth.com',
        subject: `Re: ${subject}`,
        html: htmlTemplate,
        attachments: [{
            filename: 'techneth.png',
            path: path.join(process.cwd(), 'public', 'techneth.png'),
            cid: 'technethlogo'
        }]
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Failed to send email via SMTP:', error);
        throw new Error('Failed to send email');
    }

    // Update status to 'replied'
    const { data, error } = await supabase
        .from('contact_submissions')
        .update({
            status: 'replied',
            updated_at: new Date().toISOString()
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
        resourceType: 'contact',
        resourceId: id,
        resourceTitle: `Replied to ${contact.name}`,
        changes: { status: { before: contact.status, after: 'replied' } },
    });

    revalidatePath('/contacts');
    updateTag('contacts');
    updateTag(`contact-${id}`);
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return data;
}

export async function deleteContact(id: string) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && !canPerformAction(user, 'delete', 'contact'))) {
        throw new Error('Unauthorized');
    }

    const { createServerClient, createAdminClient } = await import('@/lib/supabase/server');
    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: contact } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (!contact) throw new Error('Contact not found');

    const adminClient = createAdminClient() as SupabaseClient<any>;
    const { error } = await adminClient
        .from('contact_submissions')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'contact',
        resourceId: id,
        resourceTitle: contact.subject || `Message from ${contact.name}`,
    });

    revalidatePath('/contacts');
    updateTag('contacts');
    updateTag('dashboard-stats');
    updateTag('activity-logs');
    return { success: true };
}

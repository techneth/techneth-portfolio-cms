'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function getContacts(filters?: { status?: string }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

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
}

export async function getContact(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;

    return data;
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
        updateData.reply_sent_by = user.id;
        updateData.reply_sent_by_name = user.name;
        updateData.reply_sent_at = new Date().toISOString();
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

    // Send email using Resend if API key is present
    if (process.env.RESEND_API_KEY) {
        try {
            await resend.emails.send({
                from: 'Techneth <onboarding@resend.dev>', // Should be configured in env
                to: contact.email,
                subject: `Re: ${subject}`,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
            });
        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error('Failed to send email');
        }
    } else {
        console.warn('RESEND_API_KEY not found. Simulating email send.');
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update status to 'replied'
    const { data, error } = await supabase
        .from('contact_submissions')
        .update({
            status: 'replied',
            reply_sent_by: user.id,
            reply_sent_by_name: user.name,
            reply_sent_at: new Date().toISOString(),
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
    return data;
}

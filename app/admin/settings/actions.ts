'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SettingsData {
    maintenanceMode: {
        enabled: boolean;
        message: string;
    };
    siteName: string;
    contactEmail: string;
}

export async function getSettings(): Promise<SettingsData> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .in('key', ['maintenance_mode', 'site_name', 'contact_email']);

    if (error) throw error;

    // Transform database format to UI format
    const settings: SettingsData = {
        maintenanceMode: {
            enabled: false,
            message: 'Site under maintenance'
        },
        siteName: 'Techneth',
        contactEmail: 'info@techneth.com'
    };

    data.forEach((setting: any) => {
        switch (setting.key) {
            case 'maintenance_mode':
                settings.maintenanceMode = setting.value;
                break;
            case 'site_name':
                settings.siteName = setting.value.value;
                break;
            case 'contact_email':
                settings.contactEmail = setting.value.value;
                break;
        }
    });

    return settings;
}

export async function updateSettings(
    updates: Partial<SettingsData>
): Promise<void> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'settings')) {
        throw new Error('Unauthorized - Only super admins can update settings');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get current settings for change tracking
    const currentSettings = await getSettings();

    // Update each changed setting
    const updatePromises = [];
    const changes: any = {};

    if (updates.maintenanceMode !== undefined) {
        const before = currentSettings.maintenanceMode;
        const after = updates.maintenanceMode;

        if (JSON.stringify(before) !== JSON.stringify(after)) {
            updatePromises.push(
                supabase
                    .from('settings')
                    .update({
                        value: after,
                        updated_by: user.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('key', 'maintenance_mode')
            );

            changes.maintenance_mode = { before, after };

            // Log maintenance mode toggle separately for visibility
            await logActivity({
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                actionType: 'update',
                resourceType: 'settings',
                resourceId: undefined,
                resourceTitle: 'Maintenance Mode',
                changes: { enabled: { before: before.enabled, after: after.enabled } }
            });
        }
    }

    if (updates.siteName !== undefined && updates.siteName !== currentSettings.siteName) {
        updatePromises.push(
            supabase
                .from('settings')
                .update({
                    value: { value: updates.siteName },
                    updated_by: user.id,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'site_name')
        );

        changes.site_name = {
            before: currentSettings.siteName,
            after: updates.siteName
        };
    }

    if (updates.contactEmail !== undefined && updates.contactEmail !== currentSettings.contactEmail) {
        updatePromises.push(
            supabase
                .from('settings')
                .update({
                    value: { value: updates.contactEmail },
                    updated_by: user.id,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'contact_email')
        );

        changes.contact_email = {
            before: currentSettings.contactEmail,
            after: updates.contactEmail
        };
    }

    // Execute all updates
    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        throw new Error('Failed to update settings');
    }

    // Log activity for site_name and contact_email changes
    if (changes.site_name || changes.contact_email) {
        await logActivity({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            actionType: 'update',
            resourceType: 'settings',
            resourceId: undefined,
            resourceTitle: 'Site Settings',
            changes: {
                ...(changes.site_name && { site_name: changes.site_name }),
                ...(changes.contact_email && { contact_email: changes.contact_email })
            }
        });
    }

    revalidatePath('/admin/settings');
}

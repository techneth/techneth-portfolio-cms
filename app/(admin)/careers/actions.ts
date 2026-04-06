'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export interface Job {
    id: string;
    title: string;
    department: string;
    location: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_level: 'entry' | 'mid' | 'senior' | 'lead' | null;
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    salary_range: string | null;
    is_remote: boolean;
    is_active: boolean;
    application_deadline: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateJobData {
    title: string;
    department: string;
    location: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_level?: 'entry' | 'mid' | 'senior' | 'lead';
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    salary_range?: string;
    is_remote: boolean;
    application_deadline?: string;
}

export interface UpdateJobData extends Partial<CreateJobData> {
    is_active?: boolean;
}

export type JobApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';

export interface JobApplication {
    id: string;
    job_id: string | null;
    job_title_snapshot: string;
    full_name: string;
    email: string;
    phone: string | null;
    experience: string | null;
    expected_salary: string | null;
    linkedin: string | null;
    portfolio: string | null;
    additional_info: string | null;
    resume_file_name: string | null;
    resume_file_path: string | null;
    resume_file_url: string | null;
    cover_letter_file_name: string | null;
    cover_letter_file_path: string | null;
    cover_letter_file_url: string | null;
    status: JobApplicationStatus;
    status_notes: string | null;
    last_emailed_at: string | null;
    communication_history: any[];
    created_at: string;
    updated_at: string;
    jobs?: {
        id: string;
        title: string;
        department: string;
        location: string;
    } | null;
}

interface EmailSendPayload {
    subjectTemplate: string;
    bodyTemplate: string;
}

function applyTemplate(template: string, application: JobApplication): string {
    const replacements: Record<string, string> = {
        '{{name}}': application.full_name || '',
        '{{email}}': application.email || '',
        '{{jobTitle}}': application.job_title_snapshot || '',
        '{{status}}': application.status || '',
        '{{phone}}': application.phone || '',
        '{{experience}}': application.experience || '',
        '{{expectedSalary}}': application.expected_salary || '',
        '{{portfolio}}': application.portfolio || '',
        '{{linkedin}}': application.linkedin || '',
    };

    return Object.entries(replacements).reduce(
        (acc, [token, value]) => acc.split(token).join(value),
        template
    );
}

async function getSmtpConfig(supabase: SupabaseClient<any>) {
    const { data: smtpData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'smtp_config')
        .single();

    let smtpConfig = smtpData?.value;

    if (!smtpConfig) {
        smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'dev.techneth@gmail.com',
                pass: 'vunm bmbt msju xkqd',
            },
            fromEmail: '"No Reply Techneth" <dev.techneth@gmail.com>',
        };
    }

    return smtpConfig;
}

async function createTransporter(supabase: SupabaseClient<any>) {
    const smtpConfig = await getSmtpConfig(supabase);

    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
    });

    return {
        transporter,
                fromEmail: '"Techneth HR" <hr@techneth.com>',
    };
}

function buildApplicantEmailHtml(
        bodyHtml: string,
        application: JobApplication,
        subject: string
) {
        return `
                <!doctype html>
                <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>${subject}</title>
                    </head>
                    <body style="margin:0;padding:0;background-color:#f4f7fb;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f7fb;padding:24px 0;">
                            <tr>
                                <td align="center">
                                    <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
                                        <tr>
                                            <td style="padding:20px 24px;background:#0f172a;" align="left">
                                                <img src="cid:techneth-logo" alt="Techneth" width="140" style="display:block;border:0;outline:none;text-decoration:none;max-width:140px;height:auto;" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:24px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.65;">
                                                ${bodyHtml}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#475569;font-size:12px;line-height:1.6;">
                                                <div><strong>Application:</strong> ${application.job_title_snapshot}</div>
                                                <div><strong>Recipient:</strong> ${application.full_name} (${application.email})</div>
                                                <div style="margin-top:8px;">This message was sent by Techneth HR.</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                </html>
        `;
}

async function getTechnethLogoAttachment() {
        const logoFilePath = path.join(process.cwd(), 'public', 'logo.png');
        const logoBuffer = await fs.readFile(logoFilePath);

        return {
                filename: 'techneth.png',
                content: logoBuffer,
                cid: 'techneth-logo',
                contentType: 'image/png',
        };
}

export async function getJobs(filters?: {
    department?: string;
    location?: string;
    employment_type?: string;
    is_active?: boolean;
}): Promise<Job[]> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'careers')) {
        throw new Error('Unauthorized - Only admins can view jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const cacheKey = [
        'jobs-list',
        filters?.department ?? 'all',
        filters?.location ?? 'all',
        filters?.employment_type ?? 'all',
        filters?.is_active !== undefined ? String(filters.is_active) : 'all',
    ];

    const fetchJobs = unstable_cache(
        async () => {
            let query = supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters?.department) query = query.eq('department', filters.department);
            if (filters?.location) query = query.eq('location', filters.location);
            if (filters?.employment_type) query = query.eq('employment_type', filters.employment_type);
            if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as Job[];
        },
        cacheKey,
        { tags: ['jobs'], revalidate: 300 }
    );

    return fetchJobs();
}

export async function getJob(id: string): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'careers')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const fetchJob = unstable_cache(
        async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) throw new Error('Job not found');
            return data as Job;
        },
        [`job-${id}`],
        { tags: [`job-${id}`, 'jobs'], revalidate: 300 }
    );

    return fetchJob();
}

export async function createJob(jobData: CreateJobData): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'create', 'careers')) {
        throw new Error('Unauthorized - Only admins can create jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: newJob, error } = await supabase
        .from('jobs')
        .insert({
            ...jobData,
            created_by: user.id,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'create',
        resourceType: 'job',
        resourceId: newJob.id,
        resourceTitle: `Job: ${newJob.title}`,
        changes: {
            title: newJob.title,
            department: newJob.department,
            location: newJob.location,
            employment_type: newJob.employment_type,
        },
    });

    revalidatePath('/careers');
    revalidateTag('jobs', 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return newJob;
}

export async function updateJob(id: string, updates: UpdateJobData): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized - Only admins can update jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Get existing job for logging changes
    const { data: existingJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

    if (!existingJob) {
        throw new Error('Job not found');
    }

    const { data: updatedJob, error } = await supabase
        .from('jobs')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // Track changes for activity log
    const changes: any = {};
    const fieldsToTrack = ['title', 'department', 'location', 'employment_type', 'is_active', 'description'];

    fieldsToTrack.forEach(field => {
        if (updates[field as keyof UpdateJobData] !== undefined &&
            updates[field as keyof UpdateJobData] !== existingJob[field]) {
            changes[field] = {
                before: existingJob[field],
                after: updates[field as keyof UpdateJobData]
            };
        }
    });

    // Log activity
    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'job',
        resourceId: id,
        resourceTitle: `Job: ${updatedJob.title}`,
        changes,
    });

    revalidatePath('/careers');
    revalidateTag('jobs', 'default');
    revalidateTag(`job-${id}`, 'default');
    revalidateTag('dashboard-stats', 'default');
    revalidateTag('activity-logs', 'default');
    return updatedJob;
}

export async function toggleJobStatus(id: string): Promise<Job> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: job } = await supabase
        .from('jobs')
        .select('is_active')
        .eq('id', id)
        .single();

    if (!job) {
        throw new Error('Job not found');
    }

    return updateJob(id, { is_active: !job.is_active });
}

export async function deleteJob(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'delete', 'careers')) {
        throw new Error('Unauthorized - Only admins can delete jobs');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    // Fetch applications to delete associated files
    const { data: applications, error: appsError } = await supabase
        .from('job_applications')
        .select('resume_file_path, cover_letter_file_path')
        .eq('job_id', id);

    if (appsError) {
        throw new Error(`Failed to fetch associated applications: ${appsError.message}`);
    }

    // Delete files from storage
    if (applications && applications.length > 0) {
        const filesToDelete: string[] = [];
        
        applications.forEach((app) => {
            if (app.resume_file_path) filesToDelete.push(app.resume_file_path);
            if (app.cover_letter_file_path) filesToDelete.push(app.cover_letter_file_path);
        });

        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('job-applications')
                .remove(filesToDelete);

            if (storageError) {
                console.error('Failed to delete application files from bucket:', storageError);
            }
        }

        // Delete applications from database
        const { error: deleteAppsError } = await supabase
            .from('job_applications')
            .delete()
            .eq('job_id', id);

        if (deleteAppsError) {
            throw new Error(`Failed to delete applications: ${deleteAppsError.message}`);
        }
    }

    // Delete the job (hard delete)
    const { error: deleteJobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

    if (deleteJobError) {
        throw new Error(`Failed to delete job: ${deleteJobError.message}`);
    }

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'delete',
        resourceType: 'job',
        resourceId: id,
        resourceTitle: `Deleted job posting (${id}) and its applications`
    });

    revalidateTag('jobs', 'default');
    revalidateTag('job-applications', 'default');
    revalidatePath('/careers');
}

export async function getJobApplications(filters?: {
    status?: JobApplicationStatus;
    jobId?: string;
}): Promise<JobApplication[]> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'read', 'careers')) {
        throw new Error('Unauthorized - Only admins can view applications');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const cacheKey = [
        'job-applications-list',
        filters?.status ?? 'all',
        filters?.jobId ?? 'all',
    ];

    const fetchApplications = unstable_cache(
        async () => {
            let query = supabase
                .from('job_applications')
                .select('*, jobs(id, title, department, location)')
                .order('created_at', { ascending: false });

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.jobId) query = query.eq('job_id', filters.jobId);

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as JobApplication[];
        },
        cacheKey,
        { tags: ['job-applications'], revalidate: 60 }
    );

    return fetchApplications();
}

export async function updateJobApplicationStatus(
    applicationId: string,
    status: JobApplicationStatus,
    statusNotes?: string
): Promise<void> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized - Only admins can update application status');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;

    const { data: existing } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (!existing) {
        throw new Error('Application not found');
    }

    const { error } = await supabase
        .from('job_applications')
        .update({
            status,
            status_notes: statusNotes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

    if (error) throw error;

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'job_application',
        resourceId: applicationId,
        resourceTitle: `${existing.full_name} - ${existing.job_title_snapshot}`,
        changes: {
            status: {
                before: existing.status,
                after: status,
            },
            ...(statusNotes ? { status_notes: statusNotes } : {}),
        },
    });

    revalidatePath('/careers');
    revalidateTag('job-applications', 'default');
    revalidateTag('activity-logs', 'default');
}

export async function sendApplicationEmail(
    applicationId: string,
    payload: EmailSendPayload
): Promise<void> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized - Only admins can send application emails');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;
    const { transporter, fromEmail } = await createTransporter(supabase);

    const { data: application, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (error || !application) throw new Error('Application not found');

    const typedApp = application as JobApplication;
    const renderedSubject = applyTemplate(payload.subjectTemplate, typedApp);
    const renderedBody = applyTemplate(payload.bodyTemplate, typedApp)
        .replace(/\n/g, '<br/>');
    const logoAttachment = await getTechnethLogoAttachment();

    await transporter.sendMail({
        from: fromEmail,
        to: typedApp.email,
        subject: renderedSubject,
        html: buildApplicantEmailHtml(renderedBody, typedApp, renderedSubject),
        attachments: [logoAttachment],
    });

    const history = Array.isArray(typedApp.communication_history)
        ? typedApp.communication_history
        : [];
    history.push({
        sent_at: new Date().toISOString(),
        sent_by: user.name,
        subject: renderedSubject,
        body: renderedBody,
        mode: 'individual',
    });

    await supabase
        .from('job_applications')
        .update({
            last_emailed_at: new Date().toISOString(),
            communication_history: history,
            updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'job_application',
        resourceId: applicationId,
        resourceTitle: `${typedApp.full_name} - ${typedApp.job_title_snapshot}`,
        changes: {
            email_sent: true,
            subject: renderedSubject,
        },
    });

    revalidatePath('/careers');
    revalidateTag('job-applications', 'default');
    revalidateTag('activity-logs', 'default');
}

export async function sendBulkApplicationEmail(
    applicationIds: string[],
    payload: EmailSendPayload
): Promise<{ sent: number; failed: number }> {
    const user = await getCurrentUser();
    if (!user || !canPerformAction(user, 'update', 'careers')) {
        throw new Error('Unauthorized - Only admins can send application emails');
    }

    if (!applicationIds.length) {
        throw new Error('No applications selected for bulk email');
    }

    const supabase = (await createServerClient()) as SupabaseClient<any>;
    const { transporter, fromEmail } = await createTransporter(supabase);

    const { data: applications, error } = await supabase
        .from('job_applications')
        .select('*')
        .in('id', applicationIds);

    if (error) throw error;

    const list = (applications || []) as JobApplication[];
    let sent = 0;
    let failed = 0;
    const logoAttachment = await getTechnethLogoAttachment();

    for (const app of list) {
        try {
            const renderedSubject = applyTemplate(payload.subjectTemplate, app);
            const renderedBody = applyTemplate(payload.bodyTemplate, app).replace(/\n/g, '<br/>');

            await transporter.sendMail({
                from: fromEmail,
                to: app.email,
                subject: renderedSubject,
                html: buildApplicantEmailHtml(renderedBody, app, renderedSubject),
                attachments: [logoAttachment],
            });

            const history = Array.isArray(app.communication_history)
                ? app.communication_history
                : [];
            history.push({
                sent_at: new Date().toISOString(),
                sent_by: user.name,
                subject: renderedSubject,
                body: renderedBody,
                mode: 'bulk',
            });

            await supabase
                .from('job_applications')
                .update({
                    last_emailed_at: new Date().toISOString(),
                    communication_history: history,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', app.id);

            sent += 1;
        } catch (err) {
            console.error(`Failed to send email to ${app.email}`, err);
            failed += 1;
        }
    }

    await logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'update',
        resourceType: 'job_application',
        resourceTitle: 'Bulk applicant email',
        changes: {
            total: list.length,
            sent,
            failed,
        },
    });

    revalidatePath('/careers');
    revalidateTag('job-applications', 'default');
    revalidateTag('activity-logs', 'default');

    return { sent, failed };
}

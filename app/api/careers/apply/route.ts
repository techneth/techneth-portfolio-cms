import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function sanitizePathPart(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
}

async function uploadApplicationFile(
    supabase: any,
    file: File,
    jobId: string,
    applicantName: string,
    fileType: 'resume' | 'cover-letter'
) {
    if (!file || !file.name || file.size <= 0) return null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeApplicant = sanitizePathPart(applicantName || 'applicant');
    const safeJob = sanitizePathPart(jobId || 'unknown-job');
    const filePath = `${safeJob}/${safeApplicant}/${Date.now()}-${fileType}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('job-applications')
        .upload(filePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`Failed to upload ${fileType} file: ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
        .from('job-applications')
        .getPublicUrl(filePath);

    return {
        fileName: file.name,
        filePath,
        fileUrl: publicData.publicUrl,
    };
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const jobId = ((formData.get('jobId') as string) || '').trim();
        const jobTitle = ((formData.get('jobTitle') as string) || 'Not specified').trim();
        const fullName = ((formData.get('fullName') as string) || '').trim();
        const email = ((formData.get('email') as string) || '').trim();
        const phone = ((formData.get('phone') as string) || '').trim();
        const experience = ((formData.get('experience') as string) || '').trim();
        const expectedSalary = ((formData.get('expectedSalary') as string) || '').trim();
        const linkedin = ((formData.get('linkedin') as string) || '').trim();
        const portfolio = ((formData.get('portfolio') as string) || '').trim();
        const additionalInfo = ((formData.get('additionalInfo') as string) || '').trim();

        // Get the attachments
        const resumeFile = formData.get('resume') as File | null;
        const coverLetterFile = formData.get('coverLetter') as File | null;

        if (!fullName || !email) {
            return NextResponse.json(
                { error: 'Name and email are required fields' },
                { status: 400 }
            );
        }

        const supabase: any = createAdminClient();

        const uploadedResume = resumeFile
            ? await uploadApplicationFile(supabase, resumeFile, jobId, fullName, 'resume')
            : null;
        const uploadedCoverLetter = coverLetterFile
            ? await uploadApplicationFile(supabase, coverLetterFile, jobId, fullName, 'cover-letter')
            : null;

        const { error: insertError } = await supabase.from('job_applications').insert({
            job_id: jobId || null,
            job_title_snapshot: jobTitle,
            full_name: fullName,
            email,
            phone: phone || null,
            experience: experience || null,
            expected_salary: expectedSalary || null,
            linkedin: linkedin || null,
            portfolio: portfolio || null,
            additional_info: additionalInfo || null,
            resume_file_name: uploadedResume?.fileName || null,
            resume_file_path: uploadedResume?.filePath || null,
            resume_file_url: uploadedResume?.fileUrl || null,
            cover_letter_file_name: uploadedCoverLetter?.fileName || null,
            cover_letter_file_path: uploadedCoverLetter?.filePath || null,
            cover_letter_file_url: uploadedCoverLetter?.fileUrl || null,
            status: 'new',
        });

        if (insertError) {
            throw new Error(insertError.message);
        }

        return NextResponse.json(
            { success: true, message: 'Application submitted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error submitting application:', error);
        return NextResponse.json(
            { error: 'Failed to submit application. Please try again later.' },
            { status: 500 }
        );
    }
}

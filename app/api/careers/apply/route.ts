import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const jobId = formData.get('jobId') as string || 'Not provided';
        const jobTitle = formData.get('jobTitle') as string || 'Not specified';
        const fullName = formData.get('fullName') as string || 'Not provided';
        const email = formData.get('email') as string || 'Not provided';
        const phone = formData.get('phone') as string || 'Not provided';
        const experience = formData.get('experience') as string || 'Not provided';
        const expectedSalary = formData.get('expectedSalary') as string || 'Not provided';
        const linkedin = formData.get('linkedin') as string || 'Not provided';
        const portfolio = formData.get('portfolio') as string || 'Not provided';
        const additionalInfo = formData.get('additionalInfo') as string || 'No additional info provided';

        // Get the attachments
        const resumeFile = formData.get('resume') as File | null;
        const coverLetterFile = formData.get('coverLetter') as File | null;

        if (!fullName || !email) {
            return NextResponse.json(
                { error: 'Name and email are required fields' },
                { status: 400 }
            );
        }

        // Prepare email attachments
        const attachments = [];

        if (resumeFile && resumeFile.name && resumeFile.size > 0) {
            const arrayBuffer = await resumeFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            attachments.push({
                filename: resumeFile.name,
                content: buffer,
                contentType: resumeFile.type,
            });
        }

        if (coverLetterFile && coverLetterFile.name && coverLetterFile.size > 0) {
            const arrayBuffer = await coverLetterFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            attachments.push({
                filename: coverLetterFile.name,
                content: buffer,
                contentType: coverLetterFile.type,
            });
        }

        const supabase: any = createAdminClient();

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

        // Configure nodemailer transporter using SMTP connection details
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: smtpConfig.auth,
        });

        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #0056b3;">New Career Application Received</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">
                    A new application has been submitted for the position of <strong>${jobTitle}</strong> (Job ID: ${jobId}).
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 35%;">Full Name</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${fullName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                        <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Experience</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${experience}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Expected Salary</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${expectedSalary}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">LinkedIn</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">
                            ${linkedin !== 'Not provided' ? `<a href="${linkedin}" target="_blank">${linkedin}</a>` : 'Not provided'}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Portfolio</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">
                            ${portfolio && portfolio !== 'Not provided' ? `<a href="${portfolio}" target="_blank">${portfolio}</a>` : 'Not provided'}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;">Additional Info</td>
                        <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${additionalInfo}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                    ${attachments.length > 0 ? `<strong>Attachments:</strong> ${attachments.length} file(s) included with this application.` : 'No attachments were provided.'}
                </p>
            </div>
        `;

        const mailOptions = {
            from: smtpConfig.fromEmail || '"No Reply Techneth" <dev.techneth@gmail.com>',
            to: 'hr@techneth.com',
            cc: 'rahat@techneth.com',
            bcc: 'fahad@techneth.com',
            replyTo: email,
            subject: `${jobTitle} Job Application: ${fullName} (${jobId})`,
            html: htmlTemplate,
            attachments: attachments,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Application submitted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error submitting application:', error);
        return NextResponse.json(
            { error: 'Failed to submit application. Please try again later.' },
            { status: 500 }
        );
    }
}

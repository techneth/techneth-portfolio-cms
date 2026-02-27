import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, phone, company, service, message, ip_address, user_agent } = body;

        // Basic validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email, and message are required fields' },
                { status: 400 }
            );
        }

        const supabase: any = createAdminClient();

        const { data, error } = await supabase
            .from('contact_submissions')
            .insert([
                {
                    name,
                    email,
                    phone,
                    company,
                    service,
                    message,
                    ip_address,
                    user_agent
                } as any
            ])
            .select()
            .single();

        if (error) {
            console.error('Error submitting contact form:', error);
            return NextResponse.json(
                { error: 'Failed to submit contact form' },
                { status: 500 }
            );
        }

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

        // Send auto-reply email to the user
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: smtpConfig.auth,
        });

        const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0b1120; padding: 20px; text-align: center;">
                <img src="cid:technethlogo" alt="Techneth Logo" style="max-height: 40px;" />
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #0b1120; font-size: 24px; margin-bottom: 20px;">Thank you for reaching out!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Hi ${name},
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    We have received your message and our team will get back to you as soon as possible. 
                    We're excited to learn more about how we can help you with your needs.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Here is a summary of your submission:
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Service</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${service || 'General Inquiry'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top;">Message</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; white-space: pre-wrap;">${message}</td>
                    </tr>
                </table>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Best regards,<br/>
                    <strong>The Techneth Team</strong>
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
            to: email,
            subject: 'Thank you for contacting Techneth',
            html: htmlTemplate,
            attachments: [{
                filename: 'techneth.png',
                path: path.join(process.cwd(), 'public', 'techneth.png'),
                cid: 'technethlogo'
            }]
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('Error sending auto-reply email:', mailError);
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Newsletter email template renderer.
 *
 * Pure functions with no server-only dependencies so the exact same HTML
 * can be rendered client-side for the admin live preview and server-side
 * when actually sending through Resend. Table-based layout + inline styles
 * for maximum email client compatibility (Gmail, Outlook, Apple Mail).
 *
 * Brand tokens mirror the live techneth.com site: teal #009487 / navy #0F245B.
 */

export interface NewsletterRenderOptions {
    subject: string;
    /** Hidden preview text shown next to the subject in inboxes */
    preheader?: string;
    /** Rich HTML body produced by the campaign editor (already sanitized) */
    contentHtml: string;
    /** Per-recipient unsubscribe URL. The preview passes a placeholder. */
    unsubscribeUrl: string;
    /** Recipient name for the footer greeting; optional */
    recipientEmail?: string;
    /** Absolute URL of the header logo; defaults to the hosted brand logo */
    logoUrl?: string;
}

/**
 * The official Techneth logo, hosted on Supabase Storage (public bucket) so
 * it loads inside email clients regardless of where this backend is deployed.
 * NEXT_PUBLIC_SUPABASE_URL is inlined into both server and client bundles,
 * so the admin live preview and real sends use the identical URL.
 */
export function getNewsletterLogoUrl(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/blogs/branding/techneth-logo.png`
        : '/techneth.png';
}

const BRAND = {
    teal: '#009487',
    navy: '#0F245B',
    text: '#374151',
    muted: '#6B7280',
    bg: '#F3F4F6',
    font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Render the full email document. Returns a complete HTML page string
 * suitable for Resend's `html` field or an iframe `srcDoc` preview.
 */
export function renderNewsletterHtml(options: NewsletterRenderOptions): string {
    const { subject, preheader, contentHtml, unsubscribeUrl, recipientEmail } = options;
    const logoUrl = options.logoUrl || getNewsletterLogoUrl();
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(subject)}</title>
<style>
  /* Client-side resets + styles for rich content produced by the editor.
     Most modern clients (Gmail, Apple Mail, Outlook.com) support <style>. */
  body { margin: 0; padding: 0; background: ${BRAND.bg}; -webkit-text-size-adjust: 100%; }
  img { border: 0; max-width: 100%; height: auto; }
  a { color: ${BRAND.teal}; }
  .tn-content h1, .tn-content h2, .tn-content h3 { color: ${BRAND.navy}; line-height: 1.3; margin: 24px 0 12px; }
  .tn-content h1 { font-size: 26px; }
  .tn-content h2 { font-size: 22px; }
  .tn-content h3 { font-size: 18px; }
  .tn-content p { margin: 0 0 16px; line-height: 1.7; }
  .tn-content ul, .tn-content ol { margin: 0 0 16px; padding-left: 24px; line-height: 1.7; }
  .tn-content blockquote {
    border-left: 4px solid ${BRAND.teal}; margin: 16px 0; padding: 12px 20px;
    background: #F9FAFB; border-radius: 0 8px 8px 0; color: ${BRAND.text};
  }
  .tn-content img { border-radius: 8px; margin: 8px 0; }
  .tn-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .tn-content table td, .tn-content table th { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
  .tn-content .ql-align-center { text-align: center; }
  .tn-content .ql-align-right { text-align: right; }
  .tn-content .ql-align-justify { text-align: justify; }
  .tn-btn {
    display: inline-block; background: ${BRAND.teal}; color: #ffffff !important;
    padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;
  }
  @media only screen and (max-width: 620px) {
    .tn-container { width: 100% !important; }
    .tn-body { padding: 24px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
${preheader
            ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
            : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" class="tn-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(15,36,91,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px 24px;text-align:center;border-bottom:3px solid ${BRAND.teal};">
            <a href="https://techneth.com" style="text-decoration:none;">
              <img src="${logoUrl}" alt="Techneth — Think. Build. Scale." width="190" style="display:inline-block;width:190px;max-width:70%;height:auto;border:0;" />
            </a>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td class="tn-body tn-content" style="padding:36px 40px;font-family:${BRAND.font};font-size:16px;color:${BRAND.text};">
            ${contentHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:24px 40px;text-align:center;font-family:${BRAND.font};font-size:12px;color:${BRAND.muted};border-top:1px solid #E5E7EB;">
            <p style="margin:0 0 8px;">&copy; ${year} Techneth. All rights reserved.</p>
            <p style="margin:0 0 8px;">
              <a href="https://techneth.com" style="color:${BRAND.teal};text-decoration:none;">techneth.com</a>
            </p>
            <p style="margin:0;">
              You are receiving this email because ${recipientEmail ? `<strong>${escapeHtml(recipientEmail)}</strong> is` : 'you are'} subscribed to the Techneth newsletter.<br />
              <a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Very small HTML → plain text conversion for the email's `text` part.
 * Improves spam scoring and serves clients with HTML disabled.
 */
export function htmlToPlainText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

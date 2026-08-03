/**
 * Ready-made HTML sections offered in the sidebar. All inline-styled to the
 * techneth brand, so the frontend needs no extra CSS. Each becomes an `html`
 * block: editable as HTML, draggable like any other block.
 */

export const CTA_TEMPLATE = `<div class="tn-cta" style="background:#0F245B;border-radius:12px;padding:32px 24px;text-align:center;margin:16px 0;">
  <h3 style="color:#ffffff;font-size:1.5rem;font-weight:800;margin:0 0 8px;">Ready to start your next project?</h3>
  <p style="color:#c7d2fe;margin:0 0 20px;">Tell us about your idea — we build web, mobile and AI products that scale.</p>
  <a href="https://www.techneth.com/contact" style="display:inline-block;background:#009487;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:9999px;text-decoration:none;">Let&rsquo;s Talk</a>
</div>`;

export const SECTION_TEMPLATES: { key: string; label: string; html: string }[] = [
    { key: 'cta', label: 'CTA', html: CTA_TEMPLATE },
    {
        key: 'takeaways',
        label: 'Key Takeaways',
        html: `<div class="tn-takeaways" style="background:rgba(0,148,135,0.06);border:1px solid rgba(0,148,135,0.25);border-radius:12px;padding:24px;margin:16px 0;">
  <h3 style="color:#0F245B;font-weight:800;margin:0 0 12px;font-size:1.15rem;">Key Takeaways</h3>
  <ul style="margin:0;padding-left:20px;color:#1f2937;">
    <li style="margin-bottom:8px;">First key point of the article.</li>
    <li style="margin-bottom:8px;">Second key point of the article.</li>
    <li>Third key point of the article.</li>
  </ul>
</div>`,
    },
    {
        key: 'faq',
        label: 'FAQ',
        html: `<div class="tn-faq" style="margin:16px 0;">
  <h3 style="color:#0F245B;font-weight:800;margin:0 0 12px;font-size:1.25rem;">Frequently Asked Questions</h3>
  <details style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
    <summary style="font-weight:600;color:#0F245B;cursor:pointer;">First question goes here?</summary>
    <p style="margin:10px 0 0;color:#4b5563;">Answer to the first question.</p>
  </details>
  <details style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
    <summary style="font-weight:600;color:#0F245B;cursor:pointer;">Second question goes here?</summary>
    <p style="margin:10px 0 0;color:#4b5563;">Answer to the second question.</p>
  </details>
</div>`,
    },
    {
        key: 'proscons',
        label: 'Pros & Cons',
        html: `<div class="tn-proscons" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:16px 0;">
  <div style="background:rgba(0,148,135,0.06);border-radius:10px;padding:18px;">
    <h4 style="color:#008F84;font-weight:800;margin:0 0 10px;">Pros</h4>
    <ul style="margin:0;padding-left:18px;color:#1f2937;"><li style="margin-bottom:6px;">Advantage one</li><li>Advantage two</li></ul>
  </div>
  <div style="background:#FEF2F2;border-radius:10px;padding:18px;">
    <h4 style="color:#B91C1C;font-weight:800;margin:0 0 10px;">Cons</h4>
    <ul style="margin:0;padding-left:18px;color:#1f2937;"><li style="margin-bottom:6px;">Drawback one</li><li>Drawback two</li></ul>
  </div>
</div>`,
    },
    {
        key: 'stats',
        label: 'Stats Row',
        html: `<div class="tn-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0;text-align:center;">
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">150+</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Projects delivered</div></div>
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">98%</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Client satisfaction</div></div>
  <div style="background:#0F245B;border-radius:10px;padding:20px 12px;"><div style="color:#ffffff;font-size:1.8rem;font-weight:800;">10y</div><div style="color:#c7d2fe;font-size:0.85rem;margin-top:4px;">Experience</div></div>
</div>`,
    },
    {
        key: 'testimonial',
        label: 'Testimonial',
        html: `<div class="tn-quote" style="background:#F9F9F9;border-left:4px solid #009487;border-radius:0 10px 10px 0;padding:22px 24px;margin:16px 0;">
  <p style="margin:0;color:#374151;font-style:italic;font-size:1.05rem;">&ldquo;Quote from a happy client goes here.&rdquo;</p>
  <p style="margin:12px 0 0;color:#0F245B;font-weight:700;">&mdash; Client Name, Company</p>
</div>`,
    },
];

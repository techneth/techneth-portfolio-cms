/**
 * Standalone techneth.com-style article document, used by the full-screen
 * Preview modal and the editor's live side-by-side preview pane. Rendered
 * inside a sandboxed iframe so content <style>/<script> run exactly like on
 * the live site, isolated from the admin UI.
 */

export interface PreviewDocOptions {
    type: 'blog' | 'case-study';
    title: string;
    /** Already-sanitized HTML content */
    content: string;
    category?: string;
    authorName?: string;
    excerpt?: string;
    featuredImage?: string;
    /** Case studies only */
    clientName?: string;
    industry?: string;
    /** Hide header/breadcrumb/hero chrome — content-focused live preview */
    compact?: boolean;
}

/** Estimated reading time from the HTML content, like the live site shows. */
export function readingTime(html: string): number {
    const text = html.replace(/<[^>]+>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildPreviewDoc(opts: PreviewDocOptions): string {
    const {
        type, title, content, category, authorName, excerpt, featuredImage, clientName, industry, compact,
    } = opts;
    const sectionLabel = type === 'blog' ? 'Blogs' : 'Case Studies';
    const minutes = readingTime(content);
    const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const t = escapeHtml(title || 'Untitled post');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; background: #FFFEF8; color: #1f2937; }

  .site-header { border-bottom: 1px solid #f3f4f6; background: #FFFEF8; position: sticky; top: 0; z-index: 10; }
  .site-header .inner { max-width: 72rem; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; color: #0F245B; }
  .logo em { font-style: normal; color: #009487; }
  .nav { display: flex; gap: 22px; font-size: 0.875rem; color: #0F245B; }
  .nav .active { color: #009487; font-weight: 600; }
  @media (max-width: 860px) { .nav { display: none; } }
  .btn-talk { background: #009487; color: #fff; font-size: 0.875rem; font-weight: 600; padding: 9px 18px; border-radius: 9999px; white-space: nowrap; }

  main { max-width: 48rem; margin: 0 auto; padding: 0 20px 64px; }
  .breadcrumb { padding-top: 24px; font-size: 0.75rem; color: #9ca3af; display: flex; flex-wrap: wrap; gap: 5px; }
  .breadcrumb .here { color: #4b5563; }
  .back { margin-top: 18px; font-size: 0.875rem; color: #009487; font-weight: 500; }
  .byline { margin-top: 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.875rem; color: #6b7280; }
  .byline .author { font-weight: 600; color: #0F245B; }
  h1.post-title { margin-top: 12px; font-size: clamp(1.7rem, 4.5vw, 2.5rem); font-weight: 800; line-height: 1.2; color: #0F245B; }
  .meta-chips { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { font-size: 0.75rem; font-weight: 600; padding: 5px 12px; border-radius: 9999px; }
  .chip.client { background: rgba(0,148,135,.1); color: #008F84; }
  .chip.industry { background: rgba(15,36,91,.1); color: #0F245B; }
  .excerpt { margin-top: 16px; font-size: 1.125rem; line-height: 1.7; color: #6b7280; }
  .hero { margin-top: 32px; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; display: block; }
  .hero-placeholder { margin-top: 32px; width: 100%; aspect-ratio: 16 / 9; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 0.875rem; }

  .post-body { margin-top: ${compact ? '20px' : '40px'}; font-size: 1.0625rem; line-height: 1.75; }
  .post-body h1, .post-body h2, .post-body h3, .post-body h4, .post-body h5, .post-body h6 { color: #0F245B; font-weight: 800; line-height: 1.3; margin: 2rem 0 0.75rem; }
  .post-body h1 { font-size: 1.875rem; } .post-body h2 { font-size: 1.5rem; } .post-body h3 { font-size: 1.25rem; } .post-body h4 { font-size: 1.125rem; }
  .post-body p { margin: 0 0 1.1rem; }
  .post-body a { color: #009487; }
  .post-body ul, .post-body ol { margin: 0 0 1.1rem; padding-left: 1.5rem; }
  .post-body li { margin-bottom: 0.35rem; }
  .post-body blockquote { background: #F9F9F9; border-left: 4px solid #009487; padding: 1rem 1.25rem; margin: 1.5rem 0; color: #4b5563; font-style: italic; border-radius: 0 6px 6px 0; }
  .post-body img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; }
  .post-body iframe { max-width: 100%; margin: 1.5rem 0; border: 0; border-radius: 8px; }
  .post-body pre { background: #0F245B; color: #e5e7eb; padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; font-size: 0.9rem; margin: 1.5rem 0; }
  .post-body code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .post-body table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.95rem; display: block; overflow-x: auto; }
  .post-body table tbody { display: table; width: 100%; }
  .post-body td, .post-body th { border: 1px solid #e5e7eb; padding: 0.6rem 0.8rem; vertical-align: top; text-align: left; }
  .post-body th, .post-body tr:first-child td { background: rgba(0,148,135,.07); color: #0F245B; font-weight: 600; }
  .post-body hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  .post-body .ql-html-section { margin: 1.5rem 0; }
  .post-body .ql-align-center { text-align: center; }
  .post-body .ql-align-right { text-align: right; }
  .post-body .ql-align-justify { text-align: justify; }

  .share { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: #6b7280; }
  .share span.btn { padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 9999px; font-size: 0.75rem; }
  .cta { background: #0F245B; text-align: center; padding: 56px 20px; }
  .cta h2 { color: #fff; font-size: clamp(1.4rem, 3.5vw, 1.9rem); font-weight: 800; }
  .cta .btn-talk { display: inline-block; margin-top: 24px; padding: 13px 28px; }
</style>
</head>
<body>
  ${compact ? '' : `<header class="site-header">
    <div class="inner">
      <span class="logo">tech<em>neth</em></span>
      <nav class="nav">
        <span>Services</span><span>About Us</span><span>Portfolio</span>
        <span class="${type === 'case-study' ? 'active' : ''}">Case Studies</span>
        <span class="${type === 'blog' ? 'active' : ''}">Blogs</span>
        <span>Career</span>
      </nav>
      <span class="btn-talk">Let's Talk</span>
    </div>
  </header>`}
  <main>
    ${compact ? '' : `<div class="breadcrumb">
      <span>Home</span><span>›</span><span>${sectionLabel}</span>
      ${category ? `<span>›</span><span>${escapeHtml(category)}</span>` : ''}
      <span>›</span><span class="here">${t}</span>
    </div>
    <p class="back">‹ Back to all posts</p>`}
    <div class="byline">
      ${authorName ? `<span class="author">${escapeHtml(authorName)}</span>` : ''}
      <span>${today}</span><span>•</span><span data-minutes>${minutes} min read</span>
    </div>
    <h1 class="post-title">${t}</h1>
    ${type === 'case-study' && (clientName || industry) ? `
    <div class="meta-chips">
      ${clientName ? `<span class="chip client">Client: ${escapeHtml(clientName)}</span>` : ''}
      ${industry ? `<span class="chip industry">${escapeHtml(industry)}</span>` : ''}
    </div>` : ''}
    ${excerpt ? `<p class="excerpt">${escapeHtml(excerpt)}</p>` : ''}
    ${compact ? '' : (featuredImage
        ? `<img class="hero" src="${escapeHtml(featuredImage)}" alt="${t}">`
        : `<div class="hero-placeholder">Featured image</div>`)}
    <article class="post-body">
      ${content || '<p style="color:#9ca3af">No content yet…</p>'}
    </article>
    ${compact ? '' : `<div class="share">
      <span>Share:</span>
      <span class="btn">LinkedIn</span><span class="btn">Facebook</span><span class="btn">X</span>
    </div>`}
  </main>
  ${compact ? '' : `<section class="cta">
    <h2>Ready to start your next project?</h2>
    <span class="btn-talk">Let's Talk</span>
  </section>`}
</body>
</html>`;
}

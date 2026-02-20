const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function validateContent(html, seoKeywords) {
    const warnings = [];
    const dom = new JSDOM(html);
    const div = dom.window.document.createElement('div');
    div.innerHTML = html;
    let text = div.textContent || '';

    console.log('--- Testing HTML ---');
    console.log('HTML:', html);
    console.log('Extracted Text:', text);
    console.log('Char codes:', text.split('').map(c => c.charCodeAt(0)));

    // Normalize non-breaking spaces to regular spaces
    text = text.replace(/\u00A0/g, ' ');
    console.log('Normalized Text:', text);
    console.log('Normalized Char codes:', text.split('').map(c => c.charCodeAt(0)));


    // 1. Spacing check
    if (text.includes('  ')) {
        warnings.push('Content contains double spaces. Please use single spaces.');
    }

    // 2. SEO Keyword Check
    if (seoKeywords && seoKeywords.length > 0) {
        const first100Words = text.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
        const missingKeywords = seoKeywords.filter(keyword =>
            !first100Words.includes(keyword.toLowerCase())
        );

        if (missingKeywords.length > 0) {
            warnings.push(`Missing SEO keyword(s) in first 100 words: ${missingKeywords.join(', ')}`);
        }
    }

    // 3. Sentence Length Check (> 20 words)
    // FIX: Split by punctuation to get all segments, including the last one without punctuation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    console.log('Detected Sentences (New):', sentences.length);

    // DEBUG: Log sentences to see what's being caught
    sentences.forEach((s, i) => console.log(`S${i}: [${s.trim().split(/\s+/).length} words]`, s.trim()));

    const longSentences = sentences.filter(sentence => {
        const wordCount = sentence.trim().split(/\s+/).length;
        return wordCount > 20;
    });

    if (longSentences.length > 0) {
        warnings.push(`Found ${longSentences.length} sentence(s) exceeding 20 words.`);
    }

    // 4. Paragraph Length Check (> 3 sentences)
    // FIX: select p, li, blockquote
    const paragraphs = div.querySelectorAll('p, li, blockquote');
    console.log('Detected Blocks (New):', paragraphs.length);

    let longParagraphsCount = 0;
    let singleWordParagraphsCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
        const pText = paragraphs[i].textContent || '';
        const pSentences = pText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        console.log(`Block ${i} (${paragraphs[i].tagName}) Sentences:`, pSentences.length);

        if (pSentences.length > 3) {
            longParagraphsCount++;
        }
        if (pText.trim().split(/\s+/).length === 1 && pText.trim().length > 0) {
            singleWordParagraphsCount++;
        }
    }

    if (longParagraphsCount > 0) {
        warnings.push(`Found ${longParagraphsCount} paragraph(s) exceeding 3 sentences.`);
    }
    if (singleWordParagraphsCount > 0) {
        warnings.push(`Found ${singleWordParagraphsCount} single-word paragraph(s).`);
    }

    // 5. Hierarchy Check
    const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let h1Found = false;
    let lastLevel = 0;
    let hierarchyIssue = false;

    headings.forEach(heading => {
        const tagName = heading.tagName.toLowerCase();
        const level = parseInt(tagName.replace('h', ''));

        if (level === 1) h1Found = true;
        if (lastLevel > 0 && level > lastLevel + 1) hierarchyIssue = true;
        lastLevel = level;
    });

    if (h1Found) warnings.push('Content contains H1 tag.');
    if (hierarchyIssue) warnings.push('Heading hierarchy skipped a level.');

    return warnings;
}

// Case 1: Long Sentence
const html1 = '<p>This is a very long sentence that definitely has more than twenty words because I am just typing and typing to ensure that we trigger the validation rule correctly and verify it works as expected.</p>';
console.log('Result 1:', validateContent(html1, []));

// Case 2: Long Paragraph
const html2 = '<p>This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.</p>';
console.log('Result 2:', validateContent(html2, []));

// Case 3: Single Word Paragraph
const html3 = '<p>Word</p>';
console.log('Result 3:', validateContent(html3, []));

// Case 5: Long Sentence No Punctuation STRICT (No period at all)
const html5 = '<p>This is a very long sentence that definitely has more than twenty words and absolutely no punctuation at the end so it should be skipped by the regex</p>';
console.log('Result 5 (Strict):', validateContent(html5, []));

// Case 7: Double Spaces with nbsp (Common in Quill)
const html7 = '<p>This has&nbsp; double spaces.</p>';
console.log('Result 7 (nbsp):', validateContent(html7, []));

// Case 8: Double Spaces with multiple nbsp
const html8 = '<p>This has &nbsp; &nbsp;spaces.</p>';
console.log('Result 8 (multiple nbsp):', validateContent(html8, []));

// Case 9: Regular double spaces (might be collapsed in HTML, but worth testing textContent behavior)
const html9 = '<p>This has  double spaces.</p>';
console.log('Result 9 (regular):', validateContent(html9, []));

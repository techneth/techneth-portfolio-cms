/**
 * Keyword/tag input parsing, shared by the blog and case-study editors.
 *
 * The field accepts one keyword at a time (Enter or the Add button) but also a
 * whole pasted line — "seo, next.js, headless cms" — which is the way most
 * people have their keywords sitting in a spreadsheet or a brief.
 */

/** Anything people reasonably use to separate keywords in a pasted line. */
const SEPARATORS = /[,;\n\r\t|]+/;

/**
 * Split raw input into clean keywords: separated, trimmed, de-duplicated
 * (case-insensitively), and stripped of surrounding quotes left over from a
 * CSV copy-paste.
 */
export function splitKeywords(input: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of (input || '').split(SEPARATORS)) {
        const keyword = part.trim().replace(/^["']+|["']+$/g, '').trim();
        if (!keyword) continue;
        const dedupeKey = keyword.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        out.push(keyword);
    }
    return out;
}

/**
 * Merge new input into an existing list, skipping anything already there
 * (case-insensitive, so "SEO" doesn't join "seo"). Returns the same array
 * reference when nothing was added, so callers can skip a state update.
 */
export function mergeKeywords(existing: string[], input: string): string[] {
    const incoming = splitKeywords(input);
    if (incoming.length === 0) return existing;

    const have = new Set(existing.map((k) => k.toLowerCase()));
    const added = incoming.filter((k) => !have.has(k.toLowerCase()));
    return added.length ? [...existing, ...added] : existing;
}

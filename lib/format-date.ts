import { format } from 'date-fns';

/**
 * Format a date value safely. Returns '—' for null/undefined/invalid input
 * instead of falling back to the Unix epoch (1 Jan 1970), which is what
 * `new Date(null)` / `new Date('')` produce.
 */
export function formatDateSafe(value?: string | number | Date | null, fmt = 'MMM d, yyyy'): string {
    if (value === null || value === undefined || value === '') return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : format(d, fmt);
}

'use client';

/**
 * Case study narrative fields — the structured content the frontend
 * /portfolio/[slug] page reads to build the full narrative. Every block is
 * optional and skipped on the frontend when empty, so a partially filled study
 * still renders cleanly.
 *
 * Shared by the create and edit admin pages. Images upload immediately to the
 * `case_studies` bucket and store their public URL.
 */

import { useRef, useState } from 'react';
import { ChevronDown, Plus, Upload, X, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { uploadFile } from '@/app/(admin)/actions/upload';
import type {
    CaseStudyFormData,
    CaseStudyMetric,
    CaseStudyPhase,
    CaseStudyFeature,
    CaseStudyGalleryImage,
    CaseStudyColorSwatch,
} from '@/app/(admin)/case-studies/actions';

type Patch = Partial<CaseStudyFormData>;

/**
 * Empty defaults for every narrative field, so controlled inputs stay
 * controlled. Spread into the create/edit form's initial state, and use
 * `hydrateNarrative()` to pull saved values off a case study record.
 */
export function narrativeDefaults() {
    return {
        subtitle: '',
        hero_image: '',
        client_logo: '',
        client_location: '',
        timeline: '',
        project_year: '',
        platforms: [] as string[],
        services: [] as string[],
        industries: [] as string[],
        live_url: '',
        mission: '',
        mission_image: '',
        vision: '',
        vision_image: '',
        goals: [] as string[],
        challenge: '',
        challenge_points: [] as string[],
        challenge_image: '',
        solution: '',
        solution_points: [] as string[],
        solution_image: '',
        outcome: '',
        outcome_image: '',
        metrics: [] as CaseStudyMetric[],
        phases: [] as CaseStudyPhase[],
        features: [] as CaseStudyFeature[],
        gallery_images: [] as CaseStudyGalleryImage[],
        technologies_note: '',
        technologies_image: '',
        typography: [] as string[],
        color_palette: [] as CaseStudyColorSwatch[],
        identity_note: '',
        identity_image: '',
        testimonial_quote: '',
        testimonial_author: '',
        testimonial_role: '',
        testimonial_avatar: '',
    } satisfies Patch;
}

/**
 * Pull saved narrative values off a case study record, falling back to empty
 * defaults. jsonb columns may arrive as JSON-encoded strings, so array fields
 * are parsed defensively.
 */
export function hydrateNarrative(record: any) {
    const arr = (v: any): any[] => {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string' && v.trim()) {
            try {
                const parsed = JSON.parse(v);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };
    const d = narrativeDefaults();
    return {
        ...d,
        subtitle: record.subtitle || '',
        hero_image: record.hero_image || '',
        client_logo: record.client_logo || '',
        client_location: record.client_location || '',
        timeline: record.timeline || '',
        project_year: record.project_year || '',
        platforms: arr(record.platforms),
        services: arr(record.services),
        industries: arr(record.industries),
        live_url: record.live_url || '',
        mission: record.mission || '',
        mission_image: record.mission_image || '',
        vision: record.vision || '',
        vision_image: record.vision_image || '',
        goals: arr(record.goals),
        challenge: record.challenge || '',
        challenge_points: arr(record.challenge_points),
        challenge_image: record.challenge_image || '',
        solution: record.solution || '',
        solution_points: arr(record.solution_points),
        solution_image: record.solution_image || '',
        outcome: record.outcome || '',
        outcome_image: record.outcome_image || '',
        metrics: arr(record.metrics),
        phases: arr(record.phases),
        features: arr(record.features),
        gallery_images: arr(record.gallery_images),
        technologies_note: record.technologies_note || '',
        technologies_image: record.technologies_image || '',
        typography: arr(record.typography),
        color_palette: arr(record.color_palette),
        identity_note: record.identity_note || '',
        identity_image: record.identity_image || '',
        testimonial_quote: record.testimonial_quote || '',
        testimonial_author: record.testimonial_author || '',
        testimonial_role: record.testimonial_role || '',
        testimonial_avatar: record.testimonial_avatar || '',
    } satisfies Patch;
}

interface Props {
    data: CaseStudyFormData;
    onChange: (patch: Patch) => void;
    slug: string;
}

// ─── Collapsible section ────────────────────────────────────────────────────
function Section({
    title,
    description,
    children,
    defaultOpen = false,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="admin-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
                <div>
                    <h3 className="text-base font-bold text-gray-800">{title}</h3>
                    {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && <div className="px-4 sm:px-6 pb-6 pt-1 space-y-4 border-t border-gray-100">{children}</div>}
        </div>
    );
}

// ─── Basic inputs ───────────────────────────────────────────────────────────
function TextField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
            />
        </div>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    hint?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] resize-y"
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

// ─── Image field (uploads immediately, stores URL) ──────────────────────────
function ImageField({
    label,
    value,
    onChange,
    slug,
    subpath,
    hint,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    slug: string;
    subpath: string;
    hint?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file.');
            return;
        }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const safeSlug = (slug || 'case-study').replace(/[^a-z0-9-]/gi, '-');
            const name = `${subpath}-${Date.now()}.${ext}`;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('bucket', 'case_studies');
            fd.append('path', `${safeSlug}/narrative/${name}`);
            const url = await uploadFile(fd);
            if (url) onChange(url);
        } catch {
            toast.error('Image upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {value ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={value} alt="preview" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                        >
                            Remove
                        </button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-[#00A99D] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files[0];
                        if (f) handleFile(f);
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    className={`cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-6 gap-2 transition-colors ${
                        dragOver ? 'border-[#00A99D] bg-[#00A99D]/5' : 'border-gray-200 hover:border-[#00A99D]/50 hover:bg-gray-50'
                    }`}
                >
                    {uploading ? (
                        <div className="w-7 h-7 border-2 border-[#00A99D] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-[#00A99D]/10 flex items-center justify-center">
                                <Upload size={20} className="text-[#00A99D]" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">Click to upload or drag &amp; drop</p>
                            <p className="text-xs text-gray-400">Wide 16:9 works best. PNG, JPG, WebP.</p>
                        </>
                    )}
                </div>
            )}
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                }}
            />
        </div>
    );
}

// ─── Ordered string list (goals, platforms, services, points, typography) ────
function StringListField({
    label,
    items,
    onChange,
    placeholder,
    hint,
}: {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
    hint?: string;
}) {
    const [input, setInput] = useState('');
    const add = () => {
        const v = input.trim();
        if (v && !items.includes(v)) {
            onChange([...items, v]);
            setInput('');
        }
    };
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder || 'Type + Enter'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                />
                <button
                    type="button"
                    onClick={add}
                    className="px-3 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84]"
                >
                    <Plus size={16} />
                </button>
            </div>
            {items.length > 0 && (
                <ol className="space-y-1.5 pt-1">
                    {items.map((it, i) => (
                        <li
                            key={`${it}-${i}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm"
                        >
                            <span className="text-xs font-mono text-gray-400 w-5">{i + 1}.</span>
                            <span className="flex-1 text-gray-700">{it}</span>
                            <button
                                type="button"
                                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </li>
                    ))}
                </ol>
            )}
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
    );
}

// ─── Repeatable-item wrapper ─────────────────────────────────────────────────
function RepeatableItem({
    index,
    onRemove,
    children,
}: {
    index: number;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="relative rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <GripVertical size={14} className="text-gray-300" /> #{index + 1}
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Remove"
                >
                    <X size={16} />
                </button>
            </div>
            {children}
        </div>
    );
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#00A99D] border border-dashed border-[#00A99D]/50 rounded hover:bg-[#00A99D]/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
            <Plus size={15} /> {label}
        </button>
    );
}

// ─── Metrics ─────────────────────────────────────────────────────────────────
function MetricsField({ items, onChange }: { items: CaseStudyMetric[]; onChange: (v: CaseStudyMetric[]) => void }) {
    const update = (i: number, patch: Partial<CaseStudyMetric>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <div className="space-y-3">
            {items.map((m, i) => (
                <RepeatableItem key={i} index={i} onRemove={() => onChange(items.filter((_, idx) => idx !== i))}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextField label="Value *" value={m.value} onChange={(v) => update(i, { value: v })} placeholder="52%" />
                        <TextField label="Label *" value={m.label} onChange={(v) => update(i, { label: v })} placeholder="Fewer missed appointments" />
                    </div>
                    <TextField label="Detail (optional)" value={m.detail || ''} onChange={(v) => update(i, { detail: v })} placeholder="Measured over the first two quarters." />
                </RepeatableItem>
            ))}
            <AddButton
                label="Add metric"
                onClick={() => onChange([...items, { value: '', label: '' }])}
                disabled={items.length >= 4}
            />
            <p className="text-xs text-gray-400">Maximum of four are rendered, in order. Use only figures the client has approved.</p>
        </div>
    );
}

// ─── Phases ──────────────────────────────────────────────────────────────────
function PhasesField({ items, onChange, slug }: { items: CaseStudyPhase[]; onChange: (v: CaseStudyPhase[]) => void; slug: string }) {
    const update = (i: number, patch: Partial<CaseStudyPhase>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <div className="space-y-3">
            {items.map((p, i) => (
                <RepeatableItem key={i} index={i} onRemove={() => onChange(items.filter((_, idx) => idx !== i))}>
                    <TextField label="Title *" value={p.title} onChange={(v) => update(i, { title: v })} placeholder="Discovery and observation" />
                    <TextAreaField label="Description" value={p.description || ''} onChange={(v) => update(i, { description: v })} rows={3} />
                    <StringListField label="Points" items={p.points || []} onChange={(v) => update(i, { points: v })} placeholder="Shadowed three clinics" />
                    <ImageField label="Image" value={p.image || ''} onChange={(v) => update(i, { image: v })} slug={slug} subpath={`phase-${i + 1}`} />
                </RepeatableItem>
            ))}
            <AddButton label="Add phase" onClick={() => onChange([...items, { title: '' }])} disabled={items.length >= 6} />
            <p className="text-xs text-gray-400">Maximum of six. Only the title is required.</p>
        </div>
    );
}

// ─── Features ────────────────────────────────────────────────────────────────
function FeaturesField({ items, onChange, slug }: { items: CaseStudyFeature[]; onChange: (v: CaseStudyFeature[]) => void; slug: string }) {
    const update = (i: number, patch: Partial<CaseStudyFeature>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <div className="space-y-3">
            {items.map((f, i) => (
                <RepeatableItem key={i} index={i} onRemove={() => onChange(items.filter((_, idx) => idx !== i))}>
                    <TextField label="Title *" value={f.title} onChange={(v) => update(i, { title: v })} placeholder="Booking in three taps" />
                    <TextAreaField label="Description" value={f.description || ''} onChange={(v) => update(i, { description: v })} rows={2} />
                    <ImageField label="Image" value={f.image || ''} onChange={(v) => update(i, { image: v })} slug={slug} subpath={`feature-${i + 1}`} />
                    <TextField label="Image alt text" value={f.image_alt || ''} onChange={(v) => update(i, { image_alt: v })} placeholder="Booking screen on mobile" />
                </RepeatableItem>
            ))}
            <AddButton label="Add highlight" onClick={() => onChange([...items, { title: '' }])} disabled={items.length >= 6} />
            <p className="text-xs text-gray-400">Maximum of six. Rendered as alternating image/text rows.</p>
        </div>
    );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
const SPANS: CaseStudyGalleryImage['span'][] = ['half', 'full', 'third'];
function GalleryField({ items, onChange, slug }: { items: CaseStudyGalleryImage[]; onChange: (v: CaseStudyGalleryImage[]) => void; slug: string }) {
    const update = (i: number, patch: Partial<CaseStudyGalleryImage>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <div className="space-y-3">
            {items.map((g, i) => (
                <RepeatableItem key={i} index={i} onRemove={() => onChange(items.filter((_, idx) => idx !== i))}>
                    <ImageField label="Image *" value={g.url || ''} onChange={(v) => update(i, { url: v })} slug={slug} subpath={`gallery-${i + 1}`} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TextField label="Caption" value={g.caption || ''} onChange={(v) => update(i, { caption: v })} />
                        <TextField label="Alt text" value={g.alt || ''} onChange={(v) => update(i, { alt: v })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width in carousel</label>
                        <select
                            value={g.span || 'half'}
                            onChange={(e) => update(i, { span: e.target.value as CaseStudyGalleryImage['span'] })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        >
                            {SPANS.map((s) => (
                                <option key={s} value={s}>
                                    {s === 'half' ? 'Standard (half)' : s === 'full' ? 'Wide (full)' : 'Narrow (third)'}
                                </option>
                            ))}
                        </select>
                    </div>
                </RepeatableItem>
            ))}
            <AddButton label="Add image" onClick={() => onChange([...items, { url: '', span: 'half' }])} />
            <p className="text-xs text-gray-400">No maximum. Mix in the occasional wide or narrow slide to break up a long gallery.</p>
        </div>
    );
}

// ─── Colour palette ──────────────────────────────────────────────────────────
function ColorPaletteField({ items, onChange }: { items: CaseStudyColorSwatch[]; onChange: (v: CaseStudyColorSwatch[]) => void }) {
    const update = (i: number, patch: Partial<CaseStudyColorSwatch>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    const isValidHex = (h: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h);
    return (
        <div className="space-y-3">
            {items.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="color"
                        value={isValidHex(c.hex) ? c.hex : '#009487'}
                        onChange={(e) => update(i, { hex: e.target.value })}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={c.hex}
                        onChange={(e) => update(i, { hex: e.target.value })}
                        placeholder="#009487"
                        className={`w-28 px-3 py-2 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00A99D] ${
                            c.hex && !isValidHex(c.hex) ? 'border-red-400' : 'border-gray-300'
                        }`}
                    />
                    <input
                        type="text"
                        value={c.name || ''}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="Name (optional), e.g. Brand teal"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                    />
                    <button
                        type="button"
                        onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            <AddButton label="Add colour" onClick={() => onChange([...items, { hex: '#009487' }])} disabled={items.length >= 8} />
            <p className="text-xs text-gray-400">Maximum of eight. Hex is required and must be a valid 3 or 6 digit hex.</p>
        </div>
    );
}

// ─── Main composite ──────────────────────────────────────────────────────────
export default function CaseStudyNarrativeFields({ data, onChange, slug }: Props) {
    // Convenience setter for a single field.
    const set = <K extends keyof CaseStudyFormData>(field: K, value: CaseStudyFormData[K]) =>
        onChange({ [field]: value } as Patch);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Case study narrative (optional)</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            <Section title="Project facts" description="Hero chips and the facts strip">
                <TextAreaField
                    label="Subtitle"
                    value={data.subtitle || ''}
                    onChange={(v) => set('subtitle', v)}
                    rows={2}
                    placeholder="One or two sentences under the H1."
                    hint="Falls back to the excerpt when empty."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="Client location" value={data.client_location || ''} onChange={(v) => set('client_location', v)} placeholder="Manchester, United Kingdom" />
                    <TextField label="Timeline" value={data.timeline || ''} onChange={(v) => set('timeline', v)} placeholder="16 weeks" />
                    <TextField label="Project year" value={data.project_year || ''} onChange={(v) => set('project_year', v)} placeholder="2025" />
                    <TextField label="Live site URL" value={data.live_url || ''} onChange={(v) => set('live_url', v)} placeholder="https://…" />
                </div>
                <StringListField label="Platforms" items={data.platforms || []} onChange={(v) => set('platforms', v)} placeholder="Web, iOS, Android" />
                <StringListField
                    label="Services"
                    items={data.services || []}
                    onChange={(v) => set('services', v)}
                    placeholder="Web development"
                    hint="Entries matching a service page get auto-linked. Use exact service names where possible."
                />
                <StringListField label="Industries" items={data.industries || []} onChange={(v) => set('industries', v)} placeholder="Healthcare" hint="Falls back to the single Industry field." />
                <ImageField label="Hero image" value={data.hero_image || ''} onChange={(v) => set('hero_image', v)} slug={slug} subpath="hero" hint="Page LCP — upload at 1600px wide or more. Falls back to the featured image." />
                <ImageField label="Client logo (reserved, not rendered yet)" value={data.client_logo || ''} onChange={(v) => set('client_logo', v)} slug={slug} subpath="client-logo" />
            </Section>

            <Section title="Mission and vision" description="Statement blocks in large type">
                <TextAreaField label="Mission" value={data.mission || ''} onChange={(v) => set('mission', v)} rows={3} placeholder="What the project set out to do." />
                <ImageField label="Mission image" value={data.mission_image || ''} onChange={(v) => set('mission_image', v)} slug={slug} subpath="mission" />
                <TextAreaField label="Vision" value={data.vision || ''} onChange={(v) => set('vision', v)} rows={3} placeholder="Where the product is headed." />
                <ImageField label="Vision image" value={data.vision_image || ''} onChange={(v) => set('vision_image', v)} slug={slug} subpath="vision" />
                <StringListField label="Goals" items={data.goals || []} onChange={(v) => set('goals', v)} hint="Three to six entries reads best." />
            </Section>

            <Section title="Metrics" description="Results at a glance (teal band)">
                <MetricsField items={data.metrics || []} onChange={(v) => set('metrics', v)} />
            </Section>

            <Section title="The challenge">
                <TextAreaField label="Challenge" value={data.challenge || ''} onChange={(v) => set('challenge', v)} rows={5} hint="Separate paragraphs with a blank line." />
                <StringListField label="Key constraints" items={data.challenge_points || []} onChange={(v) => set('challenge_points', v)} hint="Rendered as cards, two per row. Four fills the grid." />
                <ImageField label="Challenge image" value={data.challenge_image || ''} onChange={(v) => set('challenge_image', v)} slug={slug} subpath="challenge" />
            </Section>

            <Section title="Our approach">
                <TextAreaField label="Solution" value={data.solution || ''} onChange={(v) => set('solution', v)} rows={5} hint="Separate paragraphs with a blank line." />
                <StringListField label="What we did" items={data.solution_points || []} onChange={(v) => set('solution_points', v)} hint="Numbered cards." />
                <ImageField label="Solution image" value={data.solution_image || ''} onChange={(v) => set('solution_image', v)} slug={slug} subpath="solution" />
            </Section>

            <Section title="The process" description="Phase by phase (max 6)">
                <PhasesField items={data.phases || []} onChange={(v) => set('phases', v)} slug={slug} />
            </Section>

            <Section title="Visual identity" description="Typography and colour palette">
                <TextAreaField label="Identity note" value={data.identity_note || ''} onChange={(v) => set('identity_note', v)} rows={3} placeholder="Prose above the typography and palette." />
                <StringListField label="Typography" items={data.typography || []} onChange={(v) => set('typography', v)} placeholder="Manrope" hint="Renders an Aa specimen card per face." />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colour palette</label>
                    <ColorPaletteField items={data.color_palette || []} onChange={(v) => set('color_palette', v)} />
                </div>
                <ImageField label="Identity image" value={data.identity_image || ''} onChange={(v) => set('identity_image', v)} slug={slug} subpath="identity" />
            </Section>

            <Section title="Product highlights" description="What we shipped (max 6)">
                <FeaturesField items={data.features || []} onChange={(v) => set('features', v)} slug={slug} />
            </Section>

            <Section title="Gallery" description="Carousel with lightbox (no maximum)">
                <GalleryField items={data.gallery_images || []} onChange={(v) => set('gallery_images', v)} slug={slug} />
            </Section>

            <Section title="Technology" description="Note and image next to the stack chips">
                <TextAreaField label="Technologies note" value={data.technologies_note || ''} onChange={(v) => set('technologies_note', v)} rows={3} placeholder="Why this stack." />
                <ImageField label="Technologies image" value={data.technologies_image || ''} onChange={(v) => set('technologies_image', v)} slug={slug} subpath="technologies" />
            </Section>

            <Section title="The outcome">
                <TextAreaField label="Outcome" value={data.outcome || ''} onChange={(v) => set('outcome', v)} rows={5} hint="Separate paragraphs with a blank line." />
                <ImageField label="Outcome image" value={data.outcome_image || ''} onChange={(v) => set('outcome_image', v)} slug={slug} subpath="outcome" />
            </Section>

            <Section title="Client quote" description="Teal testimonial band">
                <TextAreaField label="Quote" value={data.testimonial_quote || ''} onChange={(v) => set('testimonial_quote', v)} rows={3} hint="Required for the block to appear." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="Author" value={data.testimonial_author || ''} onChange={(v) => set('testimonial_author', v)} placeholder="Defaults to the client name." />
                    <TextField label="Role" value={data.testimonial_role || ''} onChange={(v) => set('testimonial_role', v)} placeholder="Operations Director, Northline Health" />
                </div>
                <ImageField label="Avatar" value={data.testimonial_avatar || ''} onChange={(v) => set('testimonial_avatar', v)} slug={slug} subpath="avatar" hint="Square image. Falls back to initials." />
            </Section>
        </div>
    );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Globe, X, Plus, Star, Link2, Upload, Monitor } from 'lucide-react';
import ContentPreview from '@/components/admin/ContentPreview';
import { createBlogPair, BlogFormData } from '../actions';
import { uploadImageDirect, StorageBucket } from '@/lib/supabase/storage';
import CategorySelect from '@/components/admin/CategorySelect';
import { getNlCategory } from '@/lib/categories';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(() => import('@/components/admin/MarkdownEditor'), { ssr: false });

function emptyForm(isEnglish: boolean): BlogFormData {
    return { title: '', slug: '', excerpt: '', content: '', featured_image: '', status: 'draft', seo_title: '', seo_description: '', seo_keywords: [], category: '', featured: false, is_english: isEnglish, author_name: '', pair_id: null };
}

function generateSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Image Upload Field ───────────────────────────────────────────────────────
function ImageUploadField({ label, imageUrl, onUpload, slug, bucket = 'blogs' }: { label: string; imageUrl: string; onUpload: (url: string) => void; slug: string; bucket?: StorageBucket }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const safe = (slug || 'featured').replace(/[^a-z0-9-]/g, '-');
            const url = await uploadImageDirect(bucket, `${safe}/${safe}.${ext}`, file); if (url) onUpload(url);
        } catch (err) { toast.error(err instanceof Error && err.message ? err.message : 'Image upload failed.'); } finally { setUploading(false); }
    };
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={imageUrl} alt="preview" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => inputRef.current?.click()} className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100">Replace</button>
                        <button onClick={() => onUpload('')} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">Remove</button>
                    </div>
                    {uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#00A99D] border-t-transparent rounded-full animate-spin" /></div>}
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} className={`cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 transition-colors ${dragOver ? 'border-[#00A99D] bg-[#00A99D]/5' : 'border-gray-200 hover:border-[#00A99D]/50 hover:bg-gray-50'}`}>
                    {uploading ? <div className="w-7 h-7 border-2 border-[#00A99D] border-t-transparent rounded-full animate-spin" /> : <><div className="w-10 h-10 rounded-full bg-[#00A99D]/10 flex items-center justify-center"><Upload size={20} className="text-[#00A99D]" /></div><p className="text-sm font-medium text-gray-600">Click to upload or drag &amp; drop</p><p className="text-xs text-gray-400">PNG, JPG, WebP up to 10 MB</p></>}
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
    );
}

// ─── Keywords Field ───────────────────────────────────────────────────────────
function KeywordsField({ keywords, onChange }: { keywords: string[]; onChange: (k: string[]) => void }) {
    const [input, setInput] = useState('');
    const add = () => { const kw = input.trim(); if (kw && !keywords.includes(kw)) { onChange([...keywords, kw]); setInput(''); } };
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600">SEO Keywords</label>
            <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} className="input-field flex-1 text-sm" placeholder="Type keyword + Enter" />
                <button onClick={add} className="px-3 py-1.5 bg-[#00A99D] text-white rounded text-sm hover:bg-[#008F84]"><Plus size={14} /></button>
            </div>
            {keywords.length > 0 && <div className="flex flex-wrap gap-1.5 pt-1">{keywords.map((k) => <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00A99D]/10 text-[#007A73] rounded-full text-xs font-medium">{k}<button onClick={() => onChange(keywords.filter((x) => x !== k))} className="hover:text-red-500"><X size={10} /></button></span>)}</div>}
        </div>
    );
}

// ─── Form Panel ───────────────────────────────────────────────────────────────
function FormPanel({ lang, form, onChange, showImageField, onPreview }: { lang: 'en' | 'nl'; form: BlogFormData; onChange: (f: BlogFormData) => void; showImageField: boolean; onPreview?: () => void }) {
    const isEn = lang === 'en';
    const set = (field: keyof BlogFormData, value: any) => onChange({ ...form, [field]: value });

    return (
        <div className={`flex-1 min-w-0 border-2 rounded-xl p-5 space-y-4 ${isEn ? 'border-blue-100 bg-blue-50/20' : 'border-orange-100 bg-orange-50/20'}`}>
            <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${isEn ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    <Globe size={14} /> {isEn ? 'English (EN)' : 'Dutch (NL)'}
                </div>
                {onPreview && (
                    <button type="button" onClick={onPreview} className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                        <Monitor size={14} /> Preview
                    </button>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => { const title = e.target.value; onChange({ ...form, title, slug: generateSlug(title) }); }} className="input-field w-full" placeholder={isEn ? 'Blog title in English' : 'Blogtitel in het Nederlands'} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} className="input-field w-full font-mono text-sm" placeholder="auto-generated" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={3} className="input-field w-full resize-none text-sm" placeholder={isEn ? 'Short description...' : 'Korte beschrijving...'} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <MarkdownEditor value={form.content} onChange={(v: string) => set('content', v)} contentTitle={form.title} />
            </div>
            {showImageField && (
                <ImageUploadField label={`Featured Image — ${isEn ? 'English version' : 'Dutch version'}`} imageUrl={form.featured_image} onUpload={(url) => set('featured_image', url)} slug={form.slug} />
            )}
            <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SEO</p>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SEO Title</label>
                    <input type="text" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className="input-field w-full text-sm" placeholder={isEn ? 'SEO title...' : 'SEO titel...'} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SEO Description</label>
                    <textarea value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} rows={2} className="input-field w-full resize-none text-sm" placeholder={isEn ? 'Meta description...' : 'Meta beschrijving...'} />
                </div>
                <KeywordsField keywords={form.seo_keywords ?? []} onChange={(k) => set('seo_keywords', k)} />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CreateBlogPairPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enForm, setEnForm] = useState<BlogFormData>(emptyForm(true));
    const [nlForm, setNlForm] = useState<BlogFormData>(emptyForm(false));

    const [sharedCategory, setSharedCategory] = useState('');
    const [sharedAuthor, setSharedAuthor] = useState('');
    const [sharedStatus, setSharedStatus] = useState<'draft' | 'published'>('draft');
    const [sharedFeatured, setSharedFeatured] = useState(false);
    const [useSharedImage, setUseSharedImage] = useState(true);
    const [sharedImage, setSharedImage] = useState('');
    const [previewLang, setPreviewLang] = useState<'en' | 'nl' | null>(null);

    const previewForm = previewLang === 'nl' ? nlForm : enForm;

    const handleSubmit = async () => {
        if (!enForm.title || !enForm.slug || !nlForm.title || !nlForm.slug) { toast.error('Both versions must have a title and slug.'); return; }
        if (!enForm.content || !nlForm.content) { toast.error('Both versions need content.'); return; }

        // Auto-resolve slug collision: append "-nl" to NL slug if it matches EN slug
        let resolvedNlForm = nlForm;
        if (enForm.slug === nlForm.slug) {
            resolvedNlForm = { ...nlForm, slug: `${nlForm.slug}-nl` };
            setNlForm(resolvedNlForm);
            toast(`NL slug was the same as EN — automatically changed to "${resolvedNlForm.slug}"`, { icon: 'ℹ️' });
        }

        const toastId = toast.loading('Creating paired blog posts...');
        setLoading(true);
        try {
            const featImg = useSharedImage ? sharedImage : undefined;
            await createBlogPair(
                { ...enForm, ...(featImg !== undefined ? { featured_image: featImg } : {}), category: sharedCategory, author_name: sharedAuthor, status: sharedStatus, featured: sharedFeatured },
                { ...resolvedNlForm, ...(featImg !== undefined ? { featured_image: featImg } : {}), category: getNlCategory(sharedCategory), author_name: sharedAuthor, status: sharedStatus, featured: sharedFeatured },
            );
            toast.success('Both blog posts created and linked!', { id: toastId });
            router.push('/blogs');
        } catch (err: any) {
            toast.error(err.message || 'Failed to create blog pair', { id: toastId });
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/blogs" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Create Paired Blog Posts</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Write EN &amp; NL versions together — automatically linked as a translation pair</p>
                    </div>
                </div>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-[#00A99D] text-white rounded-lg hover:bg-[#008F84] disabled:opacity-60 font-semibold shadow">
                    <Save size={18} /> {loading ? 'Creating...' : 'Create Both Posts'}
                </button>
            </div>

            <div className="admin-card p-5 space-y-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Shared Settings (applied to both versions)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
                        <input type="text" value={sharedAuthor} onChange={(e) => setSharedAuthor(e.target.value)} className="input-field w-full" placeholder="Techneth Team" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <CategorySelect value={sharedCategory} onChange={setSharedCategory} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={sharedStatus} onChange={(e) => setSharedStatus(e.target.value as any)} className="input-field w-full">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                        <button type="button" onClick={() => setSharedFeatured(!sharedFeatured)} className={`flex items-center gap-2 px-4 py-2 rounded border text-sm transition-colors ${sharedFeatured ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'}`}>
                            <Star size={15} fill={sharedFeatured ? 'currentColor' : 'none'} /> {sharedFeatured ? 'Featured' : 'Mark as Featured'}
                        </button>
                    </div>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-sm font-medium text-gray-700">Featured Image</label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                            <button onClick={() => setUseSharedImage(true)} className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${useSharedImage ? 'bg-[#00A99D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Link2 size={12} /> Same for both</button>
                            <button onClick={() => setUseSharedImage(false)} className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${!useSharedImage ? 'bg-[#00A99D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Globe size={12} /> Different per language</button>
                        </div>
                    </div>
                    {useSharedImage && <ImageUploadField label="Featured Image (shared for both EN & NL)" imageUrl={sharedImage} onUpload={setSharedImage} slug={enForm.slug || 'blog'} />}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                <FormPanel lang="en" form={enForm} onChange={setEnForm} showImageField={!useSharedImage} onPreview={() => setPreviewLang('en')} />
                <FormPanel lang="nl" form={nlForm} onChange={setNlForm} showImageField={!useSharedImage} onPreview={() => setPreviewLang('nl')} />
            </div>

            <ContentPreview
                isOpen={previewLang !== null}
                onClose={() => setPreviewLang(null)}
                type="blog"
                title={previewForm.title}
                content={previewForm.content}
                category={previewLang === 'nl' ? getNlCategory(sharedCategory) : sharedCategory}
                authorName={sharedAuthor}
                excerpt={previewForm.excerpt}
                featuredImage={useSharedImage ? sharedImage : previewForm.featured_image}
            />

            <div className="flex justify-end">
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-[#00A99D] text-white rounded-lg hover:bg-[#008F84] disabled:opacity-60 font-semibold shadow">
                    <Save size={18} /> {loading ? 'Creating...' : 'Create Both Posts'}
                </button>
            </div>
        </div>
    );
}

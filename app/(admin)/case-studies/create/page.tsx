'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Star, Globe } from 'lucide-react';
import Link from 'next/link';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import { createCaseStudy, CaseStudyFormData } from '../actions';
import { uploadFile } from '@/app/(admin)/actions/upload';
import CategorySelect from '@/components/admin/CategorySelect';
import { getNlCategory, getEnCategory } from '@/lib/categories';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useImageUploadQueue } from '@/hooks/useImageUploadQueue';
import ValidationModal from '@/components/admin/ValidationModal';

export default function CreateCaseStudyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const { addImage, uploadImages, clearQueue } = useImageUploadQueue();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<CaseStudyFormData>({
        title: '',
        slug: '',
        category: '',
        client_name: '',
        industry: '',
        excerpt: '',
        content: '',
        featured_image: '',
        technologies: [],
        keywords: [],
        results: {},
        status: 'draft',
        featured: false,
        seo_title: '',
        seo_description: '',
        is_english: true,  // default to English
        pair_id: null,
    });
    const [selectedEnCategory, setSelectedEnCategory] = useState('');
    const [techInput, setTechInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [contentWarnings, setContentWarnings] = useState<string[]>([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'draft' | 'published' | null>(null);

    // Pre-fill from query params when creating a counterpart version
    useEffect(() => {
        const lang = searchParams.get('lang');         // 'en' or 'nl'
        const pairId = searchParams.get('pair_id');    // ID of the existing version to pair with
        const category = searchParams.get('category'); // category from existing post
        const client = searchParams.get('client');     // client_name from existing post
        const industry = searchParams.get('industry'); // industry from existing post
        if (lang || pairId || category || client || industry) {
            setFormData((prev) => ({
                ...prev,
                is_english: lang === 'en',
                pair_id: pairId || null,
                ...(client ? { client_name: client } : {}),
                ...(industry ? { industry } : {}),
            }));
            if (category) {
                setSelectedEnCategory(getEnCategory(category));
            }
        }
    }, []);

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleTitleChange = (title: string) => {
        setFormData({
            ...formData,
            title,
            slug: generateSlug(title),
        });
    };

    const addTechnology = () => {
        if (techInput.trim() && !formData.technologies.includes(techInput.trim())) {
            setFormData({
                ...formData,
                technologies: [...formData.technologies, techInput.trim()],
            });
            setTechInput('');
        }
    };

    const removeTechnology = (tech: string) => {
        setFormData({
            ...formData,
            technologies: formData.technologies.filter(t => t !== tech),
        });
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
            setFormData({
                ...formData,
                keywords: [...formData.keywords, keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData({
            ...formData,
            keywords: formData.keywords.filter(k => k !== keyword),
        });
    };

    const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
        e.preventDefault();

        // Validation
        if (!formData.title) {
            toast.error('Please enter a title');
            return;
        }
        if (!formData.slug) {
            toast.error('Please enter a slug');
            return;
        }
        if (!selectedEnCategory) {
            toast.error('Please select a category');
            return;
        }
        if (!formData.featured_image && !imageFile) {
            toast.error('Please add a featured image');
            return;
        }

        // If validation errors exist, show modal first
        if (contentWarnings.length > 0) {
            setPendingStatus(status);
            setShowValidationModal(true);
            return;
        }

        await processSubmit(status);
    };

    const processSubmit = async (status: 'draft' | 'published') => {
        setLoading(true);
        const toastId = toast.loading('Creating case study...');

        try {
            let imageUrl = formData.featured_image;

            // Upload image if selected
            if (imageFile) {
                toast.loading('Uploading image...', { id: toastId });
                const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${formData.slug || 'featured'}.${fileExt}`;
                const filePath = `${formData.slug || 'uncategorized'}/${fileName}`;

                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile);
                uploadFormData.append('bucket', 'case_studies');
                uploadFormData.append('path', filePath);

                const publicUrl = await uploadFile(uploadFormData);
                if (publicUrl) {
                    imageUrl = publicUrl;
                }
            }

            toast.loading('Saving case study...', { id: toastId });

            // Process content images
            const processedContent = await uploadImages(
                formData.content,
                'case_studies',
                `case-studies/${formData.slug || 'uncategorized'}/content`,
                formData.title
            );

            const categoryToSave = formData.is_english ? selectedEnCategory : getNlCategory(selectedEnCategory);
            await createCaseStudy({
                ...formData,
                category: categoryToSave,
                content: processedContent,
                featured_image: imageUrl,
                status
            });

            toast.success('Case study created successfully!', { id: toastId });
            clearQueue();
            router.push('/case-studies');
        } catch (error) {
            console.error('Error creating case study:', error);
            toast.error('Failed to create case study', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSubmit = async () => {
        setShowValidationModal(false);
        if (pendingStatus) {
            await processSubmit(pendingStatus);
            setPendingStatus(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/case-studies"
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Create Case Study</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Add a new portfolio case study</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                        onClick={(e) => handleSubmit(e, 'draft')}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-[#1E3A8A] text-white rounded hover:bg-[#1E3A8A]/90 transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                        <Save size={18} />
                        <span>Save Draft</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'published')}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                        <Eye size={18} />
                        <span>Publish</span>
                    </button>
                </div>
            </div>

            {/* Form */}
            <form className="space-y-6">
                {/* Basic Information */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug *
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <CategorySelect
                                value={selectedEnCategory}
                                onChange={setSelectedEnCategory}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Client Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Industry
                                </label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Excerpt
                            </label>
                            <textarea
                                value={formData.excerpt}
                                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                            />
                        </div>

                        <div>
                            <ImageUpload
                                label="Featured Image"
                                bucket="case_studies"
                                value={formData.featured_image}
                                onChange={(value) => setFormData({ ...formData, featured_image: value })}
                                onUploadFile={(file) => setImageFile(file)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Featured Status
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                                    className={`flex items-center space-x-2 px-4 py-2.5 rounded border transition-all w-full justify-center sm:justify-start ${formData.featured
                                        ? 'bg-[#00A99D]/10 border-[#00A99D] text-[#008F84] shadow-sm ring-1 ring-[#00A99D]'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <Star
                                        size={20}
                                        fill={formData.featured ? "#00A99D" : "none"}
                                        className={formData.featured ? 'text-[#00A99D]' : 'text-gray-400'}
                                    />
                                    <span className="font-bold">{formData.featured ? 'Featured Post' : 'Click to Feature'}</span>
                                </button>
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Language
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_english: !formData.is_english })}
                                    className={`flex items-center space-x-2 px-4 py-2.5 rounded border transition-all w-full justify-center sm:justify-start ${formData.is_english
                                        ? 'bg-[#00A99D]/10 border-[#00A99D] text-[#008F84] shadow-sm ring-1 ring-[#00A99D]'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <Globe
                                        size={20}
                                        className={formData.is_english ? 'text-[#00A99D]' : 'text-gray-400'}
                                    />
                                    <span className="font-bold">{formData.is_english ? 'English' : 'Non-English'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Content *</h3>
                    <MarkdownEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        placeholder="Describe the challenge, solution, and results..."
                        onImageSelect={addImage}
                        seoKeywords={formData.seo_title ? [formData.seo_title] : []}
                        onValidationCheck={setContentWarnings}
                        contentTitle={formData.title}
                    />
                </div>
                {/* Technologies */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Technologies Used</h3>
                    <div className="space-y-3">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={techInput}
                                onChange={(e) => setTechInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnology())}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                placeholder="e.g., React, Node.js, PostgreSQL"
                            />
                            <button
                                type="button"
                                onClick={addTechnology}
                                className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.technologies.map((tech) => (
                                <span
                                    key={tech}
                                    className="inline-flex items-center px-3 py-1 bg-[#00A99D] text-white rounded-full text-sm"
                                >
                                    {tech}
                                    <button
                                        type="button"
                                        onClick={() => removeTechnology(tech)}
                                        className="ml-2 hover:text-red-600"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Keywords */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Keywords</h3>
                    <div className="space-y-3">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                placeholder="e.g., UI, Web Design, Startup"
                            />
                            <button
                                type="button"
                                onClick={addKeyword}
                                className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.keywords.map((keyword) => (
                                <span
                                    key={keyword}
                                    className="inline-flex items-center px-3 py-1 bg-[#1E3A8A] text-white rounded-full text-sm"
                                >
                                    {keyword}
                                    <button
                                        type="button"
                                        onClick={() => removeKeyword(keyword)}
                                        className="ml-2 hover:text-red-400 font-bold"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SEO */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">SEO Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SEO Title
                            </label>
                            <input
                                type="text"
                                value={formData.seo_title}
                                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                placeholder="Leave empty to use the case study title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SEO Description
                            </label>
                            <textarea
                                value={formData.seo_description}
                                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                placeholder="Leave empty to use the excerpt"
                            />
                        </div>
                    </div>
                </div>
            </form>

            <ValidationModal
                isOpen={showValidationModal}
                onClose={() => setShowValidationModal(false)}
                onConfirm={handleConfirmSubmit}
                warnings={contentWarnings}
            />
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Trash2, Star, Globe } from 'lucide-react';
import Link from 'next/link';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import { getCaseStudy, updateCaseStudy, deleteCaseStudy, CaseStudyFormData } from '../../actions';
import { uploadFile } from '@/app/(admin)/actions/upload';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useImageUploadQueue } from '@/hooks/useImageUploadQueue';
import ValidationModal from '@/components/admin/ValidationModal';
import Modal from '@/components/admin/Modal';
import { AlertTriangle } from 'lucide-react';

export default function EditCaseStudyPage() {
    const params = useParams();
    const caseStudyId = params.id as string;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { addImage, uploadImages, clearQueue } = useImageUploadQueue();
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
        is_english: false,
    });
    const [techInput, setTechInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [contentWarnings, setContentWarnings] = useState<string[]>([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'draft' | 'published' | null>(null);

    useEffect(() => {
        if (caseStudyId) {
            loadCaseStudy();
        }
    }, [caseStudyId]);

    const loadCaseStudy = async () => {
        try {
            const data = await getCaseStudy(caseStudyId);
            setFormData({
                title: data.title,
                slug: data.slug,
                category: data.category || '',
                client_name: data.client_name || '',
                industry: data.industry || '',
                excerpt: data.excerpt || '',
                content: data.content,
                featured_image: data.featured_image || '',
                technologies: data.technologies || [],
                keywords: data.keywords || [],
                results: (data.results as Record<string, any>) || {},
                status: data.status as 'draft' | 'published',
                featured: data.featured || false,
                seo_title: data.seo_title || '',
                seo_description: data.seo_description || '',
                is_english: data.is_english ?? false,
            });
        } catch (error) {
            console.error('Error loading case study:', error);
            toast.error('Failed to load case study');
            router.push('/case-studies');
        } finally {
            setLoading(false);
        }
    };

    const handleTitleChange = (title: string) => {
        setFormData({
            ...formData,
            title,
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
        if (!formData.category) {
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
        setSaving(true);
        const toastId = toast.loading('Updating case study...');

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

            toast.loading('Saving changes...', { id: toastId });

            // Process content images
            const processedContent = await uploadImages(
                formData.content,
                'case_studies',
                `case-studies/${formData.slug || caseStudyId}/content`,
                formData.title
            );

            await updateCaseStudy(caseStudyId, {
                ...formData,
                content: processedContent,
                featured_image: imageUrl,
                status
            });

            toast.success('Case study updated successfully!', { id: toastId });
            clearQueue();
            router.push('/case-studies');
        } catch (error) {
            console.error('Error updating case study:', error);
            toast.error('Failed to update case study', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmSubmit = async () => {
        setShowValidationModal(false);
        if (pendingStatus) {
            await processSubmit(pendingStatus);
            setPendingStatus(null);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleteModalOpen(false);
        const toastId = toast.loading('Deleting case study...');

        try {
            await deleteCaseStudy(caseStudyId);
            toast.success('Case study deleted successfully', { id: toastId });
            router.push('/case-studies');
        } catch (error) {
            console.error('Error deleting case study:', error);
            toast.error('Failed to delete case study', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading case study...</div>
            </div>
        );
    }

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
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Edit Case Study</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Update case study details</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                        onClick={handleDeleteClick}
                        className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-[#DC3545] text-white rounded hover:bg-[#DC3545]/90 transition-colors text-sm sm:text-base"
                    >
                        <Trash2 size={18} />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'draft')}
                        disabled={saving}
                        className="flex items-center space-x-2 px-3 py-2 sm:px-4 bg-[#1E3A8A] text-white rounded hover:bg-[#1E3A8A]/90 transition-colors disabled:opacity-50 text-sm sm:text-base"
                    >
                        <Save size={18} />
                        <span>Save Draft</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'published')}
                        disabled={saving}
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
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                required
                            >
                                <option value="" disabled>Select a category</option>
                                <option value="Custom Web Development">Custom Web Development</option>
                                <option value="Mobile App Development">Mobile App Development</option>
                                <option value="Custom Software Development">Custom Software Development</option>
                                <option value="Product Design">Product Design</option>
                                <option value="UI-UX Design">UI-UX Design</option>
                                <option value="Tech Partnership & Consultation">Tech Partnership & Consultation</option>
                                <option value="Information">Information</option>

                            </select>
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Case Study?"
            >
                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-red-50 rounded-md border border-red-100">
                        <AlertTriangle className="text-[#DC3545] mr-3 flex-shrink-0" size={24} />
                        <p className="text-sm text-red-800">
                            Warning: This action will move the case study to trash.
                        </p>
                    </div>
                    <p className="text-gray-600">
                        Are you sure you want to delete <span className="font-semibold text-gray-800">"{formData.title}"</span>?
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-[#DC3545] text-white rounded hover:bg-[#DC3545]/90 transition-colors flex items-center"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete Case Study
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

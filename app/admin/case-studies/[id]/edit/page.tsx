'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import { getCaseStudy, updateCaseStudy, deleteCaseStudy, CaseStudyFormData } from '../../actions';
import { uploadImage, getImageUrl } from '@/lib/supabase/storage';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useImageUploadQueue } from '@/hooks/useImageUploadQueue';

export default function EditCaseStudyPage() {
    const params = useParams();
    const caseStudyId = params.id as string;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { addImage, uploadImages } = useImageUploadQueue();
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<CaseStudyFormData>({
        title: '',
        slug: '',
        client_name: '',
        industry: '',
        excerpt: '',
        content: '',
        featured_image: '',
        technologies: [],
        results: {},
        status: 'draft',
        is_featured: false,
        seo_title: '',
        seo_description: '',
    });
    const [techInput, setTechInput] = useState('');

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
                client_name: data.client_name || '',
                industry: data.industry || '',
                excerpt: data.excerpt || '',
                content: data.content,
                featured_image: data.featured_image || '',
                technologies: data.technologies || [],
                results: (data.results as Record<string, any>) || {},
                status: data.status,
                is_featured: data.is_featured,
                seo_title: data.seo_title || '',
                seo_description: data.seo_description || '',
            });
        } catch (error) {
            console.error('Error loading case study:', error);
            toast.error('Failed to load case study');
            router.push('/admin/case-studies');
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

    const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
        e.preventDefault();

        // Validation
        if (!formData.title) {
            toast.error('Please enter a title');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Updating case study...');

        try {
            let imageUrl = formData.featured_image;

            // Upload image if selected
            if (imageFile) {
                toast.loading('Uploading image...', { id: toastId });
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${formData.slug || 'uncategorized'}/${fileName}`;

                const uploadResult = await uploadImage('case_studies', filePath, imageFile);

                if (uploadResult) {
                    imageUrl = getImageUrl('case_studies', filePath);
                }
            }

            toast.loading('Saving changes...', { id: toastId });

            // Process content images
            const processedContent = await uploadImages(
                formData.content,
                'case_studies',
                `case-studies/${formData.slug || caseStudyId}/content`
            );

            await updateCaseStudy(caseStudyId, {
                ...formData,
                content: processedContent,
                featured_image: imageUrl,
                status
            });

            toast.success('Case study updated successfully!', { id: toastId });
            router.push('/admin/case-studies');
        } catch (error) {
            console.error('Error updating case study:', error);
            toast.error('Failed to update case study', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this case study? This action cannot be undone.')) {
            return;
        }

        const toastId = toast.loading('Deleting case study...');

        try {
            await deleteCaseStudy(id);
            toast.success('Case study deleted successfully', { id: toastId });
            router.push('/admin/case-studies');
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
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/admin/case-studies"
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Edit Case Study</h1>
                        <p className="text-gray-600 mt-2">Update case study details</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleDelete}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        <Trash2 size={18} />
                        <span>Delete</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'draft')}
                        disabled={saving}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>Save as Draft</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'published')}
                        disabled={saving}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50"
                    >
                        <Eye size={18} />
                        <span>Publish</span>
                    </button>
                </div>
            </div>

            {/* Form */}
            <form className="space-y-6">
                {/* Basic Information */}
                <div className="admin-card p-6">
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

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_featured"
                                checked={formData.is_featured}
                                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                                className="w-4 h-4 text-[#00A99D] border-gray-300 rounded focus:ring-[#00A99D]"
                            />
                            <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">
                                Featured Case Study
                            </label>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Content *</h3>
                    <MarkdownEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        placeholder="Describe the challenge, solution, and results..."
                        onImageSelect={addImage}
                    />
                </div>
                {/* Technologies */}
                <div className="admin-card p-6">
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
                                        className="ml-2 hover:text-red-200"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SEO */}
                <div className="admin-card p-6">
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
        </div>
    );
}

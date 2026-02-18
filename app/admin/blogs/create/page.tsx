'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import { createBlog, BlogFormData } from '../actions';
import { uploadFile } from '@/app/admin/actions/upload';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useImageUploadQueue } from '@/hooks/useImageUploadQueue';

export default function CreateBlogPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { addImage, uploadImages, clearQueue } = useImageUploadQueue();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<BlogFormData>({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featured_image: '',
        status: 'draft',
        seo_title: '',
        seo_description: '',
        seo_keywords: [],
    });
    const [keywordInput, setKeywordInput] = useState('');

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

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.seo_keywords.includes(keywordInput.trim())) {
            setFormData({
                ...formData,
                seo_keywords: [...formData.seo_keywords, keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData({
            ...formData,
            seo_keywords: formData.seo_keywords.filter(k => k !== keyword),
        });
    };

    const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
        e.preventDefault();

        // Validation
        if (!formData.title) {
            toast.error('Please enter a title');
            return;
        }
        if (!formData.content) {
            toast.error('Please add some content');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating blog post...');

        try {
            let imageUrl = formData.featured_image;

            // Upload image if selected
            if (imageFile) {
                toast.loading('Uploading image...', { id: toastId });
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${formData.slug || 'uncategorized'}/${fileName}`;

                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile);
                uploadFormData.append('bucket', 'blogs');
                uploadFormData.append('path', filePath);

                const publicUrl = await uploadFile(uploadFormData);
                if (publicUrl) {
                    imageUrl = publicUrl;
                }
            }

            toast.loading('Saving blog post...', { id: toastId });

            // Process content images just before saving
            const processedContent = await uploadImages(
                formData.content,
                'blogs',
                `blogs/${formData.slug || 'uncategorized'}/content`
            );

            await createBlog({
                ...formData,
                content: processedContent,
                featured_image: imageUrl,
                status
            });

            toast.success('Blog created successfully!', { id: toastId });
            clearQueue();
            router.push('/admin/blogs');
        } catch (error) {
            console.error('Error creating blog:', error);
            toast.error('Failed to create blog post', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/admin/blogs"
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Create New Blog</h1>
                        <p className="text-gray-600 mt-2">Write and publish a new blog post</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={(e) => handleSubmit(e, 'draft')}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#1E3A8A] text-white rounded hover:bg-[#1E3A8A]/90 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>Save as Draft</span>
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, 'published')}
                        disabled={loading}
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
                                placeholder="Enter blog title"
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
                                placeholder="blog-post-slug"
                                required
                            />
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
                                placeholder="Short summary of the post"
                            />
                        </div>

                        <div>
                            <ImageUpload
                                label="Featured Image"
                                bucket="blogs"
                                value={formData.featured_image}
                                onChange={(value) => setFormData({ ...formData, featured_image: value })}
                                onUploadFile={(file) => setImageFile(file)}
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="admin-card p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Content *</h3>
                    <MarkdownEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        onImageSelect={addImage}
                    />
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
                                placeholder="Leave empty to use the blog title"
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Keywords
                            </label>
                            <div className="flex space-x-2 mb-2">
                                <input
                                    type="text"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                                    placeholder="Add a keyword and press Enter"
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
                                {formData.seo_keywords.map((keyword) => (
                                    <span
                                        key={keyword}
                                        className="inline-flex items-center px-3 py-1 bg-[#E0F2F1] text-[#00695C] rounded-full text-sm"
                                    >
                                        {keyword}
                                        <button
                                            type="button"
                                            onClick={() => removeKeyword(keyword)}
                                            className="ml-2 hover:text-red-600 font-bold"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

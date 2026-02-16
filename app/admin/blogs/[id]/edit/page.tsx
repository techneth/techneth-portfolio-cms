'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import { getBlog, updateBlog, deleteBlog, BlogFormData } from '../../actions';
import { uploadImage, getImageUrl } from '@/lib/supabase/storage';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    useEffect(() => {
        loadBlog();
    }, [id]);

    const loadBlog = async () => {
        try {
            const data = await getBlog(id);
            setFormData({
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt || '',
                content: data.content,
                featured_image: data.featured_image || '',
                status: data.status,
                seo_title: data.seo_title || '',
                seo_description: data.seo_description || '',
                seo_keywords: data.seo_keywords || [],
            });
        } catch (error) {
            console.error('Error loading blog:', error);
            toast.error('Failed to load blog post');
            router.push('/admin/blogs');
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

        setSaving(true);
        const toastId = toast.loading('Updating blog post...');

        try {
            let imageUrl = formData.featured_image;

            // Upload image if selected
            if (imageFile) {
                toast.loading('Uploading image...', { id: toastId });
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${formData.slug || 'uncategorized'}/${fileName}`;

                const uploadResult = await uploadImage('blogs', filePath, imageFile);

                if (uploadResult) {
                    imageUrl = getImageUrl('blogs', filePath);
                }
            }

            toast.loading('Saving changes...', { id: toastId });

            await updateBlog(id, {
                ...formData,
                featured_image: imageUrl,
                status
            });

            toast.success('Blog updated successfully!', { id: toastId });
            router.push('/admin/blogs');
        } catch (error) {
            console.error('Error updating blog:', error);
            toast.error('Failed to update blog post', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
            return;
        }

        const toastId = toast.loading('Deleting blog...');

        try {
            await deleteBlog(id);
            toast.success('Blog deleted successfully', { id: toastId });
            router.push('/admin/blogs');
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Failed to delete blog', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading blog post...</div>
            </div>
        );
    }

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
                        <h1 className="text-3xl font-bold text-gray-800">Edit Blog</h1>
                        <p className="text-gray-600 mt-2">Update blog post content</p>
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
                        className="flex items-center space-x-2 px-4 py-2 bg-[#4AB3A5] text-white rounded hover:bg-[#3A9A8D] transition-colors disabled:opacity-50"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
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
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5]"
                                    placeholder="Add a keyword and press Enter"
                                />
                                <button
                                    type="button"
                                    onClick={addKeyword}
                                    className="px-4 py-2 bg-[#4AB3A5] text-white rounded hover:bg-[#3A9A8D] transition-colors"
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
                                            className="ml-2 hover:text-red-500 font-bold"
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

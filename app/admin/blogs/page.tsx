'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, Search, AlertTriangle } from 'lucide-react';
import { getBlogs, deleteBlog } from './actions';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';

export default function BlogsPage() {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [blogToDelete, setBlogToDelete] = useState<{ id: string; title: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadBlogs();
    }, [statusFilter, searchQuery]);

    const loadBlogs = async () => {
        setLoading(true);
        try {
            const data = await getBlogs({
                status: statusFilter || undefined,
                search: searchQuery || undefined,
            });
            setBlogs(data);
        } catch (error) {
            console.error('Error loading blogs:', error);
            toast.error('Failed to load blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string, title: string) => {
        setBlogToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!blogToDelete) return;

        const toastId = toast.loading('Deleting blog...');
        setIsDeleteModalOpen(false);

        try {
            await deleteBlog(blogToDelete.id);
            toast.success('Blog deleted successfully', { id: toastId });
            loadBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Failed to delete blog', { id: toastId });
        } finally {
            setBlogToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Blogs</h1>
                    <p className="text-gray-600 mt-2">Manage your blog posts</p>
                </div>
                <Link
                    href="/admin/blogs/create"
                    className="flex items-center space-x-2 px-4 py-2 bg-[#4AB3A5] text-white rounded hover:bg-[#3A9A8D] transition-colors"
                >
                    <Plus size={20} />
                    <span>Create New Blog</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search blogs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-10 w-full"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-field"
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </div>
            </div>

            {/* Blogs Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : blogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No blogs found. Create your first blog post!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Author
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {blogs.map((blog) => (
                                    <tr key={blog.id} className="table-row">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                                            <div className="text-sm text-gray-500">{blog.slug}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {blog.author_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${blog.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                                                {blog.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(blog.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                <Link
                                                    href={`/admin/blogs/${blog.id}/edit`}
                                                    className="text-[#4AB3A5] hover:text-[#3A9A8D]"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(blog.id, blog.title)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
            >
                <div className="space-y-4">
                    <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-md">
                        <AlertTriangle className="mr-3 flex-shrink-0" size={24} />
                        <p className="text-sm">
                            Warning: This action cannot be undone.
                        </p>
                    </div>
                    <p className="text-gray-600">
                        Are you sure you want to delete the blog post <span className="font-semibold text-gray-800">"{blogToDelete?.title}"</span>?
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete Blog
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

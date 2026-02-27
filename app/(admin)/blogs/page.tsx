'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, Search, AlertTriangle, RotateCcw, Trash, Star } from 'lucide-react';
import { getBlogs, deleteBlog, restoreBlog, permanentlyDeleteBlog, toggleFeaturedBlog } from './actions';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';
import { createClient } from '@/lib/supabase/client';

export default function BlogsPage() {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'active' | 'trash'>('active');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [blogToDelete, setBlogToDelete] = useState<{ id: string; title: string } | null>(null);
    const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');
    const [userRole, setUserRole] = useState<string>('');
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [blogToRestore, setBlogToRestore] = useState<{ id: string; title: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getSession().then(({ data }) => ({ data: { user: data.session?.user } }));
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole((userData as any)?.role || '');
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        loadBlogs();
    }, [statusFilter, searchQuery, viewFilter]);

    const loadBlogs = async () => {
        setLoading(true);
        try {
            const data = await getBlogs({
                status: statusFilter || undefined,
                search: searchQuery || undefined,
                deleted: viewFilter === 'trash',
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
        setDeleteMode('soft');
        setIsDeleteModalOpen(true);
    };

    const handlePermanentDeleteClick = (id: string, title: string) => {
        setBlogToDelete({ id, title });
        setDeleteMode('permanent');
        setIsDeleteModalOpen(true);
    };

    const handleRestoreClick = (id: string, title: string) => {
        setBlogToRestore({ id, title });
        setIsRestoreModalOpen(true);
    };

    const confirmRestore = async () => {
        if (!blogToRestore) return;

        const toastId = toast.loading('Restoring blog...');
        setIsRestoreModalOpen(false);
        try {
            await restoreBlog(blogToRestore.id);
            toast.success('Blog restored successfully', { id: toastId });
            loadBlogs();
        } catch (error) {
            toast.error('Failed to restore blog', { id: toastId });
        } finally {
            setBlogToRestore(null);
        }
    };

    const confirmDelete = async () => {
        if (!blogToDelete) return;

        const toastId = toast.loading(
            deleteMode === 'permanent' ? 'Permanently deleting blog...' : 'Moving to trash...'
        );
        setIsDeleteModalOpen(false);

        try {
            if (deleteMode === 'permanent') {
                await permanentlyDeleteBlog(blogToDelete.id);
                toast.success('Blog permanently deleted', { id: toastId });
            } else {
                await deleteBlog(blogToDelete.id);
                toast.success('Blog moved to trash', { id: toastId });
            }
            loadBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Failed to delete blog', { id: toastId });
        } finally {
            setBlogToDelete(null);
        }
    };

    const handleToggleFeatured = async (id: string, currentStatus: boolean, title: string) => {
        const toastId = toast.loading(`${currentStatus ? 'Removing' : 'Adding'} featured status...`);
        try {
            await toggleFeaturedBlog(id, !currentStatus);
            toast.success(`Successfully ${currentStatus ? 'removed' : 'added'} featured status`, { id: toastId });
            loadBlogs();
        } catch (error) {
            console.error('Error toggling featured status:', error);
            toast.error('Failed to update featured status', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Blogs</h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your blog posts</p>
                </div>
                <Link
                    href="/blogs/create"
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors whitespace-nowrap"
                >
                    <Plus size={20} />
                    <span>Create New Blog</span>
                </Link>
            </div>

            {/* View Toggle Tabs */}
            <div className="flex space-x-2">
                <button
                    onClick={() => setViewFilter('active')}
                    className={`px-4 py-2 rounded transition-colors ${viewFilter === 'active'
                        ? 'bg-[#00A99D] text-white'
                        : 'bg-white text-gray-700 hover:bg-[#00A99D]/10 border border-[#00A99D]/30'
                        }`}
                >
                    Active Blogs
                </button>
                <button
                    onClick={() => setViewFilter('trash')}
                    className={`px-4 py-2 rounded transition-colors flex items-center space-x-2 ${viewFilter === 'trash'
                        ? 'bg-[#DC3545] text-white'
                        : 'bg-white text-gray-700 hover:bg-[#DC3545]/10 border border-[#DC3545]/30'
                        }`}
                >
                    <Trash size={16} />
                    <span>Trash</span>
                </button>
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
                        <table className="w-full min-w-[640px]">
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
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleToggleFeatured(blog.id, blog.featured, blog.title)}
                                                    className={`transition-colors focus:outline-none ${blog.featured ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                                    title={blog.featured ? 'Remove from featured' : 'Mark as featured'}
                                                >
                                                    <Star size={18} fill={blog.featured ? "currentColor" : "none"} />
                                                </button>
                                                <div>
                                                    <div className="flex items-center">
                                                        <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                                                        {blog.featured && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wider">
                                                                <Star size={10} className="mr-1" fill="currentColor" />
                                                                Featured
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{blog.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {blog.author_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${blog.status === 'published' ? 'bg-primary/10 text-primary-dark' : 'bg-secondary/10 text-secondary'}`}>
                                                {blog.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(blog.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                {viewFilter === 'active' ? (
                                                    <>
                                                        <Link
                                                            href={`/blogs/${blog.id}/edit`}
                                                            className="text-[#00A99D] hover:text-[#008F84]"
                                                        >
                                                            <Edit size={18} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteClick(blog.id, blog.title)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleRestoreClick(blog.id, blog.title)}
                                                            className="text-[#00A99D] hover:text-[#008F84]"
                                                            title="Restore"
                                                        >
                                                            <RotateCcw size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePermanentDeleteClick(blog.id, blog.title)}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Permanently Delete"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </>
                                                )}
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
                title={deleteMode === 'permanent' ? 'Permanently Delete Blog?' : 'Move Blog to Trash?'}
            >
                <div className="space-y-4">
                    <div className="flex items-center p-3 rounded-md" style={{ backgroundColor: deleteMode === 'permanent' ? '#fee' : '#fef3c7' }}>
                        <AlertTriangle className="mr-3 flex-shrink-0" style={{ color: deleteMode === 'permanent' ? '#DC3545' : '#f59e0b' }} size={24} />
                        <p className="text-sm" style={{ color: deleteMode === 'permanent' ? '#991b1b' : '#92400e' }}>
                            {deleteMode === 'permanent' ? 'Warning: This action cannot be undone!' : 'This item will be moved to trash.'}
                        </p>
                    </div>
                    <p className="text-gray-600">
                        {deleteMode === 'permanent' ? (
                            <>Permanently delete <span className="font-semibold text-gray-800">"{blogToDelete?.title}"</span>? This cannot be undone!</>
                        ) : (
                            <>Move <span className="font-semibold text-gray-800">"{blogToDelete?.title}"</span> to trash? You can restore it later.</>
                        )}
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
                            className={`px-4 py-2 text-white rounded transition-colors flex items-center ${deleteMode === 'permanent'
                                ? 'bg-[#DC3545] hover:bg-[#DC3545]/90'
                                : 'bg-[#00A99D] hover:bg-[#008F84]'
                                }`}
                        >
                            <Trash2 size={16} className="mr-2" />
                            {deleteMode === 'permanent' ? 'Permanently Delete' : 'Move to Trash'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Restore Confirmation Modal */}
            <Modal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                title="Restore Blog Post?"
            >
                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-primary/10 rounded-md">
                        <RotateCcw className="text-primary mr-3 flex-shrink-0" size={24} />
                        <p className="text-sm text-primary-dark">
                            This will move the blog post back to your active list.
                        </p>
                    </div>
                    <p className="text-gray-600">
                        Restore <span className="font-semibold text-gray-800">"{blogToRestore?.title}"</span> to active status?
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={() => setIsRestoreModalOpen(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmRestore}
                            className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors flex items-center"
                        >
                            <RotateCcw size={16} className="mr-2" />
                            Restore Blog
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

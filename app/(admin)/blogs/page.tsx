'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search, AlertTriangle, RotateCcw, Trash, Star, Globe } from 'lucide-react';
import { getBlogs, deleteBlog, restoreBlog, permanentlyDeleteBlog, toggleFeaturedBlog } from './actions';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────
type Blog = any;

/** Group blogs into EN/NL pairs.
 *  A "pair" is two posts where one has pair_id pointing to the other's id.
 *  Because only the newly-created counterpart stores pair_id, we check both
 *  directions: A→B (A.pair_id === B.id) and B→A (B.pair_id === A.id).
 */
function groupByPairId(blogs: Blog[]): Blog[][] {
    const byId = new Map<string, Blog>();
    for (const b of blogs) byId.set(b.id, b);

    const visited = new Set<string>();
    const groups: Blog[][] = [];

    // Paired posts first
    for (const b of blogs) {
        if (visited.has(b.id)) continue;

        // Does this post point at another?
        const directPartner = b.pair_id ? byId.get(b.pair_id) : null;
        // Does any unvisited post point back at this one?
        const reversePartner = !directPartner
            ? blogs.find((x) => x.pair_id === b.id && !visited.has(x.id))
            : null;

        const partner = directPartner ?? reversePartner ?? null;

        if (partner && !visited.has(partner.id)) {
            // Always put English first
            const group = b.is_english ? [b, partner] : [partner, b];
            groups.push(group);
            visited.add(b.id);
            visited.add(partner.id);
        } else if (!partner) {
            // Solo card — no partner found
            groups.push([b]);
            visited.add(b.id);
        }
        // If partner was already visited we skip (it was handled in a prior iteration)
    }

    return groups;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${status === 'published' ? 'bg-[#00A99D]/10 text-[#007A73]' : 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    );
}

function LangBadge({ isEnglish }: { isEnglish: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${isEnglish ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
            <Globe size={10} />
            {isEnglish ? 'EN' : 'NL'}
        </span>
    );
}

interface CardProps {
    blog: Blog;
    viewFilter: 'active' | 'trash';
    onDelete: (id: string, title: string) => void;
    onPermanentDelete: (id: string, title: string) => void;
    onRestore: (id: string, title: string) => void;
    onToggleFeatured: (id: string, featured: boolean, title: string) => void;
}

function BlogCard({ blog, viewFilter, onDelete, onPermanentDelete, onRestore, onToggleFeatured }: CardProps) {
    return (
        <div className={`flex-1 min-w-0 rounded-lg border bg-white p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow ${blog.is_english ? 'border-blue-100' : 'border-orange-100'}`}>
            {/* Top row: lang badge + featured star */}
            <div className="flex items-center justify-between">
                <LangBadge isEnglish={blog.is_english} />
                <button
                    onClick={() => onToggleFeatured(blog.id, blog.featured, blog.title)}
                    className={`transition-colors focus:outline-none ${blog.featured ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                    title={blog.featured ? 'Remove featured' : 'Mark as featured'}
                >
                    <Star size={16} fill={blog.featured ? 'currentColor' : 'none'} />
                </button>
            </div>

            {/* Title */}
            <div>
                <div className="text-sm font-semibold text-gray-900 leading-snug">{blog.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{blog.slug}</div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                <span>{blog.author_name || 'Unknown'}</span>
                {blog.category && <><span>·</span><span>{blog.category}</span></>}
                <span>·</span>
                <span>{format(new Date(blog.created_at), 'MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <StatusBadge status={blog.status} />
                <div className="flex items-center gap-2">
                    {viewFilter === 'active' ? (
                        <>
                            <Link href={`/blogs/${blog.id}/edit`} className="text-[#00A99D] hover:text-[#008F84]" title="Edit">
                                <Edit size={16} />
                            </Link>
                            <button onClick={() => onDelete(blog.id, blog.title)} className="text-red-500 hover:text-red-700" title="Move to trash">
                                <Trash2 size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onRestore(blog.id, blog.title)} className="text-[#00A99D] hover:text-[#008F84]" title="Restore">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={() => onPermanentDelete(blog.id, blog.title)} className="text-red-500 hover:text-red-700" title="Permanently delete">
                                <Trash size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
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

    useEffect(() => { loadBlogs(); }, [statusFilter, searchQuery, viewFilter]);

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

    const grouped = useMemo(() => groupByPairId(blogs), [blogs]);

    const handleDeleteClick = (id: string, title: string) => { setBlogToDelete({ id, title }); setDeleteMode('soft'); setIsDeleteModalOpen(true); };
    const handlePermanentDeleteClick = (id: string, title: string) => { setBlogToDelete({ id, title }); setDeleteMode('permanent'); setIsDeleteModalOpen(true); };
    const handleRestoreClick = (id: string, title: string) => { setBlogToRestore({ id, title }); setIsRestoreModalOpen(true); };

    const confirmRestore = async () => {
        if (!blogToRestore) return;
        const toastId = toast.loading('Restoring blog...');
        setIsRestoreModalOpen(false);
        try {
            await restoreBlog(blogToRestore.id);
            toast.success('Blog restored successfully', { id: toastId });
            loadBlogs();
        } catch { toast.error('Failed to restore blog', { id: toastId }); }
        finally { setBlogToRestore(null); }
    };

    const confirmDelete = async () => {
        if (!blogToDelete) return;
        const toastId = toast.loading(deleteMode === 'permanent' ? 'Permanently deleting...' : 'Moving to trash...');
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
            toast.error('Failed to delete blog', { id: toastId });
        } finally { setBlogToDelete(null); }
    };

    const handleToggleFeatured = async (id: string, currentStatus: boolean, title: string) => {
        const toastId = toast.loading(`${currentStatus ? 'Removing' : 'Adding'} featured status...`);
        try {
            await toggleFeaturedBlog(id, !currentStatus);
            toast.success(`Successfully ${currentStatus ? 'removed' : 'added'} featured status`, { id: toastId });
            loadBlogs();
        } catch { toast.error('Failed to update featured status', { id: toastId }); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Blogs</h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your blog posts — English &amp; Dutch versions shown side by side</p>
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
                    className={`px-4 py-2 rounded transition-colors ${viewFilter === 'active' ? 'bg-[#00A99D] text-white' : 'bg-white text-gray-700 hover:bg-[#00A99D]/10 border border-[#00A99D]/30'}`}
                >
                    Active Blogs
                </button>
                <button
                    onClick={() => setViewFilter('trash')}
                    className={`px-4 py-2 rounded transition-colors flex items-center space-x-2 ${viewFilter === 'trash' ? 'bg-[#DC3545] text-white' : 'bg-white text-gray-700 hover:bg-[#DC3545]/10 border border-[#DC3545]/30'}`}
                >
                    <Trash size={16} />
                    <span>Trash</span>
                </button>
            </div>

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search blogs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-10 w-full"
                        />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </div>
            </div>

            {/* Card Grid */}
            <div className="space-y-4">
                {loading ? (
                    <div className="admin-card p-8 text-center text-gray-500">Loading...</div>
                ) : grouped.length === 0 ? (
                    <div className="admin-card p-8 text-center text-gray-500">
                        No blogs found. Create your first blog post!
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div
                            key={group[0].slug}
                            className="admin-card p-4"
                        >
                            {/* Slug header */}
                            <div className="text-xs font-mono text-gray-400 mb-3 px-1">/{group[0].slug}</div>
                            {/* Side-by-side cards */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {group.map((blog) => (
                                    <BlogCard
                                        key={blog.id}
                                        blog={blog}
                                        viewFilter={viewFilter}
                                        onDelete={handleDeleteClick}
                                        onPermanentDelete={handlePermanentDeleteClick}
                                        onRestore={handleRestoreClick}
                                        onToggleFeatured={handleToggleFeatured}
                                    />
                                ))}
                                {/* Placeholder when only one language exists */}
                                {group.length === 1 && (
                                    <div className={`flex-1 min-w-0 rounded-lg border-2 border-dashed p-4 flex items-center justify-center text-sm ${group[0].is_english ? 'border-orange-100 text-orange-300' : 'border-blue-100 text-blue-300'}`}>
                                        <Link
                                            href={`/blogs/create?lang=${group[0].is_english ? 'nl' : 'en'}&pair_id=${encodeURIComponent(group[0].pair_id || group[0].id)}&author=${encodeURIComponent(group[0].author_name || '')}&category=${encodeURIComponent(group[0].category || '')}`}
                                            className="flex flex-col items-center gap-1 hover:opacity-75 transition-opacity"
                                        >
                                            <Plus size={20} />
                                            <span className="text-xs">{group[0].is_english ? 'Add Dutch version' : 'Add English version'}</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
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
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300">
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className={`px-4 py-2 text-white rounded transition-colors flex items-center ${deleteMode === 'permanent' ? 'bg-[#DC3545] hover:bg-[#DC3545]/90' : 'bg-[#00A99D] hover:bg-[#008F84]'}`}
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
                        <p className="text-sm text-primary-dark">This will move the blog post back to your active list.</p>
                    </div>
                    <p className="text-gray-600">
                        Restore <span className="font-semibold text-gray-800">"{blogToRestore?.title}"</span> to active status?
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button onClick={() => setIsRestoreModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300">
                            Cancel
                        </button>
                        <button onClick={confirmRestore} className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors flex items-center">
                            <RotateCcw size={16} className="mr-2" />
                            Restore Blog
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

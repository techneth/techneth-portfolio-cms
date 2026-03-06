'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Star, AlertTriangle, RotateCcw, Trash, Globe } from 'lucide-react';
import { getCaseStudies, deleteCaseStudy, restoreCaseStudy, permanentlyDeleteCaseStudy, toggleFeaturedCaseStudy } from './actions';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';

// ─── Types ───────────────────────────────────────────────────────────────────
type CS = any;

/** Group case studies into EN/NL pairs.
 *  Because only the newly-created counterpart stores pair_id, we check both
 *  directions: A.pair_id===B.id and B.pair_id===A.id.
 */
function groupByPairId(items: CS[]): CS[][] {
    const byId = new Map<string, CS>();
    for (const cs of items) byId.set(cs.id, cs);

    const visited = new Set<string>();
    const groups: CS[][] = [];

    for (const cs of items) {
        if (visited.has(cs.id)) continue;

        const directPartner = cs.pair_id ? byId.get(cs.pair_id) : null;
        const reversePartner = !directPartner
            ? items.find((x) => x.pair_id === cs.id && !visited.has(x.id))
            : null;

        const partner = directPartner ?? reversePartner ?? null;

        if (partner && !visited.has(partner.id)) {
            const group = cs.is_english ? [cs, partner] : [partner, cs];
            groups.push(group);
            visited.add(cs.id);
            visited.add(partner.id);
        } else if (!partner) {
            groups.push([cs]);
            visited.add(cs.id);
        }
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
    cs: CS;
    viewFilter: 'active' | 'trash';
    onDelete: (id: string, title: string) => void;
    onPermanentDelete: (id: string, title: string) => void;
    onRestore: (id: string, title: string) => void;
    onToggleFeatured: (id: string, featured: boolean, title: string) => void;
}

function CaseStudyCard({ cs, viewFilter, onDelete, onPermanentDelete, onRestore, onToggleFeatured }: CardProps) {
    return (
        <div className={`flex-1 min-w-0 rounded-lg border bg-white p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow ${cs.is_english ? 'border-blue-100' : 'border-orange-100'}`}>
            {/* Top row: lang badge + featured star */}
            <div className="flex items-center justify-between">
                <LangBadge isEnglish={cs.is_english} />
                <button
                    onClick={() => onToggleFeatured(cs.id, cs.featured, cs.title)}
                    className={`transition-colors focus:outline-none ${cs.featured ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                    title={cs.featured ? 'Remove featured' : 'Mark as featured'}
                >
                    <Star size={16} fill={cs.featured ? 'currentColor' : 'none'} />
                </button>
            </div>

            {/* Title */}
            <div>
                <div className="text-sm font-semibold text-gray-900 leading-snug">{cs.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{cs.slug}</div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                {cs.client_name && <span>{cs.client_name}</span>}
                {cs.industry && <><span>·</span><span>{cs.industry}</span></>}
                {cs.category && <><span>·</span><span>{cs.category}</span></>}
                <span>·</span>
                <span>{format(new Date(cs.created_at), 'MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <StatusBadge status={cs.status} />
                <div className="flex items-center gap-2">
                    {viewFilter === 'active' ? (
                        <>
                            <Link href={`/case-studies/${cs.id}/edit`} className="text-[#00A99D] hover:text-[#008F84]" title="Edit">
                                <Edit size={16} />
                            </Link>
                            <button onClick={() => onDelete(cs.id, cs.title)} className="text-red-500 hover:text-red-700" title="Move to trash">
                                <Trash2 size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onRestore(cs.id, cs.title)} className="text-[#00A99D] hover:text-[#008F84]" title="Restore">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={() => onPermanentDelete(cs.id, cs.title)} className="text-red-500 hover:text-red-700" title="Permanently delete">
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
export default function CaseStudiesPage() {
    const [caseStudies, setCaseStudies] = useState<CS[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'active' | 'trash'>('active');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [csToDelete, setCsToDelete] = useState<{ id: string; title: string } | null>(null);
    const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');

    useEffect(() => { loadCaseStudies(); }, [searchQuery, viewFilter]);

    const loadCaseStudies = async () => {
        setLoading(true);
        try {
            const data = await getCaseStudies({
                search: searchQuery || undefined,
                deleted: viewFilter === 'trash'
            });
            setCaseStudies(data);
        } catch (error) {
            console.error('Error loading case studies:', error);
            toast.error('Failed to load case studies');
        } finally {
            setLoading(false);
        }
    };

    const grouped = useMemo(() => groupByPairId(caseStudies), [caseStudies]);

    const handleDeleteClick = (id: string, title: string) => { setCsToDelete({ id, title }); setDeleteMode('soft'); setIsDeleteModalOpen(true); };
    const handlePermanentDeleteClick = (id: string, title: string) => { setCsToDelete({ id, title }); setDeleteMode('permanent'); setIsDeleteModalOpen(true); };

    const handleRestore = async (id: string, title: string) => {
        const toastId = toast.loading('Restoring case study...');
        try {
            await restoreCaseStudy(id);
            toast.success('Case study restored successfully', { id: toastId });
            loadCaseStudies();
        } catch { toast.error('Failed to restore case study', { id: toastId }); }
    };

    const confirmDelete = async () => {
        if (!csToDelete) return;
        const toastId = toast.loading(deleteMode === 'permanent' ? 'Permanently deleting...' : 'Moving to trash...');
        setIsDeleteModalOpen(false);
        try {
            if (deleteMode === 'permanent') {
                await permanentlyDeleteCaseStudy(csToDelete.id);
                toast.success('Case study permanently deleted', { id: toastId });
            } else {
                await deleteCaseStudy(csToDelete.id);
                toast.success('Case study moved to trash', { id: toastId });
            }
            loadCaseStudies();
        } catch (error) {
            toast.error('Failed to delete case study', { id: toastId });
        } finally { setCsToDelete(null); }
    };

    const handleToggleFeatured = async (id: string, currentStatus: boolean, title: string) => {
        const toastId = toast.loading(`${currentStatus ? 'Removing' : 'Adding'} featured status...`);
        try {
            await toggleFeaturedCaseStudy(id, !currentStatus);
            toast.success(`Successfully ${currentStatus ? 'removed' : 'added'} featured status`, { id: toastId });
            loadCaseStudies();
        } catch { toast.error('Failed to update featured status', { id: toastId }); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Case Studies</h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your portfolio — English &amp; Dutch versions shown side by side</p>
                </div>
                <Link
                    href="/case-studies/create"
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors whitespace-nowrap"
                >
                    <Plus size={20} />
                    <span>Create Case Study</span>
                </Link>
            </div>

            {/* View Toggle Tabs */}
            <div className="flex space-x-2">
                <button
                    onClick={() => setViewFilter('active')}
                    className={`px-4 py-2 rounded transition-colors ${viewFilter === 'active' ? 'bg-[#00A99D] text-white' : 'bg-white text-gray-700 hover:bg-[#00A99D]/10 border border-[#00A99D]/30'}`}
                >
                    Active Portfolio
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
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search case studies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 w-full"
                    />
                </div>
            </div>

            {/* Card Grid */}
            <div className="space-y-4">
                {loading ? (
                    <div className="admin-card p-8 text-center text-gray-500">Loading...</div>
                ) : grouped.length === 0 ? (
                    <div className="admin-card p-8 text-center text-gray-500">
                        No case studies found. Create your first case study!
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div key={group[0].slug} className="admin-card p-4">
                            {/* Slug header */}
                            <div className="text-xs font-mono text-gray-400 mb-3 px-1">/{group[0].slug}</div>
                            {/* Side-by-side cards */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {group.map((cs) => (
                                    <CaseStudyCard
                                        key={cs.id}
                                        cs={cs}
                                        viewFilter={viewFilter}
                                        onDelete={handleDeleteClick}
                                        onPermanentDelete={handlePermanentDeleteClick}
                                        onRestore={handleRestore}
                                        onToggleFeatured={handleToggleFeatured}
                                    />
                                ))}
                                {/* Placeholder when only one language exists */}
                                {group.length === 1 && (
                                    <div className={`flex-1 min-w-0 rounded-lg border-2 border-dashed p-4 flex items-center justify-center text-sm ${group[0].is_english ? 'border-orange-100 text-orange-300' : 'border-blue-100 text-blue-300'}`}>
                                        <Link
                                            href={`/case-studies/create?lang=${group[0].is_english ? 'nl' : 'en'}&pair_id=${encodeURIComponent(group[0].pair_id || group[0].id)}&category=${encodeURIComponent(group[0].category || '')}&client=${encodeURIComponent(group[0].client_name || '')}&industry=${encodeURIComponent(group[0].industry || '')}`}
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
                title={deleteMode === 'permanent' ? 'Permanently Delete Case Study?' : 'Move Case Study to Trash?'}
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
                            <>Permanently delete <span className="font-semibold text-gray-800">"{csToDelete?.title}"</span>? This cannot be undone!</>
                        ) : (
                            <>Move <span className="font-semibold text-gray-800">"{csToDelete?.title}"</span> to trash? You can restore it later.</>
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
        </div>
    );
}

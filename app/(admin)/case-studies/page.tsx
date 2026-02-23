'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Star, Search, AlertTriangle, RotateCcw, Trash } from 'lucide-react';
import { getCaseStudies, deleteCaseStudy, restoreCaseStudy, permanentlyDeleteCaseStudy } from './actions';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';

export default function CaseStudiesPage() {
    const [caseStudies, setCaseStudies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'active' | 'trash'>('active');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [csToDelete, setCsToDelete] = useState<{ id: string; title: string } | null>(null);
    const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');

    useEffect(() => {
        loadCaseStudies();
    }, [searchQuery, viewFilter]);

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

    const handleDeleteClick = (id: string, title: string) => {
        setCsToDelete({ id, title });
        setDeleteMode('soft');
        setIsDeleteModalOpen(true);
    };

    const handlePermanentDeleteClick = (id: string, title: string) => {
        setCsToDelete({ id, title });
        setDeleteMode('permanent');
        setIsDeleteModalOpen(true);
    };

    const handleRestore = async (id: string, title: string) => {
        const toastId = toast.loading('Restoring case study...');
        try {
            await restoreCaseStudy(id);
            toast.success('Case study restored successfully', { id: toastId });
            loadCaseStudies();
        } catch (error) {
            toast.error('Failed to restore case study', { id: toastId });
        }
    };

    const confirmDelete = async () => {
        if (!csToDelete) return;

        const toastId = toast.loading(
            deleteMode === 'permanent' ? 'Permanently deleting case study...' : 'Moving to trash...'
        );
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
            console.error('Error deleting case study:', error);
            toast.error('Failed to delete case study', { id: toastId });
        } finally {
            setCsToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Case Studies</h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your portfolio case studies</p>
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
                    className={`px-4 py-2 rounded transition-colors ${viewFilter === 'active'
                        ? 'bg-[#00A99D] text-white'
                        : 'bg-white text-gray-700 hover:bg-[#00A99D]/10 border border-[#00A99D]/30'
                        }`}
                >
                    Active Portfolio
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
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search case studies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 w-full"
                    />
                </div>
            </div>

            {/* Case Studies Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : caseStudies.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No case studies found. Create your first case study!
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
                                        Client/Industry
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
                                {caseStudies.map((cs) => (
                                    <tr key={cs.id} className="table-row">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {cs.is_featured && (
                                                    <Star className="text-primary" size={16} fill="currentColor" />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{cs.title}</div>
                                                    <div className="text-sm text-gray-500">{cs.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div>{cs.client_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{cs.industry || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cs.status === 'published' ? 'bg-primary/10 text-primary-dark' : 'bg-secondary/10 text-secondary'}`}>
                                                {cs.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(cs.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                {viewFilter === 'active' ? (
                                                    <>
                                                        <Link
                                                            href={`/case-studies/${cs.id}/edit`}
                                                            className="text-[#00A99D] hover:text-[#008F84]"
                                                        >
                                                            <Edit size={18} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteClick(cs.id, cs.title)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleRestore(cs.id, cs.title)}
                                                            className="text-[#00A99D] hover:text-[#008F84]"
                                                            title="Restore"
                                                        >
                                                            <RotateCcw size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePermanentDeleteClick(cs.id, cs.title)}
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
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { getCaseStudies, deleteCaseStudy } from './actions';
import { format } from 'date-fns';

export default function CaseStudiesPage() {
    const [caseStudies, setCaseStudies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCaseStudies();
    }, []);

    const loadCaseStudies = async () => {
        setLoading(true);
        try {
            const data = await getCaseStudies();
            setCaseStudies(data);
        } catch (error) {
            console.error('Error loading case studies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            await deleteCaseStudy(id);
            loadCaseStudies();
        } catch (error) {
            alert('Failed to delete case study');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Case Studies</h1>
                    <p className="text-gray-600 mt-2">Manage your portfolio case studies</p>
                </div>
                <Link
                    href="/admin/case-studies/create"
                    className="flex items-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                >
                    <Plus size={20} />
                    <span>Create Case Study</span>
                </Link>
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
                                        Client
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Industry
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
                                                    <Star className="text-yellow-500" size={16} fill="currentColor" />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{cs.title}</div>
                                                    <div className="text-sm text-gray-500">{cs.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {cs.client_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {cs.industry || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${cs.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                                                {cs.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(cs.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                <Link
                                                    href={`/admin/case-studies/${cs.id}/edit`}
                                                    className="text-[#00A99D] hover:text-[#008F84]"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(cs.id, cs.title)}
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
        </div >
    );
}

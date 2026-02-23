'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Briefcase, MapPin, Clock, Power, PowerOff, AlertTriangle } from 'lucide-react';
import { getJobs, toggleJobStatus, deleteJob, Job } from './actions';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import Modal from '@/components/admin/Modal';

export default function CareersPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => {
        loadJobs();
    }, [departmentFilter, locationFilter, typeFilter, statusFilter]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (departmentFilter) filters.department = departmentFilter;
            if (locationFilter) filters.location = locationFilter;
            if (typeFilter) filters.employment_type = typeFilter;
            if (statusFilter !== '') filters.is_active = statusFilter === 'active';

            const data = await getJobs(filters);
            setJobs(data);
        } catch (error: any) {
            console.error('Error loading jobs:', error);
            toast.error(error.message || 'Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string) => {
        const toastId = toast.loading('Updating job status...');
        try {
            await toggleJobStatus(id);
            toast.success('Job status updated', { id: toastId });
            loadJobs();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status', { id: toastId });
        }
    };

    const handleDeleteClick = (id: string, title: string) => {
        setJobToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!jobToDelete) return;

        const toastId = toast.loading('Deactivating job...');
        setIsDeleteModalOpen(false);
        try {
            await deleteJob(jobToDelete.id);
            toast.success('Job deactivated successfully', { id: toastId });
            loadJobs();
        } catch (error: any) {
            toast.error(error.message || 'Failed to deactivate job', { id: toastId });
        } finally {
            setJobToDelete(null);
        }
    };

    const getEmploymentTypeBadge = (type: string) => {
        const colors: any = {
            'full-time': 'bg-secondary/10 text-secondary',
            'part-time': 'bg-primary/10 text-primary-dark', // CHANGED
            'contract': 'bg-secondary/10 text-secondary',
            'internship': 'bg-primary/20 text-primary-dark',
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    // Get unique values for filters
    const uniqueDepartments = [...new Set(jobs.map(j => j.department))];
    const uniqueLocations = [...new Set(jobs.map(j => j.location))];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Careers & Jobs</h1>
                    <p className="text-gray-600 mt-2">Manage job postings and career opportunities</p>
                </div>
                <Link
                    href="/careers/create"
                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors" // CHANGED
                >
                    <Plus size={20} />
                    <span>Post New Job</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">All Departments</option>
                            {uniqueDepartments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">All Locations</option>
                            {uniqueLocations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">All Types</option>
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No jobs found. Post your first job!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Job Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="table-row">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"> {/* CHANGED */}
                                                        <Briefcase className="text-primary" size={20} /> {/* CHANGED */}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                                                    {job.experience_level && (
                                                        <div className="text-xs text-gray-500 capitalize">{job.experience_level} level</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{job.department}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-1 text-sm text-gray-900">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span>{job.location}</span>
                                                {job.is_remote && (
                                                    <span className="ml-1 text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded">Remote</span> // CHANGED
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentTypeBadge(job.employment_type)}`}>
                                                <Clock size={12} className="mr-1" />
                                                {job.employment_type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(job.id)}
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${job.is_active
                                                    ? 'bg-primary/10 text-primary-dark hover:bg-primary/20'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    }`}
                                            >
                                                {job.is_active ? <Power size={12} className="mr-1" /> : <PowerOff size={12} className="mr-1" />}
                                                {job.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-3">
                                                <Link
                                                    href={`/careers/${job.id}/edit`}
                                                    className="text-primary hover:text-primary-dark transition-colors" // CHANGED
                                                    title="Edit job"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(job.id, job.title)}
                                                    className="text-[#DC3545] hover:text-[#DC3545]/90 transition-colors"
                                                    title="Deactivate job"
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

            {/* Deactivation Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Deactivate Job Posting?"
            >
                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-secondary/10 rounded-md">
                        <AlertTriangle className="text-secondary mr-3 flex-shrink-0" size={24} />
                        <p className="text-sm text-secondary">
                            This will hide the job from the public careers page.
                        </p>
                    </div>
                    <p className="text-gray-600">
                        Are you sure you want to deactivate <span className="font-semibold text-gray-800">"{jobToDelete?.title}"</span>?
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
                            Deactivate Job
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

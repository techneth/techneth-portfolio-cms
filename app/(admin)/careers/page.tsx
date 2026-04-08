'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Briefcase, MapPin, Clock, Power, PowerOff, AlertTriangle, Mail, Users, Eye } from 'lucide-react';
import {
    getJobs,
    toggleJobStatus,
    deleteJob,
    getJobApplications,
    updateJobApplicationStatus,
    sendApplicationEmail,
    sendBulkApplicationEmail,
    Job,
    JobApplication,
    JobApplicationStatus,
} from './actions';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Modal from '@/components/admin/Modal';

function formatUtcDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getUTCMonth()];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');

    return `${month} ${day}, ${year} ${hour}:${minute} UTC`;
}

export default function CareersPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [applicationsLoading, setApplicationsLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState('');
    const [applicationJobFilter, setApplicationJobFilter] = useState('');
    const [applicationSearch, setApplicationSearch] = useState('');
    const [applicationSort, setApplicationSort] = useState('date-desc');
    const [minExperience, setMinExperience] = useState('');
    const [maxExperience, setMaxExperience] = useState('');
    const [minSalary, setMinSalary] = useState('');
    const [maxSalary, setMaxSalary] = useState('');
    const [requireLinkedin, setRequireLinkedin] = useState('');
    const [requirePortfolio, setRequirePortfolio] = useState('');
    const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailModalMode, setEmailModalMode] = useState<'single' | 'bulk'>('single');
    const [activeApplicationForEmail, setActiveApplicationForEmail] = useState<JobApplication | null>(null);
    const [selectedApplicant, setSelectedApplicant] = useState<JobApplication | null>(null);
    const [activeDocument, setActiveDocument] = useState<'resume' | 'cover_letter'>('resume');
    const [emailSubjectTemplate, setEmailSubjectTemplate] = useState('Update on your application for {{jobTitle}}');
    const [emailBodyTemplate, setEmailBodyTemplate] = useState('Hi {{name}},\n\nThank you for applying for {{jobTitle}}.\n\nWe are writing to share an update regarding your application status ({{status}}).\n\nBest regards,\nTechneth HR Team');
    const applicationsSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // If jobs is already populated, optionally fetch in background
        loadJobs(jobs.length === 0);
    }, [departmentFilter, locationFilter, typeFilter, statusFilter]);

    useEffect(() => {
        // If applications is already populated, optionally fetch in background
        loadApplications(applications.length === 0);
    }, [applicationStatusFilter, applicationJobFilter]);

    const loadJobs = async (showLoading = true) => {
        if (showLoading) setLoading(true);
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
            if (showLoading) setLoading(false);
        }
    };

    const loadApplications = async (showLoading = true) => {
        if (showLoading) setApplicationsLoading(true);
        try {
            const filters: { status?: JobApplicationStatus; jobId?: string } = {};
            if (applicationStatusFilter) {
                filters.status = applicationStatusFilter as JobApplicationStatus;
            }
            if (applicationJobFilter) {
                filters.jobId = applicationJobFilter;
            }

            const data = await getJobApplications(filters);
            setApplications(data);
        } catch (error: any) {
            console.error('Error loading applications:', error);
            toast.error(error.message || 'Failed to load job applications');
        } finally {
            if (showLoading) setApplicationsLoading(false);
        }
    };

    const handleToggleStatus = async (id: string) => {
        const toastId = toast.loading('Updating job status...');
        // Optimistic update
        setJobs(prevJobs => prevJobs.map(job => job.id === id ? { ...job, is_active: !job.is_active } : job));
        try {
            await toggleJobStatus(id);
            toast.success('Job status updated', { id: toastId });
            loadJobs(false);
        } catch (error: any) {
            // Revert on failure
            loadJobs(false);
            toast.error(error.message || 'Failed to update status', { id: toastId });
        }
    };

    const handleDeleteClick = (id: string, title: string) => {
        setJobToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!jobToDelete) return;

        const toastId = toast.loading('Deleting job and applications...');
        setIsDeleteModalOpen(false);
        
        // Optimistic delete
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));

        try {
            await deleteJob(jobToDelete.id);
            toast.success('Job and applications deleted permanently', { id: toastId });
            loadJobs(false);
            loadApplications(false); // Reload applications to reflect deletions
        } catch (error: any) {
            loadJobs(false);
            toast.error(error.message || 'Failed to delete job', { id: toastId });
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

    const handleApplicationStatusChange = async (applicationId: string, nextStatus: JobApplicationStatus) => {
        const toastId = toast.loading('Updating applicant status...');
        
        // Optimistic update
        setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: nextStatus } : app));

        try {
            await updateJobApplicationStatus(applicationId, nextStatus);
            toast.success('Applicant status updated', { id: toastId });
            loadApplications(false);
        } catch (error: any) {
            // Revert on failure
            loadApplications(false);
            toast.error(error.message || 'Failed to update applicant status', { id: toastId });
        }
    };

    const handleViewApplicantsForJob = (jobId: string) => {
        setApplicationJobFilter(jobId);
        setSelectedApplicationIds([]);
        setTimeout(() => applicationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    const toggleApplicationSelection = (applicationId: string) => {
        setSelectedApplicationIds((prev) => {
            if (prev.includes(applicationId)) {
                return prev.filter((id) => id !== applicationId);
            }
            return [...prev, applicationId];
        });
    };

    const toggleSelectAllVisible = (ids: string[]) => {
        const allSelected = ids.length > 0 && ids.every((id) => selectedApplicationIds.includes(id));
        if (allSelected) {
            setSelectedApplicationIds((prev) => prev.filter((id) => !ids.includes(id)));
        } else {
            setSelectedApplicationIds((prev) => [...new Set([...prev, ...ids])]);
        }
    };

    const openSingleEmailModal = (application: JobApplication) => {
        setEmailModalMode('single');
        setActiveApplicationForEmail(application);
        setEmailSubjectTemplate(`Update on your application for {{jobTitle}}`);
        setEmailBodyTemplate(
            `Hi {{name}},\n\nThank you for your interest in {{jobTitle}}.\n\nCurrent status: {{status}}.\n\nBest regards,\nTechneth HR Team`
        );
        setIsEmailModalOpen(true);
    };

    const openBulkEmailModal = () => {
        if (!selectedApplicationIds.length) {
            toast.error('Select at least one applicant for bulk email');
            return;
        }
        setEmailModalMode('bulk');
        setActiveApplicationForEmail(null);
        setEmailSubjectTemplate('Update regarding your {{jobTitle}} application');
        setEmailBodyTemplate(
            `Hi {{name}},\n\nThis is an update regarding your application for {{jobTitle}}.\n\nCurrent status: {{status}}.\n\nBest regards,\nTechneth HR Team`
        );
        setIsEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!emailSubjectTemplate.trim() || !emailBodyTemplate.trim()) {
            toast.error('Subject and email body are required');
            return;
        }

        const toastId = toast.loading(
            emailModalMode === 'single' ? 'Sending email...' : 'Sending bulk emails...'
        );

        try {
            if (emailModalMode === 'single') {
                if (!activeApplicationForEmail) {
                    toast.error('No applicant selected', { id: toastId });
                    return;
                }

                await sendApplicationEmail(activeApplicationForEmail.id, {
                    subjectTemplate: emailSubjectTemplate,
                    bodyTemplate: emailBodyTemplate,
                });
                toast.success('Email sent successfully', { id: toastId });
            } else {
                const result = await sendBulkApplicationEmail(selectedApplicationIds, {
                    subjectTemplate: emailSubjectTemplate,
                    bodyTemplate: emailBodyTemplate,
                });
                toast.success(`Bulk email complete. Sent: ${result.sent}, Failed: ${result.failed}`, {
                    id: toastId,
                });
                setSelectedApplicationIds([]);
            }

            setIsEmailModalOpen(false);
            loadApplications(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to send email', { id: toastId });
        }
    };

    const parseNumber = (val: string | null | undefined): number => {
        if (!val) return NaN;
        const match = String(val).replace(/,/g, '').match(/\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : NaN;
    };

    const filteredApplications = applications
        .filter((app) => {
            if (applicationSearch.trim()) {
                const q = applicationSearch.toLowerCase();
                const nameMatch = app.full_name?.toLowerCase().includes(q) || false;
                const emailMatch = app.email?.toLowerCase().includes(q) || false;
                const jobMatch = app.job_title_snapshot?.toLowerCase().includes(q) || false;
                
                if (!nameMatch && !emailMatch && !jobMatch) {
                    return false;
                }
            }

            const expNum = parseNumber(app.experience);
            const salNum = parseNumber(app.expected_salary);

            // Experience Filters
            if (minExperience !== '') {
                if (isNaN(expNum) || expNum < Number(minExperience)) return false;
            }
            if (maxExperience !== '') {
                if (isNaN(expNum) || expNum > Number(maxExperience)) return false;
            }

            // Salary Filters
            if (minSalary !== '') {
                if (isNaN(salNum) || salNum < Number(minSalary)) return false;
            }
            if (maxSalary !== '') {
                if (isNaN(salNum) || salNum > Number(maxSalary)) return false;
            }

            // Reference links filters
            if (requireLinkedin !== '') {
                const hasLinkedin = !!app.linkedin && app.linkedin.trim() !== '';
                if (requireLinkedin === 'yes' && !hasLinkedin) return false;
                if (requireLinkedin === 'no' && hasLinkedin) return false;
            }

            if (requirePortfolio !== '') {
                const hasPortfolio = !!app.portfolio && app.portfolio.trim() !== '';
                if (requirePortfolio === 'yes' && !hasPortfolio) return false;
                if (requirePortfolio === 'no' && hasPortfolio) return false;
            }

            return true;
        })
        .sort((a, b) => {
            if (applicationSort === 'date-desc') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (applicationSort === 'date-asc') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            if (applicationSort === 'name-asc') {
                return a.full_name.localeCompare(b.full_name);
            }
            if (applicationSort === 'name-desc') {
                return b.full_name.localeCompare(a.full_name);
            }

            const expA = parseNumber(a.experience) || 0;
            const expB = parseNumber(b.experience) || 0;
            const salA = parseNumber(a.expected_salary) || 0;
            const salB = parseNumber(b.expected_salary) || 0;

            if (applicationSort === 'exp-desc') return expB - expA;
            if (applicationSort === 'exp-asc') return expA - expB;
            if (applicationSort === 'salary-desc') return salB - salA;
            if (applicationSort === 'salary-asc') return salA - salB;
            
            return 0;
        });

    // Get unique values for filters
    const uniqueDepartments = [...new Set(jobs.map(j => j.department))];
    const uniqueLocations = [...new Set(jobs.map(j => j.location))];

    return (
        <div className="space-y-6" suppressHydrationWarning>
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
                                                <button
                                                    onClick={() => handleViewApplicantsForJob(job.id)}
                                                    className="text-primary hover:text-primary-dark transition-colors"
                                                    title="View applicants"
                                                >
                                                    <Users size={18} />
                                                </button>
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
                                                    title="Delete job and associated applications"
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

            {/* Applications Management */}
            <div ref={applicationsSectionRef} className="admin-card overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Users size={20} className="text-primary" />
                                Job Applications
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Review applicants, update status, and send individual or bulk emails using templates.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openBulkEmailModal}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                            disabled={selectedApplicationIds.length === 0}
                        >
                            <Mail size={16} />
                            Send Bulk Email ({selectedApplicationIds.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Applicant Search</label>
                            <input
                                type="text"
                                value={applicationSearch}
                                onChange={(e) => setApplicationSearch(e.target.value)}
                                placeholder="Search by name, email, or job title"
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                            <select
                                value={applicationSort}
                                onChange={(e) => setApplicationSort(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="exp-desc">Experience (High-Low)</option>
                                <option value="exp-asc">Experience (Low-High)</option>
                                <option value="salary-desc">Salary (High-Low)</option>
                                <option value="salary-asc">Salary (Low-High)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Application Status</label>
                            <select
                                value={applicationStatusFilter}
                                onChange={(e) => setApplicationStatusFilter(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">All Statuses</option>
                                <option value="new">New</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="rejected">Rejected</option>
                                <option value="hired">Hired</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Post</label>
                            <select
                                value={applicationJobFilter}
                                onChange={(e) => {
                                    setApplicationJobFilter(e.target.value);
                                    setSelectedApplicationIds([]);
                                }}
                                className="input-field w-full"
                            >
                                <option value="">All Jobs</option>
                                {jobs.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Min Experience (Years)</label>
                            <input
                                type="number"
                                min="0"
                                value={minExperience}
                                onChange={(e) => setMinExperience(e.target.value)}
                                placeholder="e.g. 2"
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Max Experience (Years)</label>
                            <input
                                type="number"
                                min="0"
                                value={maxExperience}
                                onChange={(e) => setMaxExperience(e.target.value)}
                                placeholder="e.g. 5"
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Min Salary ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={minSalary}
                                onChange={(e) => setMinSalary(e.target.value)}
                                placeholder="e.g. 50000"
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Max Salary ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={maxSalary}
                                onChange={(e) => setMaxSalary(e.target.value)}
                                placeholder="e.g. 100000"
                                className="input-field w-full"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Has LinkedIn</label>
                            <select
                                value={requireLinkedin}
                                onChange={(e) => setRequireLinkedin(e.target.value)}
                                className="input-field w-full text-sm"
                            >
                                <option value="">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Has Portfolio</label>
                            <select
                                value={requirePortfolio}
                                onChange={(e) => setRequirePortfolio(e.target.value)}
                                className="input-field w-full text-sm"
                            >
                                <option value="">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>
                </div>

                {applicationsLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading applications...</div>
                ) : filteredApplications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No applications found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredApplications.length > 0 &&
                                                filteredApplications.every((app) =>
                                                    selectedApplicationIds.includes(app.id)
                                                )
                                            }
                                            onChange={() =>
                                                toggleSelectAllVisible(filteredApplications.map((app) => app.id))
                                            }
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachments</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredApplications.map((application) => (
                                    <tr key={application.id} className="table-row">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedApplicationIds.includes(application.id)}
                                                onChange={() => toggleApplicationSelection(application.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">{application.full_name}</div>
                                            <div className="text-xs text-gray-500">{application.email}</div>
                                            {application.phone && (
                                                <div className="text-xs text-gray-500">{application.phone}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{application.job_title_snapshot}</div>
                                            {application.jobs?.department && (
                                                <div className="text-xs text-gray-500">
                                                    {application.jobs.department} • {application.jobs.location}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 space-y-1">
                                            {application.resume_file_url ? (
                                                <a
                                                    href={application.resume_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:text-primary-dark block"
                                                >
                                                    Resume
                                                </a>
                                            ) : (
                                                <span className="block text-gray-400">No resume</span>
                                            )}
                                            {application.cover_letter_file_url ? (
                                                <a
                                                    href={application.cover_letter_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:text-primary-dark block"
                                                >
                                                    Cover Letter
                                                </a>
                                            ) : (
                                                <span className="block text-gray-400">No cover letter</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={application.status}
                                                onChange={(e) =>
                                                    handleApplicationStatusChange(
                                                        application.id,
                                                        e.target.value as JobApplicationStatus
                                                    )
                                                }
                                                className="input-field w-full min-w-[140px] text-sm"
                                            >
                                                <option value="new">New</option>
                                                <option value="reviewing">Reviewing</option>
                                                <option value="shortlisted">Shortlisted</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="hired">Hired</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {formatUtcDateTime(application.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedApplicant(application);
                                                    setActiveDocument(application.resume_file_url ? 'resume' : 'cover_letter');
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-medium mr-2"
                                            >
                                                <Eye size={12} />
                                                View Details
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openSingleEmailModal(application)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-xs font-medium"
                                            >
                                                <Mail size={12} />
                                                Email
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Deletion Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Job Posting?"
            >
                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-red-50 rounded-md">
                        <AlertTriangle className="text-red-500 mr-3 flex-shrink-0" size={24} />
                        <p className="text-sm text-red-700">
                            WARNING: This will permanently delete the job from the system, remove all its job applications, and permanently delete their uploaded resumes and cover letters from the storage bucket. This action cannot be undone.
                        </p>
                    </div>
                    <p className="text-gray-600">
                        Are you sure you want to delete <span className="font-semibold text-gray-800">"{jobToDelete?.title}"</span>?
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
                            Delete Job & Applications
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Applicant Email Modal */}
            <Modal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                title={emailModalMode === 'single' ? 'Send Applicant Email' : 'Send Bulk Applicant Emails'}
            >
                <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                        {emailModalMode === 'single'
                            ? `Sending to ${activeApplicationForEmail?.full_name || 'selected applicant'} (${activeApplicationForEmail?.email || ''})`
                            : `Sending to ${selectedApplicationIds.length} selected applicants`}
                    </div>

                    <div className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded p-3">
                        {'Available tokens: {{name}}, {{email}}, {{jobTitle}}, {{status}}, {{phone}}, {{experience}}, {{expectedSalary}}, {{portfolio}}, {{linkedin}}'}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Template</label>
                        <input
                            type="text"
                            value={emailSubjectTemplate}
                            onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                            className="input-field w-full"
                            placeholder="e.g. Update on your {{jobTitle}} application"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Body Template</label>
                        <textarea
                            value={emailBodyTemplate}
                            onChange={(e) => setEmailBodyTemplate(e.target.value)}
                            rows={9}
                            className="input-field w-full"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsEmailModalOpen(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSendEmail}
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors flex items-center gap-2"
                        >
                            <Mail size={16} />
                            {emailModalMode === 'single' ? 'Send Email' : 'Send Bulk Emails'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Applicant Details Modal */}
            <Modal
                isOpen={!!selectedApplicant}
                onClose={() => setSelectedApplicant(null)}
                title="Applicant Details"
                maxWidth="max-w-5xl"
            >
                {selectedApplicant && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh] overflow-y-auto w-full">
                        {/* Left column: Applicant details */}
                        <div className="col-span-1 border-r border-gray-100 pr-0 lg:pr-6 space-y-6">
                            <div>
                                <h4 className="text-2xl font-bold text-gray-900">{selectedApplicant.full_name}</h4>
                                <p className="text-sm font-medium text-primary mt-1">{selectedApplicant.job_title_snapshot}</p>
                                <p className="text-xs text-gray-400 mt-1">Applied: {formatUtcDateTime(selectedApplicant.created_at)}</p>
                            </div>
                            
                            <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <span className="font-semibold text-gray-700 block mb-1">Email</span>
                                    <a href={`mailto:${selectedApplicant.email}`} className="text-primary hover:underline break-words">{selectedApplicant.email}</a>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700 block mb-1">Phone</span>
                                    {selectedApplicant.phone || <span className="text-gray-400">Not provided</span>}
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700 block mb-1">Additional Info</span>
                                    {selectedApplicant.additional_info ? (
                                        <p className="text-gray-800 whitespace-pre-wrap">{selectedApplicant.additional_info}</p>
                                    ) : <span className="text-gray-400">Not provided</span>}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-semibold text-gray-700 block mb-1">Experience</span>
                                        <span className="text-gray-800">
                                            {selectedApplicant.experience ? `${selectedApplicant.experience} years` : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-700 block mb-1">Salary Expectation</span>
                                        <span className="text-gray-800">
                                            {selectedApplicant.expected_salary ? `$${selectedApplicant.expected_salary}` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700 block mb-1">Portfolio</span>
                                    {selectedApplicant.portfolio ? (
                                        <a href={selectedApplicant.portfolio} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                                            {selectedApplicant.portfolio}
                                        </a>
                                    ) : <span className="text-gray-400">Not provided</span>}
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700 block mb-1">LinkedIn Profile</span>
                                    {selectedApplicant.linkedin ? (
                                        <a href={selectedApplicant.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                                            {selectedApplicant.linkedin}
                                        </a>
                                    ) : <span className="text-gray-400">Not provided</span>}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Applicant Status</label>
                                    <select
                                        value={selectedApplicant.status}
                                        onChange={async (e) => {
                                            const nextStatus = e.target.value as JobApplicationStatus;
                                            await handleApplicationStatusChange(selectedApplicant.id, nextStatus);
                                            setSelectedApplicant(prev => prev ? { ...prev, status: nextStatus } : prev);
                                        }}
                                        className="input-field w-full text-sm font-medium"
                                    >
                                        <option value="new">New</option>
                                        <option value="reviewing">Reviewing</option>
                                        <option value="shortlisted">Shortlisted</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="hired">Hired</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const app = selectedApplicant;
                                        setSelectedApplicant(null);
                                        openSingleEmailModal(app);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded hover:bg-primary-dark transition-colors text-sm font-medium w-full shadow-sm"
                                >
                                    <Mail size={16} />
                                    Email Applicant
                                </button>
                            </div>
                        </div>

                        {/* Right column: Inline document viewer */}
                        <div className="col-span-1 lg:col-span-2 h-full flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="flex bg-white border-b border-gray-200 items-center justify-between p-2">
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveDocument('resume')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeDocument === 'resume' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        Resume
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDocument('cover_letter')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeDocument === 'cover_letter' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        Cover Letter
                                    </button>
                                </div>
                                <div className="pr-2">
                                    <a
                                        href={activeDocument === 'resume' ? selectedApplicant.resume_file_url || '#' : selectedApplicant.cover_letter_file_url || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary hover:underline font-medium"
                                        hidden={activeDocument === 'resume' ? !selectedApplicant.resume_file_url : !selectedApplicant.cover_letter_file_url}
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-100 relative min-h-[400px]">
                                {activeDocument === 'resume' ? (
                                    selectedApplicant.resume_file_url ? (
                                        <iframe src={selectedApplicant.resume_file_url} className="w-full h-full border-0 absolute inset-0" title="Resume" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <AlertTriangle size={32} className="mb-2 opacity-50" />
                                            <p>No resume uploaded</p>
                                        </div>
                                    )
                                ) : (
                                    selectedApplicant.cover_letter_file_url ? (
                                        <iframe src={selectedApplicant.cover_letter_file_url} className="w-full h-full border-0 absolute inset-0" title="Cover Letter" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <AlertTriangle size={32} className="mb-2 opacity-50" />
                                            <p>No cover letter uploaded</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createJob } from '../actions';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function CreateJobPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        location: '',
        employment_type: 'full-time' as 'full-time' | 'part-time' | 'contract' | 'internship',
        experience_level: '' as '' | 'entry' | 'mid' | 'senior' | 'lead',
        description: '',
        salary_range: '',
        is_remote: false,
        application_deadline: '',
    });

    const [requirements, setRequirements] = useState<string[]>(['']);
    const [responsibilities, setResponsibilities] = useState<string[]>(['']);
    const [benefits, setBenefits] = useState<string[]>(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleArrayFieldChange = (
        index: number,
        value: string,
        items: string[],
        setItems: (items: string[]) => void
    ) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };

    const handleArrayFieldAdd = (items: string[], setItems: (items: string[]) => void) => {
        setItems([...items, '']);
    };

    const handleArrayFieldRemove = (
        index: number,
        items: string[],
        setItems: (items: string[]) => void
    ) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.department || !formData.location || !formData.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        const toastId = toast.loading('Creating job posting...');
        setIsSubmitting(true);

        try {
            await createJob({
                ...formData,
                experience_level: formData.experience_level || undefined,
                salary_range: formData.salary_range || undefined,
                application_deadline: formData.application_deadline || undefined,
                requirements: requirements.filter(r => r.trim() !== ''),
                responsibilities: responsibilities.filter(r => r.trim() !== ''),
                benefits: benefits.filter(b => b.trim() !== ''),
            });

            toast.success('Job posted successfully!', { id: toastId });
            router.push('/admin/careers');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create job', { id: toastId });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/admin/careers"
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Careers</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Post New Job</h1>
                    <p className="text-gray-600 mt-2">Create a new job posting for your careers page</p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="admin-card p-6 space-y-6">
                {/* Basic Information */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Job Title <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="input-field w-full"
                                placeholder="e.g., Senior Software Engineer"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="input-field w-full"
                                placeholder="e.g., Engineering"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="input-field w-full"
                                placeholder="e.g., New York, NY"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employment Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.employment_type}
                                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                                className="input-field w-full"
                                required
                            >
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Experience Level
                            </label>
                            <select
                                value={formData.experience_level}
                                onChange={(e) => setFormData({ ...formData, experience_level: e.target.value as any })}
                                className="input-field w-full"
                            >
                                <option value="">Select level</option>
                                <option value="entry">Entry</option>
                                <option value="mid">Mid</option>
                                <option value="senior">Senior</option>
                                <option value="lead">Lead</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Salary Range
                            </label>
                            <input
                                type="text"
                                value={formData.salary_range}
                                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                                className="input-field w-full"
                                placeholder="e.g., $80,000 - $120,000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Application Deadline
                            </label>
                            <input
                                type="date"
                                value={formData.application_deadline}
                                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                                className="input-field w-full"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_remote"
                                checked={formData.is_remote}
                                onChange={(e) => setFormData({ ...formData, is_remote: e.target.checked })}
                                className="h-4 w-4 text-[#00A99D] focus:ring-[#00A99D] border-gray-300 rounded"
                            />
                            <label htmlFor="is_remote" className="ml-2 block text-sm text-gray-700">
                                Remote position
                            </label>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input-field w-full min-h-[200px]"
                        placeholder="Describe the role, team, and what the candidate will be working on..."
                        required
                    />
                </div>

                {/* Requirements */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                    <div className="space-y-2">
                        {requirements.map((req, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={req}
                                    onChange={(e) => handleArrayFieldChange(index, e.target.value, requirements, setRequirements)}
                                    className="input-field flex-1"
                                    placeholder="e.g., 5+ years of experience with React"
                                />
                                {requirements.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleArrayFieldRemove(index, requirements, setRequirements)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => handleArrayFieldAdd(requirements, setRequirements)}
                            className="flex items-center space-x-1 text-[#00A99D] hover:text-[#008F84]"
                        >
                            <Plus size={16} />
                            <span>Add requirement</span>
                        </button>
                    </div>
                </div>

                {/* Responsibilities */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Responsibilities</label>
                    <div className="space-y-2">
                        {responsibilities.map((resp, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={resp}
                                    onChange={(e) => handleArrayFieldChange(index, e.target.value, responsibilities, setResponsibilities)}
                                    className="input-field flex-1"
                                    placeholder="e.g., Design and build scalable applications"
                                />
                                {responsibilities.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleArrayFieldRemove(index, responsibilities, setResponsibilities)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => handleArrayFieldAdd(responsibilities, setResponsibilities)}
                            className="flex items-center space-x-1 text-[#00A99D] hover:text-[#008F84]"
                        >
                            <Plus size={16} />
                            <span>Add responsibility</span>
                        </button>
                    </div>
                </div>

                {/* Benefits */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                    <div className="space-y-2">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={benefit}
                                    onChange={(e) => handleArrayFieldChange(index, e.target.value, benefits, setBenefits)}
                                    className="input-field flex-1"
                                    placeholder="e.g., Health insurance, 401(k) matching"
                                />
                                {benefits.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleArrayFieldRemove(index, benefits, setBenefits)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => handleArrayFieldAdd(benefits, setBenefits)}
                            className="flex items-center space-x-1 text-[#00A99D] hover:text-[#008F84]"
                        >
                            <Plus size={16} />
                            <span>Add benefit</span>
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                    <Link
                        href="/admin/careers"
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Publishing...' : 'Publish Job'}
                    </button>
                </div>
            </form>
        </div>
    );
}

import { FileText, Briefcase, Mail } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import Link from 'next/link';

export default async function AdminDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-2">
                    Welcome to the Techneth Admin Panel!
                </p>
            </div>

            {/* Stats Grid - Placeholder values for now */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Published Blogs"
                    value={0}
                    icon={<FileText size={24} />}
                    color="#4AB3A5"
                />
                <StatCard
                    title="Draft Blogs"
                    value={0}
                    icon={<FileText size={24} />}
                    color="#FFC107"
                />
                <StatCard
                    title="Case Studies"
                    value={0}
                    icon={<Briefcase size={24} />}
                    color="#17A2B8"
                />
                <StatCard
                    title="Unread Contacts"
                    value={0}
                    icon={<Mail size={24} />}
                    color="#DC3545"
                />
            </div>

            {/* Quick Actions */}
            <div className="admin-card p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/admin/blogs/create"
                        className="p-4 border-2 border-[#4AB3A5] rounded hover:bg-[#4AB3A5] hover:text-white transition-colors text-center group"
                    >
                        <FileText className="mx-auto mb-2 text-[#4AB3A5] group-hover:text-white" size={32} />
                        <span className="font-medium">Create New Blog</span>
                    </Link>
                    <Link
                        href="/admin/case-studies/create"
                        className="p-4 border-2 border-[#17A2B8] rounded hover:bg-[#17A2B8] hover:text-white transition-colors text-center group"
                    >
                        <Briefcase className="mx-auto mb-2 text-[#17A2B8] group-hover:text-white" size={32} />
                        <span className="font-medium">Create Case Study</span>
                    </Link>
                    <Link
                        href="/admin/contacts"
                        className="p-4 border-2 border-[#DC3545] rounded hover:bg-[#DC3545] hover:text-white transition-colors text-center group"
                    >
                        <Mail className="mx-auto mb-2 text-[#DC3545] group-hover:text-white" size={32} />
                        <span className="font-medium">View Submissions</span>
                    </Link>
                </div>
            </div>

            {/* Success Message */}
            <div className="admin-card p-6 bg-green-50 border-2 border-green-500">
                <h3 className="text-lg font-bold text-green-800 mb-2">✅ Login Successful!</h3>
                <p className="text-green-700">
                    You've successfully logged into the admin panel. Use the sidebar to navigate to different sections.
                </p>
            </div>
        </div>
    );
}

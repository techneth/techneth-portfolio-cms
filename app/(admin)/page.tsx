import { FileText, Briefcase, Mail, Users, Zap, Clock, Activity } from 'lucide-react';
import { getDashboardStats, getRecentActivity } from './actions';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminDashboard() {
    const stats = await getDashboardStats();
    const recentActivity = await getRecentActivity(5);
    const user = await getCurrentUser();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-2">
                    Welcome to the Techneth Admin Panel! Here's your overview.
                </p>
            </div>

            {/* Pending Approvals Banner */}
            {stats.pendingUsers > 0 && user?.role === 'super_admin' && (
                <div className="p-4 bg-[#00A99D]/5 border border-[#00A99D]/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#00A99D]/10 rounded-full shrink-0">
                            <Clock className="text-[#00A99D]" size={20} />
                        </div>
                        <div>
                            <p className="text-[#008F84] font-medium">
                                <span className="font-bold">{stats.pendingUsers}</span> user{stats.pendingUsers === 1 ? '' : 's'} awaiting approval
                            </p>
                            <p className="text-[#008F84]/80 text-sm">
                                Review and determine access for new account requests.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/users?status=pending"
                        className="px-4 py-2 bg-[#00A99D] text-white text-sm font-medium rounded hover:bg-[#008F84] transition-colors whitespace-nowrap self-stretch sm:self-auto text-center shadow-sm"
                    >
                        Review Requests
                    </Link>
                </div>
            )}

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Published Blogs */}
                <Link href="/blogs" className="block transition-transform hover:scale-[1.02]">
                    <div className="admin-card p-6 bg-gradient-to-br from-[#00A99D]/10 to-white border-l-4 border-[#00A99D] h-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Published Blogs</p>
                                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.publishedBlogs}</p>
                                <p className="text-xs text-gray-500 mt-1">{stats.draftBlogs} drafts</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-[#00A99D]/20 flex items-center justify-center">
                                <FileText className="text-[#00A99D]" size={24} />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Case Studies */}
                <Link href="/case-studies" className="block transition-transform hover:scale-[1.02]">
                    <div className="admin-card p-6 bg-gradient-to-br from-[#00A99D]/10 to-white border-l-4 border-[#00A99D] h-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Case Studies</p>
                                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.publishedCaseStudies}</p>
                                <p className="text-xs text-gray-500 mt-1">Published</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-[#00A99D]/20 flex items-center justify-center">
                                <Briefcase className="text-[#008F84]" size={24} />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Unread Contacts */}
                <Link href="/contacts" className="block transition-transform hover:scale-[1.02]">
                    <div className="admin-card p-6 bg-gradient-to-br from-[#00C9BA]/10 to-white border-l-4 border-[#00C9BA] h-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Unread Contacts</p>
                                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.unreadContacts}</p>
                                <p className="text-xs text-[#00A99D] mt-1">View inbox →</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-[#00C9BA]/20 flex items-center justify-center">
                                <Mail className="text-[#00A99D]" size={24} />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Active Jobs */}
                <Link href="/careers" className="block transition-transform hover:scale-[1.02]">
                    <div className="admin-card p-6 bg-gradient-to-br from-[#00A99D]/5 to-white border-l-4 border-[#008F84] h-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.activeJobs}</p>
                                <p className="text-xs text-gray-500 mt-1">{stats.totalJobs} total</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-[#00A99D]/15 flex items-center justify-center">
                                <Users className="text-[#008F84]" size={24} />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 admin-card p-6 h-full flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2 shrink-0">
                        <Activity className="text-[#00A99D]" size={20} />
                        <span>Recent Activity</span>
                    </h3>

                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 flex-1 flex flex-col justify-center">
                            <Clock className="mx-auto mb-2 opacity-50" size={32} />
                            No recent activity found.
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            {recentActivity.map((log: any) => (
                                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.action_type === 'create' ? 'bg-[#00A99D]/10 text-[#00A99D]' :
                                        log.action_type === 'update' ? 'bg-[#0B2B3E]/10 text-[#0B2B3E]' :
                                            log.action_type === 'delete' ? 'bg-red-50 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        <Activity size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            <span className="font-bold">{log.user_name}</span>
                                            <span className="text-gray-600 font-normal"> {log.action_type}d </span>
                                            <span className="font-medium text-gray-800">
                                                {log.resource_type.replace('_', ' ')}
                                            </span>
                                        </p>
                                        {log.resource_title && (
                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                "{log.resource_title}"
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions (Sidebar) */}
                <div className="admin-card p-6 h-full flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2 shrink-0">
                        <Zap className="text-[#00A99D]" size={20} />
                        <span>Quick Actions</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 flex-1">
                        <Link
                            href="/blogs/create"
                            className="p-4 border border-gray-200 rounded-lg hover:border-[#00A99D] hover:bg-[#00A99D]/5 transition-all flex items-center space-x-3 group"
                        >
                            <div className="p-2 bg-[#00A99D]/10 rounded group-hover:bg-[#00A99D] transition-colors">
                                <FileText className="text-[#00A99D] group-hover:text-white" size={20} />
                            </div>
                            <span className="font-medium text-sm text-gray-700 group-hover:text-[#00A99D]">Create Blog</span>
                        </Link>
                        <Link
                            href="/case-studies/create"
                            className="p-4 border border-gray-200 rounded-lg hover:border-[#00A99D] hover:bg-[#00A99D]/5 transition-all flex items-center space-x-3 group"
                        >
                            <div className="p-2 bg-[#00A99D]/10 rounded group-hover:bg-[#00A99D] transition-colors">
                                <Briefcase className="text-[#00A99D] group-hover:text-white" size={20} />
                            </div>
                            <span className="font-medium text-sm text-gray-700 group-hover:text-[#00A99D]">Create Case Study</span>
                        </Link>
                        <Link
                            href="/careers/create"
                            className="p-4 border border-gray-200 rounded-lg hover:border-[#00A99D] hover:bg-[#00A99D]/5 transition-all flex items-center space-x-3 group"
                        >
                            <div className="p-2 bg-[#00A99D]/10 rounded group-hover:bg-[#00A99D] transition-colors">
                                <Users className="text-[#00A99D] group-hover:text-white" size={20} />
                            </div>
                            <span className="font-medium text-sm text-gray-700 group-hover:text-[#00A99D]">Post Job</span>
                        </Link>
                        <Link
                            href="/contacts"
                            className="p-4 border border-gray-200 rounded-lg hover:border-[#00C9BA] hover:bg-[#00C9BA]/5 transition-all flex items-center space-x-3 group"
                        >
                            <div className="p-2 bg-[#00C9BA]/10 rounded group-hover:bg-[#00C9BA] transition-colors">
                                <Mail className="text-[#00C9BA] group-hover:text-white" size={20} />
                            </div>
                            <span className="font-medium text-sm text-gray-700 group-hover:text-[#00C9BA]">View Contacts</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

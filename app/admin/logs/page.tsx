'use client';

import { useState, useEffect } from 'react';
import { Download, Filter, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    action_type: string;
    resource_type: string;
    resource_id: string | null;
    resource_title: string | null;
    changes: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

const actionColors: Record<string, string> = {
    create: '#28A745',
    update: '#00A99D',
    delete: '#DC3545',
    login: '#00A99D',
    logout: '#6C757D',
};

const actionLabels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    login: 'Logged In',
    logout: 'Logged Out',
};

export default function LogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        actionType: '',
        resourceType: '',
        search: '',
        startDate: '',
        endDate: '',
    });
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const logsPerPage = 50;

    useEffect(() => {
        loadLogs();
    }, [page, filters]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: logsPerPage.toString(),
                offset: ((page - 1) * logsPerPage).toString(),
                ...(filters.actionType && { actionType: filters.actionType }),
                ...(filters.resourceType && { resourceType: filters.resourceType }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
            });

            const response = await fetch(`/api/admin/logs?${params}`);
            const data = await response.json();

            setLogs(data.logs || []);
            setTotalCount(data.count || 0);
        } catch (error) {
            console.error('Error loading logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await fetch('/api/admin/logs/export');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting logs:', error);
            alert('Failed to export logs');
        }
    };

    const totalPages = Math.ceil(totalCount / logsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Activity Logs</h1>
                    <p className="text-gray-600 mt-2">Track all user actions and system changes</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                >
                    <Download size={18} />
                    <span>Export Logs</span>
                </button>
            </div>

            {/* Filters */}
            <div className="admin-card p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <Filter size={20} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                        <select
                            value={filters.actionType}
                            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        >
                            <option value="">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="login">Login</option>
                            <option value="logout">Logout</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                        <select
                            value={filters.resourceType}
                            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        >
                            <option value="">All Resources</option>
                            <option value="blog">Blog</option>
                            <option value="case_study">Case Study</option>
                            <option value="contact">Contact</option>
                            <option value="user">User</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilters({ actionType: '', resourceType: '', search: '', startDate: '', endDate: '' });
                                setPage(1);
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No activity logs found. Activity will be logged as users interact with the system.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Resource
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="table-row">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                                                <div className="text-sm text-gray-500">{log.user_role.replace('_', ' ')}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                                    style={{ backgroundColor: actionColors[log.action_type] || '#6C757D' }}
                                                >
                                                    {actionLabels[log.action_type] || log.action_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.resource_type.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {log.resource_title || log.resource_id || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {((page - 1) * logsPerPage) + 1} to {Math.min(page * logsPerPage, totalCount)} of {totalCount} logs
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1}
                                        className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

'use client';

import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
    id: string;
    user_name: string;
    action_type: string;
    resource_type: string;
    resource_title: string | null;
    created_at: string;
}

interface ActivityFeedProps {
    logs: ActivityLog[];
}

const actionColors: Record<string, string> = {
    create: '#28A745',
    update: '#00A99D',
    delete: '#DC3545',
    login: '#00A99D',
    logout: '#6C757D',
};

const actionLabels: Record<string, string> = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    login: 'logged in',
    logout: 'logged out',
};

export default function ActivityFeed({ logs }: ActivityFeedProps) {
    return (
        <div className="admin-card p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>

            {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                            <div
                                className="w-2 h-2 rounded-full mt-2"
                                style={{ backgroundColor: actionColors[log.action_type] || '#6C757D' }}
                            />
                            <div className="flex-1">
                                <p className="text-sm text-gray-800">
                                    <span className="font-semibold">{log.user_name}</span>
                                    {' '}{actionLabels[log.action_type] || log.action_type}{' '}
                                    {log.resource_title && (
                                        <>
                                            <span className="font-medium">{log.resource_type}</span>
                                            {': '}
                                            <span className="text-gray-600">{log.resource_title}</span>
                                        </>
                                    )}
                                    {!log.resource_title && log.action_type !== 'login' && log.action_type !== 'logout' && (
                                        <span className="font-medium">{log.resource_type}</span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

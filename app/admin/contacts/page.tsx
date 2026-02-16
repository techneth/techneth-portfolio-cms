'use client';

import { useState, useEffect } from 'react';
import { Mail, MailOpen, CheckCircle, Archive, Eye } from 'lucide-react';
import { getContacts, updateContactStatus } from './actions';
import { format } from 'date-fns';

export default function ContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadContacts();
    }, [statusFilter]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await getContacts({ status: statusFilter || undefined });
            setContacts(data);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: any) => {
        try {
            await updateContactStatus(id, status);
            loadContacts();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Contact Submissions</h1>
                    <p className="text-gray-600 mt-2">View and manage contact form submissions</p>
                </div>
            </div>

            {/* Filter */}
            <div className="admin-card p-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field max-w-xs"
                >
                    <option value="">All Status</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Contacts Table */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No contact submissions found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subject
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {contacts.map((contact) => (
                                    <tr key={contact.id} className={`table-row ${contact.status === 'unread' ? 'bg-[#F8F6EE]' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                                    {contact.status === 'unread' && (
                                                        <Mail className="text-[#00A99D]" size={16} />
                                                    )}
                                                    <span>{contact.name}</span>
                                                </div>
                                                <div className="text-sm text-gray-500">{contact.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{contact.subject || 'No subject'}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-md">{contact.message}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={contact.status}
                                                onChange={(e) => handleStatusChange(contact.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded border ${contact.status === 'unread' ? 'bg-[#00A99D]/10 text-[#008F84] border-[#00A99D]' :
                                                    contact.status === 'read' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                                        contact.status === 'replied' ? 'bg-green-100 text-green-800 border-green-300' :
                                                            'bg-gray-100 text-gray-800 border-gray-300'
                                                    }`}
                                            >
                                                <option value="unread">Unread</option>
                                                <option value="read">Read</option>
                                                <option value="replied">Replied</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(contact.created_at), 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => alert('View details coming soon')}
                                                className="text-[#00A99D] hover:text-[#008F84]"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

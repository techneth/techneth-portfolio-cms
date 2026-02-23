'use client';

import { useState, useEffect } from 'react';
import { Mail, MailOpen, CheckCircle, Archive, Eye, Send, Phone, Building, Calendar, User as UserIcon, Loader2, X, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { getContacts, updateContactStatus, replyToContact, deleteContact } from './actions';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';

interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    subject: string | null;
    message: string;
    status: string;
    priority: string;
    created_at: string;
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [replying, setReplying] = useState(false);
    const [replySubject, setReplySubject] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const fetchUserRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getSession().then(({ data }) => ({ data: { user: data.session?.user } }));
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole((userData as any)?.role || '');
            }
        };
        fetchUserRole();
    }, []);

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
            toast.success('Status updated successfully');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleViewDetails = async (contact: Contact) => {
        setSelectedContact(contact);
        setIsDetailsModalOpen(true);
        setShowReplyForm(false);
        setReplySubject(`Re: ${contact.subject || 'Contact Inquiry'}`);
        setReplyMessage('');

        // Mark as read when viewing details
        if (contact.status === 'unread') {
            await handleStatusChange(contact.id, 'read');
        }
    };

    const handleSendReply = async () => {
        if (!selectedContact) return;
        if (!replySubject.trim() || !replyMessage.trim()) {
            toast.error('Subject and message are required');
            return;
        }

        setReplying(true);
        try {
            await replyToContact(selectedContact.id, replySubject, replyMessage);
            toast.success('Reply sent successfully');
            setShowReplyForm(false);
            setReplyMessage('');
            loadContacts();
            setSelectedContact({ ...selectedContact, status: 'replied' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to send reply');
        } finally {
            setReplying(false);
        }
    };

    const handleDeleteClick = (contact: Contact) => {
        setContactToDelete(contact);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!contactToDelete) return;

        const toastId = toast.loading('Deleting message...');
        setIsDeleteModalOpen(false);

        try {
            await deleteContact(contactToDelete.id);
            toast.success('Message deleted successfully', { id: toastId });
            loadContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error('Failed to delete message', { id: toastId });
        } finally {
            setContactToDelete(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'low':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-primary/10 text-primary-dark';
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
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
                                    <tr key={contact.id} className={`table-row ${contact.status === 'unread' ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                                    {contact.status === 'unread' && (
                                                        <Mail className="text-primary" size={16} />
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
                                                className={`text-xs px-2 py-1 rounded border ${contact.status === 'unread' ? 'bg-primary/10 text-primary-dark border-primary' :
                                                    contact.status === 'read' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                                                        contact.status === 'replied' ? 'bg-primary/10 text-primary-dark border-primary' :
                                                            'bg-gray-100 text-gray-700 border-gray-300'
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
                                            <div className="flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => handleViewDetails(contact)}
                                                    className="text-primary hover:text-primary-dark transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {(userRole === 'admin' || userRole === 'super_admin') && (
                                                    <button
                                                        onClick={() => handleDeleteClick(contact)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
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

            {/* Contact Details Modal */}
            {isDetailsModalOpen && selectedContact && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedContact(null);
                    }}
                    title={showReplyForm ? "Reply to Contact" : "Contact Details"}
                >
                    {showReplyForm ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowReplyForm(false)}
                                className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
                            >
                                <ArrowLeft size={16} className="mr-1" /> Back to details
                            </button>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                                    <input
                                        type="text"
                                        value={selectedContact.email}
                                        disabled
                                        className="input-field bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={replySubject}
                                        onChange={(e) => setReplySubject(e.target.value)}
                                        className="input-field"
                                        placeholder="Subject"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        className="input-field min-h-[200px]"
                                        placeholder="Type your reply here..."
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSendReply}
                                        disabled={replying}
                                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                                    >
                                        {replying ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Sending...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                <span>Send Reply</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Contact Information */}
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <UserIcon className="text-gray-400 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedContact.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Mail className="text-gray-400 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                        <a href={`mailto:${selectedContact.email}`} className="text-sm font-medium text-primary hover:text-primary-dark">
                                            {selectedContact.email}
                                        </a>
                                    </div>
                                </div>

                                {selectedContact.phone && (
                                    <div className="flex items-start space-x-3">
                                        <Phone className="text-gray-400 mt-1" size={20} />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                                            <a href={`tel:${selectedContact.phone}`} className="text-sm font-medium text-gray-900">
                                                {selectedContact.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {selectedContact.company && (
                                    <div className="flex items-start space-x-3">
                                        <Building className="text-gray-400 mt-1" size={20} />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
                                            <p className="text-sm font-medium text-gray-900">{selectedContact.company}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start space-x-3">
                                    <Calendar className="text-gray-400 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {format(new Date(selectedContact.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Subject */}
                            {selectedContact.subject && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Subject</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedContact.subject}</p>
                                </div>
                            )}

                            {/* Message */}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Message</p>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                                </div>
                            </div>

                            {/* Priority Badge */}
                            <div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedContact.priority)}`}>
                                    Priority: {selectedContact.priority.charAt(0).toUpperCase() + selectedContact.priority.slice(1)}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t">
                                <div className="flex space-x-3">
                                    <select
                                        value={selectedContact.status}
                                        onChange={(e) => {
                                            handleStatusChange(selectedContact.id, e.target.value);
                                            setSelectedContact({ ...selectedContact, status: e.target.value });
                                        }}
                                        className="input-field text-sm"
                                    >
                                        <option value="unread">Unread</option>
                                        <option value="read">Read</option>
                                        <option value="replied">Replied</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => setShowReplyForm(true)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                                >
                                    <Send size={16} />
                                    <span>Reply</span>
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && contactToDelete && (
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setContactToDelete(null);
                    }}
                    title="Delete Contact Message?"
                >
                    <div className="space-y-4">
                        <div className="flex items-center p-3 bg-red-50 rounded-md">
                            <AlertTriangle className="text-red-600 mr-3 flex-shrink-0" size={24} />
                            <p className="text-sm text-red-900">
                                Warning: This action cannot be undone!
                            </p>
                        </div>
                        <p className="text-gray-600">
                            Are you sure you want to delete the message from <span className="font-semibold text-gray-800">{contactToDelete.name}</span>?
                        </p>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setContactToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors border border-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete Message
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

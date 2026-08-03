'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users,
    UserX,
    Send,
    Mail,
    Plus,
    Download,
    Trash2,
    RotateCcw,
    Ban,
    Copy,
    Pencil,
    Eye,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    Settings as SettingsIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';
import {
    Subscriber,
    Campaign,
    getSubscribers,
    getCampaigns,
    addSubscriber,
    setSubscriberStatus,
    deleteSubscriber,
    exportSubscribersCsv,
    deleteCampaign,
    duplicateCampaign,
    updateNewsletterSettings,
} from './actions';

type Tab = 'campaigns' | 'subscribers' | 'settings';

interface NewsletterSettings {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    apiKeyConfigured: boolean;
}

const STATUS_BADGES: Record<Campaign['status'], { label: string; className: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: <Pencil size={12} /> },
    sending: { label: 'Sending', className: 'bg-blue-100 text-blue-700', icon: <Clock size={12} /> },
    sent: { label: 'Sent', className: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
};

export default function NewsletterClient({
    initialSubscribers,
    initialCampaigns,
    initialSettings,
}: {
    initialSubscribers: Subscriber[];
    initialCampaigns: Campaign[];
    initialSettings: NewsletterSettings;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('campaigns');
    const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers);
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    // Add-subscriber modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);

    // Delete confirmations
    const [subscriberToDelete, setSubscriberToDelete] = useState<Subscriber | null>(null);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Settings form
    const [settingsForm, setSettingsForm] = useState(initialSettings);
    const [savingSettings, setSavingSettings] = useState(false);

    const activeCount = subscribers.filter((s) => s.status === 'active').length;
    const unsubscribedCount = subscribers.filter((s) => s.status === 'unsubscribed').length;
    const sentCampaigns = campaigns.filter((c) => c.status === 'sent').length;

    const refreshSubscribers = async () => {
        try {
            setSubscribers(await getSubscribers());
        } catch {
            toast.error('Failed to refresh subscribers');
        }
    };

    const refreshCampaigns = async () => {
        try {
            setCampaigns(await getCampaigns());
        } catch {
            toast.error('Failed to refresh campaigns');
        }
    };

    const handleAddSubscriber = async () => {
        if (!newEmail.trim()) {
            toast.error('Email is required');
            return;
        }
        setAdding(true);
        try {
            await addSubscriber(newEmail, newName || undefined);
            toast.success('Subscriber added');
            setIsAddModalOpen(false);
            setNewEmail('');
            setNewName('');
            await refreshSubscribers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add subscriber');
        } finally {
            setAdding(false);
        }
    };

    const handleToggleStatus = async (subscriber: Subscriber) => {
        const next = subscriber.status === 'active' ? 'unsubscribed' : 'active';
        try {
            await setSubscriberStatus(subscriber.id, next);
            toast.success(next === 'active' ? 'Subscriber re-activated' : 'Subscriber unsubscribed');
            await refreshSubscribers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update subscriber');
        }
    };

    const handleDeleteSubscriber = async () => {
        if (!subscriberToDelete) return;
        setDeleting(true);
        try {
            await deleteSubscriber(subscriberToDelete.id);
            toast.success('Subscriber deleted');
            setSubscriberToDelete(null);
            await refreshSubscribers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete subscriber');
        } finally {
            setDeleting(false);
        }
    };

    const handleExportCsv = async () => {
        try {
            const csv = await exportSubscribersCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `newsletter-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('CSV exported');
        } catch (error: any) {
            toast.error(error.message || 'Failed to export CSV');
        }
    };

    const handleDuplicateCampaign = async (campaign: Campaign) => {
        try {
            const copy = await duplicateCampaign(campaign.id);
            toast.success('Campaign duplicated');
            router.push(`/newsletter/campaigns/${copy.id}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to duplicate campaign');
        }
    };

    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;
        setDeleting(true);
        try {
            await deleteCampaign(campaignToDelete.id);
            toast.success('Campaign deleted');
            setCampaignToDelete(null);
            await refreshCampaigns();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete campaign');
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await updateNewsletterSettings({
                fromName: settingsForm.fromName,
                fromEmail: settingsForm.fromEmail,
                replyTo: settingsForm.replyTo,
            });
            toast.success('Sender settings saved');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const filteredSubscribers = subscribers.filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return s.email.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
                    <p className="text-gray-500 mt-1">Manage subscribers and send email campaigns</p>
                </div>
                <Link
                    href="/newsletter/compose"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg font-medium transition-colors self-start"
                >
                    <Plus size={18} />
                    New Campaign
                </Link>
            </div>

            {!initialSettings.apiKeyConfigured && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-semibold">Resend API key not configured</p>
                        <p>Add <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> to <code className="bg-amber-100 px-1 rounded">.env.local</code> and restart the server to enable sending. You can still compose and preview campaigns.</p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-50 text-[#00A99D] flex items-center justify-center">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                        <p className="text-sm text-gray-500">Active subscribers</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                        <UserX size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{unsubscribedCount}</p>
                        <p className="text-sm text-gray-500">Unsubscribed</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Send size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{sentCampaigns}</p>
                        <p className="text-sm text-gray-500">Campaigns sent</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    {([
                        { key: 'campaigns', label: 'Campaigns', icon: <Mail size={16} /> },
                        { key: 'subscribers', label: 'Subscribers', icon: <Users size={16} /> },
                        { key: 'settings', label: 'Sender Settings', icon: <SettingsIcon size={16} /> },
                    ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.key
                                ? 'border-[#00A99D] text-[#00A99D]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Campaigns tab */}
            {activeTab === 'campaigns' && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {campaigns.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Mail size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium text-gray-700">No campaigns yet</p>
                            <p className="text-sm mt-1">Create your first newsletter campaign to get started.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Subject</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Recipients</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="px-4 py-3 font-medium">Sent</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {campaigns.map((campaign) => {
                                        const badge = STATUS_BADGES[campaign.status];
                                        return (
                                            <tr key={campaign.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/newsletter/campaigns/${campaign.id}`}
                                                        className="font-medium text-gray-900 hover:text-[#00A99D]"
                                                    >
                                                        {campaign.subject}
                                                    </Link>
                                                    {campaign.created_by_name && (
                                                        <p className="text-xs text-gray-400 mt-0.5">by {campaign.created_by_name}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                                        {badge.icon}
                                                        {badge.label}
                                                    </span>
                                                    {campaign.status === 'failed' && campaign.error_message && (
                                                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={campaign.error_message}>
                                                            {campaign.error_message}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {campaign.status === 'draft'
                                                        ? '—'
                                                        : `${campaign.sent_count}/${campaign.recipient_count}${campaign.failed_count ? ` (${campaign.failed_count} failed)` : ''}`}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {campaign.sent_at ? format(new Date(campaign.sent_at), 'MMM d, yyyy HH:mm') : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/newsletter/campaigns/${campaign.id}`}
                                                            className="p-2 text-gray-400 hover:text-[#00A99D] rounded transition-colors"
                                                            title={campaign.status === 'draft' || campaign.status === 'failed' ? 'Edit' : 'View'}
                                                        >
                                                            {campaign.status === 'draft' || campaign.status === 'failed' ? <Pencil size={16} /> : <Eye size={16} />}
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDuplicateCampaign(campaign)}
                                                            className="p-2 text-gray-400 hover:text-[#00A99D] rounded transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setCampaignToDelete(campaign)}
                                                            disabled={campaign.status === 'sending'}
                                                            className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Subscribers tab */}
            {activeTab === 'subscribers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div className="flex gap-3 flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by email or name…"
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:max-w-xs focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                            >
                                <option value="">All statuses</option>
                                <option value="active">Active</option>
                                <option value="unsubscribed">Unsubscribed</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCsv}
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Download size={16} />
                                Export CSV
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus size={16} />
                                Add Subscriber
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {filteredSubscribers.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Users size={40} className="mx-auto mb-3 text-gray-300" />
                                <p className="font-medium text-gray-700">No subscribers found</p>
                                <p className="text-sm mt-1">Subscribers from your website form will appear here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-gray-600">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3 font-medium">Source</th>
                                            <th className="px-4 py-3 font-medium">Subscribed</th>
                                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSubscribers.map((subscriber) => (
                                            <tr key={subscriber.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{subscriber.email}</td>
                                                <td className="px-4 py-3 text-gray-600">{subscriber.name || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${subscriber.status === 'active'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                    >
                                                        {subscriber.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 capitalize">{subscriber.source || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {format(new Date(subscriber.subscribed_at), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleToggleStatus(subscriber)}
                                                            className="p-2 text-gray-400 hover:text-[#00A99D] rounded transition-colors"
                                                            title={subscriber.status === 'active' ? 'Unsubscribe' : 'Re-activate'}
                                                        >
                                                            {subscriber.status === 'active' ? <Ban size={16} /> : <RotateCcw size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => setSubscriberToDelete(subscriber)}
                                                            className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
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
                </div>
            )}

            {/* Settings tab */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl space-y-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">Sender identity</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            The from address must belong to a domain verified in your Resend account.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From name</label>
                        <input
                            type="text"
                            value={settingsForm.fromName}
                            onChange={(e) => setSettingsForm({ ...settingsForm, fromName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From email</label>
                        <input
                            type="email"
                            value={settingsForm.fromEmail}
                            onChange={(e) => setSettingsForm({ ...settingsForm, fromEmail: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reply-to email</label>
                        <input
                            type="email"
                            value={settingsForm.replyTo}
                            onChange={(e) => setSettingsForm({ ...settingsForm, replyTo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-gray-500">
                            API key:{' '}
                            {initialSettings.apiKeyConfigured ? (
                                <span className="text-green-600 font-medium">configured</span>
                            ) : (
                                <span className="text-red-500 font-medium">missing</span>
                            )}
                        </p>
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                        >
                            {savingSettings && <Loader2 size={16} className="animate-spin" />}
                            Save Settings
                        </button>
                    </div>
                </div>
            )}

            {/* Add subscriber modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Subscriber">
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="someone@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSubscriber}
                            disabled={adding}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                            {adding && <Loader2 size={16} className="animate-spin" />}
                            Add Subscriber
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete subscriber confirmation */}
            <Modal
                isOpen={!!subscriberToDelete}
                onClose={() => setSubscriberToDelete(null)}
                title="Delete Subscriber"
            >
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
                        <p className="text-sm text-gray-600">
                            Permanently delete <strong>{subscriberToDelete?.email}</strong>? Prefer unsubscribing to
                            keep a record that they opted out.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setSubscriberToDelete(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteSubscriber}
                            disabled={deleting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                            {deleting && <Loader2 size={16} className="animate-spin" />}
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete campaign confirmation */}
            <Modal
                isOpen={!!campaignToDelete}
                onClose={() => setCampaignToDelete(null)}
                title="Delete Campaign"
            >
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
                        <p className="text-sm text-gray-600">
                            Permanently delete campaign <strong>&ldquo;{campaignToDelete?.subject}&rdquo;</strong>?
                            This cannot be undone.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setCampaignToDelete(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteCampaign}
                            disabled={deleting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                            {deleting && <Loader2 size={16} className="animate-spin" />}
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

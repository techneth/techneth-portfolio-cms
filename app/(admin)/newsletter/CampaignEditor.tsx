'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Send,
    Loader2,
    Monitor,
    Smartphone,
    FlaskConical,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal from '@/components/admin/Modal';
import QuillEditor from '@/components/admin/QuillEditor';
import { sanitizeHtmlClient } from '@/lib/sanitize/client';
import { renderNewsletterHtml } from '@/lib/newsletter/template';
import {
    Campaign,
    createCampaign,
    updateCampaign,
    sendTestEmail,
    sendCampaign,
    getCampaign,
} from './actions';

export default function CampaignEditor({
    initialCampaign,
    activeSubscriberCount,
}: {
    initialCampaign: Campaign | null;
    activeSubscriberCount: number;
}) {
    const router = useRouter();
    const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign);
    const [subject, setSubject] = useState(initialCampaign?.subject || '');
    const [preheader, setPreheader] = useState(initialCampaign?.preheader || '');
    const [contentHtml, setContentHtml] = useState(initialCampaign?.content_html || '');

    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    // Send-test modal
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // Send-campaign confirmation
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);

    const isLocked = campaign?.status === 'sent' || campaign?.status === 'sending';
    const isDirty =
        subject !== (campaign?.subject || '') ||
        preheader !== (campaign?.preheader || '') ||
        contentHtml !== (campaign?.content_html || '');

    // Poll campaign progress while a send is in flight (the send runs as a
    // long server action; polling keeps the counts fresh in the UI).
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if ((sending || campaign?.status === 'sending') && campaign?.id && !pollRef.current) {
            pollRef.current = setInterval(async () => {
                try {
                    const fresh = await getCampaign(campaign.id);
                    setCampaign(fresh);
                    if (fresh.status !== 'sending') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                } catch {
                    /* transient polling errors are fine */
                }
            }, 2500);
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [sending, campaign?.status, campaign?.id]);

    // Live preview: render the exact template used when sending, with the
    // content sanitized the same way the server sanitizes it on save.
    const previewHtml = useMemo(
        () =>
            renderNewsletterHtml({
                subject: subject || 'Untitled campaign',
                preheader: preheader || undefined,
                contentHtml: sanitizeHtmlClient(
                    contentHtml || '<p style="color:#9CA3AF;">Start writing your newsletter content…</p>'
                ),
                unsubscribeUrl: '#unsubscribe-preview',
                recipientEmail: 'subscriber@example.com',
            }),
        [subject, preheader, contentHtml]
    );

    const persist = async (): Promise<Campaign | null> => {
        if (!subject.trim()) {
            toast.error('Subject is required');
            return null;
        }
        if (!contentHtml.trim()) {
            toast.error('Email content is empty');
            return null;
        }

        setSaving(true);
        try {
            let saved: Campaign;
            if (campaign) {
                saved = await updateCampaign(campaign.id, { subject, preheader, contentHtml });
            } else {
                saved = await createCampaign({ subject, preheader, contentHtml });
                router.replace(`/newsletter/campaigns/${saved.id}`);
            }
            setCampaign(saved);
            setContentHtml(saved.content_html);
            return saved;
        } catch (error: any) {
            toast.error(error.message || 'Failed to save campaign');
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        const saved = await persist();
        if (saved) toast.success('Draft saved');
    };

    const handleSendTest = async () => {
        if (!testEmail.trim()) {
            toast.error('Enter an email address');
            return;
        }
        setSendingTest(true);
        try {
            const saved = isDirty || !campaign ? await persist() : campaign;
            if (!saved) return;
            await sendTestEmail(saved.id, testEmail);
            toast.success(`Test email sent to ${testEmail}`);
            setIsTestModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to send test email');
        } finally {
            setSendingTest(false);
        }
    };

    const handleSendCampaign = async () => {
        setIsSendModalOpen(false);
        setSending(true);
        try {
            const saved = isDirty || !campaign ? await persist() : campaign;
            if (!saved) return;
            setCampaign({ ...saved, status: 'sending' });
            const result = await sendCampaign(saved.id);
            const fresh = await getCampaign(saved.id);
            setCampaign(fresh);
            toast.success(
                `Campaign sent to ${result.sent} subscriber${result.sent === 1 ? '' : 's'}${result.failed ? ` — ${result.failed} failed` : ''}`
            );
        } catch (error: any) {
            toast.error(error.message || 'Failed to send campaign');
            if (campaign?.id) {
                try {
                    setCampaign(await getCampaign(campaign.id));
                } catch { /* keep local state */ }
            }
        } finally {
            setSending(false);
        }
    };

    const statusPill = () => {
        if (!campaign) return null;
        const map: Record<Campaign['status'], { label: string; cls: string; icon: React.ReactNode }> = {
            draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700', icon: null },
            sending: { label: 'Sending…', cls: 'bg-blue-100 text-blue-700', icon: <Loader2 size={12} className="animate-spin" /> },
            sent: { label: 'Sent', cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
            failed: { label: 'Failed', cls: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
        };
        const s = map[campaign.status];
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                {s.icon}
                {s.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/newsletter"
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {campaign ? (isLocked ? 'Campaign' : 'Edit Campaign') : 'New Campaign'}
                            </h1>
                            {statusPill()}
                        </div>
                        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                            <Users size={14} />
                            {activeSubscriberCount} active subscriber{activeSubscriberCount === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>

                {!isLocked && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsTestModalOpen(true)}
                            disabled={saving || sending}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                        >
                            <FlaskConical size={16} />
                            Send Test
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || sending || !isDirty}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Draft
                        </button>
                        <button
                            onClick={() => setIsSendModalOpen(true)}
                            disabled={saving || sending || activeSubscriberCount === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                        >
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {sending ? 'Sending…' : 'Send Campaign'}
                        </button>
                    </div>
                )}
            </div>

            {/* Sending / sent stats banner */}
            {campaign && campaign.status !== 'draft' && (
                <div
                    className={`rounded-lg border p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm ${campaign.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : campaign.status === 'sending'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                >
                    <span className="text-gray-700">
                        <strong>{campaign.sent_count}</strong> of <strong>{campaign.recipient_count}</strong> delivered to Resend
                    </span>
                    {campaign.failed_count > 0 && (
                        <span className="text-red-600">
                            <strong>{campaign.failed_count}</strong> failed
                        </span>
                    )}
                    {campaign.sent_at && (
                        <span className="text-gray-500">
                            Sent {format(new Date(campaign.sent_at), 'MMM d, yyyy HH:mm')}
                        </span>
                    )}
                    {campaign.error_message && (
                        <span className="text-red-600 flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            {campaign.error_message}
                        </span>
                    )}
                </div>
            )}

            {/* Editor + Preview */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {/* Left: form */}
                <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={isLocked}
                                placeholder="Your monthly dose of Techneth insights"
                                maxLength={200}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Preheader
                                <span className="text-gray-400 font-normal"> — preview text shown next to the subject in inboxes</span>
                            </label>
                            <input
                                type="text"
                                value={preheader}
                                onChange={(e) => setPreheader(e.target.value)}
                                disabled={isLocked}
                                placeholder="A short teaser for this issue…"
                                maxLength={200}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email content *</label>
                        {isLocked ? (
                            <div
                                className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 bg-gray-50"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtmlClient(contentHtml) }}
                            />
                        ) : (
                            <QuillEditor
                                value={contentHtml}
                                onChange={setContentHtml}
                                placeholder="Write your newsletter content…"
                                contentTitle={subject}
                            />
                        )}
                    </div>
                </div>

                {/* Right: live email preview */}
                <div className="xl:sticky xl:top-6">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <div className="text-sm">
                                <p className="font-medium text-gray-900 truncate max-w-[300px]">
                                    {subject || 'Untitled campaign'}
                                </p>
                                {preheader && (
                                    <p className="text-gray-400 text-xs truncate max-w-[300px]">{preheader}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                                <button
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-[#00A99D] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Desktop preview"
                                >
                                    <Monitor size={16} />
                                </button>
                                <button
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-[#00A99D] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Mobile preview"
                                >
                                    <Smartphone size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-100 flex justify-center p-4" style={{ minHeight: 500 }}>
                            <iframe
                                title="Email preview"
                                srcDoc={previewHtml}
                                sandbox=""
                                className="bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-300"
                                style={{
                                    width: previewMode === 'mobile' ? 375 : '100%',
                                    maxWidth: previewMode === 'mobile' ? 375 : 680,
                                    height: 640,
                                }}
                            />
                        </div>
                        <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                            This is the exact email your subscribers will receive, with a personalized unsubscribe
                            link added for each recipient.
                        </p>
                    </div>
                </div>
            </div>

            {/* Send test modal */}
            <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} title="Send Test Email">
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Sends this campaign to a single address with a <strong>[TEST]</strong> subject prefix. Unsaved
                        changes are saved first.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email</label>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="you@techneth.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D]/40"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsTestModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendTest}
                            disabled={sendingTest}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                            {sendingTest && <Loader2 size={16} className="animate-spin" />}
                            Send Test
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Send campaign confirmation */}
            <Modal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} title="Send Campaign">
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <Send className="text-[#00A99D] mt-0.5 shrink-0" size={20} />
                        <p className="text-sm text-gray-600">
                            Send <strong>&ldquo;{subject || 'Untitled campaign'}&rdquo;</strong> to{' '}
                            <strong>{activeSubscriberCount}</strong> active subscriber
                            {activeSubscriberCount === 1 ? '' : 's'}? This cannot be undone.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsSendModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendCampaign}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A99D] hover:bg-[#008F84] text-white rounded-lg text-sm font-medium"
                        >
                            <Send size={16} />
                            Send Now
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

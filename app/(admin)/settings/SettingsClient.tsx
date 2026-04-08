'use client';

import { useState, useEffect } from 'react';
import { Save, Power, PowerOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSettings, updateSettings, SettingsData } from './actions';
import Link from 'next/link';

export default function SettingsClient({
    initialSettings: serverSettings
}: { initialSettings: SettingsData | null }) {
    const [settings, setSettings] = useState<SettingsData | null>(serverSettings);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Track initial values to detect changes
    const [initialSettings, setInitialSettings] = useState<SettingsData | null>(serverSettings);

    useEffect(() => {
        // No initial load needed
    }, []);

    const loadSettings = async () => {
        try {
            const data = await getSettings();
            setSettings(data);
            setInitialSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings || !initialSettings) return;

        // Detect changes
        const updates: Partial<SettingsData> = {};
        let hasChanges = false;

        if (JSON.stringify(settings.maintenanceMode) !== JSON.stringify(initialSettings.maintenanceMode)) {
            updates.maintenanceMode = settings.maintenanceMode;
            hasChanges = true;
        }

        if (settings.siteName !== initialSettings.siteName) {
            updates.siteName = settings.siteName;
            hasChanges = true;
        }

        if (settings.contactEmail !== initialSettings.contactEmail) {
            updates.contactEmail = settings.contactEmail;
            hasChanges = true;
        }

        if (JSON.stringify(settings.smtpConfig) !== JSON.stringify(initialSettings.smtpConfig)) {
            updates.smtpConfig = settings.smtpConfig;
            hasChanges = true;
        }

        if (!hasChanges) {
            toast('No changes to save', { icon: 'ℹ️' });
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Saving settings...');

        try {
            await updateSettings(updates);
            toast.success('Settings saved successfully!', { id: toastId });
            // Update initial settings after successful save
            setInitialSettings(settings);
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast.error(error.message || 'Failed to save settings', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-600">Failed to load settings</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
                <p className="text-gray-600 mt-2">Manage system settings and configurations</p>
            </div>

            {/* Maintenance Mode */}
            <div className="admin-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Maintenance Mode</h3>

                <div className="flex items-center justify-between p-4 bg-gray-100 rounded">
                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Enable Maintenance Mode</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            When enabled, visitors will see a maintenance page. Admin access remains available.
                        </p>
                    </div>
                    <button
                        onClick={() => setSettings({
                            ...settings,
                            maintenanceMode: {
                                ...settings.maintenanceMode,
                                enabled: !settings.maintenanceMode.enabled
                            }
                        })}
                        className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${settings.maintenanceMode.enabled ? 'bg-[#DC3545]' : 'bg-[#E0E0E0]'
                            }`}
                    >
                        <span
                            className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${settings.maintenanceMode.enabled ? 'translate-x-13' : 'translate-x-1'
                                }`}
                        >
                            {settings.maintenanceMode.enabled ? (
                                <PowerOff className="m-2 text-[#DC3545]" size={24} />
                            ) : (
                                <Power className="m-2 text-[#6C757D]" size={24} />
                            )}
                        </span>
                    </button>
                </div>

                {settings.maintenanceMode.enabled && (
                    <div className="p-4 bg-[#00A99D]/10 border border-[#00A99D] rounded">
                        <p className="text-sm text-gray-700">
                            <strong>Warning:</strong> Maintenance mode is currently enabled. Users will not be able to access the site.
                        </p>
                    </div>
                )}
            </div>

            {/* Site Settings */}
            <div className="admin-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Site Settings</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Site Name
                    </label>
                    <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        className="input-field max-w-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email
                    </label>
                    <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                        className="input-field max-w-md"
                    />
                </div>
            </div>

            {/* SMTP Settings */}
            <div className="admin-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">SMTP Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Configure the email server used for sending automated replies and notifications.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            SMTP Host
                        </label>
                        <input
                            type="text"
                            value={settings.smtpConfig?.host || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                smtpConfig: { ...settings.smtpConfig, host: e.target.value }
                            })}
                            className="input-field w-full"
                            placeholder="e.g., smtp.gmail.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            SMTP Port
                        </label>
                        <input
                            type="number"
                            value={settings.smtpConfig?.port || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                smtpConfig: { ...settings.smtpConfig, port: parseInt(e.target.value) || 0 }
                            })}
                            className="input-field w-full"
                            placeholder="e.g., 587"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 mt-2">
                    <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={settings.smtpConfig?.secure || false}
                        onChange={(e) => setSettings({
                            ...settings,
                            smtpConfig: { ...settings.smtpConfig, secure: e.target.checked }
                        })}
                        className="w-4 h-4 text-[#00A99D] rounded border-gray-300 focus:ring-[#00A99D]"
                    />
                    <label htmlFor="smtpSecure" className="text-sm font-medium text-gray-700">
                        Use Secure Connection (SSL/TLS - typically true for port 465, false for 587)
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auth Username / Email
                        </label>
                        <input
                            type="text"
                            value={settings.smtpConfig?.auth?.user || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                smtpConfig: {
                                    ...settings.smtpConfig,
                                    auth: { ...settings.smtpConfig.auth, user: e.target.value }
                                }
                            })}
                            className="input-field w-full"
                            placeholder="Email address"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auth Password / App Password
                        </label>
                        <input
                            type="password"
                            value={settings.smtpConfig?.auth?.pass || ''}
                            onChange={(e) => setSettings({
                                ...settings,
                                smtpConfig: {
                                    ...settings.smtpConfig,
                                    auth: { ...settings.smtpConfig.auth, pass: e.target.value }
                                }
                            })}
                            className="input-field w-full"
                            placeholder="Password"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Email Address (Sender Format)
                    </label>
                    <input
                        type="text"
                        value={settings.smtpConfig?.fromEmail || ''}
                        onChange={(e) => setSettings({
                            ...settings,
                            smtpConfig: { ...settings.smtpConfig, fromEmail: e.target.value }
                        })}
                        className="input-field max-w-md"
                        placeholder='e.g., "From Techneth" <noreply@techneth.com>'
                    />
                </div>
            </div>

            {/* User Management */}
            <div className="admin-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                    <Link
                        href="/users"
                        className="text-sm text-[#00A99D] hover:text-[#008F84] font-medium"
                    >
                        View All →
                    </Link>
                </div>

                <p className="text-sm text-gray-600">
                    Manage admin users, assign roles, and control access permissions. Only super admins can create, edit, and manage users.
                </p>

                <Link
                    href="/users"
                    className="inline-block px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                >
                    Manage Users
                </Link>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>
        </div>
    );
}

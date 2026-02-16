'use client';

import { useState, useEffect } from 'react';
import { Save, Power, PowerOff } from 'lucide-react';

export default function SettingsPage() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [saving, setSaving] = useState(false);

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

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Enable Maintenance Mode</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            When enabled, visitors will see a maintenance page. Admin access remains available.
                        </p>
                    </div>
                    <button
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${maintenanceMode ? 'translate-x-13' : 'translate-x-1'
                                }`}
                        >
                            {maintenanceMode ? (
                                <PowerOff className="m-2 text-red-500" size={24} />
                            ) : (
                                <Power className="m-2 text-gray-400" size={24} />
                            )}
                        </span>
                    </button>
                </div>

                {maintenanceMode && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
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
                        defaultValue="Techneth"
                        className="input-field max-w-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email
                    </label>
                    <input
                        type="email"
                        defaultValue="info@techneth.com"
                        className="input-field max-w-md"
                    />
                </div>
            </div>

            {/* User Management (Super Admin Only) */}
            <div className="admin-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">User Management</h3>

                <p className="text-sm text-gray-600">
                    User management features will be implemented here. Super admins can create, edit, and manage admin users.
                </p>

                <button className="px-4 py-2 bg-[#4AB3A5] text-white rounded hover:bg-[#3A9A8D] transition-colors">
                    Add New User
                </button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => {
                        setSaving(true);
                        setTimeout(() => {
                            setSaving(false);
                            alert('Settings saved successfully!');
                        }, 1000);
                    }}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-[#4AB3A5] text-white rounded hover:bg-[#3A9A8D] transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>
        </div>
    );
}

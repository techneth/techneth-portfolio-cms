import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function SetupPage() {
    const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-');

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#4AB3A5] to-[#2C3E50] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Techneth Admin Panel Setup
                    </h1>
                    <p className="text-gray-600">
                        Complete the following steps to get started
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded">
                        <div className="flex-shrink-0 mt-1">
                            {supabaseConfigured ? (
                                <CheckCircle className="text-green-500" size={24} />
                            ) : (
                                <AlertCircle className="text-yellow-500" size={24} />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                1. Create Supabase Project
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Go to supabase.com and create a new project. This will host your database and authentication.
                            </p>
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-[#4AB3A5] hover:text-[#3A9A8D] text-sm font-medium"
                            >
                                <span>Open Supabase Dashboard</span>
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded">
                        <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="text-yellow-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                2. Run Database Schema
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                In your Supabase dashboard, go to SQL Editor and run the schema from{' '}
                                <code className="bg-gray-200 px-2 py-1 rounded text-xs">supabase_schema.sql</code>
                            </p>
                            <div className="bg-white p-3 rounded border text-xs font-mono text-gray-700">
                                Location: /techneth_backend/supabase_schema.sql
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded">
                        <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="text-yellow-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                3. Update Environment Variables
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Get your API credentials from Supabase Project Settings → API and update{' '}
                                <code className="bg-gray-200 px-2 py-1 rounded text-xs">.env.local</code>
                            </p>
                            <div className="bg-white p-3 rounded border text-xs font-mono space-y-1">
                                <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</div>
                                <div>SUPABASE_SERVICE_ROLE_KEY=eyJ...</div>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded">
                        <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="text-yellow-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                4. Create Your First Admin User
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                In Supabase Dashboard → Authentication → Users, create a user and add them to the users table with role='super_admin'
                            </p>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded">
                        <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="text-yellow-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                5. Restart Development Server
                            </h3>
                            <p className="text-sm text-gray-600">
                                After updating .env.local, restart the dev server:
                            </p>
                            <div className="bg-white p-3 rounded border text-xs font-mono mt-2">
                                npm run dev
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documentation Links */}
                <div className="mt-8 pt-6 border-t">
                    <h4 className="font-semibold text-gray-800 mb-3">📚 Documentation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <Link
                            href="file:///Users/leopard-workstation-office/.gemini/antigravity/brain/1354662b-5ba7-4cdc-bed3-eebf7df87bd0/setup_guide.md"
                            className="text-[#4AB3A5] hover:text-[#3A9A8D]"
                        >
                            → Detailed Setup Guide
                        </Link>
                        <Link
                            href="file:///Users/leopard-workstation-office/.gemini/antigravity/brain/1354662b-5ba7-4cdc-bed3-eebf7df87bd0/walkthrough.md"
                            className="text-[#4AB3A5] hover:text-[#3A9A8D]"
                        >
                            → Feature Walkthrough
                        </Link>
                    </div>
                </div>

                {/* Status */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                        <strong>Current Status:</strong> {supabaseConfigured ?
                            'Supabase URL configured. Complete remaining steps.' :
                            'Waiting for Supabase configuration. Please update .env.local with your Supabase credentials.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

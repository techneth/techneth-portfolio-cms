'use client';

import { Clock, LogOut } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function PendingPage() {
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A99D 0%, #008F84 100%)' }}>
            <div className="max-w-md w-full mx-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded mb-4">
                        <span className="text-2xl font-bold" style={{ color: '#00A99D' }}>T</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Techneth Admin</h1>
                </div>

                <div className="bg-white rounded shadow-xl p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                        <Clock className="text-primary" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Awaiting Approval</h2>
                    <p className="text-gray-600 mb-2">
                        Your account is currently <span className="font-semibold text-primary">pending approval</span> by a super admin.
                    </p>
                    <p className="text-sm text-gray-500 mb-8">
                        You'll be able to access the admin panel once your account has been reviewed and approved. Please check back later or contact your administrator.
                    </p>

                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

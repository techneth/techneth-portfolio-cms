import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/admin/Sidebar';

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Fetch real authenticated user
    const user = await getCurrentUser();

    // If no user found (should be handled by middleware, but double check)
    if (!user) {
        redirect('/login');
    }

    return (
        <div className="flex h-screen bg-white">
            <Sidebar user={user} />

            <main className="flex-1 lg:ml-64 overflow-y-auto">
                <div className="p-4 lg:p-8 animate-fadeIn">
                    {children}
                </div>
            </main>
            <Toaster
                position="top-right"
                toastOptions={{
                    // Default options
                    duration: 3000,
                    style: {
                        background: '#FFFFFF',
                        color: '#000100',
                        border: '1px solid #E0E0E0',
                    },
                    // Success toast
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#28A745',
                            secondary: '#FFFFFF',
                        },
                        style: {
                            border: '1px solid #28A745',
                        },
                    },
                    // Error toast
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#DC3545',
                            secondary: '#FFFFFF',
                        },
                        style: {
                            border: '1px solid #DC3545',
                        },
                    },
                    // Loading toast
                    loading: {
                        iconTheme: {
                            primary: '#00A99D',
                            secondary: '#FFFFFF',
                        },
                        style: {
                            border: '1px solid #00A99D',
                        },
                    },
                }}
            />
        </div>
    );
}

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/admin/Sidebar';

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Auth is handled by middleware, so we're guaranteed to have a user here
    const user = {
        name: 'Admin User',
        email: 'fahad@techneth.com',
        role: 'super_admin',
        avatar_url: null
    };

    return (
        <div className="flex h-screen bg-[#F5F7FA]">
            <Sidebar user={user} />

            <main className="flex-1 lg:ml-64 overflow-y-auto">
                <div className="p-4 lg:p-8">
                    {children}
                </div>
            </main>
            <Toaster position="top-right" />
        </div>
    );
}

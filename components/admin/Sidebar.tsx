'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Briefcase,
    Mail,
    Settings,
    FileSearch,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    user: {
        name: string;
        email: string;
        role: string;
        avatar_url: string | null;
    };
}

interface MenuItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    roles: string[];
}

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const menuItems: MenuItem[] = [
        {
            href: '/admin',
            label: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            roles: ['super_admin', 'admin', 'editor'],
        },
        {
            href: '/admin/blogs',
            label: 'Blogs',
            icon: <FileText size={20} />,
            roles: ['super_admin', 'admin', 'editor'],
        },
        {
            href: '/admin/case-studies',
            label: 'Case Studies',
            icon: <Briefcase size={20} />,
            roles: ['super_admin', 'admin', 'editor'],
        },
        {
            href: '/admin/contacts',
            label: 'Contact Submissions',
            icon: <Mail size={20} />,
            roles: ['super_admin', 'admin', 'editor'],
        },
        {
            href: '/admin/logs',
            label: 'Activity Logs',
            icon: <FileSearch size={20} />,
            roles: ['super_admin', 'admin'],
        },
        {
            href: '/admin/settings',
            label: 'Settings',
            icon: <Settings size={20} />,
            roles: ['super_admin'],
        },
    ];

    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(user.role)
    );

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            {/* Mobile Menu Toggle */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded bg-[#1E3A8A] text-white shadow-lg"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside
                className={`
          admin-sidebar fixed top-0 left-0 h-full w-64 transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 pt-20 lg:pt-6 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                            <Image
                                src="/logo.png"
                                alt="Techneth Logo"
                                width={160}
                                height={45}
                                className="object-contain h-10 w-auto"
                                priority
                            />
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-6">
                        <ul className="space-y-1 px-3">
                            {filteredMenuItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/admin' && pathname.startsWith(item.href));

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`
                        flex items-center space-x-3 px-4 py-3 rounded transition-colors
                        ${isActive
                                                    ? 'bg-[#00A99D] text-white'
                                                    : 'text-white/80 hover:bg-white/10'
                                                }
                      `}
                                        >
                                            {item.icon}
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* User Profile */}
                    <div className="p-6 border-t border-white/10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-[#00A99D] rounded-full flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user.name}</p>
                                <p className="text-white/60 text-xs truncate">{user.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                />
            )}
        </>
    );
}

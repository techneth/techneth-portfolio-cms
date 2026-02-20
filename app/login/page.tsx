'use client';

import { useState } from 'react';
import { loginAction } from './actions';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/public/techneth.svg';   

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('🔵 Login attempt started for:', email);

        try {
            const result = await loginAction(email, password);

            if (result?.error) {
                console.error('🔴 Login error:', result.error);
                setError(result.error);
                setLoading(false);
            } else {
                console.log('✅ Login successful! Redirecting...');
                // Server action will handle redirect
            }
        } catch (err: any) {
            // NEXT_REDIRECT is thrown by redirect() - this is SUCCESS, not an error!
            if (err?.message?.includes('NEXT_REDIRECT')) {
                console.log('✅ Redirecting to admin...');
                return; // Let the redirect happen
            }

            console.error('🔴 Login error caught:', err);
            setError(err.message || 'Invalid email or password');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A99D 0%, #008F84 100%)' }}>
            <div className="max-w-md w-full mx-4">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Image
                            src={logo}
                            alt="Techneth Logo"
                            width={240}
                            height={80}
                            className="h-24 w-auto drop-shadow-lg"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded shadow-xl p-8">
                    <form onSubmit={handleLogin}>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent"
                                placeholder="admin@techneth.com"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: loading ? '#008F84' : '#00A99D' }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#008F84')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#00A99D')}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>Techneth Content Management System</p>
                        <p className="mt-2">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-[#00A99D] hover:text-[#008F84] font-medium">
                                Request access
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

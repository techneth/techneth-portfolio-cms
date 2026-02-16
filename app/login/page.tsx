'use client';

import { useState } from 'react';
import { loginAction } from './actions';

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
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4AB3A5 0%, #3A9A8D 100%)' }}>
            <div className="max-w-md w-full mx-4">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded mb-4">
                        <span className="text-2xl font-bold" style={{ color: '#4AB3A5' }}>T</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Techneth Admin</h1>
                    <p className="text-white/90">Sign in to manage your content</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded shadow-xl p-8">
                    <form onSubmit={handleLogin}>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
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
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5] focus:border-transparent"
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
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4AB3A5] focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: loading ? '#3A9A8D' : '#4AB3A5' }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#3A9A8D')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#4AB3A5')}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>Techneth Content Management System</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

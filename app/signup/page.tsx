'use client';

import { useState } from 'react';
import { signupAction } from './actions';
import Link from 'next/link';
import Image from 'next/image';
import { UserPlus, CheckCircle } from 'lucide-react';
import logo from '@/public/techneth.svg';   

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const result = await signupAction(name, email, password);

            if (result?.error) {
                setError(result.error);
            } else if (result?.success) {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A99D 0%, #008F84 100%)' }}>
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded shadow-xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Account Request Submitted!</h2>
                        <p className="text-gray-600 mb-2">
                            Your account request has been received and is <span className="font-semibold text-[#00A99D]">pending approval</span> by a super admin.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Once approved, you'll be able to sign in and access the admin panel. Please check back later.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors font-medium"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-white/90">Request access to the Techneth admin panel</p>
                </div>

                {/* Signup Form */}
                <div className="bg-white rounded shadow-xl p-8">
                    <div className="mb-5 p-3 bg-primary/5 border border-primary/20 text-primary-dark rounded text-sm">
                        <strong>Note:</strong> After signing up, a super admin will review and approve your account before you can access the panel.
                    </div>

                    <form onSubmit={handleSignup}>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent"
                                placeholder="John Doe"
                            />
                        </div>

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
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ background: loading ? '#008F84' : '#00A99D' }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#008F84')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#00A99D')}
                        >
                            <UserPlus size={18} />
                            {loading ? 'Submitting...' : 'Request Access'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#00A99D] hover:text-[#008F84] font-medium">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

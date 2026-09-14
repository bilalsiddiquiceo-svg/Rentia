'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuthRetry: true,
      });
      setSent(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {sent ? (
          <>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-coal">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              If an account exists with that email, we&apos;ve sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="mt-8 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-coal">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-coal/80">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-mist bg-white px-4 py-3 text-sm text-coal shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending link…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-semibold text-brand transition-colors hover:text-brand-deep"
              >
                Log in
              </Link>
            </div>

            <Link
              href="/"
              className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-brand"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
        skipAuthRetry: true,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-coal">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The reset link is missing or invalid. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-brand to-[#0D9488] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-mint text-white shadow-lg shadow-brand/25">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-coal">
            Password reset successful
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your password has been updated. Please log in with your new password.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-coal">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your new password below.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-coal/80">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-mist bg-white px-4 py-3 text-sm text-coal shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-coal/80">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-mist bg-white px-4 py-3 text-sm text-coal shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting ? 'Resetting password…' : 'Reset Password'}
          </button>
        </form>

        <Link
          href="/"
          className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-brand"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="mt-8 space-y-5">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

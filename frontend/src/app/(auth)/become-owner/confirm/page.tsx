'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { refreshAuth } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing confirmation token in URL.');
      return;
    }

    const confirmToken = async () => {
      try {
        const res = await apiFetch<{ message: string; user?: unknown }>(
          `/become-owner/confirm?token=${encodeURIComponent(token)}`
        );
        setStatus('success');
        setMessage(res.message);
        await refreshAuth();
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to confirm owner token.');
      }
    };

    confirmToken();
  }, [token, refreshAuth]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center">
            <div className="mx-auto w-full max-w-sm rounded-3xl border border-mist bg-white p-8 shadow-sm">
              <div className="mx-auto h-14 w-14 skeleton-shimmer rounded-full" />
              <Skeleton className="mx-auto mt-6 h-5 w-48" />
              <Skeleton className="mx-auto mt-3 h-3 w-64" />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-3xl border border-mist bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-mint text-white shadow-lg shadow-brand/25">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-coal">
              Owner Status Confirmed!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
            >
              Go to Owner Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-3xl border border-mist bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-extrabold tracking-tight text-coal">
              Confirmation Failed
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-red-600">{message}</p>
            <button
              onClick={() => router.push('/become-owner')}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
            >
              Request New Upgrade Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BecomeOwnerConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-12 text-sm text-slate-500">
          Loading confirmation page…
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}

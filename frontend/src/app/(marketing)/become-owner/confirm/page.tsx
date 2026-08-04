'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

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
        const res = await apiFetch<{ message: string; user?: any }>(`/become-owner/confirm?token=${encodeURIComponent(token)}`);
        setStatus('success');
        setMessage(res.message);
        await refreshAuth();
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to confirm owner token.');
      }
    };

    confirmToken();
  }, [token, refreshAuth]);

  return (
    <div className="max-w-md mx-auto my-16 bg-white border border-[#E2DDD5] p-8 rounded-lg text-center shadow-xs">
      {status === 'loading' && (
        <div className="py-8">
          <div className="w-10 h-10 border-4 border-[#B4652B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-[#1C2321]">Verifying Confirmation Token...</h2>
          <p className="text-xs text-[#5C6560] mt-1">Please wait while we update your account status.</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="w-12 h-12 bg-[#4B5D45]/10 text-[#4B5D45] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-[#1C2321]">Owner Status Confirmed!</h2>
          <p className="text-sm text-[#5C6560] mt-2 mb-6">{message}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-2.5 bg-[#4B5D45] hover:opacity-90 text-white font-medium text-sm rounded transition-colors"
          >
            Go to Owner Dashboard
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="w-12 h-12 bg-[#9C3B2E]/10 text-[#9C3B2E] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ✕
          </div>
          <h2 className="text-xl font-bold text-[#1C2321]">Confirmation Failed</h2>
          <p className="text-sm text-[#9C3B2E] mt-2 mb-6">{message}</p>
          <a
            href="/become-owner"
            className="inline-block w-full py-2.5 bg-[#B4652B] hover:bg-[#9E5522] text-[#F6F4EF] font-medium text-sm rounded transition-colors"
          >
            Request New Upgrade Link
          </a>
        </div>
      )}
    </div>
  );
}

export default function BecomeOwnerConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-[#5C6560]">Loading confirmation page...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}

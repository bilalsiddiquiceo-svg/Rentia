'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';

export default function BookingCancelPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-6 font-[Cinzel] text-3xl font-bold text-slate-900">Payment cancelled</h1>
        <p className="mt-2 text-sm text-slate-500">
          No charges were made. You can try again whenever you&apos;re ready.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.history.back()}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Browse
          </Link>
        </div>
      </div>
    </RequireAuth>
  );
}

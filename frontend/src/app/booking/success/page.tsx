'use client';

import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';

export default function BookingSuccessPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="mt-6 font-[Cinzel] text-3xl font-bold text-slate-900">Booking confirmed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your stay is secured. Check your email for a receipt and move-in details.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app/leases"
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            View My Leases
          </Link>
          <Link
            href="/app"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Browse more homes
          </Link>
        </div>
      </div>
    </RequireAuth>
  );
}

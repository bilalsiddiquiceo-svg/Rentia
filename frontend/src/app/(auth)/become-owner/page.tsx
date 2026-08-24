'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

const PERKS = [
  {
    title: 'Zero commission',
    description: 'Keep 100% of your rent. No platform fees, no hidden cuts.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m6.364 3.636a3.57 3.57 0 0 0-2.015-2.873l-2.784-1.392a.75.75 0 0 0-1.008.577l-.18 1.156a3.75 3.75 0 0 0 1.12 3.09l6.564 6.563a3.75 3.75 0 0 0 3.09 1.12l1.156-.18a.75.75 0 0 0 .577-1.008l-1.392-2.784a3.57 3.57 0 0 0-2.873-2.015h-2.143Z" />
      </svg>
    ),
  },
  {
    title: 'Direct payouts',
    description: 'Rent lands in your bank via Stripe, three days after collection.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: '30-day blocks',
    description: 'Fixed lease blocks with auto-renewing rent — zero chasing.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Full dashboard',
    description: 'Availability, bookings, and earnings analytics in one place.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
];

function AuthRequired() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">
        <img src="/logo.png" alt="Rentia Logo" className="mx-auto h-20 w-auto object-contain" />
        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-coal">
          Authentication Required
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Please log in or create an account before applying to become a property owner.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login?redirect=%2Fbecome-owner"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-[#0D9488] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mist bg-white px-6 py-3 text-sm font-semibold text-coal transition-all duration-200 hover:border-brand/30 hover:text-brand"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

function AlreadyOwner() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-mint text-white shadow-lg shadow-brand/25">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-coal">You are an Owner!</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your account already has full Owner permissions. You can add listings and view payouts in your dashboard.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-[#0D9488] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105"
        >
          Go to Owner Dashboard
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function BecomeOwnerPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devConfirmationUrl, setDevConfirmationUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the Owner Terms of Service.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await apiFetch('/become-owner/request', {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      });

      setSubmitted(true);
      if (res.confirmationUrlDev) {
        setDevConfirmationUrl(res.confirmationUrlDev);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upgrade request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <AuthRequired />;
  if (user.role === 'owner') return <AlreadyOwner />;

  if (submitted) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-coal">Check Your Email</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            We have generated a secure one-time upgrade link and sent it to{' '}
            <strong className="font-semibold text-coal">{user.email}</strong>. Click the link in the email to activate your Owner account.
          </p>

          {devConfirmationUrl && (
            <div className="mt-6 rounded-xl border border-mist bg-white p-4 text-left shadow-sm">
              <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-brand">
                Development Direct Confirmation Link:
              </span>
              <a
                href={devConfirmationUrl}
                className="mt-1 block break-all font-mono text-xs text-coal underline hover:text-brand"
              >
                {devConfirmationUrl}
              </a>
            </div>
          )}

          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl border border-mist bg-white px-6 py-3 text-sm font-semibold text-coal transition-all duration-200 hover:border-brand/30 hover:text-brand"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-medium tracking-wide text-brand">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          Owner Onboarding
        </span>
        <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-coal">
          Become a property owner in minutes.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          List properties, manage 30-day lease blocks, and receive automated payouts directly to your bank account.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="group rounded-2xl border border-mist bg-white p-5 shadow-sm transition-all duration-300 hover:border-brand/25 hover:shadow-lg hover:shadow-coal/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                {perk.icon}
              </div>
              <h3 className="mt-3 text-sm font-bold text-coal">{perk.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{perk.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-mist bg-white p-8 shadow-sm">
          <h2 className="text-xl font-extrabold tracking-tight text-coal">Owner application</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Tell us a little about yourself and we will send a secure activation link to your email.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-coal/80">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-mist bg-white px-4 py-3 text-sm text-coal shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-coal/80">
                Phone number (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-mist bg-white px-4 py-3 text-sm text-coal shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-mist bg-fog p-4 transition-colors hover:border-brand/30">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-mist accent-brand"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                I agree to the Owner Terms of Service, including the fixed 30-day
                block policy and the 3-day payout hold.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/30 hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting…' : 'Request Owner Access'}
            </button>
          </form>
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
      </div>
    </div>
  );
}

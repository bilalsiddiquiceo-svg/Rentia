'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { fetchOwnerPropertyCards, fetchOwnerStats, togglePropertyStatus } from '@/lib/properties';
import type { OwnerPropertyCard, OwnerStats } from '@/lib/properties';
import {
  connectStripe,
  getStripeConnectStatus,
  fetchWallet,
  fetchDisputes,
} from '@/lib/stripe';
import { useToast } from '@/components/Toast';
import { DashboardSkeleton, PropertyRowSkeleton } from '@/components/Skeleton';
import { PageHeading } from '@/components/PageHeading';
import type { OwnerWallet, OwnerDispute } from '@/lib/stripe';

const SWR_CONFIG = { dedupingInterval: 30000 } as const;

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Pending payment', cls: 'bg-amber-50 text-amber-600' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-500' },
  ended: { label: 'Ended', cls: 'bg-slate-100 text-slate-500' },
};

export interface DashboardInitialData {
  properties: OwnerPropertyCard[] | null;
  stats: OwnerStats | null;
  stripeStatus: { connected: boolean; accountId: string | null } | null;
  wallet: OwnerWallet | null;
  disputes: OwnerDispute[] | null;
}

export default function DashboardClient({ initialData }: { initialData: DashboardInitialData }) {
  const { user, isLoading: authLoading } = useAuth();
  const isOwner = !!user && user.role === 'owner';

  const { data: properties, isLoading: propsLoading, mutate: mutateProperties } = useSWR<OwnerPropertyCard[]>(
    isOwner ? 'owner-property-cards' : null,
    fetchOwnerPropertyCards,
    { ...SWR_CONFIG, fallbackData: initialData.properties ?? undefined },
  );

  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useSWR<OwnerStats>(
    isOwner ? 'owner-stats' : null,
    fetchOwnerStats,
    { ...SWR_CONFIG, fallbackData: initialData.stats ?? undefined },
  );

  const { data: stripeStatus, isLoading: stripeLoading } = useSWR<{ connected: boolean; accountId: string | null }>(
    isOwner ? 'stripe-connect-status' : null,
    getStripeConnectStatus,
    { ...SWR_CONFIG, fallbackData: initialData.stripeStatus ?? undefined },
  );

  const { data: wallet, isLoading: walletLoading } = useSWR<OwnerWallet>(
    isOwner ? 'owner-wallet' : null,
    fetchWallet,
    { ...SWR_CONFIG, fallbackData: initialData.wallet ?? undefined },
  );

  const { data: disputes, isLoading: disputesLoading } = useSWR<OwnerDispute[]>(
    isOwner ? 'owner-disputes' : null,
    fetchDisputes,
    { ...SWR_CONFIG, fallbackData: initialData.disputes ?? undefined },
  );

  const [toggling, setToggling] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const loading = propsLoading || statsLoading || stripeLoading || walletLoading || disputesLoading;
  const stripeConnected = stripeStatus?.connected ?? null;

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const { url } = await connectStripe();
      window.location.href = url;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start Stripe setup', 'error');
      setConnecting(false);
    }
  };

  const handleToggle = useCallback(async (id: string) => {
    setToggling(id);
    const previous = properties;
    try {
      const current = properties?.find((p) => p.id === id);
      if (!current) throw new Error('Property not found');
      const flippedStatus = current.status === 'active' ? 'inactive' : 'active';
      const optimistic = { ...current, status: flippedStatus as 'active' | 'inactive' };

      mutateProperties(
        (prev) => prev?.map((p) => (p.id === id ? optimistic : p)),
        { revalidate: false },
      );

      const updated = await togglePropertyStatus(id);

      await mutateProperties(
        (prev) =>
          prev?.map((p) =>
            p.id === id
              ? { ...p, status: (updated.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive' }
              : p,
          ),
        { revalidate: false },
      );
      mutateStats();
    } catch (err) {
      mutateProperties(() => previous, { revalidate: false });
      toast(err instanceof Error ? err.message : 'Failed to update listing', 'error');
    } finally {
      setToggling(null);
    }
  }, [properties, mutateProperties, mutateStats, toast]);

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || user.role !== 'owner') {
    return (
      <div className="mx-auto max-w-md py-16">
        <div className="rounded-2xl border border-black/[0.04] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F766E]/[0.08]">
            <svg className="h-6 w-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-500">This dashboard is reserved for verified Property Owners.</p>
          <Link
            href="/become-owner"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#0D9488] hover:shadow-md hover:shadow-[#0F766E]/20"
          >
            Apply to Become an Owner
          </Link>
        </div>
      </div>
    );
  }

  const s = stats;
  const totalViews = s?.properties.views ?? 0;
  const activeCount = s?.properties.active ?? (properties ?? []).filter((p) => p.status === 'active').length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeading
        title="Owner Dashboard"
        subtitle="Your listings, bookings and payouts at a glance."
      />
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-900/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#0F766E]/10 to-transparent blur-2xl transition-all duration-300 group-hover:from-[#0F766E]/20" />
          <div className="relative flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-white shadow-lg shadow-[#0F766E]/25">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Listings</span>
          </div>
          <p className="relative mt-5 font-mono text-[28px] font-bold tabular-nums text-slate-900">{loading ? '…' : s?.properties.total ?? (properties ?? []).length}</p>
          <p className="relative mt-0.5 text-[11px] text-slate-400">Total properties in your portfolio</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl transition-all duration-300 group-hover:bg-emerald-400/25" />
          <div className="relative flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Active</span>
          </div>
          <p className="relative mt-5 font-mono text-[28px] font-bold tabular-nums text-emerald-700">{loading ? '…' : activeCount}</p>
          <p className="relative mt-0.5 text-[11px] text-slate-400">Live and bookable right now</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-900/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl transition-all duration-300 group-hover:bg-sky-400/25" />
          <div className="relative flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <span className="rounded-full bg-sky-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-600">Bookings</span>
          </div>
          <p className="relative mt-5 font-mono text-[28px] font-bold tabular-nums text-sky-700">{loading ? '…' : s?.payments.totalBookings ?? 0}</p>
          <p className="relative mt-0.5 text-[11px] text-slate-400">Confirmed stays across listings</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-400/15 blur-2xl transition-all duration-300 group-hover:bg-violet-400/25" />
          <div className="relative flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-400 text-white shadow-lg shadow-violet-500/25">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <span className="rounded-full bg-violet-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">Views</span>
          </div>
          <p className="relative mt-5 font-mono text-[28px] font-bold tabular-nums text-violet-700">{loading ? '…' : totalViews.toLocaleString()}</p>
          <p className="relative mt-0.5 text-[11px] text-slate-400">Eyes on your properties</p>
        </div>
      </div>

      {/* Payouts panel: Stripe status + balances */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#0F766E]/[0.04] via-white to-[#8B5CF6]/[0.04] p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0F766E]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#635BFF" role="img" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Payouts</p>
              <p className="text-[11px] text-slate-400">Your earnings, held and released via Stripe</p>
            </div>
          </div>
          {stripeConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Payments connected
            </span>
          ) : (
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2 text-[12px] font-semibold text-white shadow-md shadow-[#635BFF]/20 transition-all hover:bg-[#5046E5] disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {connecting ? 'Connecting…' : 'Connect Stripe'}
            </button>
          )}
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending balance</p>
              <span className="rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">On hold</span>
            </div>
            <p className="mt-2 font-mono text-[30px] font-bold tabular-nums text-amber-600">
              {loading ? '…' : formatMoney(wallet?.pending ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Held for 3 days after move-in, or until bank connected</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/15 blur-2xl" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Approved balance</p>
              <span className="rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">Withdrawable</span>
            </div>
            <p className="mt-2 font-mono text-[30px] font-bold tabular-nums text-emerald-600">
              {loading ? '…' : formatMoney(wallet?.approved ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Transferred to your Stripe account</p>
          </div>
        </div>
      </div>

      {/* Attach bank banner */}
      {wallet && !wallet.connected && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800">Attach your bank account to receive your pending balance</p>
              <p className="text-[12px] text-slate-500">
                {formatMoney(wallet.pending)} is waiting. Click &quot;Connect&quot; above to complete Stripe onboarding and release it automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projected revenue */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#134E4A] to-[#0F766E] p-7 text-white shadow-lg shadow-teal-900/20 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2DD4BF]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.15),transparent_55%)]" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-teal-200/80">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v1.5m0 1.5V21m0 0h-1.5m1.5 0v1.5m-6.75-15.75h-4.5M9 9.75h4.5M9 13.5h4.5" />
              </svg>
              Projected monthly revenue
            </p>
            <p className="mt-2 font-mono text-[42px] font-bold tabular-nums tracking-tight text-white">
              {loading ? '…' : formatMoney(s?.payments.projectedMonthlyRevenue ?? 0)}
            </p>
            <p className="mt-1 text-[12px] text-teal-100/70">Sum of active lease payments across your listings</p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-center backdrop-blur-sm">
              <p className="font-mono text-xl font-bold tabular-nums text-white">{s?.payments.totalBookings ?? 0}</p>
              <p className="text-[11px] text-teal-100/70">Bookings</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-center backdrop-blur-sm">
              <p className="font-mono text-xl font-bold tabular-nums text-emerald-300">{activeCount}</p>
              <p className="text-[11px] text-teal-100/70">Active listings</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-center backdrop-blur-sm">
              <p className="font-mono text-xl font-bold tabular-nums text-white">{s?.properties.clicks ?? 0}</p>
              <p className="text-[11px] text-teal-100/70">Clicks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      {s && s.recentLeases.length > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent bookings</h2>
                <p className="text-[12px] text-slate-400">Latest activity on your properties</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {s.recentLeases.map((l) => {
                const st = STATUS_LABEL[l.status] ?? { label: l.status, cls: 'bg-slate-100 text-slate-500' };
                return (
                  <div key={l.id} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                      {l.property.photo && <Image src={l.property.photo} alt="" width={64} height={48} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800 group-hover:text-[#0F766E]">{l.property.title}</p>
                      <p className="truncate text-[12px] text-slate-400">by {l.tenant.name} · {formatDate(l.startDate)} → {formatDate(l.endDate)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                    <span className="shrink-0 font-mono text-[13px] font-semibold text-slate-700">{formatMoney(l.monthlyRent)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Disputes */}
      {(disputes ?? []).length > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-400 text-white shadow-lg shadow-rose-500/25">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Disputes</h2>
                <p className="text-[12px] text-slate-400">Chargebacks and disputes on your payments</p>
              </div>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">
              {(disputes ?? []).length} open
            </span>
          </div>
          <div className="relative mt-5 space-y-2">
            {(disputes ?? []).map((d) => (
              <div key={d.id} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                  <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800 group-hover:text-[#0F766E]">{d.property.title}</p>
                  <p className="truncate text-[12px] text-slate-400">
                    {d.reason} · {formatDate(d.period_start)} · {formatDate(d.created_at)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${d.status === 'open' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {d.status}
                </span>
                <span className="shrink-0 font-mono text-[13px] font-semibold text-slate-700">{formatMoney(d.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Properties */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#0F766E]/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-white shadow-lg shadow-[#0F766E]/25">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Your Properties</h2>
              <p className="text-[12px] text-slate-400">
                {loading ? '…' : (properties ?? []).length}{' '}
                {loading ? '' : (properties ?? []).length === 1 ? 'listing' : 'listings'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-[#0F766E]/20 transition-all hover:bg-[#0D9488] hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add
          </Link>
        </div>

        {loading ? (
          <div className="relative mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <PropertyRowSkeleton key={i} />
            ))}
          </div>
        ) : (properties ?? []).length === 0 ? (
          <div className="relative mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E]/10 to-[#2DD4BF]/10">
              <svg className="h-6 w-6 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-700">No properties yet</h3>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-400">Add your first property to start receiving bookings.</p>
            <Link href="/dashboard/properties/new" className="mt-4 rounded-xl bg-[#0F766E] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#0D9488]">
              Add Property
            </Link>
          </div>
        ) : (
          <div className="relative mt-6 space-y-2">
            {(properties ?? []).map((p) => (
              <div key={p.id} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md">
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                  {p.photos[0] && <Image src={p.photos[0]} alt={p.title} width={80} height={64} className="h-full w-full object-cover" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-[#0F766E]">{p.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {p.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-400">{p.address}, {p.city}</p>
                  <p className="mt-1 font-mono text-[13px] font-medium text-slate-600">${p.monthlyRent.toLocaleString()}<span className="text-slate-400">/mo</span></p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link href={`/dashboard/properties/${p.id}/edit`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleToggle(p.id)}
                    disabled={toggling === p.id}
                    className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                      p.status === 'active' ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'bg-[#0F766E] text-white hover:bg-[#0D9488]'
                    }`}
                  >
                    {toggling === p.id ? '…' : p.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

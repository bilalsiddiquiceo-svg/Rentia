'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMyLeases, cancelLease, renewLease, fetchLeasePayments } from '@/lib/leases';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { PageHeading } from '@/components/PageHeading';
import type { Lease, Payment } from '@/types/lease';

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Pending payment', cls: 'bg-amber-50 text-amber-700' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-600' },
  ended: { label: 'Ended', cls: 'bg-slate-100 text-slate-500' },
};

export default function MyLeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [extendMonths, setExtendMonths] = useState<Record<string, number>>({});
  const [paymentsMap, setPaymentsMap] = useState<Record<string, Payment[]>>({});
  const [paymentsLoading, setPaymentsLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchMyLeases()
      .then(setLeases)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load leases', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    fetchMyLeases().then(setLeases).catch(() => {});
  };

  // Lazy-load payment history only when a lease is expanded — the list itself
  // doesn't carry payments, avoiding over-fetching every lease's history.
  const handleExpand = async (id: string) => {
    const isOpen = expanded === id;
    setExpanded(isOpen ? null : id);
    if (isOpen) return;
    if (paymentsMap[id]) return;
    setPaymentsLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const payments = await fetchLeasePayments(id);
      setPaymentsMap((prev) => ({ ...prev, [id]: payments }));
    } catch {
      setPaymentsMap((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setPaymentsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      await cancelLease(id);
      toast('Cancellation requested — updating…');
      setConfirmingCancel(null);
      // The status flips via the Stripe webhook, so re-fetch after it lands.
      refresh();
      setTimeout(refresh, 3000);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Cancellation failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRenew = async (id: string, months: number) => {
    setBusyId(id);
    try {
      const res = await renewLease(id, months);
      toast(`Lease extended by ${months} month${months > 1 ? 's' : ''} until ${formatDate(res.end_date)}`);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Renewal failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-4 p-5">
              <Skeleton className="h-20 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leases.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/[0.08]">
          <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <h1 className="mt-4 font-[Cinzel] text-2xl font-bold text-slate-900">No leases yet</h1>
        <p className="mt-2 text-sm text-slate-500">Browse properties to book your first stay.</p>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="My Leases"
        subtitle={`${leases.length} booking${leases.length > 1 ? 's' : ''} · fixed 30-day blocks, managed end to end`}
      />

      {leases.map((lease) => {
        const status = STATUS_STYLES[lease.status] ?? { label: lease.status, cls: 'bg-slate-100 text-slate-500' };
        const isOpen = expanded === lease.id;
        const activeLease = lease.status === 'active';
        const upcoming = lease.status === 'active' || lease.status === 'pending_payment';
        return (
          <div key={lease.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div
              onClick={() => handleExpand(lease.id)}
              className="flex cursor-pointer items-center gap-4 p-5 transition-colors hover:bg-slate-50/60"
            >
              {lease.property?.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lease.property.photos[0]} alt={lease.property.title} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="h-20 w-24 shrink-0 rounded-xl bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-slate-900">{lease.property?.title ?? 'Property'}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {formatDate(lease.start_date)} → {formatDate(lease.end_date)} · {lease.months} month{lease.months > 1 ? 's' : ''}
                </p>
                <p className="mt-1 font-mono text-[15px] font-bold tabular-nums text-slate-900">
                  {formatMoney(lease.monthly_rent)}
                  <span className="text-[12px] font-normal text-slate-400">/mo</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {activeLease && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpand(lease.id);
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-deep"
                  >
                    Extend
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpand(lease.id);
                  }}
                  className="text-[12px] font-medium text-slate-500 hover:text-slate-800"
                >
                  {isOpen ? 'Hide details' : 'View details'}
                </button>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4">
                <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Move-in</p>
                    <p className="mt-0.5 text-slate-700">{formatDate(lease.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Move-out</p>
                    <p className="mt-0.5 text-slate-700">{formatDate(lease.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly rent</p>
                    <p className="mt-0.5 font-mono tabular-nums text-slate-700">{formatMoney(lease.monthly_rent)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Booked</p>
                    <p className="mt-0.5 text-slate-700">{formatDate(lease.created_at)}</p>
                  </div>
                </div>

                {lease.property && (
                  <Link href={`/property/${lease.property.id}`} className="mt-3 inline-block text-[12px] font-medium text-brand hover:text-brand-deep">
                    View property →
                  </Link>
                )}

                {activeLease && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Extend your lease
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Choose how many months to add. Rent keeps billing monthly and the end date moves out by that amount.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                        const selected = (extendMonths[lease.id] ?? 1) === m;
                        return (
                          <button
                            key={m}
                            onClick={() => setExtendMonths((prev) => ({ ...prev, [lease.id]: m }))}
                            className={`h-9 w-11 rounded-lg border text-[13px] font-semibold transition-colors ${
                              selected
                                ? 'border-brand bg-brand text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] text-slate-500">
                        Ends {formatDate(lease.end_date)} →{' '}
                        <span className="font-semibold text-slate-700">
                          {formatDate(new Date(new Date(lease.end_date).getTime() + (extendMonths[lease.id] ?? 1) * 30 * 24 * 60 * 60 * 1000).toISOString())}
                        </span>
                      </p>
                      <button
                        onClick={() => handleRenew(lease.id, extendMonths[lease.id] ?? 1)}
                        disabled={busyId === lease.id}
                        className="rounded-xl bg-brand px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
                      >
                        {busyId === lease.id ? 'Extending…' : `Extend ${extendMonths[lease.id] ?? 1} month${(extendMonths[lease.id] ?? 1) > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                )}

                {paymentsLoading[lease.id] ? (
                  <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
                    Loading payment history…
                  </div>
                ) : (paymentsMap[lease.id]?.length ?? 0) > 0 ? (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment history</p>
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Period</th>
                            <th className="px-3 py-2 font-semibold">Amount</th>
                            <th className="px-3 py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentsMap[lease.id]!.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 text-slate-600">
                                {formatDate(p.period_start)} → {formatDate(p.period_end)}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-slate-700">{formatMoney(p.amount)}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    p.status === 'released'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : p.status === 'held'
                                        ? 'bg-amber-50 text-amber-700'
                                        : p.status === 'refunded'
                                          ? 'bg-red-50 text-red-600'
                                          : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {upcoming && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                    <p className="text-[12px] text-slate-500">
                      {confirmingCancel === lease.id
                        ? 'This will cancel your booking and refund any unreleased payments. Continue?'
                        : 'Cancel your booking'}
                    </p>
                    {confirmingCancel === lease.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancel(lease.id)}
                          disabled={busyId === lease.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {busyId === lease.id ? '…' : 'Yes, cancel'}
                        </button>
                        <button
                          onClick={() => setConfirmingCancel(null)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingCancel(lease.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

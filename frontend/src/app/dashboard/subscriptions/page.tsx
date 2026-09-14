'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeading } from '@/components/PageHeading';
import {
  type AgentStatus,
  type AgentPayment,
  getAgentStatus,
  subscribeToAgent,
  cancelAgentSubscription,
  fetchAgentPayments,
} from '@/lib/agent';

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  open: 'bg-amber-50 text-amber-700',
  uncollectible: 'bg-red-50 text-red-600',
  not_found: 'bg-slate-100 text-slate-500',
  void: 'bg-slate-100 text-slate-500',
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SparklesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [payments, setPayments] = useState<AgentPayment[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAgentStatus().then((s) => {
        if (!cancelled) setStatus(s);
      }),
      fetchAgentPayments().then((p) => {
        if (!cancelled) setPayments(p.items);
      }),
    ])
      .catch(() => {
        if (!cancelled) toast('Could not load subscription details', 'error');
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStatus(false);
          setLoadingPayments(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleCancel = async () => {
    if (
      !window.confirm(
        'Cancel your Rentia Agent subscription? You keep access until the end of the current billing period.',
      )
    ) {
      return;
    }
    setActioning('cancel');
    try {
      setStatus(await cancelAgentSubscription());
      toast('Your subscription will cancel at the end of the current period.', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel subscription', 'error');
    } finally {
      setActioning(null);
    }
  };

  const handleResubscribe = async () => {
    setActioning('subscribe');
    try {
      const { url } = await subscribeToAgent();
      window.location.href = url;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start checkout', 'error');
      setActioning(null);
    }
  };

  const handlePay = (p: AgentPayment) => {
    if (p.hostedInvoiceUrl) window.open(p.hostedInvoiceUrl, '_blank', 'noopener');
  };

  const periodEnd = status?.currentPeriodEnd;
  const isActive = !!status?.active;
  const canceling = !!status?.cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Subscriptions"
        subtitle="Manage your Rentia subscriptions and view billing history."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#14B8A6] px-6 py-5 text-white">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <SparklesIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Rentia Agent</h2>
                {isActive ? (
                  <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold opacity-80">
                    Inactive
                  </span>
                )}
                {canceling && (
                  <span className="rounded-full bg-amber-300/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100">
                    Cancels at period end
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-teal-100">AI property assistant</p>
            </div>
            <div className="flex shrink-0 items-end gap-1.5">
              <div className="text-4xl font-bold tabular-nums tracking-tight">
                $49
                <span className="ml-1 text-[15px] font-medium text-teal-100">/month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </p>
                <p className="mt-0.5 text-slate-700">
                  {isActive ? 'Active' : 'Inactive'}
                  {canceling && periodEnd ? ` — canceling on ${formatDate(periodEnd)}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Next billing
                </p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {periodEnd ? formatDate(periodEnd) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {loadingStatus ? (
                <p className="text-[12px] text-slate-400">Loading…</p>
              ) : isActive && !canceling ? (
                <button
                  onClick={handleCancel}
                  disabled={actioning === 'cancel'}
                  className="rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {actioning === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              ) : isActive && canceling ? (
                <button
                  onClick={handleResubscribe}
                  disabled={actioning === 'subscribe'}
                  className="rounded-lg bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {actioning === 'subscribe' ? 'Opening…' : 'Resume'}
                </button>
              ) : (
                <button
                  onClick={handleResubscribe}
                  disabled={actioning === 'subscribe'}
                  className="rounded-lg bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[#0F766E]/20 transition hover:brightness-110 disabled:opacity-50"
                >
                  {actioning === 'subscribe' ? 'Opening…' : 'Subscribe — $49/month'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                Payment history{' '}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {payments.length}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {historyOpen ? 'Click to collapse' : 'Click to expand'}
              </p>
            </div>
            <svg
              className={`h-5 w-5 text-slate-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {historyOpen &&
            (loadingPayments ? (
              <div className="px-6 py-6 text-[12px] text-slate-400">Loading…</div>
            ) : payments.length === 0 ? (
              <div className="px-6 py-6 text-[12px] text-slate-400">No payments yet.</div>
            ) : (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-6 py-2.5 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-6 py-2.5 text-slate-600">
                          {p.date ? formatDate(p.date) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-800">
                          {formatMoney(p.amount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-2.5 text-right">
                          <button
                            onClick={() => handlePay(p)}
                            disabled={!p.hostedInvoiceUrl}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                              />
                            </svg>
                            {p.hostedInvoiceUrl ? 'View / Download' : 'Unavailable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

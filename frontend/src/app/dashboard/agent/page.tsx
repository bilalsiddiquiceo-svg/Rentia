'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { AgentChat, type AgentChatHandle } from '@/components/agent/AgentChat';
import {
  getAgentStatus,
  getAgentStatusFresh,
  subscribeToAgent,
  type AgentStatus,
} from '@/lib/agent';

const FEATURES = [
  {
    title: 'Instant, accurate answers',
    detail: 'Payouts, leases and disputes — replied from your real data in seconds.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v-1.5m0 1.5v18m0 0h-1.5m1.5 0v1.5m-6.75-15.75h-4.5M9 9.75h4.5M9 13.5h4.5" />
      </svg>
    ),
  },
  {
    title: 'Draft listings from photos',
    detail: 'Snap a few photos, add the address, and get a ready-to-publish listing.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    title: 'Remembers your conversations',
    detail: 'Pick up right where you left off — on any page, any time.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    title: 'Performance at a glance',
    detail: 'Views, bookings and projected revenue — summarized the moment you ask.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
];

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

function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SubscribeCard({ subscribing, onSubscribe }: { subscribing: boolean; onSubscribe: () => void }) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
        <div className="h-1.5 bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#22D3EE]" />
        <div className="grid sm:grid-cols-[1.25fr_1fr]">
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-lg shadow-[#0F766E]/25">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-900">Rentia Agent</p>
                <p className="text-xs text-slate-500">Your one-stop AI property assistant</p>
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
              Run your rentals smarter, not harder.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Ask anything about your portfolio and get answers from your real data — payouts,
              leases, disputes, performance — then turn a few photos into a ready-to-publish
              listing.
            </p>

            <ul className="mt-7 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F766E]/10 text-[#0F766E]">
                    {f.icon}
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-bold text-slate-800">{f.title}</span>
                    <span className="block text-[12.5px] leading-relaxed text-slate-500">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center border-t border-slate-100 bg-gradient-to-b from-[#F0FDFA]/70 to-white p-8 sm:border-l sm:border-t-0 sm:p-10">
            <div className="flex items-center justify-center gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-slate-900">$49</span>
              <span className="pb-1 text-sm font-medium text-slate-400">/month</span>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              One flat price. Every tool included.
            </p>

            <button
              onClick={onSubscribe}
              disabled={subscribing}
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0F766E]/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {subscribing ? 'Opening checkout…' : 'Subscribe — $49/month'}
            </button>

             <p className="mt-4 text-center text-[10.5px] text-slate-400">
               Secure Stripe checkout
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [activating, setActivating] = useState(!!sessionId);
  const [subscribing, setSubscribing] = useState(false);
  const chatRef = useRef<AgentChatHandle>(null);

  useEffect(() => {
    let cancelled = false;
    getAgentStatus()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ active: false, currentPeriodEnd: null, cancelAtPeriodEnd: false }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const s = await getAgentStatusFresh();
        if (cancelled) return;
        if (s.active) {
          clearInterval(timer);
          setStatus(s);
          setActivating(false);
          toast('Your Rentia Agent subscription is active', 'success');
          return;
        }
        if (tries >= 12) {
          clearInterval(timer);
          setActivating(false);
        }
      } catch {
        if (cancelled) return;
        if (tries >= 12) {
          clearInterval(timer);
          setActivating(false);
        }
      }
    }, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [sessionId, toast]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { url } = await subscribeToAgent();
      window.location.href = url;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start checkout', 'error');
      setSubscribing(false);
    }
  };

  if (status === null) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
          Connecting to Rentia Agent…
        </div>
      </div>
    );
  }

  if (!status.active) {
    if (sessionId && activating) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-lg shadow-[#0F766E]/30">
            <SparklesIcon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Activating your subscription…</p>
            <p className="mt-1 text-xs text-slate-400">This takes a few seconds. One moment.</p>
          </div>
        </div>
      );
    }

    return <SubscribeCard subscribing={subscribing} onSubscribe={handleSubscribe} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#F0FDFA]/50 via-white to-[#F0FDFA]/40">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#22D3EE] text-white shadow-lg shadow-[#0F766E]/25">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Rentia Agent</h2>
            <p className="text-[11px] text-slate-400">Your one-stop property assistant</p>
          </div>
        </div>
        <button
          onClick={() => chatRef.current?.resetConversation()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Start a new conversation"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New conversation
        </button>
      </header>

      <AgentChat
        ref={chatRef}
        className="flex-1"
        onLapsed={() => setStatus({ active: false, currentPeriodEnd: null, cancelAtPeriodEnd: false })}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
        </div>
      }
    >
      <AgentContent />
    </Suspense>
  );
}
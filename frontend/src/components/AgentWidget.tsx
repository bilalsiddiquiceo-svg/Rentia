'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/Toast';
import { AgentChat, type AgentChatHandle } from '@/components/agent/AgentChat';
import { getAgentStatus, getAgentStatusFresh } from '@/lib/agent';

function SparklesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

export function AgentWidget() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const chatRef = useRef<AgentChatHandle>(null);

  useEffect(() => setMounted(true), []);

  // Only subscribed owners get the widget; re-check on every route change so a
  // lapsed or just-subscribed owner sees the correct state without a refresh.
  useEffect(() => {
    if (!user || user.role !== 'owner') return;
    let cancelled = false;
    getAgentStatusFresh()
      .then((s) => {
        if (!cancelled) setSubscribed(s.active);
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, user]);

  const isOwner = !isLoading && user?.role === 'owner';
  if (!isOwner || checking || !subscribed) return null;
  if (pathname.startsWith('/dashboard/agent')) return null;

  return (
    <>
      {open &&
        mounted &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <div className="fixed bottom-4 right-4 z-[95] flex h-[min(640px,calc(100dvh-6rem))] w-[min(100vw,420px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/30 sm:bottom-6 sm:right-6">
              <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0F766E]/[0.06] to-transparent px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#22D3EE] text-white shadow-lg shadow-[#0F766E]/25">
                      <SparklesIcon className="h-5 w-5" />
                    </div>
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Rentia Agent</h2>
                    <p className="text-[11px] text-slate-400">Always here to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => chatRef.current?.resetConversation()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-[#0F766E]"
                    title="New conversation"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-600"
                    title="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </header>
              <AgentChat
                ref={chatRef}
                className="flex-1"
                onLapsed={() => {
                  setOpen(false);
                  toast('Your Rentia Agent subscription has ended. Renew from the Agent page.', 'error');
                }}
              />
            </div>
          </>,
          document.body,
        )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#22D3EE] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0F766E]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0F766E]/35 hover:brightness-110 active:scale-95"
          title="Chat with Agent"
          aria-label="Chat with Agent"
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <SparklesIcon className="h-[18px] w-[18px]" />
            <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-emerald-300 ring-2 ring-white/60" />
          </span>
          Chat with Agent
        </button>
      )}
    </>
  );
}
